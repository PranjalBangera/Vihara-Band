with open('.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re

for net in ['/BG22/SWCLK', '/BG22/RST']:
    print(f"================ {net} ================")
    segs = re.findall(r'\(segment\s+\(start\s+([\d.-]+)\s+([\d.-]+)\)\s+\(end\s+([\d.-]+)\s+([\d.-]+)\)\s+\(width\s+([\d.-]+)\)\s+\(layer "([^"]+)"\)\s+\(net "' + re.escape(net) + r'"\).*?\(uuid "([^"]+)"\)\s*\)', text, re.DOTALL)
    for s in segs:
        x1, y1, x2, y2 = float(s[0]), float(s[1]), float(s[2]), float(s[3])
        if 108 <= (x1+x2)/2 <= 118 and 79 <= (y1+y2)/2 <= 90:
            print(f"  SEG near J5: ({x1:.2f}, {y1:.2f}) -> ({x2:.2f}, {y2:.2f}) on {s[5]} uuid={s[6]}")
