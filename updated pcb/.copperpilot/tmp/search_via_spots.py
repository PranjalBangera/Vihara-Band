with open('.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

import re
import math

# We want to place a 0.6mm via (0.3 drill).
# Board setup constraints:
# min clearance = 0.100 mm (copper to copper)
# min hole clearance = 0.250 mm (hole to copper)

# Let's collect all pads and segments on F.Cu and B.Cu
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

def evaluate_via(vx, vy, target_net):
    vr = 0.3 # copper radius
    hr = 0.15 # drill radius
    # check against pads with different net
    for p in pads:
        if p['net'] == target_net: continue
        dx = max(abs(vx - p['x']) - p['w']/2, 0)
        dy = max(abs(vy - p['y']) - p['h']/2, 0)
        dist_copper = math.sqrt(dx*dx + dy*dy) - vr
        dist_hole = math.sqrt(dx*dx + dy*dy) - hr
        if dist_copper < 0.15 or dist_hole < 0.28:
            return False, f"Near pad {p['ref']} (net={p['net']}): copper_clr={dist_copper:.3f}, hole_clr={dist_hole:.3f}"
    return True, "OK"

# Candidate points for SWCLK via:
print("--- SWCLK candidates ---")
for x in [117.5, 118.0, 118.5, 119.0, 119.5, 120.0, 120.5, 121.0]:
    for y in [78.5, 79.0, 79.5, 79.76, 80.0, 80.5, 81.0, 82.5, 83.0, 83.5, 84.0]:
        ok, reason = evaluate_via(x, y, '/BG22/SWCLK')
        if ok:
            print(f"SWCLK via OK at ({x:.2f}, {y:.2f})")

# Candidate points for SDA via near U1:
print("--- SDA candidates ---")
for x in [128.5, 129.0, 129.5, 130.0, 130.5, 131.0, 131.5, 132.0, 132.5, 133.0]:
    for y in [72.0, 72.5, 73.0, 73.2, 73.5, 75.5, 76.0, 76.5]:
        ok, reason = evaluate_via(x, y, '/BG22/SDA')
        if ok:
            print(f"SDA via OK at ({x:.2f}, {y:.2f})")
