with open('.copperpilot/tmp/staging/drc-remediation-01/baseline/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re

segs = re.findall(r'\(segment\s+\(start\s+([\d.-]+)\s+([\d.-]+)\)\s+\(end\s+([\d.-]+)\s+([\d.-]+)\)\s+\(width\s+([\d.-]+)\)\s+\(layer "In2.Cu"\)\s+\(net "([^"]*)"\).*?\(uuid "([^"]+)"\)\s*\)', text, re.DOTALL)
print(f"Total In2.Cu segments in entire board: {len(segs)}")
for s in segs:
    print(f"In2.Cu: ({float(s[0]):.2f}, {float(s[1]):.2f}) -> ({float(s[2]):.2f}, {float(s[3]):.2f}) net='{s[5]}'")
