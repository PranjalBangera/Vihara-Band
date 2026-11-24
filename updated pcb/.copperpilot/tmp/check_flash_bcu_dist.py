import math

# Check FLASH_CS: (131.83, 77.80) -> (134.92, 74.71)
x1, y1 = 131.83, 77.80
x2, y2 = 134.92, 74.71
vx, vy = 131.80, 75.60
dx, dy = x2 - x1, y2 - y1
l2 = dx*dx + dy*dy
t = max(0, min(1, ((vx - x1)*dx + (vy - y1)*dy) / l2))
proj_x = x1 + t*dx
proj_y = y1 + t*dy
dist = math.sqrt((vx - proj_x)**2 + (vy - proj_y)**2)
print(f"Distance to B.Cu FLASH_CS track: {dist:.3f} mm, clr={dist - 0.38:.3f} mm")

# Check FLASH_MISO: (135.40, 74.60) -> (131.52, 78.48)
x1, y1 = 135.40, 74.60
x2, y2 = 131.52, 78.48
t = max(0, min(1, ((vx - x1)*dx + (vy - y1)*dy) / l2))
proj_x = x1 + t*dx
proj_y = y1 + t*dy
dist = math.sqrt((vx - proj_x)**2 + (vy - proj_y)**2)
print(f"Distance to B.Cu FLASH_MISO track: {dist:.3f} mm, clr={dist - 0.38:.3f} mm")
