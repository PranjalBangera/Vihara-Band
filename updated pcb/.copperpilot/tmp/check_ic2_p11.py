with open('.copperpilot/tmp/staging/drc-remediation-01/baseline/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re

fps = text.split('(footprint ')
for fp_chunk in fps[1:]:
    if '(property "Reference" "IC2"' in fp_chunk:
        pad_chunks = re.findall(r'\(pad\s+"[^"]+".*?\n\t\t\)', fp_chunk, re.DOTALL)
        for pc in pad_chunks:
            if '(pad "11"' in pc or '(pad "10"' in pc or '(pad "12"' in pc:
                print(pc.strip())
                print('-'*20)
