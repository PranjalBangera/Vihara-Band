import json

with open('.copperpilot/tmp/drc_verified.json', 'r', encoding='utf-8') as f:
    drc = json.load(f)

errors = [v for v in drc['violations'] if v['severity'] == 'error']
warnings = [v for v in drc['violations'] if v['severity'] == 'warning']

print(f"Errors count: {len(errors)}")
print(f"Warnings count: {len(warnings)}")
for e in errors:
    print(f"  ERROR: {e['type']} - {e['description']}")
for w in warnings:
    print(f"  WARNING: {w['type']} - {w['description']}")
