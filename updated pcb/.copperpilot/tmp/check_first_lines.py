with open('Medical Wearable Patch recovered.kicad_sch', 'r', encoding='utf-8', errors='ignore') as f:
    for i in range(100):
        line = f.readline()
        if len(line) > 120:
            print(f"L{i}: [len={len(line)}] {line[:80]} ...")
        else:
            print(f"L{i}: {line.strip()}")
