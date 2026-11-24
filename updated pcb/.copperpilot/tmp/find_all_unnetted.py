with open('.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re

unnetted_segs = re.findall(r'\(segment\s+.*?\(net ""\).*?\(uuid "([^"]+)"\)\s*\)', text, re.DOTALL)
unnetted_vias = re.findall(r'\(via\s+.*?\(net ""\).*?\(uuid "([^"]+)"\)\s*\)', text, re.DOTALL)

print(f"Unnetted segments: {len(unnetted_segs)}")
print(f"Unnetted vias: {len(unnetted_vias)}")

for uid in unnetted_vias:
    m = re.search(rf'\(via\s+.*?\(uuid "{uid}"\)\s*\)', text, re.DOTALL)
    if m:
        print("VIA:", m.group(0).strip())

for uid in unnetted_segs:
    m = re.search(rf'\(segment\s+.*?\(uuid "{uid}"\)\s*\)', text, re.DOTALL)
    if m:
        print("SEG:", m.group(0).strip())
