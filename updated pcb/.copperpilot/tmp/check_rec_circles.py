with open("Medical Wearable Patch recovered.kicad_pcb", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

import re
circles = re.findall(r'\(gr_circle\s+.*?\)', text, re.DOTALL)
print("Circles in recovered PCB:", len(circles))
for c in circles:
    print(" ", c.replace("\n", " "))
