with open('.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# Parse footprint by footprint
fps = text.split('(footprint ')
for net in ['/BG22/SCL', '/BG22/SDA']:
    print(f"=== Net {net} Pads ===")
    for fp_chunk in fps[1:]:
        m_ref = re.search(r'\(property "Reference" "([^"]+)"', fp_chunk)
        if not m_ref:
            continue
        ref = m_ref.group(1)
        # find each (pad ...)
        pad_chunks = re.findall(r'\(pad\s+"[^"]+".*?\n\t\t\)', fp_chunk, re.DOTALL)
        for pc in pad_chunks:
            if f'(net "{net}")' in pc:
                p_num = re.search(r'\(pad\s+"([^"]+)"', pc).group(1)
                # get footprint (at x y)
                m_at = re.search(r'\(at\s+([\d.-]+)\s+([\d.-]+)', fp_chunk)
                fx, fy = float(m_at.group(1)), float(m_at.group(2))
                m_pat = re.search(r'\(at\s+([\d.-]+)\s+([\d.-]+)', pc)
                px, py = float(m_pat.group(1)), float(m_pat.group(2))
                print(f"  {ref:5s} pad {p_num:3s} at fp ({fx:.2f}, {fy:.2f}) rel ({px:.2f}, {py:.2f})")
