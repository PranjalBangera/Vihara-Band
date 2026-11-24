with open('.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# 1. Look around SWCLK trace between (121.78, 79.76) and (118.62, 79.76)
print("=== Area around SWCLK (x: 119-122, y: 78.5-81) ===")
fps = text.split('(footprint ')
for fp_chunk in fps[1:]:
    m_at = re.search(r'\(at\s+([\d.-]+)\s+([\d.-]+)', fp_chunk)
    if m_at:
        fx, fy = float(m_at.group(1)), float(m_at.group(2))
        if 117 <= fx <= 123 and 78 <= fy <= 82:
            m_ref = re.search(r'\(property "Reference" "([^"]+)"', fp_chunk)
            print(f"FP {m_ref.group(1) if m_ref else 'unknown'} at ({fx:.2f}, {fy:.2f})")

# 2. Look around SDA near U1
print("=== Area around SDA near U1 (x: 128-132, y: 72-76) ===")
for fp_chunk in fps[1:]:
    m_at = re.search(r'\(at\s+([\d.-]+)\s+([\d.-]+)', fp_chunk)
    if m_at:
        fx, fy = float(m_at.group(1)), float(m_at.group(2))
        if 128 <= fx <= 134 and 72 <= fy <= 76:
            m_ref = re.search(r'\(property "Reference" "([^"]+)"', fp_chunk)
            print(f"FP {m_ref.group(1) if m_ref else 'unknown'} at ({fx:.2f}, {fy:.2f})")
