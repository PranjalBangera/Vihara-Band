import sys
sys.stdout.reconfigure(encoding='utf-8')
import re

with open("Medical Wearable Patch recovered.kicad_pcb", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

footprints = re.findall(r'\(footprint\s+"([^"]+)".*?\(property\s+"Reference"\s+"([^"]+)".*?\(at\s+([0-9.-]+)\s+([0-9.-]+)', text, re.DOTALL)
print(f"Total footprints placed: {len(footprints)}")
for fp, ref, x, y in sorted(footprints, key=lambda f: (f[1][0], int(f[1][1:]) if f[1][1:].isdigit() else 999)):
    print(f"{ref:<8} at ({float(x):>7.2f}, {float(y):>7.2f}) : {fp}")
