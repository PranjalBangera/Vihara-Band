with open('.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re

for net in ['/BG22/SCL', '/BG22/SDA']:
    print(f"================ {net} ================")
    vias = re.findall(r'\(via\s+\(at\s+([\d.-]+)\s+([\d.-]+)\).*?\(net "' + re.escape(net) + r'"\).*?\(uuid "([^"]+)"\)\s*\)', text, re.DOTALL)
    for v in vias:
        print(f"VIA at ({float(v[0]):.2f}, {float(v[1]):.2f}) uuid={v[2]}")
    segs = re.findall(r'\(segment\s+\(start\s+([\d.-]+)\s+([\d.-]+)\)\s+\(end\s+([\d.-]+)\s+([\d.-]+)\)\s+\(width\s+([\d.-]+)\)\s+\(layer "([^"]+)"\)\s+\(net "' + re.escape(net) + r'"\).*?\(uuid "([^"]+)"\)\s*\)', text, re.DOTALL)
    for s in segs:
        print(f"  SEG: ({float(s[0]):.2f}, {float(s[1]):.2f}) -> ({float(s[2]):.2f}, {float(s[3]):.2f}) on {s[5]} uuid={s[6]}")
