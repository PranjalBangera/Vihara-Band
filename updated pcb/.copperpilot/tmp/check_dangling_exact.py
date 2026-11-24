with open('.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re

dangling_vias = [
    "5b1ee752-1f83-4f5f-9915-2770d3c58a56",
    "67f33c6c-9574-4a37-8444-a44ef9f704d7",
    "eeee087f-4717-443c-bb9a-fd02d54bff7f",
    "669efcbb-f21d-4508-b154-5bc52c38d3fc"
]

for uid in dangling_vias:
    pos = text.find(uid)
    start = text.rfind('(via', 0, pos)
    end = text.find(')', pos) + 1
    chunk = text[start:end]
    print(f"=== VIA {uid} ===")
    print(chunk.strip())
