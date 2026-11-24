with open("Medical Wearable Patch recovered.kicad_pcb", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

import re
print("Matches for 'Edge.Cuts':", len(re.findall(r'Edge\.Cuts', text)))
for m in re.finditer(r'\(gr_[a-z]+\s+.*?\)', text, re.DOTALL):
    s = m.group(0)
    if "Edge.Cuts" in s:
        print("Edge cut shape:", s[:150])

print("Matches for '(zone':", len(re.findall(r'\(zone\b', text)))
for m in re.finditer(r'\(zone\b.*?\n\s*\)', text, re.DOTALL):
    print("Zone definition header:")
    print(m.group(0)[:300])
