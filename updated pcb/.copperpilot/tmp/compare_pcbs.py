import re, glob

for pcb in glob.glob("*.kicad_pcb"):
    with open(pcb, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    nets = re.findall(r'\(net\s+(\d+)\s+"?([^"\)\s]+)"?\)', content)
    footprints = re.findall(r'\(footprint\s', content)
    segments = re.findall(r'\(segment\s', content)
    vias = re.findall(r'\(via\s', content)
    zones = re.findall(r'\(zone\s', content)
    # Check for net occurrences anywhere
    all_nets = set(re.findall(r'\(net\s+"?([^"\)\s]+)"?\)', content))
    pad_nets = set(re.findall(r'\(pad\s+.*?\s+\(net\s+([^\)]+)\)', content))
    print(f"=== {pcb} ===")
    print(f"  Header nets: {len(nets)}")
    print(f"  Footprints: {len(footprints)}")
    print(f"  Segments: {len(segments)}, Vias: {len(vias)}, Zones: {len(zones)}")
    print(f"  Pad net references count: {len(pad_nets)}")
    if pad_nets:
        print("  Sample pad nets:", list(pad_nets)[:5])
    if nets:
        print("  Sample header nets:", nets[:5])
