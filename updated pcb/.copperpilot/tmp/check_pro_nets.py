import json

with open("Medical Wearable Patch recovered.kicad_pro", "r", encoding="utf-8") as f:
    pro = json.load(f)

print("net_settings:")
print(json.dumps(pro.get("net_settings", {}), indent=2))
