import sys
sys.stdout.reconfigure(encoding='utf-8')

with open("Power .kicad_sch", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

# Print lines with wire, symbol, label, pin
for line in text.splitlines():
    if any(k in line for k in ['(symbol', '(property "Reference"', '(property "Value"', '(pin', '(label', '(global_label', '(hierarchical_label']):
        print(line)
