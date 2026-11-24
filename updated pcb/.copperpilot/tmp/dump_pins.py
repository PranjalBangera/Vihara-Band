with open('symbols.kicad_sym', 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()
for i, l in enumerate(lines):
    if 'symbol "Chip Antenna"' in l:
        print(''.join(lines[i+150:i+200]))
        break
