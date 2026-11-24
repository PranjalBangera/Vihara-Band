# Simplicity Studio BLE setup for Vihara Band

Use this checklist to get live step-count and fall-detection reporting working from the current project.

## 1) Project components
In Simplicity Studio, ensure the project includes:
- Bluetooth Stack
- I2CSPM
- Simple Timer (app_timer) or the equivalent scheduler used by your firmware
- Log

## 2) GATT configuration
Create or import the GATT definition from:
- [config/btconf/gatt_configuration.btconf](config/btconf/gatt_configuration.btconf)

This defines:
- Service UUID: 12340000-1234-1234-1234-123456789012
- Step characteristic UUID: 12340001-1234-1234-1234-123456789012
- Fall characteristic UUID: 12340002-1234-1234-1234-123456789012
- Status characteristic UUID: 12340003-1234-1234-1234-123456789012

## 3) Device name
Make sure the firmware writes the device name exactly as:
- Vihara Band

## 4) Firmware behavior to implement
The app should:
1. Initialize the BMA400 over I2C
2. Read step count periodically
3. Send step count notifications on the step characteristic
4. Trigger a fall notification on the fall characteristic when a fall event is detected

## 5) Testing
After flashing:
- Scan for Vihara Band in a Chrome browser
- Connect using Web Bluetooth
- Subscribe to the step and fall characteristics
- Move the board to generate steps and shake/drop it to trigger the fall path
