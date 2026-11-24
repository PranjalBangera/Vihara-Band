with open('.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re

for pt in ["141.975 83.625", "143.4 82.2", "143.975 73.975"]:
    print(f"=== Search for {pt} ===")
    matches = re.findall(rf'\(segment\s+.*?{pt}.*?\)', text, re.DOTALL)
    for m in matches:
        print(m.strip())
        print('-'*30)
