with open('.copperpilot/tmp/staging/drc-remediation-01/baseline/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re
import math

vx, vy = 132.76, 73.40
target_net = '/BG22/SDA'

segs = re.findall(r'\(segment\s+\(start\s+([\d.-]+)\s+([\d.-]+)\)\s+\(end\s+([\d.-]+)\s+([\d.-]+)\).*?\(layer "([^"]+)"\)\s+\(net "([^"]*)"\).*?\)', text, re.DOTALL)
for s in segs:
    x1, y1, x2, y2, lay, snet = float(s[0]), float(s[1]), float(s[2]), float(s[3]), s[4], s[5]
    if snet == target_net or snet == '': continue
    dx, dy = x2 - x1, y2 - y1
    l2 = dx*dx + dy*dy
    if l2 == 0:
        dist = math.sqrt((vx-x1)**2 + (vy-y1)**2)
    else:
        t = max(0, min(1, ((vx - x1)*dx + (vy - y1)*dy) / l2))
        proj_x = x1 + t*dx
        proj_y = y1 + t*dy
        dist = math.sqrt((vx - proj_x)**2 + (vy - proj_y)**2)
    if dist < 0.8:
        print(f"Seg [{lay}] ({x1:.2f}, {y1:.2f}) -> ({x2:.2f}, {y2:.2f}) net='{snet}': dist={dist:.3f}")
