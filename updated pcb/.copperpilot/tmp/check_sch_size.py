import os

size = os.path.getsize('Medical Wearable Patch recovered.kicad_sch')
print(f"Size: {size}")
with open('Medical Wearable Patch recovered.kicad_sch', 'rb') as f:
    chunk = f.read(500)
    print("Raw first 200 bytes:", chunk[:200])
