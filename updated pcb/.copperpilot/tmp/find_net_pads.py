with open('.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re

for net in ['/BG22/SCL', '/BG22/SDA']:
    print(f"=== Net {net} Pads ===")
    matches = re.finditer(r'\(footprint\s+"([^"]+)".*?\(property\s+"Reference"\s+"([^"]+)".*?\(pad\s+"([^"]+)".*?\(net\s+"' + re.escape(net) + r'"\)', text, re.DOTALL)
    for m in matches:
        # find the footprint position
        fp_ref = m.group(2)
        pad_num = m.group(3)
        # get pad center
        pad_chunk = text[m.start():text.find(')', m.start()+len(m.group(0)))+1]
        print(f"  {fp_ref} pad {pad_num}")
