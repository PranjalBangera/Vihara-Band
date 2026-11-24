# Design Review: Medical Wearable Patch

**Date:** 2026-10-03  
**Target Hardware:** Silicon Labs EFR32BG22C224F512GM32-C (Cortex-M33 BLE 5.2 SoC), Bosch BMA400 Accelerometer, ISSI IS25LP064A 64Mb SPI Flash, Microchip MCP73831 Li-Ion Charger, TI TLV73330 LDO.  
**Review Scope:** Schematic connectivity, datasheet specification compliance, component values, power delivery, RF front-end matching, clock generation, peripheral buses, and PCB layout status.

---

## 1. What is Done Well

- **EFR32BG22 DC-DC Buck Converter Topology:**
  - The internal DC-DC converter is properly connected with a 2.2 µH power inductor (L5) between switching pin `VREGSW` (Pin 25) and `DVDD` / `VDCDC` (Pin 28).
  - Bulk and high-frequency bypass capacitance on `VDCDC` is correctly provisioned using C15 (4.7 µF) and C13 (100 nF), matching Silicon Labs AN0002.2 application notes.
  - Core digital regulator pin `DECOUPLE` (Pin 24) is terminated with an exact 1.0 µF low-ESR ceramic capacitor (C9) to GND.

- **Dedicated RF Power Rail Filtering:**
  - High-frequency power noise isolation is implemented using Wurth ferrite beads (WE-CBF 742692004): L1 filters `VDCDC` to `RFVDD` (Pin 10) with local bypass C3 (100 nF) and C4 (120 pF); L3 filters `VDCDC` to `PAVDD` (Pin 13) with local bypass C6 (100 nF) and C7 (120 pF). This follows Silicon Labs recommendations for low phase-noise and clean harmonic suppression.

- **38.4 MHz HFXO Oscillator Implementation:**
  - High-frequency oscillator crystal Y1 (Abracon ABM8-38.400MHZ-10-B1U-T) is correctly connected across `HFXTAL_I` (Pin 7) and `HFXTAL_O` (Pin 8) with ground pads 2 & 4 tied to system GND.
  - The design correctly relies on the EFR32BG22 on-chip programmable load capacitors (CTUNE). Because the ABM8 crystal has a load capacitance $C_L = 10\text{ pF}$ (which is below the 12 pF threshold requiring external capacitors), external fixed capacitors are avoided, reducing PCB parasitic loading.

- **Silicon Labs Mini Simplicity Debug Connector (J5):**
  - J5 (Samtec FTSH-105-01-L-DV-K 10-pin 1.27 mm micro-header) strictly follows the Silicon Labs Mini Simplicity pinout (AN958):
    - Pin 1: `VTARGET` (`3V`)
    - Pin 2: `GND`
    - Pin 3: `RST` (`RESETN`)
    - Pin 6: `SWO` (PA03)
    - Pin 7: `SWDIO` (PA02)
    - Pin 8: `SWCLK` (PA01)

- **IS25LP064A SPI NOR Flash Bus:**
  - Flash memory U5 is correctly wired for standard SPI: `~CE` (PB02), `SCK` (PB01), `SI/IO0` (PC05), and `SO/IO1` (PA00).
  - Dedicated 10 kΩ pull-up resistors R3 (`~WP`) and R8 (`~HOLD`) to `3V` prevent unintended write-protect or interface-suspend states.
  - Decoupling capacitor C27 (100 nF) is placed locally on `VCC` (Pin 8).

- **BMA400 Motion Sensor Interface:**
  - Pin 10 (`CSB`) is tied to `3V`, configuring the device in I2C communication mode.
  - Pin 1 (`SDO`) is tied to GND, setting the 7-bit I2C device address to `0x14`.
  - Independent 100 nF decoupling capacitors are placed on both `VDD` (C1) and `VDDIO` (C20).
  - Standard 4.7 kΩ pull-up resistors (R9, R10) are populated on `SCL` and `SDA`.
  - Motion interrupt output `INT1` is routed to MCU GPIO PC04.

- **RF Impedance Matching Topology:**
  - The 2.4 GHz RF matching and harmonic filter network follows Silicon Labs AN930.2 reference values: shunt C5 (1.2 pF), series L2 (2.6 nH), shunt C8 (18 pF), series C10 (1.3 pF), followed by antenna tuning elements shunt C11 (1.5 pF) and series L4 (1.5 nH) to chip antenna ANT1 (Johanson 2450AT18D0100E).

---

## 2. Prioritized Fix List

| Priority | Subsystem | Severity | Issue Summary |
|---|---|---|---|
| **1** | MCU Core | **CRITICAL** | Pin 29 (`AVDD`) is completely floating (unconnected). |
| **2** | Oscillator | **CRITICAL** | 32.768 kHz LFXO capacitors C25/C26 are 100 nF (10,000x too large). |
| **3** | Power/Safety | **CRITICAL** | 4.2V Li-ion charger connected to generic header while CR1220 primary cell is in project. |
| **4** | Indicators | **HIGH** | Green and Blue RGB LEDs starved by 3.0V supply ($V_f = 3.1\text{ V}$). |
| **5** | Reset Circuit | **HIGH** | Reset button SW1 has 10 kΩ in series to GND; reset cap C2 is 1 µF. |
| **6** | RF Front-End | **HIGH** | 2.4 GHz RF matching capacitors use 0603 packages instead of 0402/0201. |
| **7** | Sensors | **HIGH** | Temperature sensor (TMP117 / AS6221) is missing from the schematic. |
| **8** | Power Management | **MEDIUM** | Direct battery connection lacks power-path management (load sharing). |
| **9** | Power Telemetry | **MEDIUM** | No battery voltage divider connected to MCU ADC for state-of-charge tracking. |
| **10** | Charger Telemetry| **MEDIUM** | MCP73831 charge status pin `STAT` is unconnected. |
| **11** | Debug Interface | **MEDIUM** | Mini Simplicity VCOM UART lines (pins 4 & 5) are unconnected. |
| **12** | PCB Layout | **LOW** | Board outline missing on Edge.Cuts layer; 128 unrouted pads. |

---

### Detailed Analysis and Actionable Recommendations

#### Fix 1: Connect EFR32BG22 Pin 29 (`AVDD`) to the 3V Rail (Critical)
- **Problem:** Netlist analysis reveals `Net unconnected-(IC2-AVDD-Pad29) : IC2.29(AVDD_29)`. EFR32BG22 Pin 29 (`AVDD`) is completely unconnected. AVDD powers the analog circuitry, internal bandgap references, power-on reset (POR), brown-out detectors (BOD), and oscillator analog drivers (HFXO and LFXO).
- **Consequence:** The MCU will either stay held in hard reset, trigger brownout, or fail to start the oscillator clocks. The board will not boot.
- **Actionable Fix:** Connect Pin 29 (`AVDD`) directly to the `/BG22/3V` net. Place a dedicated 100 nF ceramic capacitor (and optional 10 µF bulk) immediately adjacent to Pin 29 referenced to the ground paddle (Pin 33).

#### Fix 2: Correct 32.768 kHz LFXO Load Capacitors C25 & C26 (Critical)
- **Problem:** Capacitors C25 and C26 on nets `LFXO_IN` (PD00) and `LFXO_OUT` (PD01) have schematic values of **100 nF** (0.1 µF). 
- **Consequence:** At 32.768 kHz, a 100 nF capacitor has an impedance of $X_C = \frac{1}{2\pi f C} \approx 48.5\ \Omega$. This essentially grounds both crystal pins, killing oscillator transconductance and preventing the 32.768 kHz oscillator from running.
- **Actionable Fix:** The EFR32BG22 features integrated on-chip tunable capacitance (`CAPTUNE`). Mark C25 and C26 as DNP (Do Not Populate) or delete them to use internal tuning. If external load capacitors are preferred, replace C25 and C26 with **10 pF to 18 pF** (C0G/NP0 dielectric) calculated from the crystal load specification: $C_{\text{ext}} = 2 \times (C_L - C_{\text{stray}})$.

#### Fix 3: Resolve Battery Chemistry & Charging Safety Hazard (Critical)
- **Problem:** The workspace contains footprints and symbols for a **CR1220 primary lithium coin cell** (non-rechargeable 3.0V), but the power circuit integrates an **MCP73831-2-MC 4.20V linear Li-Ion charger** feeding J2 (`V_BAT`) at 100 mA.
- **Consequence:** If a user connects a standard primary CR1220 coin cell into J2 while 5V is plugged into J4, the charger will push 100 mA at 4.2V into the non-rechargeable lithium cell, resulting in electrolyte leakage, thermal runaway, or explosion.
- **Actionable Fix:**
  - *If rechargeable Li-ion/Li-poly is intended:* Replace J2 with a polarized, keyed micro-connector (e.g. JST-SH or Molex PicoBlade) clearly labeled "3.7V LiPo Only", remove the unused CR1220 footprint, and ensure battery cell capacity is rated for 100 mA charge current (≥ 100 mAh, 1C rating).
  - *If CR1220 primary coin cell is intended:* Remove charger IC U2 and 5V input connector J4. Feed the coin cell directly through a reverse-polarity protection Schottky diode (or P-FET) to the LDO input, or power the 3.0V system directly from the coin cell.

#### Fix 4: Increase LDO Voltage from 3.0V to 3.3V to Prevent LED Starvation (High)
- **Problem:** D1 is a common-anode RGB LED (Kingbright APFA3010LSEEZGKQBKC) with its anode tied to `3V` (regulated 3.0V from TLV73330PDBV) and cathodes driven through 330 Ω resistors by PC00, PC01, PC02. Per Kingbright datasheet, the typical forward voltage is **3.1 V for Green (ZGK)** and **3.1 V for Blue (QBK)** (maximum 3.4 V).
- **Consequence:** Because $V_{\text{rail}} (3.0\text{ V}) < V_f (3.1\text{ V})$, there is zero voltage headroom across the 330 Ω series resistor. Green and Blue LEDs will fail to turn on or will exhibit extremely faint emission.
- **Actionable Fix:** Replace U3 (TLV73330PDBV) with **TLV73333PDBV (3.3V output)**. All connected active ICs (EFR32BG22: 1.71V–3.8V, BMA400: 1.71V–3.6V, IS25LP064A: 2.3V–3.6V) are fully rated for 3.3V. With a 3.3V rail, $V_{\text{res}} = 3.3\text{ V} - 3.1\text{ V} = 0.2\text{ V}$; replacing R5 and R7 with **100 Ω – 150 Ω** will yield a bright, balanced ~1.5–2.0 mA drive current.

#### Fix 5: Redesign Reset Switch Circuitry and Reduce C2 Capacitance (High)
- **Problem:**
  1. Resistor R4 (10 kΩ) is wired in series between push button SW1 Pin 1 and GND. When SW1 is closed, `RESETN` is pulled to GND through 10 kΩ against the MCU's internal ~40 kΩ pull-up, establishing a voltage divider of $V_{\text{reset}} = 3.0\text{ V} \times \frac{10\text{ k}\Omega}{40\text{ k}\Omega + 10\text{ k}\Omega} = 0.60\text{ V}$. This falls on the borderline of the maximum $V_{IL}$ threshold ($0.2 \times V_{DD} = 0.60\text{ V}$), risking failure to reset.
  2. Capacitor C2 on `RESETN` is **1.0 µF**. The resulting RC time constant ($\tau = 40\text{ k}\Omega \times 1\text{ µF} = 40\text{ ms}$) causes a rise time in excess of 100 ms.
- **Consequence:** Push button resets are intermittent or non-functional. Debuggers (Segger J-Link / Simplicity Link) will timeout or fail during hardware reset assertion.
- **Actionable Fix:** Connect SW1 directly to GND (replace R4 with a 0 Ω jumper or short SW1 to GND). Reduce C2 from 1.0 µF to **10 nF – 100 nF** per Silicon Labs hardware design guidelines.

#### Fix 6: Change RF Matching Capacitor Footprints to 0402 (High)
- **Problem:** Capacitors C5 (1.2 pF), C8 (18 pF), C10 (1.3 pF), and C11 (1.5 pF) in the 2.45 GHz matching circuit are specified with `Capacitor_SMD:C_0603_1608Metric` footprints.
- **Consequence:** At 2.4 GHz, 0603 packages exhibit parasitic series inductance of ~0.8 to 1.2 nH and larger pad shunt capacitance, completely detuning the sensitive LC pi-network, causing severe insertion loss, and reducing BLE radiated power and receiver sensitivity.
- **Actionable Fix:** Update C5, C8, C10, and C11 footprints to **0402 (1005 Metric)** (matching inductors L2 and L4) or **0201 (0603 Metric)**.

#### Fix 7: Re-introduce Missing Temperature Sensor (High)
- **Problem:** The schematic sheet is named `Temperature_Sensor`, but the symbol placed inside is U1 (BMA400 accelerometer). The temperature sensor footprint (`TMP117MAIDRVR` or `AS6221`) originally present in older project revisions is completely absent from the current schematic and netlist.
- **Actionable Fix:** Add the TMP117 (or AS6221) symbol to the I2C bus: connect `SDA` to `/BG22/SDA`, `SCL` to `/BG22/SCL`, `V+` to `3V`, and `GND` to `GND`. Set `ADD0` to GND (I2C address `0x48`, preventing conflict with BMA400 at `0x14`). Route the TMP117 `ALERT` pin to an unused MCU GPIO (e.g., PC03 or PA05).

#### Fix 8: Implement Load Sharing / Power-Path Circuitry (Medium)
- **Problem:** Charger output (`V_BAT`) and LDO input (`IN`) are hardwired together. If the system draws more than the charger termination threshold current ($I_{\text{TERM}} = 7.5\%\times 100\text{ mA} = 7.5\text{ mA}$) during operation, the MCP73831 will never terminate charging, maintaining the battery indefinitely at 4.2V.
- **Actionable Fix:** Implement a standard 3-component power-path circuit (P-channel MOSFET e.g. DMG2305UX, Schottky diode e.g. B0520W, and 100 kΩ gate pull-down) between 5V, Battery, and LDO input. When 5V is connected, the P-FET disconnects the battery from the load while 5V powers the LDO and charges the battery independently.

#### Fix 9: Add Battery Voltage Telemetry Divider to MCU ADC (Medium)
- **Problem:** The battery net `Net-(J2-Pin_1)` has no connection to the EFR32BG22. The firmware cannot measure battery voltage or broadcast state-of-charge warnings.
- **Actionable Fix:** Route `V_BAT` to an unused analog-capable pin (e.g. PC03) through a high-resistance voltage divider (e.g., two 1 MΩ resistors with a 10 nF filter cap, or an N-FET switched divider to eliminate standby leakage).

#### Fix 10: Wire Charger STAT Pin (Medium)
- **Problem:** MCP73831 Pin 5 (`STAT`) is floating. Neither the user nor the MCU can determine if the battery is actively charging or fully charged.
- **Actionable Fix:** Connect Pin 5 (`STAT`) to a charging indicator LED with current-limiting resistor to 5V, or route it to an available GPIO (e.g. PB00) with a pull-up resistor.

#### Fix 11: Route Mini Simplicity Virtual COM UART (Medium)
- **Problem:** Pins 4 (`VCOM_RX`) and 5 (`VCOM_TX`) on header J5 are left unconnected.
- **Actionable Fix:** Connect J5 Pin 4 and Pin 5 to available MCU pins (e.g. PB00 and PC03 configured as EUART0/USART0 TX/RX) to enable direct serial console and debugging via Simplicity Studio without external adapters.

#### Fix 12: Complete PCB Board Outline & Routing (Low)
- **Problem:** `Medical Wearable Patch recovered.kicad_pcb` lacks an Edge.Cuts boundary outline (triggering DRC error `[invalid_outline]`), and all 54 footprints remain in unrouted placement staging (128 open ratlines).
- **Actionable Fix:** Draw the mechanical board outline on Edge.Cuts, define a 4-layer stackup (Top Signal - Ground - Power - Bottom Signal) for proper 50 Ω coplanar waveguide routing to ANT1, place decoupling capacitors directly against IC pins, and route all copper tracks.
