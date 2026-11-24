with open("Medical Wearable Patch.kicad_pcb", "r", encoding="utf-8", errors="ignore") as f:
    text_orig = f.read()

with open("Medical Wearable Patch recovered.kicad_pcb", "r", encoding="utf-8", errors="ignore") as f:
    text_rec = f.read()

import re
fps_orig = set(re.findall(r'\(footprint\s+"?([^"\s\)]+)"?', text_orig))
fps_rec = set(re.findall(r'\(footprint\s+"?([^"\s\)]+)"?', text_rec))

refs_orig = set(re.findall(r'\(property\s+"Reference"\s+"([^"]+)"', text_orig))
refs_rec = set(re.findall(r'\(property\s+"Reference"\s+"([^"]+)"', text_rec))

print("Original PCB references count:", len(refs_orig))
print("Recovered PCB references count:", len(refs_rec))

print("Refs in recovered but not in original:", refs_rec - refs_orig)
print("Refs in original but not in recovered:", refs_orig - refs_rec)
