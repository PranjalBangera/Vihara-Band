import xml.etree.ElementTree as ET

tree = ET.parse('.copperpilot/tmp/recovered.xml')
root = tree.getroot()

for comp in root.find('components').findall('comp'):
    if comp.get('ref') == 'U5':
        print(f"Ref: {comp.get('ref')}, Value: {comp.find('value').text}, Footprint: {comp.find('footprint').text}")

print("\n--- U5 PINS ---")
for net in root.find('nets').findall('net'):
    name = net.get('name')
    for node in net.findall('node'):
        if node.get('ref') == 'U5':
            print(f"Pin {node.get('pin'):>2} ({node.get('pinfunction'):<15}) -> Net: {name}")
