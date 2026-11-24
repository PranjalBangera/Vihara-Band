with open('Temp_Sensor.kicad_sch', 'r', encoding='utf-8') as f:
    text = f.read()

import re
symbols = re.findall(r'\(property\s+"Reference"\s+"([^"]+)"\).*?\(property\s+"Value"\s+"([^"]+)"\)', text, re.DOTALL)
print(f"Symbols in Temp_Sensor.kicad_sch: {len(symbols)}")
for s in symbols:
    print(" ", s)
