with open('.copperpilot/tmp/staging/drc-remediation-01/baseline/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re
import math

# pads check for (132.76, 73.40)
vx, vy = 132.76, 73.40
pads = []
fps = text.split('(footprint ')
for fp_chunk in fps[1:]:
    m_at = re.search(r'\(at\s+([\d.-]+)\s+([\d.-]+)', fp_chunk)
    if not m_at: continue
    fx, fy = float(m_at.group(1)), float(m_at.group(2))
    m_rot = re.search(r'\(at\s+[\d.-]+\s+[\d.-]+\s+([\d.-]+)', fp_chunk)
    rot = float(m_rot.group(1)) if m_rot else 0.0
    m_ref = re.search(r'\(property "Reference" "([^"]+)"', fp_chunk)
    ref = m_ref.group(1) if m_ref else '?'
    pad_chunks = re.findall(r'\(pad\s+"[^"]+".*?\n\t\t\)', fp_chunk, re.DOTALL)
    for pc in pad_chunks:
        m_pat = re.search(r'\(at\s+([\d.-]+)\s+([\d.-]+)', pc)
        if not m_pat: continue
        px, py = float(m_pat.group(1)), float(m_pat.group(2))
        m_size = re.search(r'\(size\s+([\d.-]+)\s+([\d.-]+)', pc)
        sw, sh = float(m_size.group(1)), float(m_size.group(2)) if m_size else (0.5, 0.5)
        if rot == 180 or rot == -180:
            ax, ay = fx - px, fy - py
        elif rot == 90:
            ax, ay = fx - py, fy + px
            sw, sh = sh, sw
        elif rot == -90 or rot == 270:
            ax, ay = fx + py, fy - px
            sw, sh = sh, sw
        else:
            ax, ay = fx + px, fy + py
        p_num = re.search(r'\(pad\s+"([^"]+)"', pc).group(1)
        net = re.search(r'\(net\s+"([^"]*)"', pc)
        net_name = net.group(1) if net else ''
        dx = max(abs(vx - ax) - sw/2, 0)
        dy = max(abs(vy - ay) - sh/2, 0)
        d = math.sqrt(dx*dx + dy*dy)
        if d < 1.5:
            print(f"Pad {ref}.{p_num} (net='{net_name}') at ({ax:.2f}, {ay:.2f}) [size {sw:.2f}x{sh:.2f}]: edge-to-center dist={d:.3f}, copper_clr={d-0.3:.3f}, hole_clr={d-0.15:.3f}")
