with open('.copperpilot/tmp/staging/drc-remediation-01/baseline/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# Check clearance around (131.80, 75.60) for SDA
# In1.Cu has: (130.20, 76.20) -> (131.81, 74.59) net='GND'
# What is distance from (131.80, 75.60) to (130.20, 76.20)-(131.81, 74.59)?
import math
x1, y1 = 130.20, 76.20
x2, y2 = 131.81, 74.59
vx, vy = 131.80, 75.60
dx, dy = x2 - x1, y2 - y1
l2 = dx*dx + dy*dy
t = max(0, min(1, ((vx - x1)*dx + (vy - y1)*dy) / l2))
proj_x = x1 + t*dx
proj_y = y1 + t*dy
dist = math.sqrt((vx - proj_x)**2 + (vy - proj_y)**2)
print(f"Distance to In1.Cu GND track: {dist:.3f} mm")
print(f"Via radius=0.3, track radius=0.08, copper clr={dist - 0.38:.3f} mm, hole clr={dist - 0.15:.3f} mm")
