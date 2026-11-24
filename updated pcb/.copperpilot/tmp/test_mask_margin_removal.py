import re
import subprocess
import json

candidate_pcb = '.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb'
baseline_pcb = '.copperpilot/tmp/staging/drc-remediation-01/baseline/Medical Wearable Patch recovered.kicad_pcb'

with open(baseline_pcb, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Delete all unnetted segments and vias
text = re.sub(r'\t\(segment\s+.*?\(net ""\).*?\(uuid "[^"]+"\)\s*\)\n', '', text, flags=re.DOTALL)
text = re.sub(r'\t\(via\s+.*?\(net ""\).*?\(uuid "[^"]+"\)\s*\)\n', '', text, flags=re.DOTALL)

# 2. Test removing (solder_mask_margin 0.102) from pads
text_no_margin = text.replace('(solder_mask_margin 0.102)\n\t\t\t', '').replace('(solder_mask_margin 0.102)', '')

with open(candidate_pcb, 'w', encoding='utf-8') as f:
    f.write(text_no_margin)

cmd = [
    r'C:\Program Files\KiCad\10.0\bin\kicad-cli.exe',
    'pcb', 'drc',
    '--format', 'json',
    '--severity-all',
    '--output', '.copperpilot/tmp/test_drc_nomargin.json',
    candidate_pcb
]
subprocess.run(cmd, capture_output=True, text=True)

with open('.copperpilot/tmp/test_drc_nomargin.json', 'r', encoding='utf-8') as f:
    drc = json.load(f)

print(f"Total violations without local 0.102 mask margin: {len(drc['violations'])}")
by_type = {}
for v in drc['violations']:
    t = v['type']
    by_type[t] = by_type.get(t, 0) + 1

for t, count in by_type.items():
    print(f"  {t}: {count}")

for v in drc['violations']:
    if v['severity'] == 'error':
        print(f"ERROR: {v['type']} - {v['description']}")
        for it in v['items']:
            print(f"   {it['description']}")
