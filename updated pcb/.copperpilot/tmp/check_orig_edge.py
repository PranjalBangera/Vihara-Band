with open("Medical Wearable Patch.kicad_pcb", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

import re
edge_cuts = re.findall(r'\((?:gr_line|gr_rect|gr_circle|gr_arc)\s+.*?layer\s+"Edge\.Cuts"[^\)]*\)', text, re.DOTALL)
print("Edge.Cuts in Medical Wearable Patch.kicad_pcb:", len(edge_cuts))
for ec in edge_cuts[:10]:
    print(" ", ec.replace("\n", " "))
