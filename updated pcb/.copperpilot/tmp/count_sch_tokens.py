with open('Medical Wearable Patch recovered.kicad_sch', 'r', encoding='utf-8', errors='ignore') as f:
    counts = {}
    for line in f:
        stripped = line.strip()
        if stripped.startswith('('):
            token = stripped.split()[0][1:]
            counts[token] = counts.get(token, 0) + 1

for k, v in sorted(counts.items(), key=lambda x: x[1], reverse=True)[:30]:
    print(f"{k}: {v}")
