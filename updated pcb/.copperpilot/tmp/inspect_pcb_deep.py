import re

with open('Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    content = f.read()

print(f"File length: {len(content)} chars")

# Check layers
layers_match = re.search(r'\(layers\s*(.*?)\n\s*\)', content, re.DOTALL)
if layers_match:
    print("LAYERS:")
    print(layers_match.group(1))

# Check setup / stackup
stackup_match = re.search(r'\(stackup\s*(.*?)\n\s*\)', content, re.DOTALL)
if stackup_match:
    print("STACKUP:")
    print(stackup_match.group(1)[:1000])

# Check edge.cuts
edge_cuts = re.findall(r'\((gr_line|gr_arc|gr_rect|gr_circle)[^)]*Edge\.Cuts[^)]*\)', content)
print(f"Edge.Cuts primitives: {len(edge_cuts)}")
for ec in edge_cuts[:10]:
    print(ec)

# Check zones
zones = re.findall(r'\(zone\s+.*?\(net\s+(\d+)\)\s+\(net_name\s+"([^"]*)"\)\s+\(layers\s+"([^"]*)"\)', content)
print(f"Zones found: {len(zones)}")
for z in zones:
    print(z)

# Check all nets
nets = re.findall(r'\(net\s+(\d+)\s+"([^"]*)"\)', content)
print(f"Total nets defined: {len(nets)}")
print("Sample nets:", nets[:15])
