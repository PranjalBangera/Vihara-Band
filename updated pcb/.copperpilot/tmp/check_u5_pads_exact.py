with open('.copperpilot/tmp/staging/drc-remediation-01/baseline/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re

fps = text.split('(footprint ')
for fp_chunk in fps[1:]:
    if '(property "Reference" "U5"' in fp_chunk:
        pad_chunks = re.findall(r'\(pad\s+"[^"]+".*?\n\t\t\)', fp_chunk, re.DOTALL)
        for pc in pad_chunks:
            p_num = re.search(r'\(pad\s+"([^"]+)"', pc).group(1)
            net = re.search(r'\(net\s+"([^"]*)"', pc)
            net_name = net.group(1) if net else ''
            print(f"U5 pad {p_num} net='{net_name}'")
            # find pos from drc items or calculate
