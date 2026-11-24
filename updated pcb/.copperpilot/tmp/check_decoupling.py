import sys
sys.stdout.reconfigure(encoding='utf-8')
import xml.etree.ElementTree as ET

tree = ET.parse('.copperpilot/tmp/recovered.xml')
root = tree.getroot()

power_nets = ['/BG22/3V', '/BG22/VDCDC', '/BG22/RFVDD', '/BG22/PAVDD', 'Net-(IC2-DECOUPLE)', 'unconnected-(IC2-AVDD-Pad29)']

for pnet in power_nets:
    print(f"\nNet {pnet}:")
    for net in root.find('nets').findall('net'):
        if net.get('name') == pnet:
            for node in net.findall('node'):
                ref = node.get('ref')
                pin = node.get('pin')
                val = ''
                for comp in root.find('components').findall('comp'):
                    if comp.get('ref') == ref:
                        val = comp.find('value').text if comp.find('value') is not None else ''
                print(f"  {ref}.{pin} -> {val}")
