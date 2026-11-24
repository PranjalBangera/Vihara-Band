import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

def analyze_sheet(filename):
    print(f"\n=== {filename} ===")
    with open(filename, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # find all symbols
    symbols = re.findall(r'\(symbol\s+\(lib_id\s+"([^"]+)"\).*?\(property\s+"Reference"\s+"([^"]+)".*?\(property\s+"Value"\s+"([^"]+)"', content, re.DOTALL)
    print(f"Symbols found: {len(symbols)}")
    for lib_id, ref, val in symbols:
        if not ref.startswith('#'):
            print(f"  {ref:<8} {val:<25} ({lib_id})")
    
    # find all labels
    labels = re.findall(r'\((?:label|global_label|hierarchical_label)\s+"([^"]+)"', content)
    print(f"Labels ({len(labels)}): {sorted(list(set(labels)))}")

analyze_sheet("MCU.kicad_sch")
analyze_sheet("Temp_Sensor.kicad_sch")
analyze_sheet("Power .kicad_sch")
analyze_sheet("BMA400_sheet (1).kicad_sch")
