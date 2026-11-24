# PCB Autorouting Stage Configuration: Non-Critical Digital & Control Nets

## Executive Summary
This document establishes the formal routing configuration for automated trace generation on the **Medical Wearable Patch** PCB.

In accordance with RF design rules and mixed-signal best practices, **automated routing is strictly restricted to low-speed digital buses, GPIO control lines, debug interfaces, and static configuration lines**. All high-frequency RF front-end networks, crystal oscillator tank circuits, switching regulator nodes, core analog supplies, and high-current power distribution trunks are hard-excluded from the autorouting engine and must be manually routed, impedance-controlled, and locked prior to executing any autoroute pass.

---

## 1. Autoroute Whitelist: Non-Critical Digital & Control Nets

The autorouter is configured to route exclusively the following **21 electrical nets** (comprising the 16 primary digital/control signals and 5 associated local passive branches):

| Subsystem | Net Name | Signal Function | From Endpoint | To Endpoint | Assigned Netclass |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SPI Flash** | `/BG22/FLASH_CS` | Chip Select (50 MHz max) | IC2 pin 14 (PB02) | U5 pin 1 (`~{CE}`) | `Digital_Fast` |
| **SPI Flash** | `/BG22/FLASH_SCK` | Serial Clock (50 MHz max) | IC2 pin 15 (PB01) | U5 pin 6 (`SCK`) | `Digital_Fast` |
| **SPI Flash** | `/BG22/FLASH_MOSI`| Master Out / Slave In | IC2 pin 6 (PC05) | U5 pin 5 (`SI`) | `Digital_Fast` |
| **SPI Flash** | `/BG22/FLASH_MISO`| Master In / Slave Out | IC2 pin 17 (PA00) | U5 pin 2 (`SO`) | `Digital_Fast` |
| **SPI Flash** | `Net-(U5-~{HOLD}(IO3))` | Static Flash Hold Pull-Up | U5 pin 7 (`~{HOLD}`) | R8 pin 2 | `Digital_Slow` |
| **SPI Flash** | `Net-(U5-~{WP}(IO2))` | Static Flash Write Protect | U5 pin 3 (`~{WP}`) | R3 pin 2 | `Digital_Slow` |
| **I2C Bus** | `/BG22/SCL` | Sensor Clock (400 kHz) | IC2 pin 21 (PA04) | U1 pin 12 (`SCX`), R9 pin 2 | `Digital_Slow` |
| **I2C Bus** | `/BG22/SDA` | Sensor Data (400 kHz) | IC2 pin 23 (PA06) | U1 pin 2 (`SDX`), R10 pin 2 | `Digital_Slow` |
| **Interrupt** | `/BG22/Alert` | BMA400 Motion Alert | IC2 pin 5 (PC04) | U1 pin 5 (`INT1`) | `Digital_Slow` |
| **Debug / SWD** | `/BG22/SWCLK` | SWD Debug Clock | IC2 pin 18 (PA01) | J5 pin 8 (`SWCLK`) | `Digital_Control` |
| **Debug / SWD** | `/BG22/SWDIO` | SWD Bidirectional Data | IC2 pin 19 (PA02) | J5 pin 7 (`SWDIO`) | `Digital_Control` |
| **Debug / SWD** | `/BG22/SWO` | Serial Wire Output Trace | IC2 pin 20 (PA03) | J5 pin 6 (`SWO`) | `Digital_Control` |
| **Reset** | `/BG22/RST` | Hardware Reset (Active Low) | IC2 pin 9 (`RESETn`) | J5 pin 3, SW1 pin 2, C2 pin 1 | `Digital_Slow` |
| **Reset** | `Net-(R4-Pad2)` | Reset Switch Series Branch | SW1 pin 1 | R4 pin 2 | `Digital_Slow` |
| **Status LED** | `/BG22/LED_R` | Red Channel GPIO Driver | IC2 pin 1 (PC00) | R6 pin 2 | `Digital_Slow` |
| **Status LED** | `/BG22/LED_G` | Green Channel GPIO Driver | IC2 pin 2 (PC01) | R5 pin 2 | `Digital_Slow` |
| **Status LED** | `/BG22/LED_B` | Blue Channel GPIO Driver | IC2 pin 3 (PC02) | R7 pin 2 | `Digital_Slow` |
| **Status LED** | `Net-(D1-RK)` | Red Cathode Return | R6 pin 1 | D1 pin 1 (`RK`) | `Digital_Slow` |
| **Status LED** | `Net-(D1-GK)` | Green Cathode Return | R5 pin 1 | D1 pin 2 (`GK`) | `Digital_Slow` |
| **Status LED** | `Net-(D1-BK)` | Blue Cathode Return | R7 pin 1 | D1 pin 3 (`BK`) | `Digital_Slow` |
| **Charger** | `Net-(U2-PROG)` | MCP73831 Charge Current Set| U2 pin 8 (`PROG`) | R1 pin 1 | `Digital_Slow` |

---

## 2. Hard Exclusion Blacklist: Critical Nets (Manual Only)

The following **17 nets** are strictly **excluded** from FreeRouting via the `-inc` (`--ignore-net-class`) filter and must be locked in the PCB database before running any automated operations:

| Category | Net Name | Total Pads | Exclusion Justification | Required Implementation |
| :--- | :--- | :--- | :--- | :--- |
| **RF Front-End** | `/BG22/RF2G4_IO` | 3 | 2.4 GHz RF TX/RX output | 50 Ω CPWG, F.Cu only, continuous GND under |
| **RF Front-End** | `/BG22/RF1` | 3 | Harmonic filter inter-stage | Direct pad-to-pad, minimal length, zero stubs |
| **RF Front-End** | `/BG22/RF2` | 3 | Antenna matching PI-network | Symmetrical trace geometry, ground via shielding |
| **RF Front-End** | `/BG22/RF3` | 2 | Antenna feed terminal | Direct feed to ANT1 pad 4, zero vias |
| **Oscillator** | `/BG22/X1` | 2 | 38.4 MHz HFXO input | Balanced differential pair, guard ring |
| **Oscillator** | `/BG22/X2` | 2 | 38.4 MHz HFXO output | Guard ring, ground return via directly to IC2 VSS |
| **Oscillator** | `/BG22/LFXO_IN` | 3 | 32.768 kHz LFXO input | High-impedance node, <5 mm trace length |
| **Oscillator** | `/BG22/LFXO_OUT`| 3 | 32.768 kHz LFXO output | Load cap directly at pin, isolated from switchers |
| **DCDC Buck** | `/BG22/VREGSW` | 2 | High dv/dt switch node | Direct wide trace IC2 pin 25 to L5 pin 1, min loop |
| **DCDC Output** | `/BG22/VDCDC` | 6 | 1.1–1.8V internal rail | Star route from C13 to L1 and L3, 0.4 mm width |
| **RF Analog** | `/BG22/RFVDD` | 4 | Low-noise RF rail | Direct trace from L1/C4/C3 to IC2 pin 10 |
| **PA Analog** | `/BG22/PAVDD` | 4 | High-power RF PA rail | Direct trace from L3/C6/C7 to IC2 pin 13 |
| **Core Supply** | `Net-(IC2-DECOUPLE)`| 2 | Internal 1.1V core rail | C9 (1 µF) placed <1 mm from pin 24 with GND via |
| **Power Input** | `/Power/5v` | 4 | USB 5V charging input | 0.50 mm wide power trunk, C28 decoupling |
| **Battery Rail**| `Net-(J2-Pin_1)` | 7 | Raw Li-ion battery rail | 0.50 mm wide power trunk, J2 to U2 to U3 |
| **System Power**| `/BG22/3V` | 23 | Regulated 3.3V system supply | Main 0.40–0.50 mm trunk branching to local caps |
| **Ground** | `GND` | 46 | System ground reference | Continuous planes on F.Cu and B.Cu, via stitching |

---

## 3. Netclass Geometrical Rules & Fab Constraints

The PCB rules are tailored to match standard two-layer PCB manufacturing specifications (JLCPCB, PCBWay, Eurocircuits standard capabilities):

| Parameter | Board Global DRC Limit | `Digital_Fast` (SPI) | `Digital_Slow` (I2C/GPIO) | `Digital_Control` (SWD) | Standard Fab Capability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Trace Width** | 0.150 mm (5.9 mil) | **0.200 mm** (7.87 mil) | **0.160 mm** (6.30 mil) | **0.160 mm** (6.30 mil) | 0.127 mm (5.0 mil) min |
| **Trace Clearance** | 0.100 mm (3.94 mil) | **0.200 mm** (7.87 mil) | **0.160 mm** (6.30 mil) | **0.200 mm** (7.87 mil) | 0.127 mm (5.0 mil) min |
| **Copper Pour Clearance**| 0.200 mm (7.87 mil) | **0.250 mm** (9.84 mil) | **0.200 mm** (7.87 mil) | **0.250 mm** (9.84 mil) | 0.150 mm (5.9 mil) min |
| **Via Pad Diameter** | 0.600 mm (23.6 mil) | **0.600 mm** (23.6 mil) | **0.600 mm** (23.6 mil) | **0.600 mm** (23.6 mil) | 0.450 mm (17.7 mil) min |
| **Via Drill Diameter** | 0.300 mm (11.8 mil) | **0.300 mm** (11.8 mil) | **0.300 mm** (11.8 mil) | **0.300 mm** (11.8 mil) | 0.200 mm (7.87 mil) min |
| **Annular Ring** | 0.150 mm (5.9 mil) | **0.150 mm** (5.9 mil) | **0.150 mm** (5.9 mil) | **0.150 mm** (5.9 mil) | 0.125 mm (4.9 mil) min |
| **Microvia Usage** | Prohibited | Prohibited | Prohibited | Prohibited | N/A (Standard 2-Layer) |

---

## 4. Layer Routing Bias & Strategy

1. **Top Layer (`F.Cu`):**
   - **Primary Routing Direction:** Horizontal / Component-side escapes.
   - Houses all surface mount components, RF CPWG transmission line, crystal tanks, and decoupling loops.
   - Low-speed digital traces should escape from QFN/WLCSP/SON packages on `F.Cu` and drop through a via to `B.Cu` only when crossing existing traces.
2. **Bottom Layer (`B.Cu`):**
   - **Primary Routing Direction:** Vertical / Interconnect bus routing.
   - Primarily serves as the continuous unbroken RF and digital ground reference plane.
   - Digital cross-overs are routed orthogonally on `B.Cu` with minimal trace lengths to avoid slotting the ground return path.
   - **Ground return plane rule:** No digital trace on `B.Cu` may run directly beneath the RF front-end (between IC2 pin 12 and ANT1) or beneath the crystal resonators (Y1, Y4).

---

## 5. Physical Keepouts & Boundary Constraints

1. **Chip Antenna Keepout (`ANT1`):**
   - johanson 2450AT18D0100E keepout zones (UUIDs `6f792c95-a4bf-4c85-b29a-ddecea9b779c` and `d4a24832-f5fa-47d7-8aa1-60b2e4c43c25`) enforce:
     - `tracks: not_allowed`
     - `vias: not_allowed`
     - `copperpour: not_allowed`
     - All layers (F.Cu, B.Cu, internal) must remain 100% devoid of metal under and around the radiating element.
2. **Oscillator Guard Zones:**
   - A 1.0 mm keepout zone around Y1 (38.4 MHz) and Y4 (32.768 kHz) is enforced to prevent SWD clock harmonics or SPI bus transitions from coupling into clock inputs.
3. **Switching Regulator Keepout (`L5`, `VREGSW`):**
   - High dv/dt rectangular loop between IC2 pin 25 and L5 pin 1 is excluded from autorouting to prevent digital traces from being routed parallel to the switching loop.

---

## 6. Execution Command & Engine Parameters

When approved for execution, the autorouter will be invoked via KiCad's bundled Python and the installed FreeRouting headless engine using the following command:

```cmd
"C:\Program Files\KiCad\10.0\bin\python.exe" ".copperpilot/skills/kicad_autorouter/main.py" route ^
  --platform win ^
  --project-dir . ^
  --pcb "Medical Wearable Patch recovered.kicad_pcb" ^
  --ignore-net-class RF ^
  --ignore-net-class Power ^
  --ignore-net-class Crystal_Osc ^
  --ignore-net-class GND ^
  --autorouter-passes 10 ^
  --post-route-passes 5 ^
  --threads 4 ^
  --timeout-sec 600 ^
  --run-drc ^
  --refill-zones
```

### Engine Argument Rationale:
- `--ignore-net-class RF`, `--ignore-net-class Power`, `--ignore-net-class Crystal_Osc`, `--ignore-net-class GND`: Guarantees zero automated copper generation or rip-up on sensitive nets.
- `--autorouter-passes 10`: Allows up to 10 routing passes to negotiate topological conflicts without track congestion.
- `--post-route-passes 5`: Runs 5 smoothing and via-reduction passes to minimize stub length, eliminate redundant layer hops, and improve signal integrity.
- `--threads 4`: Multi-threaded optimization using the Adoptium JDK 17 headless runtime.
- `--run-drc` and `--refill-zones`: Automatically verifies post-route physical clearances and refills ground copper zones.

---

## 7. Pre-Flight Engineering Checklist Before Execution

Before triggering the autorouting command, the following prerequisites must be confirmed:
1. **Board Outline (`Edge.Cuts`):** KiCad DRC flagged `Board has malformed outline (no edges found on Edge.Cuts layer)`. A closed outer boundary on `Edge.Cuts` (such as the 30 mm diameter circle or equivalent rectangular boundary) must be defined so the Specctra DSN translator has a bounded routing area.
2. **Schematic Fix Verification:** Confirm that IC2 pin 29 (AVDD) is tied to 3.3V and LFXO capacitors are set to 18 pF in the schematic so netlists remain fully synchronized.
3. **Manual Critical Net Routing & Locking:** Confirm that the 17 critical nets (RF, Crystals, DCDC, Power trunks, GND) are manually placed and marked with the `locked` property in KiCad.
