with open('.copperpilot/tmp/staging/drc-remediation-01/baseline/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re
import math

# Let's inspect everything in x:[131, 134], y:[75, 78]
for lay in ["F.Cu", "In1.Cu", "B.Cu"]:
    print(f"=== Layer {lay} ===")
    segs = re.findall(rf'\(segment\s+\(start\s+([\d.-]+)\s+([\d.-]+)\)\s+\(end\s+([\d.-]+)\s+([\d.-]+)\).*?\(layer "{lay}"\)\s+\(net "([^"]*)"\).*?\)', text, re.DOTALL)
    for s in segs:
        x1, y1, x2, y2, net = float(s[0]), float(s[1]), float(s[2]), float(s[3]), s[4]
        if 131 <= (x1+x2)/2 <= 134 and 75 <= (y1+y2)/2 <= 78:
            print(f"  SEG [{lay}]: ({x1:.2f}, {y1:.2f}) -> ({x2:.2f}, {y2:.2f}) net='{net}'")
    vias = re.findall(rf'\(via\s+\(at\s+([\d.-]+)\s+([\d.-]+)\).*?\(net "([^"]*)"\).*?\)', text, re.DOTALL)
    for v in vias:
        vx, vy, net = float(v[0]), float(v[1]), v[2]
        if 131 <= vx <= 134 and 75 <= vy <= 78:
            print(f"  VIA [{net}] at ({vx:.2f}, {vy:.2f})")
