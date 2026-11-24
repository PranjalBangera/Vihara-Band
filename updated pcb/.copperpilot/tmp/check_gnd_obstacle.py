with open('.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# find segment near (117.45, 80)
m = re.search(r'\(segment.*?117\.45.*?\(uuid "dd7ae23c-801e-4f68-ad6b-de1d864539ea"\)\s*\)', text, re.DOTALL)
if m:
    print(m.group(0).strip())

# find all components near (117, 80)
fps = text.split('(footprint ')
for fp_chunk in fps[1:]:
    m_at = re.search(r'\(at\s+([\d.-]+)\s+([\d.-]+)', fp_chunk)
    if m_at:
        fx, fy = float(m_at.group(1)), float(m_at.group(2))
        if 115 <= fx <= 120 and 76 <= fy <= 82:
            m_ref = re.search(r'\(property "Reference" "([^"]+)"', fp_chunk)
            print(f"FP {m_ref.group(1) if m_ref else 'unknown'} at ({fx:.2f}, {fy:.2f})")
