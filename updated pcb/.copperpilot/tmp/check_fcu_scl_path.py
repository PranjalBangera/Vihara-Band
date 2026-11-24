with open('.copperpilot/tmp/staging/drc-remediation-01/baseline/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re

print("=== Items on F.Cu in x:[132, 134], y:[75, 83] ===")
segs = re.findall(r'\(segment\s+\(start\s+([\d.-]+)\s+([\d.-]+)\)\s+\(end\s+([\d.-]+)\s+([\d.-]+)\)\s+\(width\s+([\d.-]+)\)\s+\(layer "F.Cu"\)\s+\(net "([^"]*)"\).*?\(uuid "([^"]+)"\)\s*\)', text, re.DOTALL)
for s in segs:
    x1, y1, x2, y2, net, uid = float(s[0]), float(s[1]), float(s[2]), float(s[3]), s[5], s[6]
    if 132 <= (x1+x2)/2 <= 134 and 75 <= (y1+y2)/2 <= 83:
        print(f"  F.Cu SEG: ({x1:.2f}, {y1:.2f}) -> ({x2:.2f}, {y2:.2f}) net='{net}' uuid={uid}")
