with open('.copperpilot/tmp/staging/drc-remediation-01/baseline/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# find all segments and vias near x: [129, 135], y: [72, 80]
print("=== Segments & Vias near U1/U5 ===")
segs = re.findall(r'\(segment\s+\(start\s+([\d.-]+)\s+([\d.-]+)\)\s+\(end\s+([\d.-]+)\s+([\d.-]+)\)\s+\(width\s+([\d.-]+)\)\s+\(layer "([^"]+)"\)\s+\(net "([^"]*)"\).*?\(uuid "([^"]+)"\)\s*\)', text, re.DOTALL)
for s in segs:
    x1, y1, x2, y2, lay, net, uid = float(s[0]), float(s[1]), float(s[2]), float(s[3]), s[5], s[6], s[7]
    if 129 <= (x1+x2)/2 <= 135 and 72 <= (y1+y2)/2 <= 80:
        print(f"SEG [{lay}] ({x1:.2f}, {y1:.2f}) -> ({x2:.2f}, {y2:.2f}) net='{net}'")

vias = re.findall(r'\(via\s+\(at\s+([\d.-]+)\s+([\d.-]+)\).*?\(net "([^"]*)"\).*?\(uuid "([^"]+)"\)\s*\)', text, re.DOTALL)
for v in vias:
    vx, vy, net, uid = float(v[0]), float(v[1]), v[2], v[3]
    if 129 <= vx <= 135 and 72 <= vy <= 80:
        print(f"VIA at ({vx:.2f}, {vy:.2f}) net='{net}'")
