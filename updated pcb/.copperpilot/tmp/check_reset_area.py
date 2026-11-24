with open("MCU.kicad_sch", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

import re

# find wire coordinates near x=20..50, y=75..105
wires = re.findall(r'\(wire\s+\(pts\s+\(xy\s+([0-9.-]+)\s+([0-9.-]+)\)\s+\(xy\s+([0-9.-]+)\s+([0-9.-]+)\)\)', text)
print("Wires in Reset area:")
for x1, y1, x2, y2 in wires:
    if 20 <= float(x1) <= 60 and 75 <= float(y1) <= 105:
        print(f"  ({x1}, {y1}) -> ({x2}, {y2})")

# find labels near this area
labels = re.findall(r'\((?:label|global_label|hierarchical_label)\s+"([^"]+)".*?\(at\s+([0-9.-]+)\s+([0-9.-]+)', text, re.DOTALL)
print("\nLabels in Reset area:")
for name, x, y in labels:
    if 20 <= float(x) <= 60 and 75 <= float(y) <= 105:
        print(f"  {name} at ({x}, {y})")
