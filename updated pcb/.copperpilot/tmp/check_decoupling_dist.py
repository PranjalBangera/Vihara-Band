import math

caps = {
    'C9': ('IC2', 24, 'DECOUPLE'),
    'C15': ('IC2', 28, 'VDCDC'),
    'C13': ('IC2', 28, 'VDCDC'),
    'L5': ('IC2', 25, 'VREGSW'),
    'C3': ('IC2', 10, 'RFVDD'),
    'C4': ('IC2', 10, 'RFVDD'),
    'C6': ('IC2', 13, 'PAVDD'),
    'C7': ('IC2', 13, 'PAVDD'),
    'C27': ('U5', 8, '3V'),
    'C1': ('U1', 7, '3V'),
    'C20': ('U1', 3, '3V'),
}

# Read footprint positions from pcb
with open('Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    content = f.read()

import re
fps = {}
for m in re.finditer(r'\(footprint\s+"([^"]+)".*?\(at\s+([\d.-]+)\s+([\d.-]+).*?\(property\s+"Reference"\s+"([^"]+)"\)', content, re.DOTALL):
    ref = m.group(4)
    x = float(m.group(2))
    y = float(m.group(3))
    fps[ref] = (x, y)

print("Decoupling distances:")
for cap, (ic_ref, pin_num, rail) in caps.items():
    if cap in fps and ic_ref in fps:
        cx, cy = fps[cap]
        ix, iy = fps[ic_ref]
        dist = math.sqrt((cx - ix)**2 + (cy - iy)**2)
        print(f"  {cap:4s} -> {ic_ref} (Pin {pin_num:2d}, {rail:10s}): dist = {dist:.2f} mm | Cap at ({cx:.2f}, {cy:.2f}) vs {ic_ref} at ({ix:.2f}, {iy:.2f})")
