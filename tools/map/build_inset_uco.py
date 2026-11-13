# Uco Valley for the Argentina inset (UcoInset in App.tsx): the cultivated valley — the narrow strip
# from Tupungato down to Vista Flores / Altamira, as the client marked it — not the three whole
# departments. Reuses ZOOM_UCO from mapdata.ts (drawn for the first map's magnifier) and carries it
# into the inset's space with the same transform that turns ZOOM_MENDOZA into ARG_MENDOZA (bounding
# box to bounding box; checked against the Mendoza city point, PT.mendozaCityZ → PT.mendozaCity).
# Writes/replaces `export const ARG_UCO` in mapdata.ts.
import os, re

D = os.path.dirname(os.path.abspath(__file__))
MAPDATA = os.path.abspath(os.path.join(D, '..', '..', 'src', 'data', 'mapdata.ts'))
src = open(MAPDATA, encoding='utf-8').read()

def path(name):
    return [tuple(map(float, m)) for m in re.findall(r'(-?[\d.]+)[ ,](-?[\d.]+)', re.search(rf"export const {name} = '([^']*)'", src).group(1))]

def bbox(pts):
    return min(p[0] for p in pts), min(p[1] for p in pts), max(p[0] for p in pts), max(p[1] for p in pts)

a, z = bbox(path('ARG_MENDOZA')), bbox(path('ZOOM_MENDOZA'))
sx, sy = (a[2] - a[0]) / (z[2] - z[0]), (a[3] - a[1]) / (z[3] - z[1])
f = lambda x, y: (a[0] + (x - z[0]) * sx, a[1] + (y - z[1]) * sy)

city = re.search(r'"mendozaCity":\[([\d.]+),([\d.]+)\],"mendozaCityZ":\[([\d.]+),([\d.]+)\]', src)
cx, cy = f(float(city.group(3)), float(city.group(4)))
assert abs(cx - float(city.group(1))) < 0.5 and abs(cy - float(city.group(2))) < 0.5, (cx, cy)

pts = [f(x, y) for x, y in path('ZOOM_UCO')]
d = 'M' + 'L'.join(f'{x:.2f} {y:.2f}' for x, y in pts) + 'Z'
line = (
    "// Uco Valley (the cultivated strip, Tupungato → Altamira), ZOOM_UCO carried into the inset; tools/map/build_inset_uco.py\n"
    f"export const ARG_UCO = '{d}';\n"
)
src = re.sub(r"// Uco Valley \([^\n]*\nexport const ARG_UCO = '[^']*';\n", '', src)
open(MAPDATA, 'w', encoding='utf-8', newline='\n').write(src.rstrip('\n') + '\n' + line)
x0, y0, x1, y1 = bbox(pts)
print('ARG_UCO', d)
print(f'size {x1 - x0:.1f} × {y1 - y0:.1f} (Mendoza {a[2] - a[0]:.1f} × {a[3] - a[1]:.1f})')
