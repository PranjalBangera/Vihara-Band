/*******************************************************************************
 * @file   app.c
 * @brief  Vihara Band -- BMA400 Step Counter + Fall Detector
 *         BLE is handled in app_ble.c / app_ble.h
 *         This file: sensor logic only, calls app_ble_* for notifications
 ******************************************************************************/

#include "sl_component_catalog.h"
#include "sl_sleeptimer.h"
#include "app_ble.h"           // BLE notify functions
#include "bma400.h"
#include "nvm3.h"              // NVM3 library
#include "nvm3_default.h"      // NVM3 default instance configurations
#include <math.h>
#include <stdbool.h>

#define NVM3_KEY_STEPS  0x00010

#if defined(SLI_SI917)
  #include "rsi_debug.h"
  #include "sl_si91x_driver_gpio.h"
  #ifdef SL_CATALOG_MIKROE_ACCEL5_BMA400_I2C_PRESENT
    #include "mikroe_bma400_i2c.h"
    #include "mikroe_bma400_i2c_config.h"
    #include "sl_i2c_instances.h"
    #define I2C_INSTANCE_USED  SL_I2C2
    static sl_i2c_instance_t i2c_instance = I2C_INSTANCE_USED;
  #endif
  #define app_printf(...)  DEBUGOUT(__VA_ARGS__)
  #ifdef MIKROE_BMA400_READ_MODE_INTERRUPT
    #include "sl_driver_gpio.h"
    #define PIN_INTR_NO  PIN_INTR_0
    #define AVL_INTR_NO  0
  #endif
#else
  #include "app_log.h"
  #ifdef MIKROE_BMA400_READ_MODE_INTERRUPT
    #include "sl_gpio.h"
  #endif
  #ifdef SL_CATALOG_MIKROE_ACCEL5_BMA400_I2C_PRESENT
    #include "sl_i2cspm_instances.h"
    #include "mikroe_bma400_i2c.h"
    #include "mikroe_bma400_i2c_config.h"
  #endif
  #define app_printf(...)  app_log(__VA_ARGS__)
#endif

// ============================================================
//  CONFIGURATION
// ============================================================
#define MIKROE_BMA400_READ_MODE_INTERRUPT
#define GRAVITY_EARTH               9.80665f
#ifndef M_PI
#define M_PI                        3.14159265358979323846f
#endif
#define STEP_SMOOTHING_ALPHA        0.3f
#define STEP_THRESHOLD_HIGH_MS2     11.5f
#define STEP_THRESHOLD_LOW_MS2      9.0f
#define STEP_MIN_INTERVAL_MS        300u
#define STRIDE_LENGTH_M             0.73f
#define ACTIVE_MINUTE_STEP_THRESHOLD 30u
#define ACTIVITY_HEARTBEAT_EVERY_N  500u
#define SEDENTARY_THRESHOLD_MIN     60u
#define FALL_FREEFALL_THRESHOLD_MS2 4.9f
#define FALL_FREEFALL_MIN_MS        150u
#define FALL_IMPACT_WINDOW_MS       500u
#define FALL_IMPACT_THRESHOLD_MS2   34.3f
#define FALL_MAX_IMPACT_SETTLE_MS   1500u
#define FALL_STILL_BAND_MS2         1.8f
#define FALL_STILL_CONFIRM_MS       1800u
#define VARIANCE_WINDOW_SIZE        20u
#define MIN_ORIENTATION_DELTA_DEG   30.0f
#define STILL_VARIANCE_MAX_MS2      1.0f

typedef enum { STEP_STATE_BELOW = 0, STEP_STATE_ABOVE } step_state_t;
typedef enum { FALL_IDLE = 0, FALL_FREEFALL, FALL_IMPACT, FALL_CONFIRMED } fall_state_t;

// ============================================================
//  STATE
// ============================================================
static step_state_t  step_state          = STEP_STATE_BELOW;
static float         step_filtered_mag   = GRAVITY_EARTH;
static uint32_t      step_last_tick      = 0;
static uint32_t      activity_sample_counter = 0;
static uint32_t      total_steps         = 0;
static uint32_t      last_saved_steps    = 0;
static float         total_distance_m    = 0.0f;
static uint32_t      total_active_minutes = 0;
static uint32_t      minute_bucket_start = 0;
static uint32_t      minute_bucket_steps = 0;
static uint32_t      sedentary_last_step_tick = 0;
static bool          sedentary_alert_active = false;
static fall_state_t  fall_state          = FALL_IDLE;
static uint32_t      fall_enter_tick     = 0;
static uint32_t      stillness_start_tick = 0;
static bool          fall_alert_pending  = false;
static uint32_t      fall_sample_counter = 0;
static float         mag_window[VARIANCE_WINDOW_SIZE];
static uint32_t      mag_window_idx = 0, mag_window_count = 0;
static float         mag_window_sum = 0.0f, mag_window_sum_sq = 0.0f;
static float         pre_fall_angle_deg = 0.0f;
static bool          pre_fall_angle_valid = false;

static struct bma400_dev bma;
static volatile bool data_ready = false;
#ifdef SL_CATALOG_MIKROE_ACCEL5_BMA400_I2C_PRESENT
static mikroe_i2c_handle_t app_i2c_instance = NULL;
#endif

// ============================================================
//  PROTOTYPES
// ============================================================
static sl_status_t sensor_init(void);
static sl_status_t sensor_read(void);
static float lsb_to_ms2(int16_t v, uint8_t g, uint8_t b);
static void update_step_counter(float ax, float ay, float az);
static void update_fall_detection(float ax, float ay, float az);
static void check_sedentary(void);
static void print_status(void);
static float compute_inclination(float az);
static void push_variance(float m);
static float get_variance(void);
static const char *fall_state_name(fall_state_t s);
static uint32_t get_tick_ms(void);

// ============================================================
//  INTERRUPT CALLBACK
// ============================================================
#ifdef MIKROE_BMA400_READ_MODE_INTERRUPT
#if defined(SLI_SI917)
static void gpio_int_cb(uint32_t i) { (void)i; data_ready = true; }
#else
static void gpio_int_cb(uint8_t i, void *c) { (void)i; (void)c; data_ready = true; }
#endif
#endif

// ============================================================
//  APP INIT
// ============================================================
void app_init(void)
{
  app_printf("\r\n=================================\r\n");
  app_printf("  VIHARA BAND -- BMA400 + BLE\r\n");
  app_printf("=================================\r\n\r\n");

  // Open NVM3 default instance and load saved steps
  Ecode_t err = nvm3_open(nvm3_defaultHandle, nvm3_defaultInit);
  if (err == ECODE_NVM3_OK) {
    uint32_t saved_steps = 0;
    err = nvm3_readData(nvm3_defaultHandle, NVM3_KEY_STEPS, &saved_steps, sizeof(saved_steps));
    if (err == ECODE_NVM3_OK) {
      total_steps = saved_steps;
      last_saved_steps = saved_steps;
      app_printf("Loaded steps from NVM3: %lu\r\n", (unsigned long)total_steps);
    } else {
      app_printf("No saved steps found in NVM3 (err=0x%x). Starting from 0.\r\n", err);
      total_steps = 0;
      last_saved_steps = 0;
    }
  } else {
    app_printf("ERROR: NVM3 open failed (err=0x%x)\r\n", err);
    total_steps = 0;
  }

  if (sensor_init() != SL_STATUS_OK) {
    app_printf("ERROR: BMA400 init failed!\r\n");
  }
}

// ============================================================
//  MAIN LOOP
// ============================================================
void app_process_action(void)
{
  if (!data_ready) return;
  data_ready = false;
  if (sensor_read() != SL_STATUS_OK) { app_printf("Read error\r\n"); return; }
  check_sedentary();
  if (fall_alert_pending) {
    fall_alert_pending   = false;
    fall_state           = FALL_IDLE;
    stillness_start_tick = 0;
    app_printf("\r\n>>> FALL DETECTED! <<<\r\n\r\n");
    app_ble_notify_fall();   // -> web app overlay
  }
}

// ============================================================
//  SENSOR INIT
// ============================================================
static sl_status_t sensor_init(void)
{
  int8_t rslt;
  struct bma400_sensor_conf conf;
  struct bma400_int_enable int_en;
#if defined(SLI_SI917)
  app_i2c_instance = &i2c_instance;
#else
  app_i2c_instance = sl_i2cspm_mikroe;
#endif
  rslt = bma400_i2c_init(app_i2c_instance, MIKROE_BMA400_ADDR, &bma);
  if (rslt != BMA400_OK) { app_printf("I2C init failed\r\n"); return SL_STATUS_FAIL; }
  rslt = bma400_soft_reset(&bma);
  if (rslt != BMA400_OK) return SL_STATUS_FAIL;
  rslt = bma400_init(&bma);
  if (rslt != BMA400_OK) { app_printf("BMA400 not found (err=%d)\r\n", rslt); return SL_STATUS_FAIL; }
  app_printf("BMA400 detected OK\r\n");
  conf.type = BMA400_ACCEL;
  rslt = bma400_get_sensor_conf(&conf, 1, &bma);
  if (rslt != BMA400_OK) return SL_STATUS_FAIL;
#ifdef MIKROE_BMA400_READ_MODE_INTERRUPT
  conf.param.accel.int_chan = BMA400_INT_CHANNEL_1;
#endif
  conf.param.accel.odr      = BMA400_ODR_100HZ;
  conf.param.accel.range    = BMA400_RANGE_2G;
  conf.param.accel.data_src = BMA400_DATA_SRC_ACCEL_FILT_1;
  rslt = bma400_set_sensor_conf(&conf, 1, &bma);
  if (rslt != BMA400_OK) return SL_STATUS_FAIL;
  rslt = bma400_set_power_mode(BMA400_MODE_NORMAL, &bma);
  if (rslt != BMA400_OK) return SL_STATUS_FAIL;
  int_en.type = BMA400_DRDY_INT_EN; int_en.conf = BMA400_ENABLE;
  rslt = bma400_enable_interrupt(&int_en, 1, &bma);
  if (rslt != BMA400_OK) return SL_STATUS_FAIL;
#ifdef MIKROE_BMA400_READ_MODE_INTERRUPT
  {
    sl_gpio_t gpio_port_pin; int32_t int_no;
#if defined(SLI_SI917)
    gpio_port_pin.port = (MIKROE_BMA400_INT1_PORT > 0) ? MIKROE_BMA400_INT1_PORT : (MIKROE_BMA400_INT1_PIN / 16);
    gpio_port_pin.pin  = MIKROE_BMA400_INT1_PIN % 16;
    int_no = (MIKROE_BMA400_INT1_PORT == UULP_VBAT) ? MIKROE_BMA400_INT1_PIN : PIN_INTR_NO;
    sl_gpio_driver_configure_interrupt(&gpio_port_pin, int_no, SL_GPIO_INTERRUPT_RISING_EDGE, gpio_int_cb, AVL_INTR_NO);
#else
    gpio_port_pin.port = MIKROE_BMA400_INT1_PORT; gpio_port_pin.pin = MIKROE_BMA400_INT1_PIN;
    int_no = MIKROE_BMA400_INT1_PIN;
    sl_gpio_configure_external_interrupt(&gpio_port_pin, &int_no, SL_GPIO_INTERRUPT_RISING_EDGE, gpio_int_cb, NULL);
#endif
  }
#endif
  return SL_STATUS_OK;
}

static sl_status_t sensor_read(void)
{
  int8_t rslt; struct bma400_sensor_data accel; uint16_t int_status = 0;
  rslt = bma400_get_interrupt_status(&int_status, &bma);
  if (rslt != BMA400_OK) return SL_STATUS_FAIL;
  if (!(int_status & BMA400_ASSERTED_DRDY_INT)) return SL_STATUS_OK;
  rslt = bma400_get_accel_data(BMA400_DATA_SENSOR_TIME, &accel, &bma);
  if (rslt != BMA400_OK) return SL_STATUS_FAIL;
  float ax = lsb_to_ms2(accel.x, 2, 12);
  float ay = lsb_to_ms2(accel.y, 2, 12);
  float az = lsb_to_ms2(accel.z, 2, 12);
  update_step_counter(ax, ay, az);
  update_fall_detection(ax, ay, az);
  if ((++activity_sample_counter % ACTIVITY_HEARTBEAT_EVERY_N) == 0) print_status();
  return SL_STATUS_OK;
}
static float lsb_to_ms2(int16_t v, uint8_t g, uint8_t b) { return (GRAVITY_EARTH * v * g) / (float)(1 << (b - 1)); }

// ============================================================
//  STEP COUNTER
// ============================================================
static void update_step_counter(float ax, float ay, float az)
{
  float mag = sqrtf(ax*ax + ay*ay + az*az);
  uint32_t now = get_tick_ms();
  step_filtered_mag += STEP_SMOOTHING_ALPHA * (mag - step_filtered_mag);
  switch (step_state) {
    case STEP_STATE_BELOW:
      if (step_filtered_mag >= STEP_THRESHOLD_HIGH_MS2) {
        if ((now - step_last_tick) >= STEP_MIN_INTERVAL_MS) {
          total_steps++; total_distance_m += STRIDE_LENGTH_M;
          minute_bucket_steps++; step_last_tick = now; sedentary_last_step_tick = now;
          if (sedentary_alert_active) { sedentary_alert_active = false; app_printf("[SEDENTARY] Cleared\r\n"); }
          app_printf("[STEP] count=%lu |a|=%.2f\r\n", (unsigned long)total_steps, step_filtered_mag);
          
          app_ble_update_step_count(total_steps);  // -> web app dashboard
        }
        step_state = STEP_STATE_ABOVE;
      }
      break;
    case STEP_STATE_ABOVE:
      if (step_filtered_mag <= STEP_THRESHOLD_LOW_MS2) step_state = STEP_STATE_BELOW;
      break;
    default: step_state = STEP_STATE_BELOW; break;
  }
  if (minute_bucket_start == 0) minute_bucket_start = now;
  if ((now - minute_bucket_start) >= 60000u) {
    if (minute_bucket_steps >= ACTIVE_MINUTE_STEP_THRESHOLD) {
      total_active_minutes++;
      app_printf("[ACTIVE] +1 active minute (steps: %lu)\r\n", (unsigned long)minute_bucket_steps);
    }
    
    // Save to flash periodically (every minute) if step count has changed
    if (total_steps != last_saved_steps) {
      nvm3_writeData(nvm3_defaultHandle, NVM3_KEY_STEPS, &total_steps, sizeof(total_steps));
      last_saved_steps = total_steps;
    }
    
    minute_bucket_steps = 0; minute_bucket_start = now;
  }
}

// ============================================================
//  FALL DETECTION
// ============================================================
static void update_fall_detection(float ax, float ay, float az)
{
  float mag = sqrtf(ax*ax + ay*ay + az*az);
  float angle_deg = compute_inclination(az);
  uint32_t now = get_tick_ms();
  push_variance(mag);
  if ((++fall_sample_counter % 20) == 0)
    app_printf("[FALL] state=%s |a|=%.2f angle=%.1fdeg var=%.3f\r\n", fall_state_name(fall_state), mag, angle_deg, get_variance());
  switch (fall_state) {
    case FALL_IDLE:
      if (mag < FALL_FREEFALL_THRESHOLD_MS2) {
        fall_state = FALL_FREEFALL; fall_enter_tick = now;
        pre_fall_angle_deg = angle_deg; pre_fall_angle_valid = true; stillness_start_tick = 0;
        app_printf("[FALL] IDLE->FREEFALL (|a|=%.2f)\r\n", mag);
        app_ble_notify_freefall(); // Notify freefall
      }
      break;
    case FALL_FREEFALL: {
      uint32_t ff_dt = now - fall_enter_tick;
      if (mag >= FALL_IMPACT_THRESHOLD_MS2) {
        if (ff_dt >= FALL_FREEFALL_MIN_MS) {
          fall_state = FALL_IMPACT; fall_enter_tick = now; stillness_start_tick = 0;
          app_printf("[FALL] FREEFALL->IMPACT (ff=%lums)\r\n", (unsigned long)ff_dt);
        } else { fall_state = FALL_IDLE; pre_fall_angle_valid = false; }
      } else if (ff_dt > FALL_IMPACT_WINDOW_MS) { fall_state = FALL_IDLE; pre_fall_angle_valid = false; }
      break;
    }
    case FALL_IMPACT: {
      bool near_1g = (fabsf(mag - GRAVITY_EARTH) <= FALL_STILL_BAND_MS2);
      uint32_t imp_dt = now - fall_enter_tick;
      if (near_1g) {
        if (stillness_start_tick == 0) { stillness_start_tick = now; app_printf("[FALL] Stillness started\r\n"); }
        if ((now - stillness_start_tick) >= FALL_STILL_CONFIRM_MS) { fall_state = FALL_CONFIRMED; app_printf("[FALL] IMPACT->CONFIRMED\r\n"); }
      } else {
        if (stillness_start_tick != 0) { stillness_start_tick = 0; }
        if (imp_dt > FALL_MAX_IMPACT_SETTLE_MS) { fall_state = FALL_IDLE; pre_fall_angle_valid = false; stillness_start_tick = 0; }
      }
      break;
    }
    case FALL_CONFIRMED: {
      float delta = fabsf(angle_deg - pre_fall_angle_deg);
      bool ori_ok = pre_fall_angle_valid && (delta >= MIN_ORIENTATION_DELTA_DEG);
      float var   = get_variance();
      bool still  = (var <= STILL_VARIANCE_MAX_MS2);
      app_printf("[FALL] Checks: delta=%.1fdeg var=%.3f => %s/%s\r\n", delta, var, ori_ok?"PASS":"FAIL", still?"PASS":"FAIL");
      if (ori_ok && still) fall_alert_pending = true;
      else { fall_state = FALL_IDLE; }
      pre_fall_angle_valid = false; stillness_start_tick = 0;
      break;
    }
    default: fall_state = FALL_IDLE; pre_fall_angle_valid = false; stillness_start_tick = 0; break;
  }
}

static void check_sedentary(void)
{
  uint32_t now = get_tick_ms();
  if (sedentary_last_step_tick == 0) { sedentary_last_step_tick = now; return; }
  uint32_t min = (now - sedentary_last_step_tick) / 60000u;
  if (min >= SEDENTARY_THRESHOLD_MIN && !sedentary_alert_active) {
    sedentary_alert_active = true;
    app_printf("\r\n[SEDENTARY] No steps for %lu min!\r\n\r\n", (unsigned long)min);
  }
}
static void print_status(void)
{
  app_printf("\r\n[STATUS] steps=%lu dist=%.1fm active=%lu fall=%s\r\n",
    (unsigned long)total_steps, (double)total_distance_m, (unsigned long)total_active_minutes, fall_state_name(fall_state));
}
static float compute_inclination(float az) { float r = az/GRAVITY_EARTH; if(r>1)r=1; if(r<-1)r=-1; return acosf(r)*(180.0f/(float)M_PI); }
static void push_variance(float m) {
  if (mag_window_count == VARIANCE_WINDOW_SIZE) { float o=mag_window[mag_window_idx]; mag_window_sum-=o; mag_window_sum_sq-=o*o; }
  else mag_window_count++;
  mag_window[mag_window_idx]=m; mag_window_sum+=m; mag_window_sum_sq+=m*m;
  mag_window_idx=(mag_window_idx+1u)%VARIANCE_WINDOW_SIZE;
}
static float get_variance(void) { if(!mag_window_count) return 0; float mean=mag_window_sum/mag_window_count; float v=(mag_window_sum_sq/mag_window_count)-(mean*mean); return v<0?0:v; }
static const char *fall_state_name(fall_state_t s) { switch(s){case FALL_IDLE:return"IDLE";case FALL_FREEFALL:return"FREEFALL";case FALL_IMPACT:return"IMPACT";case FALL_CONFIRMED:return"CONFIRMED";default:return"UNKNOWN";} }
static uint32_t get_tick_ms(void) { uint32_t f=sl_sleeptimer_get_timer_frequency(); uint64_t t=(uint64_t)sl_sleeptimer_get_tick_count(); if(!f)return 0; return(uint32_t)((t*1000ull)/f); }

uint32_t app_get_step_count(void)      { return total_steps; }
float    app_get_distance_m(void)      { return total_distance_m; }
uint32_t app_get_active_minutes(void)  { return total_active_minutes; }
uint32_t app_get_fall_state(void)      { return (uint32_t)fall_state; }
