import re

for sch in ['Medical Wearable Patch recovered.kicad_sch', 'MCU.kicad_sch', 'BMA400_sheet (1).kicad_sch', 'Temp_Sensor.kicad_sch', 'Power .kicad_sch']:
    try:
        with open(sch, 'r', encoding='utf-8') as f:
            content = f.read()
        print(f"File {sch}: {len(content)} bytes")
        # Check sheet symbols
        sheets = re.findall(r'\(sheet\s+.*?\(property\s+"Sheetfile"\s+"([^"]+)"\)', content, re.DOTALL)
        if sheets:
            print(f"  Hierarchical sheets in {sch}: {sheets}")
    except Exception as e:
        print(f"Error {sch}: {e}")
