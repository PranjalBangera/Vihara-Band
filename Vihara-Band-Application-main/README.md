# Vihara Band Companion App

[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20Web%20PWA-teal.svg)](#)
[![Capacitor](https://img.shields.io/badge/Capacitor-v8.4.1-blue.svg)](https://capacitorjs.com/)
[![Vite](https://img.shields.io/badge/Vite-v8.1.3-purple.svg)](https://vite.dev/)
[![BLE](https://img.shields.io/badge/Bluetooth-LE%205.0-0080FF.svg)](#)
[![Firebase](https://img.shields.io/badge/Firebase-v12.19.0-orange.svg)](https://firebase.google.com/)

A modern, high-performance cross-platform mobile companion application for the **Vihara Band** wearable IoT health and fall-detection device. Built using a high-efficiency hybrid mobile architecture (Vite, Capacitor 8, Vanilla HTML5/CSS3/ES6+), featuring glassmorphic aesthetics, real-time Bluetooth Low Energy (BLE) health telemetry, automated fall detection with emergency SOS dispatch, Firebase authentication, dynamic body metric intelligence, and automated Android packaging pipelines.

---

## 🌟 Key Features

### 🎨 Modern Glassmorphic Dark UI & Onboarding
*   **Intuitive Welcome Screen:** Interactive onboarding screen introducing key features with guest browsing or Google sign-in.
*   **Interactive Activity Rings:** Dynamic SVG activity rings tracking daily steps, estimated active minutes, and calories burned with smooth animation triggers.
*   **Live Completion Feedback:** Profile completion progress bar with contextual guidance prompts.

### 🔐 Authentication & Profile Intelligence
*   **Google Sign-In & Guest Mode:** Native Google Authentication powered by `@capacitor-firebase/authentication` backed by Firebase BOM, alongside seamless guest mode support.
*   **Dynamic BMI Engine:** Real-time Body Mass Index (BMI) calculation based on user height (cm) and weight (kg), featuring categorized color-coded pill indicators (*Underweight*, *Normal*, *Overweight*) and health guidance.
*   **Smart Step Goals with Science Hints:** Step target presets (5,000 Light, 8,000 Longevity Sweet Spot, 10,000 Classic, 12,500 High Endurance) and fine-grained stepper adjustments with dynamic calorie-burn estimations.

### 📡 Bluetooth Low Energy (BLE) Telemetry
*   **Device Scanner & RSSI Indicator:** Real-time BLE peripheral scanner filtering for Vihara Band hardware with live signal strength (RSSI) badges and connection status feedback.
*   **Automatic Reconnection:** Intelligent background listener that detects connection drops and automatically executes auto-reconnect retry cycles.
*   **Hardware Telemetry Parser:** Decodes real-time band sensor telemetry, including step counts, fall detection events, and battery level diagnostics.
*   **Bluetooth State Guard:** System prompt modal notifying users if Bluetooth is turned off, with a one-click intent to enable Bluetooth on supported devices.

### 🚨 Emergency SOS & Fall Dispatch System
*   **Instant Fall Alert Response:** Detects fall telemetry from the Vihara Band and automatically opens a high-visibility SOS alert overlay with a 5-second cancel buffer.
*   **Haptic & Audio Alerts:** Triggered emergency state engages distinctive multi-pulse vibration patterns (`navigator.vibrate`) and audio sirens.
*   **Automated Emergency Dialing:** One-click phone intent (`tel:`) to instantly call designated emergency contacts.
*   **Broadcast SMS Dispatch:** One-click SMS intent (`sms:`) pre-formatted with emergency alert details and GPS coordinates.

### 📇 Emergency Contacts with Native Address Book Picker
*   **Device Contacts Integration:** Integrates native device contact picker via `@capacitor-community/contacts` allowing direct selection of emergency contacts from the phone's address book.
*   **Encrypted Local Persistence:** Contacts and priority order stored securely on-device using `@capacitor/preferences`.

### 🏆 Gamification, Badges & Streaks
*   **Activity Streaks:** Tracks consecutive days meeting step targets.
*   **Weekly Metric Trends:** Interactive 7-day health trend chart displaying activity history.
*   **Milestone Badges:** Unlockable achievement badges rewarding consistency and safety configuration (*First Step*, *Goal Crusher*, *Streak Warrior*, *SOS Sentinel*).

### 📊 Data Export & PWA Support
*   **CSV Telemetry Export:** Export raw activity and telemetry history directly to CSV format via `@capacitor/filesystem` and `@capacitor/share`.
*   **PWA & Offline Service Worker:** Custom Service Worker (`src/sw.js`) implementing a cache-first strategy for instant offline launches and low-latency startup.

---

## 🛠️ Tech Stack & Dependencies

| Layer | Technology | Details / Purpose |
| :--- | :--- | :--- |
| **Frontend Core** | HTML5, CSS3, ES6+ JavaScript | Lightweight, zero-framework overhead, glassmorphic UI |
| **Build Bundler** | [Vite 8](https://vite.dev/) | Ultra-fast bundling, ES module compilation, asset optimization |
| **Native Wrapper** | [Capacitor 8](https://capacitorjs.com/) | Native Android runtime bridge and hardware API integration |
| **BLE Communication** | `@capacitor-community/bluetooth-le` | BLE scanning, GATT connection, telemetry subscriptions |
| **Authentication** | `@capacitor-firebase/authentication`, `firebase` | Google OAuth and Firebase authentication |
| **Device Contacts** | `@capacitor-community/contacts` | Native phone address book picker |
| **Data Persistence** | `@capacitor/preferences` | Key-value encrypted local storage |
| **File Sharing** | `@capacitor/filesystem`, `@capacitor/share` | Health data report generation and CSV export |
| **Network & App State**| `@capacitor/app`, `@capacitor/network` | App lifecycle and online/offline status monitoring |

---

## 📁 Directory Structure

```text
├── android/                             # Native Android wrapper project (Capacitor)
│   ├── app/
│   │   ├── build.gradle                 # App-level Gradle build configuration & dependencies
│   │   ├── google-services.json         # Firebase project configuration (com.viharaband.companion)
│   │   └── src/main/
│   │       ├── AndroidManifest.xml      # Permissions (Bluetooth LE, Contacts, Vibrate)
│   │       └── res/                     # Adaptive launcher icons, splash screens, layouts
│   ├── build.gradle                     # Top-level Gradle configuration
│   └── variables.gradle                 # Android dependency version mappings
├── dist/                                # Compiled production web assets
├── src/                                 # Web application source files
│   ├── css/
│   │   └── style.css                    # Glassmorphism design system & responsive styling
│   ├── js/
│   │   └── main.js                      # Core application logic, BLE, Auth, SOS, Metrics
│   ├── public/
│   │   └── icons/                       # High-resolution PWA and web icons (192px, 512px)
│   ├── index.html                       # Main HTML5 application root entrypoint
│   ├── manifest.json                    # PWA installation manifest
│   └── sw.js                            # Offline Service Worker cache implementation
├── build_and_bump.py                    # Automated Android compilation and versioning pipeline
├── capacitor.config.json                # Capacitor application & plugin configuration
├── generate_app_icons.py                # Asset generator script for Android and PWA icons
├── package.json                         # Node.js project dependencies and scripts
├── start.bat                            # Windows quick-launch dev server helper
└── vite.config.js                       # Vite bundler build settings
```

---

## 📋 Prerequisites

Ensure your development environment meets the following requirements:
1.  **Node.js**: `v18.x` or `v20.x+` (recommended: latest LTS) and `npm`.
2.  **Python 3**: For build automation (`build_and_bump.py`, `generate_app_icons.py`) and local testing.
3.  **Android Studio**: Android SDK command-line tools, platform-tools, and SDK Build-Tools 34+.
4.  **Java Development Kit (JDK)**: JDK 17 or JDK 21.

---

## 🚀 Getting Started & Local Development

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/jostansaldanha58-gif/Vihara-Band-Application.git
cd Vihara-Band-Application
npm install
```

### 2. Run Local Development Server
To launch and test the web application locally in your browser:

*   **Option A: Vite Dev Server (Recommended)**
    ```bash
    npm run dev
    ```
*   **Option B: Quick Start Batch Script (Windows)**
    Double-click `start.bat` or run:
    ```bash
    .\start.bat
    ```
*   **Option C: Python HTTP Server**
    ```bash
    python -m http.server 5173
    ```

---

## 📦 Building the Android APK

The project includes an end-to-end automation pipeline script [`build_and_bump.py`](build_and_bump.py) that:
1. Automatically detects your machine's `JAVA_HOME` and `ANDROID_HOME` paths (including Android Studio and Simplicity Studio JDK environments).
2. Automatically increments the Android `versionCode` and `versionName` in `android/app/build.gradle` using the current epoch timestamp.
3. Compiles production web assets via `vite build` into `dist/`.
4. Executes `npx cap sync android` to synchronize web assets and plugin configurations with the Android project.
5. Invokes Gradle to compile an installable debug APK.

### Automated Build Command:
```bash
python build_and_bump.py
```

### Manual Build Steps:
If you prefer building step-by-step:
```bash
# 1. Bundle web assets
npm run build

# 2. Sync assets with native Android project
npx cap sync android

# 3. Compile Debug APK via Gradle
cd android
.\gradlew.bat assembleDebug
cd ..
```

The compiled APK will be located at:
```text
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🔐 Android Permissions & Setup

The Android manifest (`android/app/src/main/AndroidManifest.xml`) declares the following permissions required for operation:

*   `android.permission.BLUETOOTH_SCAN` & `BLUETOOTH_CONNECT`: To discover, pair, and communicate with the Vihara Band hardware.
*   `android.permission.ACCESS_FINE_LOCATION`: Required by Android OS for BLE beacon and peripheral discovery.
*   `android.permission.READ_CONTACTS` & `WRITE_CONTACTS`: Used by the native contact picker for emergency SOS contact selection.
*   `android.permission.VIBRATE`: Provides haptic feedback patterns during fall alerts and notifications.

### Firebase Configuration
The Google Authentication module requires `android/app/google-services.json`. Ensure this file is present and matches your Firebase application package name (`com.viharaband.companion`).

---

## 📝 Recent Improvements & Changelog

*   **Firebase Google Auth Integration:** Fully integrated `@capacitor-firebase/authentication` with native OAuth client support.
*   **Automated Environment Resolution:** Updated `build_and_bump.py` to auto-detect JDK and Android SDK installations dynamically without manual hardcoding.
*   **Enhanced Fall & SOS Safety System:** Added automated calling (`tel:`), broadcast SMS (`sms:`), and persistent haptic feedback patterns.
*   **Native Device Contacts Picker:** Replaced manual text entry with native phone address book selection via `@capacitor-community/contacts`.
*   **Comprehensive Health Profiler:** Added BMI calculator with health status classification and science-backed daily step goal presets.
*   **High-Resolution App Icons:** Upgraded all Android mipmap densities (`mdpi` to `xxxhdpi`) and web PWA icons to modern adaptive squircles.
*   **PWA Cache Resilience:** Updated Service Worker cache to `vihara-cache-v3` with network-first fallback during local development.
