with open('.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re

print("=== Items on B.Cu near x<115, y in [78, 88] ===")
segs = re.findall(r'\(segment\s+\(start\s+([\d.-]+)\s+([\d.-]+)\)\s+\(end\s+([\d.-]+)\s+([\d.-]+)\)\s+\(width\s+([\d.-]+)\)\s+\(layer "B.Cu"\)\s+\(net "([^"]*)"\).*?\(uuid "([^"]+)"\)\s*\)', text, re.DOTALL)
for s in segs:
    x1, y1, x2, y2 = float(s[0]), float(s[1]), float(s[2]), float(s[3])
    if max(x1, x2) <= 115 and 78 <= min(y1, y2) and max(y1, y2) <= 88:
        print(f"B.Cu SEG: ({x1:.2f}, {y1:.2f}) -> ({x2:.2f}, {y2:.2f}) net='{s[5]}' uuid={s[6]}")
