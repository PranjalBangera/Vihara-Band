import re
import subprocess
import json

candidate_pcb = '.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb'

with open(candidate_pcb, 'r', encoding='utf-8') as f:
    text = f.read()

print("Original length:", len(text))
