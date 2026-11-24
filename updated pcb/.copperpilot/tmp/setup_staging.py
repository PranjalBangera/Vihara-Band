import os
import shutil

op_id = 'drc-remediation-01'
base_dir = os.path.join('.copperpilot', 'tmp', 'staging', op_id)
baseline = os.path.join(base_dir, 'baseline')
candidate = os.path.join(base_dir, 'candidate')

os.makedirs(baseline, exist_ok=True)
os.makedirs(candidate, exist_ok=True)

for fname in ['Medical Wearable Patch recovered.kicad_pcb', 'Medical Wearable Patch recovered.kicad_pro']:
    if os.path.exists(fname):
        shutil.copy2(fname, os.path.join(baseline, fname))
        shutil.copy2(fname, os.path.join(candidate, fname))
        print(f'Staged {fname}')
