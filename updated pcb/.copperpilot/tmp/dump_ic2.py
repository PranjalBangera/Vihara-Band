import xml.etree.ElementTree as ET

tree = ET.parse('.copperpilot/tmp/recovered.xml')
root = tree.getroot()

ic2_pins = {}
for comp in root.find('components').findall('comp'):
    if comp.get('ref') == 'IC2':
        for prop in comp.findall('property'):
            print(f"Property: {prop.get('name')} = {prop.get('value')}")

for net in root.find('nets').findall('net'):
    net_name = net.get('name')
    for node in net.findall('node'):
        if node.get('ref') == 'IC2':
            pin = node.get('pin')
            fn = node.get('pinfunction')
            ic2_pins[int(pin) if pin.isdigit() else pin] = (pin, fn, net_name)

print("\n--- IC2 PINS AND CONNECTIONS ---")
for p in sorted(ic2_pins.keys()):
    pin, fn, net_name = ic2_pins[p]
    print(f"Pin {pin:>2} ({fn:<15}): {net_name}")
