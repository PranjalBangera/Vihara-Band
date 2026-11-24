with open('.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re

for net in ['/BG22/SCL', '/BG22/SDA']:
    print(f"=== Net {net} ===")
    vias = re.findall(r'\(via\s+\(at\s+([\d.-]+)\s+([\d.-]+)\).*?\(net "' + re.escape(net) + r'"\).*?\(uuid "([^"]+)"\)\s*\)', text, re.DOTALL)
    segs = re.findall(r'\(segment\s+\(start\s+([\d.-]+)\s+([\d.-]+)\)\s+\(end\s+([\d.-]+)\s+([\d.-]+)\)\s+\(width\s+([\d.-]+)\)\s+\(layer "([^"]+)"\)\s+\(net "' + re.escape(net) + r'"\).*?\(uuid "([^"]+)"\)\s*\)', text, re.DOTALL)
    print(f"Total vias: {len(vias)}, Total segments: {len(segs)}")
    for v in vias:
        print(f"  VIA at ({float(v[0]):.2f}, {float(v[1]):.2f}) uuid={v[2]}")
    for s in segs:
        # print if near U5 (x between 130 and 138, y between 73 and 82)
        x1, y1, x2, y2 = float(s[0]), float(s[1]), float(s[2]), float(s[3])
        if 130 <= (x1+x2)/2 <= 138 and 73 <= (y1+y2)/2 <= 82:
            print(f"  SEG near U5: ({x1:.2f}, {y1:.2f}) -> ({x2:.2f}, {y2:.2f}) layer={s[5]} uuid={s[6]}")
