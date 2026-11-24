import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('symbols.kicad_sym', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

start = text.find('(symbol "Chip Antenna"')
end = text.find('(symbol "', start + 20)
print(text[start:end])
