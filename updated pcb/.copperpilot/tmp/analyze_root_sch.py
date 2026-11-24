with open('Medical Wearable Patch recovered.kicad_sch', 'r', encoding='utf-8', errors='ignore') as f:
    for i in range(100):
        line = f.readline()
        if '(image' in line:
            print("Found image at line", i)
        if '(sheet' in line:
            print("Found sheet at line", i)

# Find largest s-expr blocks
import re
with open('Medical Wearable Patch recovered.kicad_sch', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

images = re.findall(r'\(image\b', text)
print(f"Total image blocks: {len(images)}")
sheets = re.findall(r'\(sheet\s+.*?\(property\s+"Sheetfile"\s+"([^"]+)"\)', text, re.DOTALL)
print(f"Hierarchical sheets: {sheets}")
