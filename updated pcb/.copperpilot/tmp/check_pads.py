with open("Medical Wearable Patch recovered.kicad_pcb", "r", encoding="utf-8", errors="ignore") as f:
    lines = [f.readline() for _ in range(50)]
print("First 50 lines of Medical Wearable Patch recovered.kicad_pcb:")
print("".join(lines[:30]))

# Search for pad in Medical Wearable Patch recovered.kicad_pcb
with open("Medical Wearable Patch recovered.kicad_pcb", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

import re
pads = re.findall(r'\(pad\s+[^\n]+', text)
print(f"Total pads found: {len(pads)}")
for p in pads[:10]:
    print(" ", p)
