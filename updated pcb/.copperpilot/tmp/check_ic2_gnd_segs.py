with open('Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    content = f.read()

import re
# Find all segments on net GND near (122.8, 77.2)
segments = re.findall(r'\(segment\s+\(start\s+([\d.-]+)\s+([\d.-]+)\)\s+\(end\s+([\d.-]+)\s+([\d.-]+)\)\s+\(width\s+([\d.-]+)\)\s+\(layer\s+"([^"]+)"\)\s+\(net\s+"([^"]+)"\)', content)
gnd_segs_ic2 = []
for s in segments:
    if s[6] == 'GND':
        x1, y1, x2, y2 = float(s[0]), float(s[1]), float(s[2]), float(s[3])
        if (120 <= x1 <= 125 and 75 <= y1 <= 80) or (120 <= x2 <= 125 and 75 <= y2 <= 80):
            gnd_segs_ic2.append(s)

print(f"GND segments near IC2: {len(gnd_segs_ic2)}")
for s in gnd_segs_ic2:
    print(f"  Layer {s[5]}, Width {s[4]} mm, ({s[0]}, {s[1]}) -> ({s[2]}, {s[3]})")
