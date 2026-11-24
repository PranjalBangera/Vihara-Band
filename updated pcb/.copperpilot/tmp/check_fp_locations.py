with open("Medical Wearable Patch recovered.kicad_pcb", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

import re
matches = re.finditer(r'\(footprint\s+"([^"]+)".*?\(at\s+([0-9\.\-]+)\s+([0-9\.\-]+).*?\(property\s+"Reference"\s+"([^"]+)"', text, re.DOTALL)
fps = []
for m in matches:
    fp_name = m.group(1)
    x = float(m.group(2))
    y = float(m.group(3))
    ref = m.group(4)
    fps.append((ref, fp_name, x, y))

print(f"Total placed footprints in recovered: {len(fps)}")
min_x = min(x for r, f, x, y in fps)
max_x = max(x for r, f, x, y in fps)
min_y = min(y for r, f, x, y in fps)
max_y = max(y for r, f, x, y in fps)
print(f"Bounding box: X=[{min_x:.2f}, {max_x:.2f}], Y=[{min_y:.2f}, {max_y:.2f}]")
print(f"Span: dX={max_x-min_x:.2f} mm, dY={max_y-min_y:.2f} mm")

print("\nSample footprint locations:")
for r, f, x, y in sorted(fps, key=lambda item: item[0])[:15]:
    print(f"  {r:6s} at ({x:7.2f}, {y:7.2f}) - {f}")
