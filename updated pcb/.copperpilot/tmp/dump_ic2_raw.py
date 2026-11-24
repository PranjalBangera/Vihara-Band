with open('Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    lines = f.readlines()

in_ic2 = False
ic2_lines = []
for line in lines:
    if '(property "Reference" "IC2"' in line or '(property "Reference" "IC2")' in line:
        in_ic2 = True
    if in_ic2:
        ic2_lines.append(line)
        if line.strip() == '(embedded_fonts no)' or len(ic2_lines) > 500:
            break

# Let's find footprint containing IC2
content = "".join(lines)
import re
fps = re.split(r'\(footprint\s+', content)
for fp in fps:
    if '"IC2"' in fp:
        print("Found IC2 footprint block!")
        for line in fp.splitlines()[:60]:
            print(line[:100])
        break
