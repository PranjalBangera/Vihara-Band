import subprocess
import json
import uuid

with open('.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's check how many violations currently exist in candidate
cmd = [
    r'C:\Program Files\KiCad\10.0\bin\kicad-cli.exe',
    'pcb', 'drc',
    '--format', 'json',
    '--severity-all',
    '--output', '.copperpilot/tmp/test_drc_current.json',
    '.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb'
]
subprocess.run(cmd, capture_output=True, text=True)

with open('.copperpilot/tmp/test_drc_current.json', 'r', encoding='utf-8') as f:
    drc = json.load(f)

for v in drc['violations']:
    if v['severity'] == 'error':
        print(f"ERROR: {v['type']} - {v['description']}")
        for it in v['items']:
            print(f"   {it['description']} at ({it['pos']['x']}, {it['pos']['y']})")
