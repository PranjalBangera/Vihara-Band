with open("Medical Wearable Patch recovered.kicad_pcb", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

import re
zones = re.findall(r'\(zone\s+.*?\(layers\s+([^\)]+)\).*?\(net\s+(\d+)\).*?\(net_name\s+"([^"]*)"\)', text, re.DOTALL)
print("Zones:", len(zones))
for z in zones:
    print("  Layers:", z[0], "Net:", z[1], "Net name:", z[2])

# Check Edge.Cuts
edge_cuts = re.findall(r'\((?:gr_line|gr_rect|gr_circle|gr_arc)\s+.*?layer\s+"Edge\.Cuts"[^\)]*\)', text, re.DOTALL)
print("Edge.Cuts items:", len(edge_cuts))
for ec in edge_cuts[:10]:
    print(" ", ec.replace("\n", " "))
