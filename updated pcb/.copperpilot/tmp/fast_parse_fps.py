with open('Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    lines = f.readlines()

footprints = []
current_fp = None
for line in lines:
    stripped = line.strip()
    if stripped.startswith('(footprint '):
        parts = stripped.split('"')
        fp_name = parts[1] if len(parts) > 1 else stripped
        current_fp = {'name': fp_name, 'ref': None, 'val': None, 'at': None}
    elif current_fp is not None:
        if stripped.startswith('(at '):
            if current_fp['at'] is None:
                current_fp['at'] = stripped
        elif stripped.startswith('(property "Reference"'):
            parts = stripped.split('"')
            if len(parts) >= 4:
                current_fp['ref'] = parts[3]
        elif stripped.startswith('(property "Value"'):
            parts = stripped.split('"')
            if len(parts) >= 4:
                current_fp['val'] = parts[3]
        elif stripped == ')':
            # end of footprint or sub-element, but we record when ref is found
            pass

# Better parser by tracking paren depth
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
    print(f"{fp['ref']:8s} | Val: {fp['val']:15s} | At: {fp['at']:15s} | FP: {fp['name']}")
