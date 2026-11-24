# PCB Routing Strategy and Net Classification

## Executive Summary
Automatic routing (via FreeRouting / Specctra engine) can route standard low-speed digital buses, GPIOs, and status signals. However, **critical RF, clock/crystal, switching regulator, and power delivery networks must NEVER be autorouted**. 

Autorouters do not preserve RF impedance, introduce parasitic inductance and stubs, create loop antennas, split ground return paths, and drop vias in sensitive analog nodes. 

A two-stage routing strategy is required:
1. **Stage 1 (Manual Routing & Hard Locks):** Manually route 2.4 GHz RF matching and antenna feed, 38.4 MHz HFXO, 32.768 kHz LFXO, DCDC switch node (`VREGSW`), core decouple, and primary power rails with local decoupling caps. Lock all critical traces and ground pours.
2. **Stage 2 (Automated Routing):** Run the autorouter strictly on designated digital, control, and programming net classes with established clearance and layer rules.

---

## 1. Net Classification Matrix

| Category | Net Name | Connected Components / Pins | Routing Strategy | Critical Constraints & Routing Rules |
| :--- | :--- | :--- | :--- | :--- |
| **RF Front-End** | `/BG22/RF2G4_IO` | IC2:12, L2:2, C5:2 | **MANUAL ONLY** | 50 Ω Coplanar Waveguide with Ground (CPWG), top layer only, no vias, unbroken GND plane below. |
| **RF Front-End** | `/BG22/RF1` | L2:1, C10:1, C8:2 | **MANUAL ONLY** | Component-to-pad direct routing, minimal trace length, zero stubs, keep clearance to digital traces > 3x dielectric height. |
| **RF Front-End** | `/BG22/RF2` | C10:2, C11:2, L4:2 | **MANUAL ONLY** | Symmetrical RF PI-network topology, tight ground via stitching on adjacent ground pads. |
| **RF Front-End** | `/BG22/RF3` | L4:1, ANT1:4 | **MANUAL ONLY** | Direct feed to chip antenna pad 4. Maintain exact antenna keepout zone (zero copper on all layers under antenna body). |
| **Oscillators** | `/BG22/X1` | IC2:7, Y1:1 | **MANUAL ONLY** | 38.4 MHz High-Frequency Crystal (HFXO). Short differential-style pair, no vias, top layer, continuous GND plane underneath. |
| **Oscillators** | `/BG22/X2` | IC2:8, Y1:3 | **MANUAL ONLY** | Guard ring with ground shield vias. Keep away from high-speed digital and switching nodes. |
| **Oscillators** | `/BG22/LFXO_IN` | IC2:32, Y4:1, C25:1 | **MANUAL ONLY** | 32.768 kHz Low-Frequency Crystal. High impedance node, ultra-short trace, keep load caps right at crystal pins. |
| **Oscillators** | `/BG22/LFXO_OUT`| IC2:31, Y4:2, C26:1 | **MANUAL ONLY** | Guarded by ground pour, no vias, isolated from DCDC inductor and switch node. |
| **DCDC Switching**| `/BG22/VREGSW` | IC2:25, L5:1 | **MANUAL ONLY** | High di/dt, high dv/dt switch node. Ultra-short wide trace directly between IC2 pin 25 and inductor L5 pin 1. Minimal loop area to prevent radiated EMI. |
| **DCDC Output** | `/BG22/VDCDC` | IC2:28, L5:2, L1:1, L3:2, C13:1, C15:1 | **MANUAL ONLY** | DCDC buck output rail. Star connection directly from output cap C13 to filter inductors L1 (RFVDD) and L3 (PAVDD). Wide copper (0.4–0.5 mm). |
| **Analog / Filter**| `/BG22/RFVDD` | IC2:10, L1:2, C4:1, C3:1 | **MANUAL ONLY** | RF analog supply. Decoupling capacitors C4 (100 pF) and C3 (10 µF) must connect directly to IC2 pin 10 with lowest ESL. |
| **Analog / Filter**| `/BG22/PAVDD` | IC2:13, L3:1, C6:1, C7:1 | **MANUAL ONLY** | RF PA supply. C6 (100 pF) and C7 (10 µF) placed immediately at IC2 pin 13 with direct via to ground flood. |
| **Core Decouple** | `Net-(IC2-DECOUPLE)` | IC2:24, C9:1 | **MANUAL ONLY** | Internal 1.1V core regulator decouple. C9 (1 µF) must be directly adjacent to pin 24 with dedicated ground return via. No autorouter track splits. |
| **Power Input** | `/Power/5v` | U2:1,2, J4:2, C28:1 | **MANUAL ONLY** | 5V USB charger input. 0.5 mm wide trace from J4 pin 2 through C28 to MCP73831 input pins. |
| **Battery Rail** | `Net-(J2-Pin_1)`| U2:3,4, J2:1, U3:1,3, C29:1, C21:1 | **MANUAL ONLY** | VBAT rail. 0.5 mm wide trace connecting J2 battery terminal, charger output, and LDO (U3) input filter caps. |
| **System Power** | `/BG22/3V` | 23 pads (IC2, U1, U3, U5, J5, passives) | **MANUAL TRUNK / STAR** | Regulated 3.3V system rail. Must be routed as a primary trunk (0.4–0.5 mm) branching out with dedicated drops to decoupling caps before IC supply pins. Autorouting directly would daisy-chain power through narrow 0.15 mm tracks. |
| **Ground** | `GND` | 46 pads | **MANUAL POUR & STITCH** | Unbroken ground planes on F.Cu and B.Cu. Thermal vias on thermal pads (IC2 pad 33, U5 pad 9). Direct vias for all bypass capacitors. |
| **SPI Flash** | `/BG22/FLASH_CS` | IC2:14, U5:1 | **AUTOMATIC** | Standard 50 MHz SPI control. Net class: Digital_Fast (0.2 mm width, 0.2 mm clearance). |
| **SPI Flash** | `/BG22/FLASH_SCK` | IC2:15, U5:6 | **AUTOMATIC** | SPI clock line. Net class: Digital_Fast. Route with ground reference, avoid crossing split planes. |
| **SPI Flash** | `/BG22/FLASH_MOSI`| IC2:6, U5:5 | **AUTOMATIC** | SPI data out. Net class: Digital_Fast. |
| **SPI Flash** | `/BG22/FLASH_MISO`| IC2:17, U5:2 | **AUTOMATIC** | SPI data in. Net class: Digital_Fast. |
| **I2C Bus** | `/BG22/SCL` | IC2:21, U1:12, R9:2 | **AUTOMATIC** | 400 kHz I2C clock. Net class: Digital_Slow (0.15 mm width, 0.15 mm clearance). |
| **I2C Bus** | `/BG22/SDA` | IC2:23, U1:2, R10:2 | **AUTOMATIC** | 400 kHz I2C data. Net class: Digital_Slow. |
| **Sensor Alert** | `/BG22/Alert` | IC2:5, U1:5 | **AUTOMATIC** | BMA400 interrupt signal. Net class: Digital_Slow. |
| **Debug / SWD** | `/BG22/SWCLK` | IC2:18, J5:8 | **AUTOMATIC** | SWD clock. Net class: Digital_Control. |
| **Debug / SWD** | `/BG22/SWDIO` | IC2:19, J5:7 | **AUTOMATIC** | SWD bi-directional data. Net class: Digital_Control. |
| **Debug / SWD** | `/BG22/SWO` | IC2:20, J5:6 | **AUTOMATIC** | SWD trace output. Net class: Digital_Control. |
| **Reset** | `/BG22/RST` | IC2:9, SW1:2, J5:3, C2:1 | **AUTOMATIC** | Active-low reset with C2 filter cap. Route C2 close to IC2 pin 9, line to SW1 and J5 can be autorouted. |
| **LED Signals** | `/BG22/LED_R` | IC2:1, R6:2 | **AUTOMATIC** | Low-speed GPIO. Net class: Digital_Slow. |
| **LED Signals** | `/BG22/LED_G` | IC2:2, R5:2 | **AUTOMATIC** | Low-speed GPIO. Net class: Digital_Slow. |
| **LED Signals** | `/BG22/LED_B` | IC2:3, R7:2 | **AUTOMATIC** | Low-speed GPIO. Net class: Digital_Slow. |
| **LED Cathodes** | `Net-(D1-RK)` | R6:1, D1:1 | **AUTOMATIC** | Resistor to LED cathode segment. Net class: Digital_Slow. |
| **LED Cathodes** | `Net-(D1-GK)` | R5:1, D1:2 | **AUTOMATIC** | Resistor to LED cathode segment. Net class: Digital_Slow. |
| **LED Cathodes** | `Net-(D1-BK)` | R7:1, D1:3 | **AUTOMATIC** | Resistor to LED cathode segment. Net class: Digital_Slow. |
| **Flash Config** | `Net-(U5-~{HOLD}(IO3))` | R8:2, U5:7 | **AUTOMATIC** | Pull-up connection to flash HOLD pin. |
| **Flash Config** | `Net-(U5-~{WP}(IO2))` | R3:2, U5:3 | **AUTOMATIC** | Pull-up connection to flash WP pin. |
| **Charger Prog** | `Net-(U2-PROG)` | U2:8, R1:1 | **AUTOMATIC** | Programming resistor to ground for charger current set. |
| **Button Input** | `Net-(R4-Pad2)` | R4:2, SW1:1 | **AUTOMATIC** | Reset button pull-down/series connection. |

---

## 2. Step-by-Step Execution Plan

1. **Schematic Fixes Prior to Routing (Prerequisite):**
   - Correct the floating AVDD pin (connect IC2 pin 29 to 3.3V).
   - Change LFXO capacitors C25 and C26 from 100 nF to 12–18 pF.
   - Resolve battery chemistry conflict (CR1220 coin cell vs Li-ion charger).
2. **Pre-Route Placement and Manual Escape:**
   - Place chip antenna at the PCB edge with cleared ground on all layers in the antenna keepout zone.
   - Place 38.4 MHz crystal Y1 and 32.768 kHz crystal Y4 immediately adjacent to IC2 pins.
   - Manually route RF path (`RF2G4_IO` -> `RF1` -> `RF2` -> `RF3` -> `ANT1`) as a 50 Ω coplanar waveguide.
   - Manually route DCDC switch node `VREGSW` and filter inductors/caps (`VDCDC`, `RFVDD`, `PAVDD`, `DECOUPLE`).
   - Manually route power trunks (`/Power/5v`, `Net-(J2-Pin_1)`, `/BG22/3V`) with adequate track widths.
   - Flood and stitch GND planes.
3. **Locking & Boundary Protection:**
   - Lock all manually routed critical tracks, vias, and copper zones in KiCad so the FreeRouting engine treats them as fixed obstacles.
4. **Auto-Routing Execution (FreeRouting):**
   - Run the autorouter strictly for the remaining 16 non-critical digital, I2C, SPI, SWD, and LED nets.
   - Verify post-route connectivity with DRC and netlist checks.
