import sys
sys.stdout.reconfigure(encoding='utf-8')
import re

with open("MCU.kicad_sch", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

# find all symbols with Reference, Value, at
symbols = re.findall(r'\(symbol\s+.*?\(property "Reference" "([^"]+)".*?\(at ([0-9.-]+) ([0-9.-]+).*?\(property "Value" "([^"]+)"', text, re.DOTALL)
for ref, x, y, val in sorted(symbols, key=lambda s: s[0]):
    print(f"{ref:<6} {val:<25} at ({x}, {y})")
