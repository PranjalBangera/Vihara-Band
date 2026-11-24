with open('.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re

m = re.findall(r'\(gr_.*?"Edge\.Cuts".*?\)', text, re.DOTALL)
for item in m:
    print(item.strip())
