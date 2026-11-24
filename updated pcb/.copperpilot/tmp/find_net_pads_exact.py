with open('.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# Split by (footprint
fps = text.split('(footprint ')
for net in ['/BG22/SCL', '/BG22/SDA']:
    print(f"=== Net {net} Pads ===")
    for fp_chunk in fps[1:]:
        m_ref = re.search(r'\(property "Reference" "([^"]+)"', fp_chunk)
        if not m_ref:
            continue
        ref = m_ref.group(1)
        # find all pads with net
        pads = re.findall(r'\(pad "([^"]+)".*?\(net "' + re.escape(net) + r'"\)', fp_chunk, re.DOTALL)
        for p in pads:
            print(f"  {ref} pad {p}")
