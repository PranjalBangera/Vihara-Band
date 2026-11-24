with open('Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    content = f.read()

import re
fps = re.split(r'\(footprint\s+', content)
for fp in fps:
    if '"IC2"' in fp:
        pads = re.findall(r'\(pad\s+"([^"]+)"\s+([^\s]+)\s+([^\s]+)\s+\(at\s+([\d.-]+)\s+([\d.-]+)[^)]*\)\s+\(size\s+([\d.-]+)\s+([\d.-]+)\).*?\(net\s+"([^"]*)"\)', fp, re.DOTALL)
        print(f"Total pads matched for IC2: {len(pads)}")
        for p in pads:
            print(f"Pad {p[0]:4s} | type {p[1]:8s} | at ({p[3]:6s}, {p[4]:6s}) | size ({p[5]:4s}, {p[6]:4s}) | net {p[7]}")
        break
