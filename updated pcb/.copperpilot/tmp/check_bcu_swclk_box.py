with open('.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re

print("=== Items on B.Cu in x:[114, 119], y:[79, 81] ===")
segs = re.findall(r'\(segment\s+\(start\s+([\d.-]+)\s+([\d.-]+)\)\s+\(end\s+([\d.-]+)\s+([\d.-]+)\)\s+\(width\s+([\d.-]+)\)\s+\(layer "B.Cu"\)\s+\(net "([^"]*)"\).*?\(uuid "([^"]+)"\)\s*\)', text, re.DOTALL)
for s in segs:
    x1, y1, x2, y2 = float(s[0]), float(s[1]), float(s[2]), float(s[3])
    if 114 <= min(x1, x2) and max(x1, x2) <= 119 and 79 <= min(y1, y2) and max(y1, y2) <= 81:
        print(f"B.Cu SEG: ({x1:.2f}, {y1:.2f}) -> ({x2:.2f}, {y2:.2f}) net='{s[5]}' uuid={s[6]}")

vias = re.findall(r'\(via\s+\(at\s+([\d.-]+)\s+([\d.-]+)\).*?\(net "([^"]*)"\).*?\(uuid "([^"]+)"\)\s*\)', text, re.DOTALL)
for v in vias:
    vx, vy = float(v[0]), float(v[1])
    if 114 <= vx <= 119 and 79 <= vy <= 81:
        print(f"VIA: ({vx:.2f}, {vy:.2f}) net='{v[2]}' uuid={v[3]}")
