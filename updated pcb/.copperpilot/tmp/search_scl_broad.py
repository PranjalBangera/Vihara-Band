import re
import math

with open('.copperpilot/tmp/staging/drc-remediation-01/baseline/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

# collect all pads
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
        pads.append({'ref': f"{ref}.{p_num}", 'x': ax, 'y': ay, 'w': sw, 'h': sh, 'net': net_name})

def evaluate_spot(vx, vy, target_net):
    vr = 0.3
    hr = 0.15
    for p in pads:
        if p['net'] == target_net: continue
        dx = max(abs(vx - p['x']) - p['w']/2, 0)
        dy = max(abs(vy - p['y']) - p['h']/2, 0)
        dist_copper = math.sqrt(dx*dx + dy*dy) - vr
        dist_hole = math.sqrt(dx*dx + dy*dy) - hr
        if dist_copper < 0.12 or dist_hole < 0.26:
            return False
    vias = re.findall(r'\(via\s+\(at\s+([\d.-]+)\s+([\d.-]+)\).*?\(net "([^"]*)"\).*?\)', text, re.DOTALL)
    for v in vias:
        ex, ey, enet = float(v[0]), float(v[1]), v[2]
        if enet == target_net or enet == '': continue
        dist = math.sqrt((vx-ex)**2 + (vy-ey)**2)
        if dist < 0.70:
            return False
    segs = re.findall(r'\(segment\s+\(start\s+([\d.-]+)\s+([\d.-]+)\)\s+\(end\s+([\d.-]+)\s+([\d.-]+)\).*?\(layer "([^"]+)"\)\s+\(net "([^"]*)"\).*?\)', text, re.DOTALL)
    for s in segs:
        x1, y1, x2, y2, lay, snet = float(s[0]), float(s[1]), float(s[2]), float(s[3]), s[4], s[5]
        if snet == target_net or snet == '': continue
        dx, dy = x2 - x1, y2 - y1
        l2 = dx*dx + dy*dy
        if l2 == 0:
            dist = math.sqrt((vx-x1)**2 + (vy-y1)**2)
        else:
            t = max(0, min(1, ((vx - x1)*dx + (vy - y1)*dy) / l2))
            proj_x = x1 + t*dx
            proj_y = y1 + t*dy
            dist = math.sqrt((vx - proj_x)**2 + (vy - proj_y)**2)
        if dist < 0.45:
            return False
    return True

print("=== SCL candidates in x:[123, 131] ===")
for x in [123.0, 124.0, 125.0, 126.0, 127.0, 128.0, 129.0, 130.0]:
    for y in [73.0, 74.0, 75.0, 76.0, 77.0, 78.0, 79.0, 80.0, 81.0, 82.0, 83.0, 84.0, 85.0]:
        if evaluate_spot(x, y, '/BG22/SCL'):
            print(f"SCL via OK at ({x:.2f}, {y:.2f})")
