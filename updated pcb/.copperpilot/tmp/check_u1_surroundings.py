with open('.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re

print("=== Footprints near U1 ===")
fps = text.split('(footprint ')
for fp_chunk in fps[1:]:
    m_at = re.search(r'\(at\s+([\d.-]+)\s+([\d.-]+)', fp_chunk)
    if m_at:
        fx, fy = float(m_at.group(1)), float(m_at.group(2))
        if 127 <= fx <= 135 and 72 <= fy <= 78:
            m_ref = re.search(r'\(property "Reference" "([^"]+)"', fp_chunk)
            print(f"FP {m_ref.group(1) if m_ref else 'unknown'} at ({fx:.2f}, {fy:.2f})")

print("=== Vias near U1 ===")
vias = re.findall(r'\(via\s+\(at\s+([\d.-]+)\s+([\d.-]+)\).*?\(net "([^"]*)"\).*?\(uuid "([^"]+)"\)\s*\)', text, re.DOTALL)
for v in vias:
    vx, vy = float(v[0]), float(v[1])
    if 127 <= vx <= 134 and 72 <= vy <= 78:
        print(f"VIA at ({vx:.2f}, {vy:.2f}) net='{v[2]}' uuid={v[3]}")
