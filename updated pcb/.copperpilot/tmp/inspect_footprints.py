import re

with open('Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    content = f.read()

# Find footprints
fps = re.findall(r'\(footprint\s+"([^"]+)"\s+.*?\(at\s+([\d.-]+)\s+([\d.-]+)(?:\s+([\d.-]+))?\)\s+.*?\(property\s+"Reference"\s+"([^"]+)"\)', content, re.DOTALL)
print(f"Total footprints: {len(fps)}")

# Print footprint positions and references
for fp in sorted(fps, key=lambda x: x[4]):
    rot = fp[3] if fp[3] else "0"
    print(f"{fp[4]:8s} | Pos: ({float(fp[1]):6.2f}, {float(fp[2]):6.2f}) | Rot: {rot:5s} | Footprint: {fp[0]}")
