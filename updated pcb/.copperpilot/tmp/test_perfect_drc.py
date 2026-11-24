import re
import subprocess
import json
import uuid

candidate_pcb = '.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb'
baseline_pcb = '.copperpilot/tmp/staging/drc-remediation-01/baseline/Medical Wearable Patch recovered.kicad_pcb'

with open(baseline_pcb, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Delete all unnetted segments and vias
text = re.sub(r'\t\(segment\s+.*?\(net ""\).*?\(uuid "[^"]+"\)\s*\)\n', '', text, flags=re.DOTALL)
text = re.sub(r'\t\(via\s+.*?\(net ""\).*?\(uuid "[^"]+"\)\s*\)\n', '', text, flags=re.DOTALL)

# 2. Fix J5 RST
rst_segs_to_delete = [
    "a64afa2c-db9f-45ee-bf08-0afe511cf2e6",
    "ee1f4e99-df27-4029-bbeb-c8cd4bb746c8",
    "b19ea10b-3303-4fd8-a060-fd4bfa784d8b",
    "1197c509-db9a-4c55-acfd-24152b7aa75a",
    "86fdc4fb-8d16-4b1c-91ec-466d9f85f06d",
    "1c7234a0-4aed-4dc2-8c24-138a0ac5e8ee",
]
for uid in rst_segs_to_delete:
    text = re.sub(rf'\t\(segment\s+.*?\(uuid "{uid}"\)\s*\)\n', '', text, flags=re.DOTALL)

# Add via at (111.99, 87.20) for RST
rst_additions = f"""	(via
		(at 111.99 87.2)
		(size 0.6)
		(drill 0.3)
		(layers "F.Cu" "B.Cu")
		(net "/BG22/RST")
		(uuid "{uuid.uuid4()}")
	)
	(segment
		(start 111.99 85.87)
		(end 111.99 87.2)
		(width 0.16)
		(layer "F.Cu")
		(net "/BG22/RST")
		(uuid "{uuid.uuid4()}")
	)
	(segment
		(start 111.99 87.2)
		(end 111.8 87.01)
		(width 0.16)
		(layer "B.Cu")
		(net "/BG22/RST")
		(uuid "{uuid.uuid4()}")
	)
	(segment
		(start 111.8 87.01)
		(end 111.8 78.4)
		(width 0.16)
		(layer "B.Cu")
		(net "/BG22/RST")
		(uuid "{uuid.uuid4()}")
	)
"""

# 3. Fix J5 SWCLK:
# Segments that looped around Pad 10:
swclk_segs_to_delete = [
    "e4cd37e6-72a4-4e4f-b378-e26d87e0686c", # (117.20, 82.86) -> (116.35, 82.00)
    "8354aa4b-ed64-40b2-8805-b25fc459cb38", # (116.35, 82.00) -> (116.35, 80.22)
    "25be9dd9-d6a8-448d-befb-1fa8f8454b9e", # (116.35, 80.22) -> (115.72, 79.60)
    "f8b9f927-c734-4ede-936a-6f1e05595b05", # (115.72, 79.60) -> (115.00, 79.60)
]
for uid in swclk_segs_to_delete:
    text = re.sub(rf'\t\(segment\s+.*?\(uuid "{uid}"\)\s*\)\n', '', text, flags=re.DOTALL)

# At (117.20, 82.86), instead of going to Pad 10, go to (118.00, 83.50) via:
# From (117.20, 82.86) to (118.00, 83.50) is on F.Cu.
# Then via at (118.00, 83.50) to B.Cu.
# On B.Cu, go from (118.00, 83.50) to (115.00, 79.60) (existing via!).
swclk_additions = f"""	(segment
		(start 117.2 82.86)
		(end 118.0 83.66)
		(width 0.16)
		(layer "F.Cu")
		(net "/BG22/SWCLK")
		(uuid "{uuid.uuid4()}")
	)
	(via
		(at 118.0 83.66)
		(size 0.6)
		(drill 0.3)
		(layers "F.Cu" "B.Cu")
		(net "/BG22/SWCLK")
		(uuid "{uuid.uuid4()}")
	)
	(segment
		(start 118.0 83.66)
		(end 115.0 80.66)
		(width 0.16)
		(layer "B.Cu")
		(net "/BG22/SWCLK")
		(uuid "{uuid.uuid4()}")
	)
	(segment
		(start 115.0 80.66)
		(end 115.0 79.6)
		(width 0.16)
		(layer "B.Cu")
		(net "/BG22/SWCLK")
		(uuid "{uuid.uuid4()}")
	)
"""

# 4. Fix U5 SDA
text = re.sub(rf'\t\(via\s+.*?\(uuid "61a4a2d3-dda7-4e1e-88e6-1475a59e12ab"\)\s*\)\n', '', text, flags=re.DOTALL)
sda_segs_to_delete = [
    "b8aa0cb5-f09d-489a-9d73-50663394084b", # F.Cu (130.65, 73.62) -> (132.76, 73.62)
    "de2c0b03-4b30-45c9-b3f4-d8108830842f", # B.Cu (132.76, 73.62) -> (132.76, 76.51)
    "4fef1030-8033-4213-9110-fa44ec27e621", # B.Cu (132.76, 76.51) -> (132.58, 76.68)
    "d00408e4-ebd5-45b5-a927-e0430519b8c0", # B.Cu (132.58, 76.68) -> (130.00, 76.68)
]
for uid in sda_segs_to_delete:
    text = re.sub(rf'\t\(segment\s+.*?\(uuid "{uid}"\)\s*\)\n', '', text, flags=re.DOTALL)

# Add via at (131.50, 72.80)
sda_additions = f"""	(via
		(at 131.5 72.8)
		(size 0.6)
		(drill 0.3)
		(layers "F.Cu" "B.Cu")
		(net "/BG22/SDA")
		(uuid "{uuid.uuid4()}")
	)
	(segment
		(start 130.65 73.62)
		(end 131.47 72.8)
		(width 0.16)
		(layer "F.Cu")
		(net "/BG22/SDA")
		(uuid "{uuid.uuid4()}")
	)
	(segment
		(start 131.47 72.8)
		(end 131.5 72.8)
		(width 0.16)
		(layer "F.Cu")
		(net "/BG22/SDA")
		(uuid "{uuid.uuid4()}")
	)
	(segment
		(start 131.5 72.8)
		(end 131.5 75.36)
		(width 0.16)
		(layer "B.Cu")
		(net "/BG22/SDA")
		(uuid "{uuid.uuid4()}")
	)
	(segment
		(start 131.5 75.36)
		(end 130.18 76.68)
		(width 0.16)
		(layer "B.Cu")
		(net "/BG22/SDA")
		(uuid "{uuid.uuid4()}")
	)
	(segment
		(start 130.18 76.68)
		(end 130.0 76.68)
		(width 0.16)
		(layer "B.Cu")
		(net "/BG22/SDA")
		(uuid "{uuid.uuid4()}")
	)
"""

# 5. Fix U5 SCL
text = re.sub(rf'\t\(via\s+.*?\(uuid "cd12daf0-4f1c-4cdd-b5f3-f39d4762521a"\)\s*\)\n', '', text, flags=re.DOTALL)
scl_segs_to_delete = [
    "39a68e63-be7a-49ba-bec2-cf94d24950a1",
    "ddefc7ce-0e4d-4f79-8c3e-8c0eb714db2c",
    "dc7328ca-2add-4dd8-a51c-42506c0b9423",
    "8c61355e-ef69-4aa7-a13c-2d29da7c5a13",
    "0b19be85-a691-4c19-b106-713162f529d3",
    "8add3a5d-36b5-48ba-bb43-d02a909dce88",
    "2986b8e6-f828-4192-811b-d4601dbec7f4",
    "7a0823bc-a721-487c-b3bd-4205e28acdd7",
    "21f9135d-a39e-42f1-bad6-2a6a2b63d123",
    "e5147d62-8f93-4435-8428-6a909005b948",
    "1d6afd19-9217-417f-bb80-fefdbe3298d8",
]
for uid in scl_segs_to_delete:
    text = re.sub(rf'\t\(segment\s+.*?\(uuid "{uid}"\)\s*\)\n', '', text, flags=re.DOTALL)

scl_additions = f"""	(via
		(at 132.34 79.02)
		(size 0.6)
		(drill 0.3)
		(layers "F.Cu" "B.Cu")
		(net "/BG22/SCL")
		(uuid "{uuid.uuid4()}")
	)
	(segment
		(start 132.34 79.02)
		(end 132.34 81.31)
		(width 0.16)
		(layer "B.Cu")
		(net "/BG22/SCL")
		(uuid "{uuid.uuid4()}")
	)
	(segment
		(start 132.34 81.31)
		(end 131.31 82.34)
		(width 0.16)
		(layer "B.Cu")
		(net "/BG22/SCL")
		(uuid "{uuid.uuid4()}")
	)
"""

insert_pos = text.rfind('\n)')
new_text = text[:insert_pos] + '\n' + rst_additions + swclk_additions + sda_additions + scl_additions + text[insert_pos:]

with open(candidate_pcb, 'w', encoding='utf-8') as f:
    f.write(new_text)

# Run DRC
cmd = [
    r'C:\Program Files\KiCad\10.0\bin\kicad-cli.exe',
    'pcb', 'drc',
    '--format', 'json',
    '--severity-all',
    '--output', '.copperpilot/tmp/test_drc_perfect.json',
    candidate_pcb
]
res = subprocess.run(cmd, capture_output=True, text=True)

with open('.copperpilot/tmp/test_drc_perfect.json', 'r', encoding='utf-8') as f:
    drc = json.load(f)

print(f"Total violations: {len(drc['violations'])}")
by_type = {}
for v in drc['violations']:
    t = v['type']
    by_type[t] = by_type.get(t, 0) + 1

for t, count in by_type.items():
    print(f"  {t}: {count}")

for v in drc['violations']:
    if v['severity'] == 'error':
        print(f"ERROR: {v['type']} - {v['description']}")
        for it in v['items']:
            print(f"   {it['description']} at ({it['pos']['x']}, {it['pos']['y']})")
