import re

with open('Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all segments
segments = re.findall(r'\(segment\s+\(start\s+([\d.-]+)\s+([\d.-]+)\)\s+\(end\s+([\d.-]+)\s+([\d.-]+)\)\s+\(width\s+([\d.-]+)\)\s+\(layer\s+"([^"]+)"\)\s+\(net\s+"([^"]+)"\)', content)
print(f"Total segments matched: {len(segments)}")

# Filter RF segments
rf_segments = [s for s in segments if 'RF' in s[6]]
print(f"RF segments: {len(rf_segments)}")
for s in rf_segments:
    print(f"Net: {s[6]}, Layer: {s[5]}, Width: {s[4]} mm, From ({s[0]}, {s[1]}) to ({s[2]}, {s[3]})")

# Check all net widths
widths_by_net = {}
for s in segments:
    net = s[6]
    w = float(s[4])
    if net not in widths_by_net:
        widths_by_net[net] = set()
    widths_by_net[net].add(w)

print("\nSample trace widths by net:")
for net, ws in sorted(widths_by_net.items()):
    print(f"  {net}: {sorted(list(ws))} mm")
