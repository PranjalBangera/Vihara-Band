import re

candidate_pcb = '.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb'

with open(candidate_pcb, 'r', encoding='utf-8') as f:
    text = f.read()

uuids = [
    "e5aedec9-2b3d-44b7-85d8-f8b8e013de8b", # via on U1 pad 4
    "07088784-7789-45aa-b9ad-99bafc104d30", # track near SW1 pad 4
    "432088f4-be99-4d43-bfb5-707c82dafbf2", # track near SW1 pad 3
    "666e4c67-c417-4060-9147-67c322ac0314", # track near U2 pad 9
    "cd12daf0-4f1c-4cdd-b5f3-f39d4762521a", # via SCL near U5 pad 6
    "8c3517f7-7dc9-44ba-87d0-6bdfac7b6cb8", # track near SW1 pad 3
    "61a4a2d3-dda7-4e1e-88e6-1475a59e12ab", # via SDA near U5 pad 4
    "8354aa4b-ed64-40b2-8805-b25fc459cb38", # track SWCLK near J5 pad 10
    "e4cd37e6-72a4-4e4f-b378-e26d87e0686c", # track SWCLK near J5 pad 10
    "39a68e63-be7a-49ba-bec2-cf94d24950a1", # track SCL near U5 pad 5
    "a64afa2c-db9f-45ee-bf08-0afe511cf2e6", # track RST near J5 pad 1
    "ddefc7ce-0e4d-4f79-8c3e-8c0eb714db2c", # track SCL near U5 pad 5/6
    "ee1f4e99-df27-4029-bbeb-c8cd4bb746c8", # track RST near J5 pad 1/2
    "5b1ee752-1f83-4f5f-9915-2770d3c58a56", # dangling via Alert
    "67f33c6c-9574-4a37-8444-a44ef9f704d7", # dangling via Alert
    "eeee087f-4717-443c-bb9a-fd02d54bff7f", # dangling via FLASH_MOSI
    "669efcbb-f21d-4508-b154-5bc52c38d3fc", # dangling via SWDIO
]

for uid in uuids:
    pos = text.find(uid)
    if pos != -1:
        start = text.rfind('\n\t(', 0, pos)
        if start == -1:
            start = text.rfind('\n', 0, pos)
        end = text.find('\n\t)', pos)
        if end == -1:
            end = text.find('\n', pos + len(uid))
        else:
            end += 3
        print(f"=== UUID {uid} ===")
        print(text[start:end].strip())
    else:
        print(f"=== UUID {uid} NOT FOUND ===")
