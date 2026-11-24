import xml.etree.ElementTree as ET

tree = ET.parse(".copperpilot/tmp/recovered.xml")
root = tree.getroot()

critical_prefixes = [
    "/BG22/RF", "/BG22/X", "/BG22/LFXO", "/BG22/VREGSW", 
    "/BG22/VDCDC", "/BG22/RFVDD", "/BG22/PAVDD", "Net-(IC2-DECOUPLE)",
    "/Power/5v", "Net-(J2-Pin_1)", "/BG22/3V", "GND"
]

all_nets = root.find("nets").findall("net")

critical_nets = []
autoroute_nets = []
unconnected_nets = []

for n in all_nets:
    name = n.get("name")
    nodes = [(node.get("ref"), node.get("pin"), node.get("pinfunction")) for node in n.findall("node")]
    if len(nodes) <= 1:
        unconnected_nets.append((name, nodes))
        continue
    
    is_critical = any(name.startswith(crit) or name == crit for crit in critical_prefixes)
    if is_critical:
        critical_nets.append((name, nodes))
    else:
        autoroute_nets.append((name, nodes))

print("=== CRITICAL NETS (MANUAL ONLY / EXCLUDED FROM AUTOROUTE) ===")
print(f"Total critical nets: {len(critical_nets)}")
for name, nodes in critical_nets:
    node_str = ", ".join(f"{r}:{p}({fn})" for r, p, fn in nodes)
    print(f"  {name:25s} [{len(nodes)} nodes]: {node_str}")

print("\n=== NON-CRITICAL DIGITAL / CONTROL NETS (AUTOROUTE CANDIDATES) ===")
print(f"Total autoroute candidate nets: {len(autoroute_nets)}")
for name, nodes in autoroute_nets:
    node_str = ", ".join(f"{r}:{p}({fn})" for r, p, fn in nodes)
    print(f"  {name:25s} [{len(nodes)} nodes]: {node_str}")
