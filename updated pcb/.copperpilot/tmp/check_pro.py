import json

with open("Medical Wearable Patch recovered.kicad_pro", "r", encoding="utf-8") as f:
    pro = json.load(f)

print("Pro keys:", pro.keys())
if "board" in pro:
    print("Board keys:", pro["board"].keys())
    if "design_settings" in pro["board"]:
        ds = pro["board"]["design_settings"]
        print("Design settings keys:", ds.keys())
        print("Rules:", ds.get("rules"))
if "net_classes" in pro:
    print("Net classes:", pro["net_classes"])
