with open('.copperpilot/tmp/staging/drc-remediation-01/candidate/Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    text = f.read()

def dump_footprint(ref):
    pos = text.find(f'(property "Reference" "{ref}"')
    if pos == -1:
        print(f"Ref {ref} not found")
        return
    start = text.rfind('(footprint ', 0, pos)
    depth = 0
    end = start
    while end < len(text):
        if text[end] == '(':
            depth += 1
        elif text[end] == ')':
            depth -= 1
            if depth == 0:
                end += 1
                break
        end += 1
    print(f"=== Footprint {ref} ===")
    print(text[start:end])

dump_footprint('U5')
dump_footprint('J5')
