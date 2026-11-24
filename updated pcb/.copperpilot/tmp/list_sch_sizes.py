import os

for fname in os.listdir('.'):
    if fname.endswith('.kicad_sch'):
        print(f"{fname:40s} : {os.path.getsize(fname)} bytes")
