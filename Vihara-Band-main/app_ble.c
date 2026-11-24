#include "app_ble.h"
#include "app_log.h"
#include "gatt_db.h"
#include "sl_bt_api.h"
#include "sl_status.h"
#include "sl_sleeptimer.h"
#include <stddef.h>

static bool app_ble_enabled = false;
static uint8_t app_ble_advertiser_handle = 0xFFu;
static uint8_t app_ble_connection_handle = SL_BT_INVALID_CONNECTION_HANDLE;
static bool app_ble_step_notify_enabled = false;
static bool app_ble_fall_notify_enabled = false;
static bool app_ble_battery_notify_enabled = false;
static bool app_ble_status_notify_enabled = false;

static void app_ble_log_status(sl_status_t status, const char *msg)
{
  if (status != SL_STATUS_OK) {
    app_log("[BLE] ERROR %s: 0x%02X\r\n", msg, (unsigned)status);
  }
}

void app_ble_init(void)
{
  sl_status_t status;

  // TX power: +4.0 dBm (40 in 0.1dBm units)
  // Gives ~8-10m real-world range on wrist, ~1.8mA avg (still 7-day battery)
  // EFR32BG22 hardware max is +6dBm but +4dBm is the sweet spot for range/battery
  (void)sl_bt_system_set_tx_power(-30, 40, NULL, NULL);

  status = sl_bt_advertiser_create_set(&app_ble_advertiser_handle);
  if (status != SL_STATUS_OK) {
    app_ble_log_status(status, "create_set");
    return;
  }

  // Advertising interval: 800 * 0.625ms = 500ms (Mi Band / Fitbit standard)
  // Reduces duty cycle and saves ~40% battery vs 100ms interval
  status = sl_bt_advertiser_set_timing(app_ble_advertiser_handle,
                                       800, 800, 0, 0);
  app_ble_log_status(status, "set_timing");
  if (status != SL_STATUS_OK) {
    return;
  }

  status = sl_bt_legacy_advertiser_generate_data(app_ble_advertiser_handle,
                                                  sl_bt_advertiser_general_discoverable);
  app_ble_log_status(status, "generate_data");
  if (status != SL_STATUS_OK) {
    return;
  }

  status = sl_bt_legacy_advertiser_start(app_ble_advertiser_handle,
                                         sl_bt_legacy_advertiser_connectable);
  app_ble_log_status(status, "start");
  if (status == SL_STATUS_OK) {
    app_ble_enabled = true;
    app_log("[BLE] Advertising started.\r\n");
  }
}

void app_ble_deinit(void)
{
  app_ble_enabled = false;
  app_ble_connection_handle = SL_BT_INVALID_CONNECTION_HANDLE;
  app_ble_step_notify_enabled = false;
  app_ble_fall_notify_enabled = false;
  app_ble_battery_notify_enabled = false;
  app_ble_status_notify_enabled = false;
}

void app_ble_update_step_count(uint32_t steps)
{
  uint8_t payload[3];
  sl_status_t status;

  if (!app_ble_enabled
      || app_ble_connection_handle == SL_BT_INVALID_CONNECTION_HANDLE
      || !app_ble_step_notify_enabled) {
    return;
  }

  payload[0] = (uint8_t)(steps & 0xFFu);
  payload[1] = (uint8_t)((steps >> 8) & 0xFFu);
  payload[2] = (uint8_t)((steps >> 16) & 0xFFu);

  status = sl_bt_gatt_server_send_notification(
      app_ble_connection_handle,
      gattdb_step_count,
      sizeof(payload),
      payload);
  app_ble_log_status(status, "notify_step_count");
}

void app_ble_notify_fall(void)
{
  uint8_t payload = 0x01u;
  sl_status_t status;

  if (!app_ble_enabled
      || app_ble_connection_handle == SL_BT_INVALID_CONNECTION_HANDLE
      || !app_ble_fall_notify_enabled) {
    return;
  }

  status = sl_bt_gatt_server_send_notification(
      app_ble_connection_handle,
      gattdb_fall_event,
      sizeof(payload),
      &payload);
  app_ble_log_status(status, "notify_fall_event");
}

void app_ble_notify_freefall(void)
{
  uint8_t payload = 0x02u;
  sl_status_t status;
  static uint32_t last_notify_tick = 0;
  uint32_t now_tick = sl_sleeptimer_get_tick_count();
  uint32_t freq = sl_sleeptimer_get_timer_frequency();

  if (!app_ble_enabled
      || app_ble_connection_handle == SL_BT_INVALID_CONNECTION_HANDLE
      || !app_ble_fall_notify_enabled) {
    return;
  }

  // Rate-limit freefall notifications to at most once per 2 seconds (2 * freq ticks)
  if (last_notify_tick != 0 && (now_tick - last_notify_tick) < (2 * freq)) {
    return;
  }
  last_notify_tick = now_tick;

  status = sl_bt_gatt_server_send_notification(
      app_ble_connection_handle,
      gattdb_fall_event,
      sizeof(payload),
      &payload);
  app_ble_log_status(status, "notify_freefall_event");
}

void app_ble_update_status(uint32_t steps, uint8_t battery_percent, uint8_t sensitivity)
{
  (void)steps;
  uint8_t payload[2];
  sl_status_t status;

  if (!app_ble_enabled
      || app_ble_connection_handle == SL_BT_INVALID_CONNECTION_HANDLE
      || !app_ble_status_notify_enabled) {
    return;
  }

  payload[0] = battery_percent;
  payload[1] = sensitivity;

  status = sl_bt_gatt_server_send_notification(
      app_ble_connection_handle,
      gattdb_device_status,
      sizeof(payload),
      payload);
  app_ble_log_status(status, "notify_device_status");
}

static void app_ble_handle_characteristic_status(sl_bt_msg_t *evt)
{
  uint16_t characteristic = evt->data.evt_gatt_server_characteristic_status.characteristic;
  uint16_t flags = evt->data.evt_gatt_server_characteristic_status.client_config_flags;

  if (characteristic == gattdb_step_count) {
    app_ble_step_notify_enabled = (flags & 0x0001u) != 0;
    if (app_ble_step_notify_enabled) {
      extern uint32_t app_get_step_count(void);
      app_ble_update_step_count(app_get_step_count());
    }
  } else if (characteristic == gattdb_fall_event) {
    app_ble_fall_notify_enabled = (flags & 0x0001u) != 0;
  } else if (characteristic == gattdb_battery_level) {
    app_ble_battery_notify_enabled = (flags & 0x0001u) != 0;
  } else if (characteristic == gattdb_device_status) {
    app_ble_status_notify_enabled = (flags & 0x0001u) != 0;
  }
}

static void app_ble_handle_user_read_request(sl_bt_msg_t *evt)
{
  uint16_t char_id = evt->data.evt_gatt_server_user_read_request.characteristic;
  uint8_t connection = evt->data.evt_gatt_server_user_read_request.connection;
  uint8_t response[3];
  size_t response_len = 0;

  if (char_id == gattdb_step_count) {
    extern uint32_t app_get_step_count(void);
    uint32_t steps = app_get_step_count();
    response[0] = (uint8_t)(steps & 0xFFu);
    response[1] = (uint8_t)((steps >> 8) & 0xFFu);
    response[2] = (uint8_t)((steps >> 16) & 0xFFu);
    response_len = 3;
  } else if (char_id == gattdb_battery_level) {
    response[0] = 75;
    response_len = 1;
  } else if (char_id == gattdb_device_status) {
    response[0] = 75;
    response[1] = 0;
    response_len = 2;
  }

  if (response_len > 0) {
    (void)sl_bt_gatt_server_send_user_read_response(
        connection,
        char_id,
        0,
        response_len,
        response,
        NULL);
  }
}

void sl_bt_on_event(sl_bt_msg_t *evt)
{
  sl_status_t status;

  switch (SL_BT_MSG_ID(evt->header)) {
    case sl_bt_evt_system_boot_id:
      app_log("[BLE] system boot\r\n");
      app_ble_init();
      break;

    case sl_bt_evt_connection_opened_id:
      app_ble_connection_handle = evt->data.evt_connection_opened.connection;
      app_ble_step_notify_enabled = false;
      app_ble_fall_notify_enabled = false;
      app_ble_battery_notify_enabled = false;
      app_ble_status_notify_enabled = false;
      app_log("[BLE] connected handle=%u\r\n", app_ble_connection_handle);
      break;

    case sl_bt_evt_connection_closed_id:
      app_log("[BLE] disconnected, reason: 0x%04X\r\n", evt->data.evt_connection_closed.reason);
      app_ble_connection_handle = SL_BT_INVALID_CONNECTION_HANDLE;
      app_ble_step_notify_enabled = false;
      app_ble_fall_notify_enabled = false;
      app_ble_battery_notify_enabled = false;
      app_ble_status_notify_enabled = false;
      if (app_ble_enabled) {
        status = sl_bt_legacy_advertiser_start(app_ble_advertiser_handle,
                                               sl_bt_legacy_advertiser_connectable);
        app_ble_log_status(status, "restart_advertising");
      }
      break;

    case sl_bt_evt_gatt_server_characteristic_status_id:
      app_ble_handle_characteristic_status(evt);
      break;

    case sl_bt_evt_gatt_server_user_read_request_id:
      app_ble_handle_user_read_request(evt);
      break;

    default:
      break;
  }
}
