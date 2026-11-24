import sys
import xml.etree.ElementTree as ET

sys.stdout.reconfigure(encoding='utf-8')

tree = ET.parse('.copperpilot/tmp/recovered.xml')
root = tree.getroot()

components = []
for comp in root.find('components').findall('comp'):
    ref = comp.get('ref')
    val = comp.find('value').text if comp.find('value') is not None else ''
    fp = comp.find('footprint').text if comp.find('footprint') is not None else ''
    sheetpath = comp.find('sheetpath').get('names') if comp.find('sheetpath') is not None else ''
    components.append((ref, val, fp, sheetpath))

print(f"Total components: {len(components)}")
for c in sorted(components, key=lambda x: (x[0][0], int(x[0][1:]) if x[0][1:].isdigit() else 999)):
    print(f"{c[0]:<8} {c[1]:<25} {c[3]:<25} {c[2]}")

print("\n--- NETS ---")
nets = []
for net in root.find('nets').findall('net'):
    code = net.get('code')
    name = net.get('name')
    nodes = [(node.get('ref'), node.get('pin'), node.get('pinfunction')) for node in net.findall('node')]
    nets.append((name, nodes))

print(f"Total nets: {len(nets)}")
for n, nodes in sorted(nets, key=lambda x: x[0]):
    node_str = ", ".join([f"{ref}.{pin}({fn})" for ref, pin, fn in nodes])
    print(f"Net {n:<35}: {node_str}")
