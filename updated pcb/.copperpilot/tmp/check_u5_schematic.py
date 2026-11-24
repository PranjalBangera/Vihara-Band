with open("MCU.kicad_sch", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r'IS25LP064A', text)]
for idx in matches:
    print(text[max(0, idx-500):min(len(text), idx+1500)])
