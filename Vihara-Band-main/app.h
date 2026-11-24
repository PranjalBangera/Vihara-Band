/***************************************************************************//**
 * @file
 * @brief Top level application functions
 *******************************************************************************
 * # License
 * <b>Copyright 2020 Silicon Laboratories Inc. www.silabs.com</b>
 *******************************************************************************
 *
 * The licensor of this software is Silicon Laboratories Inc. Your use of this
 * software is governed by the terms of Silicon Labs Master Software License
 * Agreement (MSLA) available at
 * www.silabs.com/about-us/legal/master-software-license-agreement. This
 * software is distributed to you in Source Code format and is governed by the
 * sections of the MSLA applicable to Source Code.
 *
 ******************************************************************************/

#ifndef APP_H
#define APP_H

#include <stddef.h>
#include <stdint.h>

typedef struct {
  uint32_t steps;
  float distance_m;
  uint32_t active_minutes;
  uint32_t fall_state;
} app_activity_state_t;

/***************************************************************************//**
 * Initialize application.
 ******************************************************************************/
void app_init(void);

/***************************************************************************//**
 * App ticking function.
 ******************************************************************************/
void app_process_action(void);

/***************************************************************************//**
 * Retrieve the latest activity state for UI/BLE consumers.
 ******************************************************************************/
void app_get_activity_state(app_activity_state_t *state);

/***************************************************************************//**
 * Format a compact JSON payload containing the latest live activity state.
 ******************************************************************************/
void app_format_ble_payload(char *buffer, size_t buffer_size);

#endif // APP_H
