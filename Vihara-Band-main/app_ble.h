#ifndef APP_BLE_H
#define APP_BLE_H

#include <stdint.h>

void app_ble_init(void);
void app_ble_deinit(void);
void app_ble_update_step_count(uint32_t steps);
void app_ble_notify_fall(void);
void app_ble_notify_freefall(void);
void app_ble_update_status(uint32_t steps, uint8_t battery_percent, uint8_t sensitivity);

#endif
