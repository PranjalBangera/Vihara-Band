with open("Medical Wearable Patch recovered.kicad_pcb", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

import re
idx = text.find("Edge.Cuts")
if idx != -1:
    print("Edge.Cuts context:")
    print(text[max(0, idx - 100):min(len(text), idx + 200)])

print("\n--- Zone 1 ---")
z1_idx = text.find("(zone")
if z1_idx != -1:
    print(text[z1_idx:z1_idx + 600])

z2_idx = text.find("(zone", z1_idx + 1)
if z2_idx != -1:
    print("\n--- Zone 2 ---")
    print(text[z2_idx:z2_idx + 600])
