import shutil
import os

candidate = '.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb'
primary = 'Medical Wearable Patch recovered.kicad_pcb'

shutil.copy2(candidate, primary)
print("Promoted candidate to primary:", primary)
