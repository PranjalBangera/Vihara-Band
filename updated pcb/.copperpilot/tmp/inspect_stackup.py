import re

with open('Medical Wearable Patch recovered.kicad_pcb', 'r', encoding='utf-8') as f:
    content = f.read()

# Find stackup
idx = content.find('(stackup')
if idx != -1:
    end_idx = content.find('\n\t)', idx)
    # find balanced paren
    p_count = 0
    end_p = idx
    for i in range(idx, len(content)):
        if content[i] == '(':
            p_count += 1
        elif content[i] == ')':
            p_count -= 1
            if p_count == 0:
                end_p = i + 1
                break
    print("STACKUP DEFINITION:")
    print(content[idx:end_p])
else:
    print("No (stackup block found!")
