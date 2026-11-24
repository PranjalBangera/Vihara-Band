import sys
sys.stdout.reconfigure(encoding='utf-8')
import re

with open("Medical Wearable Patch recovered.kicad_pcb", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

# match footprint block: (footprint "..." ... (at X Y [ROT]) ... (property "Reference" "REF"
fps = re.findall(r'\(footprint\s+"([^"]+)".*?\(at\s+([0-9.-]+)\s+([0-9.-]+)(?:\s+([0-9.-]+))?\).*?\(property\s+"Reference"\s+"([^"]+)"', text, re.DOTALL)
print(f"Total footprints: {len(fps)}")
for fp, x, y, rot, ref in sorted(fps, key=lambda f: (f[4][0], int(f[4][1:]) if f[4][1:].isdigit() else 999)):
    rot_str = f"rot {rot}" if rot else "rot 0"
    print(f"{ref:<8} at ({float(x):>7.2f}, {float(y):>7.2f}) {rot_str:<10} : {fp}")
