with open('.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re

segs = re.findall(r'\(segment\s+\(start\s+([\d.-]+)\s+([\d.-]+)\)\s+\(end\s+([\d.-]+)\s+([\d.-]+)\)\s+\(width\s+([\d.-]+)\)\s+\(layer "([^"]+)"\)\s+\(net "/BG22/SWCLK"\).*?\(uuid "([^"]+)"\)\s*\)', text, re.DOTALL)
for s in segs:
    print(f"({float(s[0]):.2f}, {float(s[1]):.2f}) -> ({float(s[2]):.2f}, {float(s[3]):.2f}) on {s[5]} uuid={s[6]}")
