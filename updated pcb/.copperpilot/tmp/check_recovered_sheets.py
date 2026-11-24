with open('Medical Wearable Patch recovered.kicad_sch', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

import re
sheets = re.findall(r'\(property\s+"Sheetfile"\s+"([^"]+)"\)', text)
print("Sheetfiles in recovered.kicad_sch:", sheets)
sheetnames = re.findall(r'\(property\s+"Sheetname"\s+"([^"]+)"\)', text)
print("Sheetnames in recovered.kicad_sch:", sheetnames)
