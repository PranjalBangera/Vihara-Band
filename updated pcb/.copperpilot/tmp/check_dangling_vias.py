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
    print(f"=== VIA {uid} ===")
    m = re.search(rf'\(via\s+\(at\s+([\d.-]+)\s+([\d.-]+)\).*?\(net "([^"]+)"\).*?\(uuid "{uid}"\)\s*\)', text, re.DOTALL)
    if m:
        vx, vy, net = float(m.group(1)), float(m.group(2)), m.group(3)
        print(f"Via at ({vx}, {vy}) net={net}")
        # find segments connected to this via
        segs = re.findall(rf'\(segment\s+\(start\s+([\d.-]+)\s+([\d.-]+)\)\s+\(end\s+([\d.-]+)\s+([\d.-]+)\).*?\(layer "([^"]+)"\)\s+\(net "{re.escape(net)}"\).*?\)', text, re.DOTALL)
        for s in segs:
            x1, y1, x2, y2, lay = float(s[0]), float(s[1]), float(s[2]), float(s[3]), s[4]
            if (abs(x1-vx) < 0.01 and abs(y1-vy) < 0.01) or (abs(x2-vx) < 0.01 and abs(y2-vy) < 0.01):
                print(f"  Connected segment: ({x1}, {y1}) -> ({x2}, {y2}) on {lay}")
