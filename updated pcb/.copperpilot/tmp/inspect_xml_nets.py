import xml.etree.ElementTree as ET

tree = ET.parse(".copperpilot/tmp/recovered.xml")
root = tree.getroot()

nets = root.find("nets")
print(f"Total nets in recovered.xml: {len(nets)}")
all_net_names = []
for net in nets:
    code = net.get("code")
    name = net.get("name")
    nodes = net.findall("node")
    all_net_names.append((name, len(nodes)))

print("\nAll nets in schematic (recovered.xml):")
for name, count in sorted(all_net_names, key=lambda x: -x[1]):
    print(f"  {name:30s} : {count:2d} nodes")
