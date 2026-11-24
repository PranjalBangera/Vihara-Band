import json

with open('.copperpilot/tmp/drc_report.json', 'r', encoding='utf-8') as f:
    drc = json.load(f)

print("DRC Summary:")
print(f"Total violations: {len(drc.get('violations', []))}")
print(f"Total unconnected: {len(drc.get('unconnected_items', []))}")

print("\n--- UNCONNECTED ITEMS ---")
for i, item in enumerate(drc.get('unconnected_items', [])):
    desc = item.get('description', '')
    subitems = [sub.get('description', '') for sub in item.get('items', [])]
    positions = [f"({sub.get('pos', {}).get('x', 0):.2f}, {sub.get('pos', {}).get('y', 0):.2f})" for sub in item.get('items', [])]
    print(f"[{i+1}] {desc}: {' <--> '.join(subitems)} at {' & '.join(positions)}")

print("\n--- VIOLATIONS ---")
for i, v in enumerate(drc.get('violations', [])):
    v_type = v.get('type', '')
    v_desc = v.get('description', '')
    subitems = [sub.get('description', '') for sub in v.get('items', [])]
    positions = [f"({sub.get('pos', {}).get('x', 0):.2f}, {sub.get('pos', {}).get('y', 0):.2f})" for sub in v.get('items', [])]
    print(f"[{i+1}] [{v_type}] {v_desc} between {' and '.join(subitems)} at {' & '.join(positions)}")
