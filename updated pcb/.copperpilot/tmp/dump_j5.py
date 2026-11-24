import xml.etree.ElementTree as ET

tree = ET.parse('.copperpilot/tmp/recovered.xml')
root = tree.getroot()

print("--- J5 PINS ---")
for net in root.find('nets').findall('net'):
    name = net.get('name')
    for node in net.findall('node'):
        if node.get('ref') == 'J5':
            print(f"Pin {node.get('pin'):>2} ({node.get('pinfunction'):<10}) -> Net: {name}")
