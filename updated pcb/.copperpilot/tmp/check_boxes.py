with open('.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re

def check_box(x_min, x_max, y_min, y_max):
    print(f"=== Check box x:[{x_min}, {x_max}], y:[{y_min}, {y_max}] ===")
    fps = text.split('(footprint ')
    for fp_chunk in fps[1:]:
        m_at = re.search(r'\(at\s+([\d.-]+)\s+([\d.-]+)', fp_chunk)
        if not m_at: continue
        fx, fy = float(m_at.group(1)), float(m_at.group(2))
        m_ref = re.search(r'\(property "Reference" "([^"]+)"', fp_chunk)
        ref = m_ref.group(1) if m_ref else '?'
        pad_chunks = re.findall(r'\(pad\s+"[^"]+".*?\n\t\t\)', fp_chunk, re.DOTALL)
        for pc in pad_chunks:
            m_pat = re.search(r'\(at\s+([\d.-]+)\s+([\d.-]+)', pc)
            if not m_pat: continue
            px, py = float(m_pat.group(1)), float(m_pat.group(2))
            # rough absolute
            ax = fx + px # for 0 rotation
            ay = fy + py
            # check rotation of fp
            m_rot = re.search(r'\(at\s+[\d.-]+\s+[\d.-]+\s+([\d.-]+)', fp_chunk)
            rot = float(m_rot.group(1)) if m_rot else 0.0
            if rot == 180 or rot == -180:
                ax = fx - px
                ay = fy - py
            elif rot == 90:
                ax = fx - py
                ay = fy + px
            elif rot == -90 or rot == 270:
                ax = fx + py
                ay = fy - px
            if x_min <= ax <= x_max and y_min <= ay <= y_max:
                p_num = re.search(r'\(pad\s+"([^"]+)"', pc).group(1)
                net = re.search(r'\(net\s+"([^"]*)"', pc)
                net_name = net.group(1) if net else ''
                print(f"  Pad {ref}.{p_num} at ({ax:.2f}, {ay:.2f}) net='{net_name}'")

check_box(115, 122, 78, 83)
check_box(130, 134, 72, 75)
