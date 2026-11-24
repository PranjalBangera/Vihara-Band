import re

with open('Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's inspect keywords in content
for kw in ['kicad_pcb', 'net ', 'zone', 'gr_line', 'gr_rect', 'gr_circle', 'gr_poly', 'Edge.Cuts', 'segment', 'via', 'footprint']:
    cnt = content.count(kw)
    print(f"'{kw}': count = {cnt}")

print("Checking Edge.Cuts:")
for m in list(re.finditer(r'Edge\.Cuts', content))[:5]:
    start = max(0, m.start() - 100)
    end = min(len(content), m.end() + 100)
    print("Match around Edge.Cuts:")
    print(content[start:end])
    print("-" * 40)

print("Checking (net:")
for m in list(re.finditer(r'\(net\b', content))[:3]:
    start = max(0, m.start() - 20)
    end = min(len(content), m.end() + 80)
    print("Match around (net:")
    print(content[start:end])
    print("-" * 40)

print("Checking (zone:")
for m in list(re.finditer(r'\(zone\b', content))[:3]:
    start = max(0, m.start() - 20)
    end = min(len(content), m.end() + 200)
    print("Match around (zone:")
    print(content[start:end])
    print("-" * 40)
