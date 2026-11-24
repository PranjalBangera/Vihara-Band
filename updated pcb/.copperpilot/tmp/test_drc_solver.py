import re
import subprocess
import json
import uuid

baseline_pcb = '.copperpilot/tmp/staging/drc-remediation-01/baseline/Medical Wearable Patch recovered.kicad_pcb'
candidate_pcb = '.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb'

with open(baseline_pcb, 'r', encoding='utf-8') as f:
    orig = f.read()

# 1. Base deletions
t = re.sub(r'\t\(segment\s+.*?\(net ""\).*?\(uuid "[^"]+"\)\s*\)\n', '', orig, flags=re.DOTALL)
t = re.sub(r'\t\(via\s+.*?\(net ""\).*?\(uuid "[^"]+"\)\s*\)\n', '', t, flags=re.DOTALL)

# Delete J5 RST offending segs
for uid in ["a64afa2c-db9f-45ee-bf08-0afe511cf2e6", "ee1f4e99-df27-4029-bbeb-c8cd4bb746c8",
            "b19ea10b-3303-4fd8-a060-fd4bfa784d8b", "1197c509-db9a-4c55-acfd-24152b7aa75a",
            "86fdc4fb-8d16-4b1c-91ec-466d9f85f06d", "1c7234a0-4aed-4dc2-8c24-138a0ac5e8ee"]:
    t = re.sub(rf'\t\(segment\s+.*?\(uuid "{uid}"\)\s*\)\n', '', t, flags=re.DOTALL)

# Delete J5 SWCLK offending segs
for uid in ["e4cd37e6-72a4-4e4f-b378-e26d87e0686c", "8354aa4b-ed64-40b2-8805-b25fc459cb38",
            "25be9dd9-d6a8-448d-befb-1fa8f8454b9e", "f8b9f927-c734-4ede-936a-6f1e05595b05"]:
    t = re.sub(rf'\t\(segment\s+.*?\(uuid "{uid}"\)\s*\)\n', '', t, flags=re.DOTALL)

# Delete U5 SDA old via & segs
t = re.sub(rf'\t\(via\s+.*?\(uuid "61a4a2d3-dda7-4e1e-88e6-1475a59e12ab"\)\s*\)\n', '', t, flags=re.DOTALL)
for uid in ["b8aa0cb5-f09d-489a-9d73-50663394084b", "de2c0b03-4b30-45c9-b3f4-d8108830842f",
            "4fef1030-8033-4213-9110-fa44ec27e621"]:
    t = re.sub(rf'\t\(segment\s+.*?\(uuid "{uid}"\)\s*\)\n', '', t, flags=re.DOTALL)

# Delete U5 SCL old via & segs
t = re.sub(rf'\t\(via\s+.*?\(uuid "cd12daf0-4f1c-4cdd-b5f3-f39d4762521a"\)\s*\)\n', '', t, flags=re.DOTALL)
for uid in ["39a68e63-be7a-49ba-bec2-cf94d24950a1", "ddefc7ce-0e4d-4f79-8c3e-8c0eb714db2c",
            "dc7328ca-2add-4dd8-a51c-42506c0b9423", "8c61355e-ef69-4aa7-a13c-2d29da7c5a13",
            "0b19be85-a691-4c19-b106-713162f529d3", "8add3a5d-36b5-48ba-bb43-d02a909dce88",
            "2986b8e6-f828-4192-811b-d4601dbec7f4", "7a0823bc-a721-487c-b3bd-4205e28acdd7",
            "21f9135d-a39e-42f1-bad6-2a6a2b63d123", "e5147d62-8f93-4435-8428-6a909005b948",
            "1d6afd19-9217-417f-bb80-fefdbe3298d8"]:
    t = re.sub(rf'\t\(segment\s+.*?\(uuid "{uid}"\)\s*\)\n', '', t, flags=re.DOTALL)

# Add RST & SWCLK additions
rst_additions = f"""	(via (at 111.99 87.2) (size 0.6) (drill 0.3) (layers "F.Cu" "B.Cu") (net "/BG22/RST") (uuid "{uuid.uuid4()}"))
	(segment (start 111.99 85.87) (end 111.99 87.2) (width 0.16) (layer "F.Cu") (net "/BG22/RST") (uuid "{uuid.uuid4()}"))
	(segment (start 111.99 87.2) (end 111.8 87.01) (width 0.16) (layer "B.Cu") (net "/BG22/RST") (uuid "{uuid.uuid4()}"))
	(segment (start 111.8 87.01) (end 111.8 78.4) (width 0.16) (layer "B.Cu") (net "/BG22/RST") (uuid "{uuid.uuid4()}"))
"""

swclk_additions = f"""	(segment (start 117.2 82.86) (end 118.0 83.66) (width 0.16) (layer "F.Cu") (net "/BG22/SWCLK") (uuid "{uuid.uuid4()}"))
	(via (at 118.0 83.66) (size 0.6) (drill 0.3) (layers "F.Cu" "B.Cu") (net "/BG22/SWCLK") (uuid "{uuid.uuid4()}"))
	(segment (start 118.0 83.66) (end 115.0 80.66) (width 0.16) (layer "B.Cu") (net "/BG22/SWCLK") (uuid "{uuid.uuid4()}"))
	(segment (start 115.0 80.66) (end 115.0 79.6) (width 0.16) (layer "B.Cu") (net "/BG22/SWCLK") (uuid "{uuid.uuid4()}"))
"""

sda_additions = f"""	(via (at 131.8 75.6) (size 0.6) (drill 0.3) (layers "F.Cu" "B.Cu") (net "/BG22/SDA") (uuid "{uuid.uuid4()}"))
	(segment (start 130.6 74.0) (end 131.12 75.03) (width 0.16) (layer "F.Cu") (net "/BG22/SDA") (uuid "{uuid.uuid4()}"))
	(segment (start 131.12 75.03) (end 131.8 75.6) (width 0.16) (layer "F.Cu") (net "/BG22/SDA") (uuid "{uuid.uuid4()}"))
	(segment (start 131.8 75.6) (end 131.8 76.68) (width 0.16) (layer "B.Cu") (net "/BG22/SDA") (uuid "{uuid.uuid4()}"))
"""

insert_pos = t.rfind('\n)')
base_content = t[:insert_pos] + '\n' + rst_additions + swclk_additions + sda_additions + t[insert_pos:]

# Now test candidate spots for SCL via
# Existing SCL on F.Cu ends at (132.34, 75.41).
# Existing SCL on B.Cu has (125.42, 82.34) -> (131.31, 82.34).
print("Testing candidate SCL via spots...")

for (vx, vy) in [
    (133.0, 82.0),
    (132.5, 83.0),
    (134.0, 83.5),
    (134.5, 84.0),
    (136.0, 81.0),
    (133.5, 82.5),
    (132.0, 83.0),
    (126.0, 82.0),
]:
    # connect on F.Cu: from (132.34, 75.41) to (vx, vy)
    # wait: can it go on F.Cu or B.Cu?
    # If via is at (vx, vy), how does (132.34, 75.41) reach (vx, vy)?
    # What if the via is placed near U1, e.g. at (132.34, 74.0)?
    # Let's test a via at (vx, vy)
    scl_add = f"""	(via (at {vx} {vy}) (size 0.6) (drill 0.3) (layers "F.Cu" "B.Cu") (net "/BG22/SCL") (uuid "{uuid.uuid4()}"))
"""
    test_content = base_content[:base_content.rfind('\n)')] + '\n' + scl_add + base_content[base_content.rfind('\n)'):]
    with open(candidate_pcb, 'w', encoding='utf-8') as f:
        f.write(test_content)
    
    cmd = [r'C:\Program Files\KiCad\10.0\bin\kicad-cli.exe', 'pcb', 'drc', '--format', 'json', '--severity-error', '--output', '.copperpilot/tmp/test_eval.json', candidate_pcb]
    subprocess.run(cmd, capture_output=True, text=True)
    with open('.copperpilot/tmp/test_eval.json', 'r', encoding='utf-8') as f:
        res = json.load(f)
    print(f"Via at ({vx}, {vy}): {len(res['violations'])} errors")
    if len(res['violations']) < 3:
        for err in res['violations']:
            print(f"   {err['type']}: {err['description']}")
