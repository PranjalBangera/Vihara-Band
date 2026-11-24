import glob, re

for sch in glob.glob('*.kicad_sch'):
    with open(sch, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    if 'BMA400' in content or 'U1' in content:
        print(f"=== {sch} ===")
        # search for U1 symbol or pins
        for line in content.splitlines():
            if any(k in line for k in ['U1', 'INT1', 'BMA400', 'Alert']):
                print("  ", line[:100])
