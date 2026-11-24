import re

with open('Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's inspect IC2 footprint pads
ic2_idx = content.find('EFR32BG22C224F512GM32-C')
if ic2_idx != -1:
    end_fp = content.find('\n\t)', ic2_idx)
    # find balanced
    p = 0
    end_ic2 = ic2_idx
    for i in range(ic2_idx, len(content)):
        if content[i] == '(':
            p += 1
        elif content[i] == ')':
            p -= 1
            if p == 0:
                end_ic2 = i + 1
                break
    ic2_text = content[ic2_idx:end_ic2]
    print("IC2 pads:")
    pads = re.findall(r'\(pad\s+"?([^"\s]+)"?\s+([^\s]+)\s+([^\s]+)\s+\(at\s+([\d.-]+)\s+([\d.-]+)(?:\s+([\d.-]+))?\)\s+\(size\s+([\d.-]+)\s+([\d.-]+)\).*?\(net\s+"([^"]*)"\)', ic2_text, re.DOTALL)
    for pad in pads:
        if pad[0] in ['33', 'EP', 'GND'] or 'GND' in pad[8]:
            print(f"Pad {pad[0]}: type {pad[1]}, shape {pad[2]}, at ({pad[3]}, {pad[4]}), size ({pad[6]}, {pad[7]}), net '{pad[8]}'")

# Check vias near IC2 (at 122.8, 77.2)
vias = re.findall(r'\(via\s+\(at\s+([\d.-]+)\s+([\d.-]+)\)\s+\(size\s+([\d.-]+)\)\s+\(drill\s+([\d.-]+)\)\s+\(layers\s+"([^"]+)"\s+"([^"]+)"\)\s+\(net\s+"([^"]+)"\)', content)
print(f"\nTotal vias in board: {len(vias)}")
ic2_vias = [v for v in vias if 120 <= float(v[0]) <= 125 and 75 <= float(v[1]) <= 79.5]
print(f"Vias near IC2 (120-125, 75-79.5): {len(ic2_vias)}")
for v in ic2_vias:
    print(f"  Via at ({v[0]}, {v[1]}), size {v[2]}, drill {v[3]}, net {v[6]}")
