with open('.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re

for net in ['/BG22/SCL', '/BG22/SDA']:
    print(f"=== Net {net} ===")
    vias = re.findall(rf'\(via\s+.*?\(net "{re.escape(net)}"\).*?\(uuid "([^"]+)"\)\s*\)', text, re.DOTALL)
    segs = re.findall(rf'\(segment\s+.*?\(net "{re.escape(net)}"\).*?\(uuid "([^"]+)"\)\s*\)', text, re.DOTALL)
    for v in vias:
        m = re.search(rf'\(via\s+.*?\(uuid "{v}"\)\s*\)', text, re.DOTALL)
        print("VIA:", m.group(0).strip())
    for s in segs:
        m = re.search(rf'\(segment\s+.*?\(uuid "{s}"\)\s*\)', text, re.DOTALL)
        print("SEG:", m.group(0).strip())
