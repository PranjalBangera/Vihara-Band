with open('.copperpilot/tmp/staging/drc-remediation-01/baseline/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re

for lay in ["F.Cu", "In1.Cu", "In2.Cu", "B.Cu"]:
    print(f"=== Layer {lay} near (132.76, 73.20) ===")
    segs = re.findall(rf'\(segment\s+\(start\s+([\d.-]+)\s+([\d.-]+)\)\s+\(end\s+([\d.-]+)\s+([\d.-]+)\).*?\(layer "{lay}"\)\s+\(net "([^"]*)"\).*?\)', text, re.DOTALL)
    for s in segs:
        x1, y1, x2, y2, net = float(s[0]), float(s[1]), float(s[2]), float(s[3]), s[4]
        if 132.0 <= (x1+x2)/2 <= 133.5 and 72.5 <= (y1+y2)/2 <= 74.0:
            print(f"  SEG: ({x1:.2f}, {y1:.2f}) -> ({x2:.2f}, {y2:.2f}) net='{net}'")
    vias = re.findall(rf'\(via\s+\(at\s+([\d.-]+)\s+([\d.-]+)\).*?\(net "([^"]*)"\).*?\)', text, re.DOTALL)
    for v in vias:
        vx, vy, net = float(v[0]), float(v[1]), v[2]
        if 132.0 <= vx <= 133.5 and 72.5 <= vy <= 74.0:
            print(f"  VIA at ({vx:.2f}, {vy:.2f}) net='{net}'")
