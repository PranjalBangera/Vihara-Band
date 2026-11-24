import re

with open('Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    content = f.read()

zones = re.findall(r'\(zone.*?\n\t\)', content, re.DOTALL)
print(f"Total zone blocks extracted: {len(zones)}")
for i, z in enumerate(zones):
    print(f"=== ZONE {i+1} ===")
    print(z[:400])
    print("...")
    print(z[-200:])

# Check if there are any other zones or polygon fills
# Search for filled_polygon or net_name in zones
print("Zone net names:")
for m in re.finditer(r'\(zone.*?(?=\n\t\))', content, re.DOTALL):
    z_text = m.group(0)
    net_m = re.search(r'\(net_name\s+"([^"]*)"\)', z_text)
    layer_m = re.search(r'\(layer[s]?\s+([^)]*)\)', z_text)
    keepout_m = re.search(r'\(keepout', z_text)
    print("Zone:", layer_m.group(0) if layer_m else "no layer", 
          "Net:", net_m.group(1) if net_m else "NO NET (or keepout)",
          "Is keepout:", bool(keepout_m))
