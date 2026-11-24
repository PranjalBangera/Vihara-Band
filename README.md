# VIHARA BAND
### Smart Wearable for Motion Monitoring, Step Counting & Fall Detection

<p align="center">
  <strong>Embedded Systems | TinyML | Bluetooth Low Energy | PCB Design | Mobile Application</strong>
</p>

Vihara Band is an embedded wearable prototype developed during an industrial internship at **Zilliot Technologies**. The project combines motion sensing, embedded signal processing, step counting, fall-event analysis using TinyML, Bluetooth Low Energy (BLE) communication, and a companion application.

The system is designed to monitor everyday physical activity and identify potential fall events, with the aim of providing useful activity information and an alert pathway through a connected device.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Hardware Components](#hardware-components)
- [Embedded Firmware](#embedded-firmware)
- [Step Counting Algorithm](#step-counting-algorithm)
- [Fall Detection Using TinyML](#fall-detection-using-tinyml)
- [Bluetooth Low Energy Communication](#bluetooth-low-energy-communication)
- [Companion Application](#companion-application)
- [PCB Design](#pcb-design)
- [Repository Structure](#repository-structure)
- [Software and Tools](#software-and-tools)
- [Getting Started](#getting-started)
- [Testing and Verification](#testing-and-verification)
- [Current Development Status](#current-development-status)
- [Future Improvements](#future-improvements)
- [Learning Outcomes](#learning-outcomes)
- [Project Information](#project-information)

---

## Project Overview

Wearable motion-monitoring devices can help users understand their daily activity and identify unusual movement patterns. However, accelerometer data contains normal body movement, wrist rotation, sudden impacts and other signals that can lead to incorrect step counts or false fall alerts.

Vihara Band addresses these challenges through two separate processing approaches:

1. **Deterministic step counting:** Uses acceleration magnitude, digital filtering, threshold hysteresis and cadence verification to identify walking steps.
2. **Fall-event analysis:** Uses a multi-stage event-detection pipeline, motion features and a compact TinyML classifier to distinguish potential falls from ordinary activities.

The wearable uses a Silicon Labs EFR32BG22 Bluetooth Low Energy microcontroller and a Bosch BMA400 three-axis accelerometer. Activity and event information can be transmitted to a companion application through BLE.

### Project Objectives

- Develop an embedded wearable motion-monitoring system.
- Acquire and process three-axis accelerometer data.
- Implement reliable step-counting logic.
- Estimate distance and active minutes from activity data.
- Develop a multi-stage fall-detection pipeline using TinyML.
- Communicate activity and event information through BLE.
- Design a compact wearable PCB.
- Develop a companion application for displaying activity information and handling alerts.

---

## Key Features

| Feature | Description |
|---|---|
| Motion monitoring | Three-axis acceleration sensing using BMA400 |
| Step counting | Filtered acceleration and cadence-based verification |
| Distance estimation | Estimated from accumulated steps and configured stride length |
| Active minutes | Activity-duration tracking |
| Fall analysis | Freefall-like event, impact, stillness and TinyML classification |
| Manual SOS | Hardware event path for a manual SOS trigger |
| BLE communication | Wireless transfer of step and event information |
| Data persistence | Step-count storage using Silicon Labs NVM3 |
| Companion application | Activity dashboard and connected-device interface |
| PCB development | Custom wearable hardware design using KiCad |

---

## System Architecture

The system is divided into four major sections:

- **Sensing layer:** Captures motion data using the BMA400 accelerometer.
- **Processing layer:** Performs filtering, step counting and fall-event analysis on the EFR32BG22.
- **Communication layer:** Transfers activity and event information through BLE GATT.
- **Application layer:** Displays information and provides user-facing features through the companion application.

```text
              VIHARA BAND WEARABLE
                      |
                      v
             Bosch BMA400 Sensor
              3-Axis Accelerometer
                      |
                      v
             I2C Sensor Interface
                      |
                      v
             Silicon Labs EFR32BG22
                      |
             +--------+---------+
             |                  |
             v                  v
       Step Counting       Fall Detection
       Signal Filtering    Event State Machine
       Cadence Checks      Feature Extraction
                           TinyML Classifier
             |                  |
             +--------+---------+
                      |
                      v
               BLE GATT Service
                      |
                      v
              Android / Web App
                      |
             +--------+---------+
             |                  |
             v                  v
        Activity Dashboard   Fall / SOS Alerts
```

---

## Hardware Components

The hardware design combines motion sensing, wireless communication, power management, external memory and debugging interfaces.

| Component | Purpose |
|---|---|
| Silicon Labs EFR32BG22 | Main BLE microcontroller and embedded processing unit |
| Bosch BMA400 | Three-axis MEMS accelerometer |
| IS25LP064A | External SPI Flash memory |
| MCP73831 | Single-cell Li-ion battery charging controller |
| TLV73330 | 3.0 V low-dropout regulator |
| 2.4 GHz antenna | BLE wireless communication |
| RGB LED | Visual status indication |
| SWD connector | Programming and debugging |

### Important Hardware Configuration

| Parameter | Documented configuration |
|---|---|
| Motion sensor | Bosch BMA400 |
| Sensor sampling rate | 100 Hz |
| Acceleration range | ±8g |
| Communication interface | I2C |
| I2C clock speed | 100 kbit/s |
| BMA400 address | 0x15 default; startup probes 0x14/0x15 |
| Wireless communication | Bluetooth Low Energy |
| Supply rail | 3.0 V |

*These values describe the documented project configuration. Actual hardware operation should be confirmed during board bring-up.*

---

## Embedded Firmware

The firmware is developed in **Embedded C** for the Silicon Labs EFR32BG22 platform.

It handles sensor initialization, motion acquisition, activity processing, fall-event analysis, BLE communication and non-volatile data storage.

### Main Firmware Responsibilities

- Initialize the microcontroller and required peripherals.
- Communicate with the BMA400 accelerometer through I2C.
- Acquire and process acceleration data.
- Calculate acceleration magnitude.
- Perform step detection and cadence verification.
- Estimate activity-related parameters.
- Run the fall-detection state machine and TinyML inference.
- Publish activity and event information over BLE.
- Store step-count information using NVM3.
- Handle sensor communication errors and device status.

### Important Firmware Files

| File | Purpose |
|---|---|
| `app.c` | Main application logic |
| `app.h` | Application declarations |
| `app_ble.c` | BLE communication functionality |
| `app_ble.h` | BLE declarations |
| `main.c` | Firmware entry point |
| `fall_model.h` | Generated TinyML model representation |
| `VIHARA_BAND.slcp` | Silicon Labs project configuration |
| `BLE_SETUP.md` | BLE setup and testing notes |
| `config/btconf/gatt_configuration.btconf` | BLE GATT configuration |

---

## Step Counting Algorithm

The step-counting module uses filtered acceleration magnitude rather than treating every acceleration threshold crossing as a valid step.

### Processing Flow

1. Read the three-axis acceleration values.
2. Calculate the acceleration magnitude.
3. Apply exponential moving average filtering.
4. Detect a candidate step using an upper threshold.
5. Apply a minimum time interval between candidates.
6. Re-arm detection using a lower threshold.
7. Confirm a group of candidates within a time window.
8. Update the total step count.

### Documented Algorithm Parameters

| Parameter | Value |
|---|---:|
| EMA coefficient | 0.3 |
| Upper step threshold | 10.7 m/s² |
| Lower step threshold | 9.2 m/s² |
| Minimum step interval | 280 ms |
| Cadence confirmation | 3 candidates within 1.6 seconds |

The use of separate upper and lower thresholds introduces hysteresis, helping reduce repeated detections caused by noisy acceleration signals.

The confirmed step total is used for distance estimation and activity tracking. Step-count persistence is handled through NVM3 with batched writes.

---

## Fall Detection Using TinyML

Fall detection is implemented as a multi-stage analysis pipeline rather than relying on a single high-acceleration threshold.

A sudden impact can occur during ordinary activities such as running, jumping, dropping an object or hitting a surface. Therefore, the system checks the sequence of motion events before classifying a potential fall.

### Fall Detection Pipeline

```text
       Accelerometer Data
               |
               v
       Freefall-Like Event
               |
               v
         Impact Detection
               |
               v
        Post-Impact Stillness
               |
               v
        Feature Extraction
               |
               v
       TinyML Classification
               |
               v
        Fall Event Decision
               |
               v
          BLE Notification
```

### Documented Detection Parameters

| Parameter | Value |
|---|---:|
| Freefall threshold | Below 6.2 m/s² |
| Minimum freefall duration | 80 ms |
| Impact threshold | At least 21.5 m/s² |
| Stillness evaluation | At least 1,000 ms |
| Movement timeout | 1,500 ms |
| Classifier | Three-tree ensemble |
| Maximum tree depth | 4 |
| Classification method | Majority voting |

### TinyML Model

The fall-analysis pipeline extracts five motion features and uses a compact three-tree ensemble classifier.

The model is designed for resource-constrained embedded hardware, reducing the need for a large external processing system.

The physical event sequence gates the classification process, helping distinguish potential fall patterns from ordinary movement.

**Important:** The model and detection pipeline are prototype implementations. Their real-world sensitivity, specificity and false-alarm rate require systematic testing with labeled data.

---

## Bluetooth Low Energy Communication

BLE is used to connect the wearable to the companion application.

The firmware exposes a custom GATT service containing characteristics for step information, fall events and device status.

### Custom GATT Configuration

| Attribute | UUID | Purpose |
|---|---|---|
| Custom service | `12340000-1234-1234-1234-123456789012` | Vihara Band service |
| Step characteristic | `12340001-1234-1234-1234-123456789012` | Step-count information |
| Fall characteristic | `12340002-1234-1234-1234-123456789012` | Fall-event information |
| Status characteristic | `12340003-1234-1234-1234-123456789012` | Device status information |

### Documented BLE Configuration

- Advertising interval: 500 ms.
- Requested connection interval: 30–60 ms.
- Step-count payload: 3-byte little-endian unsigned integer.
- Fall-event codes:
  - `0x01` – Fall event.
  - `0x02` – Freefall warning.
  - `0x03` – Manual SOS.

BLE notifications allow the connected client to receive updates from the wearable.

---

## Companion Application

The companion application provides the user-facing interface for the Vihara Band system.

It includes a web-based application and an Android application wrapper using Capacitor.

### Technologies Used

| Technology | Purpose |
|---|---|
| HTML5 | Application structure |
| CSS3 | User interface styling |
| JavaScript ES6+ | Application functionality |
| Vite | Development server and build tool |
| Capacitor | Native Android integration |
| Bluetooth LE plugin | BLE scanning and communication |
| Firebase Authentication | Google sign-in integration |
| Capacitor Preferences | Local application preferences |

### Application Features

- User onboarding and guest access.
- Google sign-in integration.
- Activity dashboard and step goals.
- Activity rings and progress indicators.
- BMI calculation.
- BLE device scanning and connection.
- Signal-strength indication.
- Device reconnection handling.
- Step and fall-event telemetry parsing.
- Fall-alert interface with a cancellation countdown.
- Audio and haptic alert functionality.
- Emergency-contact selection and phone/SMS intent integration.
- Activity streaks, badges and weekly trends.
- CSV activity export.
- Progressive Web App support and offline service-worker functionality.

Emergency-contact and SOS-related application features should be treated as alert workflows, not proof that an emergency message has been successfully delivered.

---

## PCB Design

The Vihara Band hardware is being developed as a compact wearable PCB using **KiCad**.

The PCB design incorporates the microcontroller, motion sensor, power-management circuit, external Flash memory, BLE antenna network and programming/debugging connections.

### PCB Design Details

| Parameter | Detail |
|---|---|
| PCB design tool | KiCad |
| Board dimensions | 40.15 mm × 20 mm |
| Layer count | 4-layer |
| Board material | FR4 |
| Main controller | EFR32BG22 |
| Motion sensor | BMA400 |
| Wireless interface | 2.4 GHz BLE antenna and matching network |

### PCB Design Subsystems

- Microcontroller and BLE RF section.
- Accelerometer interface.
- Battery charging and power regulation.
- External SPI Flash.
- Programming and debugging interface.
- Status LED circuitry.
- Antenna and RF matching network.

**PCB development status:** The supplied design review identifies outstanding electrical and routing issues, including unconnected nets and RF, power and ground-plane concerns. The board should therefore be considered a work in progress, not a fabrication-ready design. DRC closure, routing review, antenna validation and hardware bring-up are required before manufacturing.

---

## Repository Structure

The repository brings together the firmware, application and PCB design resources.

```text
Vihara-Band/
│
├── README.md
│
├── Vihara-Band-main/
│   ├── app.c
│   ├── app.h
│   ├── app_ble.c
│   ├── app_ble.h
│   ├── main.c
│   ├── fall_model.h
│   ├── config/
│   ├── web/
│   ├── BLE_SETUP.md
│   └── VIHARA_BAND.slcp
│
├── Vihara-Band-Application-main/
│   ├── src/
│   │   ├── index.html
│   │   ├── js/
│   │   ├── css/
│   │   └── sw.js
│   ├── android/
│   ├── package.json
│   ├── capacitor.config.json
│   └── README.md
│
├── updated pcb/
│   ├── KiCad project files
│   ├── Schematic files
│   ├── PCB layout files
│   ├── BOM/
│   ├── Gerber exports/
│   └── Design review files/
│
├── Zilliot_Internship.pdf
│
└── LICENSE
```

*The structure above is a simplified overview of the main project areas. Individual files and subfolders may vary.*

---

## Software and Tools

| Tool / Platform | Usage |
|---|---|
| Silicon Labs Simplicity Studio 6 | Embedded firmware development |
| Silicon Labs Simplicity SDK | MCU and BLE development environment |
| Embedded C | Firmware programming |
| KiCad | Schematic and PCB design |
| Visual Studio Code | Application development |
| Node.js and npm | Application dependencies and build |
| Vite | Web application development |
| Capacitor | Android application integration |
| Firebase | Authentication integration |
| Git and GitHub | Version control and project documentation |

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/PranjalBangera/Vihara-Band.git
cd Vihara-Band
```

### 2. Embedded Firmware

1. Install Silicon Labs Simplicity Studio 6.
2. Install the compatible Silicon Labs Simplicity SDK.
3. Import or open the firmware project using its `.slcp` project configuration.
4. Check the target MCU and board configuration.
5. Verify the BMA400 I2C connection and peripheral configuration.
6. Build the firmware.
7. Flash the firmware to compatible hardware using the supported programming/debugging interface.

### 3. Companion Application

Open a terminal inside the application directory:

```bash
cd Vihara-Band-Application-main
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Synchronize the Capacitor Android project:

```bash
npx cap sync android
```

The Android project can then be opened in Android Studio for device-specific configuration and testing.

### 4. PCB Design

1. Install KiCad.
2. Open the supplied KiCad project.
3. Inspect the schematic and PCB layout.
4. Review the component footprints and board configuration.
5. Resolve electrical-rule and design-rule violations.
6. Complete routing and ground-plane verification.
7. Validate the antenna and power circuitry before fabrication.

---

## Testing and Verification

Testing is essential for evaluating step-count reliability, fall-detection behaviour, wireless communication and power consumption.

The project report identifies the following recommended verification activities:

| Test Area | Verification Approach |
|---|---|
| Sensor acquisition | Compare accelerometer readings with known orientations and inspect sample continuity |
| Step counting | Test slow, normal and fast walking and compare against manually counted steps |
| False step rejection | Test hand gestures, typing, desk taps and other everyday activities |
| Fall detection | Conduct supervised, cushioned simulations and record detected events |
| Activity rejection | Test running, jumping, clapping and dropped-device scenarios |
| Data persistence | Reboot after step-count updates and verify restored values |
| BLE communication | Test connections, notification subscriptions and reconnection |
| Power consumption | Measure current in sleep, sensing, advertising and connected modes |
| Application SOS | Verify permissions, alert states and actual delivery status using designated test contacts |

### Verification Metrics

For a labeled fall and activity dataset, useful evaluation metrics include:

- Sensitivity.
- Specificity.
- Precision.
- False alarms per hour or day.
- Missed-event rate.
- Step-count error.
- BLE notification latency.
- Recovery after disconnection.
- Battery current in different operating modes.

The supplied project materials describe the implementation and recommended tests, but do not establish a complete independently measured validation dataset, confusion matrix, whole-device battery-life result or verified emergency-message delivery.

---

## Current Development Status

| Project Area | Status |
|---|---|
| Embedded firmware | Implemented prototype |
| BMA400 sensor integration | Firmware support implemented; hardware verification required |
| Step counting | Algorithm implemented |
| Fall-event analysis | Multi-stage pipeline and TinyML model implemented |
| BLE communication | Custom GATT implementation |
| Companion application | Application implementation available |
| PCB design | Under development; design issues remain |
| Full system validation | Further testing required |

### Important Hardware Configuration Note

The supplied firmware configuration references `EFR32BG22C224F512IM40`, while the PCB BOM lists `EFR32BG22C224F512GM32-C`.

These part-number differences should be checked against the actual selected component, package, pinout and board design before firmware deployment or PCB fabrication.

---

## Future Improvements

1. Collect ethically approved real-world accelerometer data from different users and wearable placements.
2. Improve fall classification using subject-independent training and evaluation.
3. Measure sensitivity, specificity, precision and false alarms per unit time.
4. Calibrate step thresholds and stride length using measured walking sessions.
5. Verify sensor timing, interrupt handling and axis conversion on the actual board.
6. Measure BLE notification latency and reconnection reliability.
7. Improve application-side data validation and connection recovery.
8. Verify SOS delivery states and emergency-contact workflows.
9. Measure complete-device power consumption and estimate battery life using actual battery capacity.
10. Complete PCB routing, DRC checks, antenna tuning and hardware bring-up.
11. Add structured diagnostic logs, watchdog recovery and persistent-record validation.

---

## Learning Outcomes

This project provided practical exposure to several areas of electronics and embedded-system development:

- Embedded C programming.
- Silicon Labs EFR32BG22 microcontroller development.
- I2C-based sensor communication.
- Accelerometer data acquisition and signal processing.
- Digital filtering and threshold hysteresis.
- Step-counting algorithm development.
- State-machine-based event detection.
- TinyML model integration on embedded hardware.
- Bluetooth Low Energy advertising and GATT communication.
- Non-volatile memory management using NVM3.
- Schematic interpretation and PCB design using KiCad.
- RF layout and power-management considerations.
- Web and Android application development.
- System testing, debugging and technical documentation.

---

## Project Information

| Detail | Information |
|---|---|
| Project | Vihara Band |
| Organization | Zilliot Technologies |
| Programme | Advanced Communication Technology |
| Institution | NMAM Institute of Technology, Nitte |
| Year | 2026 |
| Project type | Industrial Internship / Embedded Systems Project |

### Project Team

- Avinash Shetty
- Pramith Suvarna
- Pranjal Bangera
- Jostan Saldanha

### Company Mentors

- Mr Puneeth Salian
- Mrs Supriya Naik

---

## Disclaimer

Vihara Band is an academic and engineering prototype developed for learning and demonstration purposes. It is not a certified medical device and must not be relied upon as a guaranteed fall-detection or emergency-response system. Real-world deployment requires extensive validation, safety assessment, hardware verification and reliable emergency communication testing.

---

<p align="center">
  <strong>Vihara Band — Connecting Embedded Intelligence with Wearable Technology.</strong>
</p>
