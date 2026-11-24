import json

with open('.copperpilot/tmp/drc_report.json', 'r', encoding='utf-8') as f:
    drc = json.load(f)

for v in drc['violations']:
    print('='*50)
    print(f"Severity: {v['severity']}, Type: {v['type']}")
    print(f"Desc: {v['description']}")
    for item in v['items']:
        print(f"  Item: {item['description']} @ ({item['pos']['x']}, {item['pos']['y']}) uuid: {item.get('uuid')}")
