import re

pcb_file = "Medical Wearable Patch recovered.kicad_pcb"
with open(pcb_file, "r", encoding="utf-8") as f:
    content = f.read()

nets = re.findall(r'\(net\s+(\d+)\s+"([^"]+)"\)', content)
print(f"Total nets defined in PCB ({pcb_file}): {len(nets)}")
for num, name in nets:
    print(f"  Net {num:2s}: {name}")

segments = re.findall(r'\(segment\s', content)
vias = re.findall(r'\(via\s', content)
zones = re.findall(r'\(zone\s', content)
print(f"\nExisting segments: {len(segments)}, vias: {len(vias)}, zones: {len(zones)}")

# Check setup / netclasses
netclasses = re.findall(r'\(net_class\s+"?([^"\s\)]+)"?.*?\)', content, re.DOTALL)
print(f"\nNetclasses defined in PCB: {len(netclasses)}")
for nc in re.finditer(r'\(net_class\s+"?([^"\s\)]+)"?(.*?)\n\s*\)', content, re.DOTALL):
    print(f"Netclass: {nc.group(1)}")
    print(nc.group(2)[:200])
