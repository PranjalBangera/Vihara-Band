# Multidisciplinary PCB Design Review: Medical Wearable Patch (Updated Layout)

**Date:** 2026-10-17  
**Design Artifacts Reviewed:** `Medical Wearable Patch recovered.kicad_pcb`, `Medical Wearable Patch recovered.kicad_pro`, `Medical Wearable Patch.kicad_sch`  
**Board Geometry:** 40.15 mm x 20.00 mm rounded rectangular board outline on Edge.Cuts  
**Stackup:** 4-Layer FR4 (1.58 mm nominal): F.Cu (Top Signal) / In1.Cu (Internal) / In2.Cu (Internal) / B.Cu (Bottom Signal)  
**Silicon / Modules:** Silicon Labs EFR32BG22C224F512GM32-C (BLE 5.2 SoC), Bosch BMA400 (LGA-12 Accelerometer), ISSI IS25LP064A (SON-8 SPI Flash), Microchip MCP73831 (DFN-8 Li-Ion Charger), TI TLV73330PDBV (SOT-23-5 LDO), Johanson 2450AT18D0100E (2.4 GHz Chip Antenna).  
**DRC Status:** 15 Errors, 4 Warnings, 14 Unconnected Items (via `kicad-cli pcb drc`).  
**Readiness Assessment:** **NOT READY FOR FABRICATION** (Critical functional blockers, severe assembly bridge risks, and absence of solid ground planes).

---

## 1. Executive Summary

A comprehensive automated and manual design audit of the updated PCB layout (`Medical Wearable Patch recovered.kicad_pcb`) was performed across Design Rule Checks (DRC), layer stackup, power distribution (PDN), signal integrity (SI), RF front-end architecture, thermal dissipation, and manufacturing/assembly (DFM/DFA) rules. 

While the 32.768 kHz LFXO capacitors (C25/C26) have been adjusted from 100 nF to 18 pF, the board exhibits several fatal design defects:
1. **Unconnected Critical Signals:** The 38.4 MHz crystal input (`X1`), the 2.4 GHz RF feed line to the chip antenna (`RF3`), SPI Flash `MOSI`, and SWD debug lines (`SWO`, `SWDIO`) are unrouted or broken.
2. **Missing Ground Planes:** The 4-layer board contains zero copper ground pours. In1.Cu and In2.Cu are routed as sparse signal tracks instead of continuous ground/power planes, completely destroying 50 ohm microstrip RF impedance matching and creating large inductive ground loops.
3. **Severe Assembly Solder-Mask Bridges:** 13 solder mask aperture violations will cause direct solder bridging during reflow across the SPI Flash, debug header, charger IC, and reset switch.
4. **Thermal & Grounding Choke on MCU:** The central ground/thermal paddle of the EFR32BG22 QFN-32 has zero thermal vias and is tied to ground solely through a hair-thin 0.16 mm trace.

---

## 2. Critical Findings (Must Fix Before Fabrication)

| ID | Domain | Severity | Location | Description & Mechanism | Consequence |
|---|---|---|---|---|---|
| **CRIT-01** | Clock / MCU | **CRITICAL** | Y1 Pin 1 / IC2 Pin 7 | Net `/BG22/X1` is completely unrouted between 38.4 MHz crystal Y1 (Pad 1) and EFR32BG22 Pin 7. | HFXO oscillator will not start. The CPU cannot enter high-performance mode and the 2.4 GHz BLE radio cannot operate. |
| **CRIT-02** | RF / Antenna | **CRITICAL** | ANT1 Pad 4 / L4 Pad 1 | Net `/BG22/RF3` between matching inductor L4 and chip antenna ANT1 is unrouted (open circuit). In addition, ANT1 GND pads (1, 2, 3) are disconnected from system ground. | Zero RF power delivery to the antenna. BLE radio cannot transmit or receive. |
| **CRIT-03** | PDN / SI | **CRITICAL** | Board-wide (All layers) | Zero copper pour zones exist on the board. In1.Cu (58 segments) and In2.Cu (17 segments) contain sparse traces rather than solid ground/power planes. Ground is routed exclusively via 0.16 mm traces. | No return path or reference plane for 2.4 GHz RF traces (impedance is undefined, causing high reflections). Massive return loop inductances across all digital switching signals (SPI, I2C, clocks). Decoupling capacitors are rendered ineffective. |
| **CRIT-04** | Thermal / PDN | **CRITICAL** | IC2 Pad 33 (EP) | EFR32BG22 2.8 mm x 2.8 mm exposed thermal/ground paddle (Pad 33) has zero thermal vias to inner/bottom copper and connects to system GND via a single 0.16 mm surface trace. | Severe ground impedance and ground bounce during RF burst transmissions. High thermal resistance will lead to local silicon hot-spotting and thermal throttling. |
| **CRIT-05** | DFM / DFA | **CRITICAL** | U5 Pads 4, 5, 6 | Solder mask apertures bridge `/BG22/SCL` and `/BG22/SDA` vias/tracks into U5 SPI Flash pads (Pad 4 GND, Pad 5 MOSI, Pad 6 SCK). | Reflow solder bridges will short the I2C bus directly to the SPI bus and GND, causing permanent bus contention and silicon communication failure. |
| **CRIT-06** | DFM / Clearance | **CRITICAL** | U1 Pad 4 | Hole clearance violation of 0.0000 mm: a via with `<no net>` at (129.55, 73.975) directly intersects Pad 4 of U1 (BMA400 LGA-12). In addition, net `/BG22/Alert` has a broken trace gap. | Drill hole will clip the SMD pad, damaging the LGA land and causing an open or short on the motion interrupt line. |
| **CRIT-07** | Power / Bring-up | **CRITICAL** | (124.8, 77.0) & (145.5, 73.8) | Track gaps: `/BG22/3V` has an unrouted disconnect between (124.80, 77.00) and (125.33, 78.20). `/Power/5v` has an unrouted gap between F.Cu and In2.Cu at (145.47, 73.72). | 3V power fails to reach portions of the MCU/sensors; 5V USB charging input fails to reach charger IC U2. |
| **CRIT-08** | Debug / Flash | **CRITICAL** | J5 & IC2 | `/BG22/SWO` (J5 Pin 6 to IC2 Pin 20) and `/BG22/SWDIO` (via at 117.4, 87.2 to IC2 Pin 19) are unconnected. SPI Flash `/BG22/FLASH_MOSI` (IC2 Pin 6 to B.Cu track) is unconnected. | Hardware programming and debug via J-Link / Simplicity Link is blocked. External SPI Flash storage is non-functional. |

---

## 3. High-Priority Findings (Severe Performance & Reliability Risks)

| ID | Domain | Severity | Location | Description & Mechanism | Consequence |
|---|---|---|---|---|---|
| **HIGH-01** | PDN / Trace Sizing | **HIGH** | Power nets (Board-wide) | All power nets (`5V`, `Net-(J2-Pin_1)` [VBAT], `3V`, `VDCDC`, `VREGSW`, `PAVDD`, `RFVDD`) are routed with narrow 0.16 mm (6.3 mil) traces. | Excessive DC IR drop and high parasitic trace inductance ($L \approx 1\text{ nH/mm}$). Inductive voltage spikes on `VREGSW` during DC-DC switching; rail sag during 2.4 GHz +6 dBm TX pulses. |
| **HIGH-02** | RF Front-End | **HIGH** | C5, C8, C10, C11 | RF matching and harmonic filter capacitors are placed as `C_0603_1608Metric` packages. | At 2.45 GHz, 0603 SMD capacitors introduce 0.8–1.2 nH parasitic series inductance and larger pad shunt capacitance, completely detuning the pi-filter, degrading receiver sensitivity, and failing harmonic emissions. |
| **HIGH-03** | PDN / Decoupling | **HIGH** | IC2 bypass network | High-frequency bypass capacitors are located far from target pins: C15 (4.7 µF bulk) is 7.1 mm away; C3/C4 (RFVDD) are 7.9 mm / 6.0 mm away; C6/C7 (PAVDD) are 5.7 mm / 6.7 mm away; C9 (DECOUPLE) is 5.5 mm away. | Excessive trace length and lack of adjacent ground plane vias introduce large loop inductances, nullifying high-frequency decoupling effectiveness. |
| **HIGH-04** | Optical / Indicators | **HIGH** | U3 & D1 | U3 is populated as TLV73330PDBV (3.0V fixed output). D1 is Kingbright APFA3010 RGB LED with forward voltages $V_f(\text{Green}) = 3.1\text{ V}$ and $V_f(\text{Blue}) = 3.1\text{ V}$ (max 3.4 V), driven through 330 ohm resistors (R5, R6, R7). | Supply rail (3.0 V) is lower than LED forward threshold (3.1 V). Green and Blue LEDs will fail to illuminate or produce negligible light output. |
| **HIGH-05** | Reset Circuit | **HIGH** | SW1, R4, C2 | Reset line has 10 kΩ resistor R4 in series with push button SW1 to GND, and reset capacitor C2 is 1.0 µF. | Forms a voltage divider with the internal MCU pull-up ($V_{\text{reset}} \approx 0.60\text{ V}$, borderline maximum $V_{IL}$); 40 ms RC time constant causes debugger reset assertion timeouts. |
| **HIGH-06** | Architecture | **HIGH** | Sensors | Dedicated temperature sensor IC (TMP117 or AS6221) is missing from the schematic and layout, despite the product being a medical patch. | Patch lacks clinical skin/body temperature measurement capability. |

---

## 4. Medium & DFM Findings

| ID | Domain | Severity | Location | Description & Recommendation |
|---|---|---|---|---|
| **MED-01** | Power Architecture | **MEDIUM** | J2, J4, U2, U3 | Direct battery charging lacks dynamic power-path management (load sharing). Hardwiring battery to load causes charger termination failure if load exceeds 7.5 mA. Implement standard 3-component P-FET + Schottky power-path circuit. |
| **MED-02** | DFM / Solder Mask | **MEDIUM** | J5 & SW1 | Solder mask bridges on J5 (SWCLK track to Pad 10; RST track to 3V/GND pads) and SW1. Reroute signal tracks outside connector pad courtyards with ≥ 0.2 mm clearance. |
| **MED-03** | Layout / Hygiene | **MEDIUM** | Signal layers | 4 dangling/single-layer vias detected on nets `/BG22/Alert` (x2), `/BG22/FLASH_MOSI`, and `/BG22/SWDIO`. Remove unused via stubs. |
| **MED-04** | RF Power Routing | **MEDIUM** | `/BG22/RFVDD` | `RFVDD` net hops between F.Cu and B.Cu across multiple vias right through digital routing. Keep analog RF supply strictly on F.Cu backed by an unbroken In1.Cu ground plane. |

---

## 5. Prioritized Action Plan & Remediation Guide

```
PHASE 1: STACKUP & COPPER POUR ARCHITECTURE (Immediate)
├── 1. Assign Layer In1.Cu as a solid, continuous GND copper pour across the entire board.
├── 2. Assign Layer In2.Cu as a secondary ground / power distribution split plane (3V & 5V).
├── 3. Pour GND copper fill on F.Cu and B.Cu; stitch planes with 0.3 mm drill / 0.6 mm diameter ground vias at ≤ 3 mm pitch.
└── 4. Under ANT1, ensure the antenna keepout zone (Zone 3) cuts all copper across F.Cu, In1.Cu, In2.Cu, and B.Cu.

PHASE 2: RESOLVE DRC & ROUTING DISCONNECTIONS
├── 1. Connect Y1 Pin 1 to IC2 Pin 7 (`/BG22/X1`) with a short, symmetric F.Cu trace.
├── 2. Connect L4 Pin 1 to ANT1 Pin 4 (`/BG22/RF3`) with a 0.18 mm 50 Ω coplanar microstrip referenced to In1.Cu GND.
├── 3. Connect ANT1 Pads 1, 2, and 3 directly to F.Cu ground copper and stitch to In1.Cu ground plane.
├── 4. Complete unrouted connections on `/BG22/FLASH_MOSI`, `/BG22/SWO`, `/BG22/SWDIO`, `/BG22/3V`, `/Power/5v`, and `/BG22/Alert`.
├── 5. Delete rogue via at (129.55, 73.975) overlapping U1 Pad 4; reroute `/BG22/Alert` cleanly.
└── 6. Reroute I2C `/BG22/SCL` and `/BG22/SDA` traces away from U5 Flash pads to eliminate solder mask bridges.

PHASE 3: THERMAL & POWER DELIVERY ENHANCEMENT
├── 1. Place a 3x3 grid of 0.3 mm drill / 0.6 mm diameter thermal ground vias directly inside IC2 Pad 33 (EP) into In1.Cu GND.
├── 2. Increase trace widths on power nets:
│      • `/BG22/VREGSW`: Widen to 0.50 mm (short, wide polygon between Pin 25 and inductor L5).
│      • `/BG22/VDCDC`: Widen to 0.40–0.50 mm from L5 output to C15, C13, and Pin 28.
│      • `/BG22/3V` and `/Power/5v`: Widen to 0.35–0.50 mm.
│      • `Net-(J2-Pin_1)` [VBAT]: Widen to 0.40 mm.
└── 3. Relocate high-frequency bypass caps (C9, C13, C15, C4, C7) immediately adjacent (< 1.5 mm) to respective IC supply pins.

PHASE 4: SCHEMATIC SPECIFICATION FIXES
├── 1. Change RF matching capacitor footprints (C5, C8, C10, C11) from 0603 to 0402 (`Capacitor_SMD:C_0402_1005Metric`).
├── 2. Replace LDO U3 (TLV73330PDBV) with 3.3V version TLV73333PDBV; resize LED series resistors R5/R7 to 120 Ω.
├── 3. Replace R4 (10 kΩ) with 0 Ω jumper to GND; reduce reset cap C2 from 1.0 µF to 100 nF.
└── 4. Re-integrate TMP117 clinical temperature sensor on the I2C bus at address 0x48.
```

---

## 6. Verification Plan

1. **Automated Verification:** Execute `kicad-cli pcb drc` on the modified candidate board until 0 errors, 0 unconnected items, and 0 solder mask bridge violations are achieved.
2. **RF Impedance Calculation:** Run field-solver check on F.Cu RF trace geometry (target $Z_0 = 50\ \Omega \pm 2\ \Omega$ with $h = 0.1\text{ mm}$ prepreg, $\varepsilon_r = 4.5$).
3. **Thermal & Ground Continuity:** Confirm via resistance from IC2 thermal paddle to ground plane is $< 5\text{ m}\Omega$ with thermal dissipation capability $\theta_{JA} < 35\text{ }^\circ\text{C/W}$.
4. **Bring-up Electrical Check:** Validate 3.3V rail voltage under active BLE transmit (+6 dBm), verify 38.4 MHz HFXO startup time ($< 300\ \mu\text{s}$), and verify 100 mA Li-ion charging profile with automatic termination.
