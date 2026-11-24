import sys

with open('Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    lines = f.readlines()

current_fp = None
depth = 0
fps = []
for line in lines:
    stripped = line.strip()
    if stripped.startswith('(footprint '):
        parts = stripped.split('"')
        current_fp = {'name': parts[1] if len(parts) > 1 else 'unknown', 'ref': '', 'val': '', 'at': ''}
        depth = 1
        continue
    if current_fp:
        depth += line.count('(') - line.count(')')
        if '(property "Reference"' in stripped:
            parts = stripped.split('"')
            if len(parts) >= 4:
                current_fp['ref'] = parts[3]
        elif '(property "Value"' in stripped:
            parts = stripped.split('"')
            if len(parts) >= 4:
                current_fp['val'] = parts[3]
        elif stripped.startswith('(at ') and not current_fp['at']:
            current_fp['at'] = stripped[4:-1].strip()
        if depth <= 0:
            fps.append(current_fp)
            current_fp = None

print(f"Total footprints parsed: {len(fps)}")
for fp in sorted(fps, key=lambda x: x['ref']):
    val = fp['val'].encode('ascii', errors='replace').decode('ascii')
    print(f"{fp['ref']:8s} | Val: {val:15s} | At: {fp['at']:20s} | FP: {fp['name']}")
