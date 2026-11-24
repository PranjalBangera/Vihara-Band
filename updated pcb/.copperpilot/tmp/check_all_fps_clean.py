with open("Medical Wearable Patch recovered.kicad_pcb", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

import re
matches = re.finditer(r'\(footprint\s+"([^"]+)".*?\(at\s+([0-9\.\-]+)\s+([0-9\.\-]+).*?\(property\s+"Reference"\s+"([^"]+)".*?\(property\s+"Value"\s+"([^"]+)"', text, re.DOTALL)
fps = []
for m in matches:
    fp_name = m.group(1)
    x = float(m.group(2))
    y = float(m.group(3))
    ref = m.group(4)
    val = m.group(5).encode("ascii", "replace").decode("ascii")
    fps.append((ref, val, fp_name, x, y))

print(f"Total placed footprints in recovered: {len(fps)}")
for r, v, f, x, y in sorted(fps, key=lambda item: item[0]):
    print(f"  {r:6s} {v:15s} ({x:7.2f}, {y:7.2f})  {f}")
