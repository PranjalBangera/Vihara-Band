with open('Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    content = f.read()

import re
fps = re.split(r'\(footprint\s+', content)
for fp in fps:
    for ref in ['"U2"', '"U5"', '"U1"', '"U3"']:
        if ref in fp:
            print(f"=== {ref} ===")
            pads = re.findall(r'\(pad\s+"?([^"\s]+)"?\s+([^\s]+)\s+([^\s]+)\s+\(at\s+([\d.-]+)\s+([\d.-]+)[^)]*\)\s+\(size\s+([\d.-]+)\s+([\d.-]+)\).*?\(net\s+"([^"]*)"\)', fp, re.DOTALL)
            for p in pads:
                print(f"  Pad {p[0]:4s} | type {p[1]:8s} | at ({p[3]:6s}, {p[4]:6s}) | net '{p[7]}'")
