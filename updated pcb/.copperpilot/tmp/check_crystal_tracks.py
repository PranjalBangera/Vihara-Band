with open('Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    content = f.read()

import re
segments = re.findall(r'\(segment\s+\(start\s+([\d.-]+)\s+([\d.-]+)\)\s+\(end\s+([\d.-]+)\s+([\d.-]+)\)\s+\(width\s+([\d.-]+)\)\s+\(layer\s+"([^"]+)"\)\s+\(net\s+"([^"]+)"\)', content)
for s in segments:
    if 'X1' in s[6] or 'X2' in s[6] or 'LFXO' in s[6]:
        print(f"Net {s[6]:15s} | Layer {s[5]:6s} | Width {s[4]} | ({s[0]}, {s[1]}) -> ({s[2]}, {s[3]})")
