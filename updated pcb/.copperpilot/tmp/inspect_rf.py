import xml.etree.ElementTree as ET

tree = ET.parse('.copperpilot/tmp/recovered.xml')
root = tree.getroot()

rf_nets = ['/BG22/RF2G4_IO', '/BG22/RF1', '/BG22/RF2', '/BG22/RF3']

for net in root.find('nets').findall('net'):
    name = net.get('name')
    if any(r in name for r in ['RF', 'ANT']):
        nodes = [(node.get('ref'), node.get('pin'), node.get('pinfunction')) for node in net.findall('node')]
        print(f"Net {name}:")
        for ref, pin, fn in nodes:
            # find value
            val = ''
            fp = ''
            for comp in root.find('components').findall('comp'):
                if comp.get('ref') == ref:
                    val = comp.find('value').text if comp.find('value') is not None else ''
                    fp = comp.find('footprint').text if comp.find('footprint') is not None else ''
            print(f"  {ref}.{pin} ({fn}) -> {val} [{fp}]")
