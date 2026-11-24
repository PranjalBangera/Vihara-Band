import math

# Use fast parsed fps
with open('Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    lines = f.readlines()

fps = {}
current_fp = None
depth = 0
for line in lines:
    stripped = line.strip()
    if stripped.startswith('(footprint '):
        current_fp = {'ref': '', 'at': None}
        depth = 1
        continue
    if current_fp:
        depth += line.count('(') - line.count(')')
        if '(property "Reference"' in stripped:
            parts = stripped.split('"')
            if len(parts) >= 4:
                current_fp['ref'] = parts[3]
        elif stripped.startswith('(at ') and not current_fp['at']:
            parts = stripped[4:-1].strip().split()
            current_fp['at'] = (float(parts[0]), float(parts[1]))
        if depth <= 0:
            if current_fp['ref'] and current_fp['at']:
                fps[current_fp['ref']] = current_fp['at']
            current_fp = None

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
    'C18': ('U3', 1, 'VIN'),
    'C21': ('U3', 5, 'VOUT'),
}

print(f"Parsed {len(fps)} footprints.")
print("Decoupling distances:")
for cap, (ic_ref, pin_num, rail) in caps.items():
    if cap in fps and ic_ref in fps:
        cx, cy = fps[cap]
        ix, iy = fps[ic_ref]
        dist = math.sqrt((cx - ix)**2 + (cy - iy)**2)
        print(f"  {cap:4s} -> {ic_ref} (Pin {pin_num:2d}, {rail:10s}): dist = {dist:5.2f} mm | Cap at ({cx:6.2f}, {cy:6.2f}) vs {ic_ref} at ({ix:6.2f}, {iy:6.2f})")
    else:
        print(f"  {cap:4s} or {ic_ref} not found in fps!")
