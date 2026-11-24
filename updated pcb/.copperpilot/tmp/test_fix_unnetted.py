import subprocess
import json

candidate_pcb = '.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb'

cmd = [
    r'C:\Program Files\KiCad\10.0\bin\kicad-cli.exe',
    'pcb', 'drc',
    '--format', 'json',
    '--severity-all',
    '--output', '.copperpilot/tmp/test_drc1.json',
    candidate_pcb
]
res = subprocess.run(cmd, capture_output=True, text=True)
print("DRC exit code:", res.returncode)

with open('.copperpilot/tmp/test_drc1.json', 'r', encoding='utf-8') as f:
    drc = json.load(f)

print(f"Total violations: {len(drc['violations'])}")
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
