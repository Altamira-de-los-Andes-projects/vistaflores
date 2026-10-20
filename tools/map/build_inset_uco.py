# Uco Valley for the Argentina inset (UcoInset in App.tsx): the three departments of the valley —
# Tupungato, Tunuyán and San Carlos (Mendoza) — from geoBoundaries ARG ADM2 (CC BY 4.0), placed in
# the inset's own space by fitting geoBoundaries' Mendoza (ADM1) onto ARG_MENDOZA in mapdata.ts
# (Mercator, bounding box to bounding box). Writes/replaces `export const ARG_UCO` in mapdata.ts.
import os, re, json, math, urllib.request

D = os.path.dirname(os.path.abspath(__file__))
MAPDATA = os.path.abspath(os.path.join(D, '..', '..', 'src', 'mapdata.ts'))
CACHE = os.path.join(D, 'geoboundaries')
BASE = 'https://github.com/wmgeolab/geoBoundaries/raw/main/releaseData/gbOpen/ARG/{0}/geoBoundaries-ARG-{0}_simplified.geojson'

def load(level):
    os.makedirs(CACHE, exist_ok=True)
    p = os.path.join(CACHE, f'{level}.geojson')
    if not os.path.exists(p):
        open(p, 'wb').write(urllib.request.urlopen(BASE.format(level), timeout=60).read())
    return json.load(open(p, encoding='utf-8'))

def rings(g):
    return [r for poly in (g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]) for r in poly]

def merc_y(lat):
    return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))

def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    n = math.hypot(dx, dy) or 1e-9
    i, dmax = 0, 0.0
    for k in range(1, len(pts) - 1):
        d = abs(dy * pts[k][0] - dx * pts[k][1] + x2 * y1 - y2 * x1) / n
        if d > dmax:
            i, dmax = k, d
    if dmax <= eps:
        return [pts[0], pts[-1]]
    return rdp(pts[: i + 1], eps)[:-1] + rdp(pts[i:], eps)

src = open(MAPDATA, encoding='utf-8').read()
arg = re.search(r"export const ARG_MENDOZA = '([^']*)'", src).group(1)
ap = [tuple(map(float, m)) for m in re.findall(r'(-?[\d.]+)[ ,](-?[\d.]+)', arg)]
ax0, ay0 = min(p[0] for p in ap), min(p[1] for p in ap)
ax1, ay1 = max(p[0] for p in ap), max(p[1] for p in ap)

mz = next(f for f in load('ADM1')['features'] if f['properties']['shapeName'] == 'Mendoza')
mp = [p for r in rings(mz['geometry']) for p in r]
lo0, lo1 = min(p[0] for p in mp), max(p[0] for p in mp)
my0, my1 = merc_y(max(p[1] for p in mp)), merc_y(min(p[1] for p in mp))   # north → top

def to_inset(lon, lat):
    return (ax0 + (lon - lo0) / (lo1 - lo0) * (ax1 - ax0), ay0 + (my0 - merc_y(lat)) / (my0 - my1) * (ay1 - ay0))

def in_mendoza(f):
    q = [p for r in rings(f['geometry']) for p in r]
    return lo0 <= sum(p[0] for p in q) / len(q) <= lo1 and -37.6 <= sum(p[1] for p in q) / len(q) <= -31.9

wanted = ('Tupungato', 'Tunuyán', 'San Carlos')
deps = [f for f in load('ADM2')['features'] if f['properties']['shapeName'] in wanted and in_mendoza(f)]
assert sorted(f['properties']['shapeName'] for f in deps) == sorted(wanted), [f['properties']['shapeName'] for f in deps]

d = ''
for f in deps:
    for r in rings(f['geometry']):
        q = [to_inset(lon, lat) for lon, lat in r]
        h = len(q) // 2   # closed ring: simplify the two halves (first point == last point)
        pts = rdp(q[: h + 1], 0.25)[:-1] + rdp(q[h:], 0.25)
        if len(pts) >= 4:
            d += 'M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in pts) + 'Z'

line = (
    "// Uco Valley (Tupungato, Tunuyán, San Carlos) — geoBoundaries ARG ADM2, CC BY 4.0; tools/map/build_inset_uco.py\n"
    f"export const ARG_UCO = '{d}';\n"
)
src = re.sub(r"// Uco Valley \(Tupungato[^\n]*\nexport const ARG_UCO = '[^']*';\n", '', src)
open(MAPDATA, 'w', encoding='utf-8', newline='\n').write(src.rstrip('\n') + '\n' + line)
print('ARG_UCO', len(d), 'chars,', d.count('M'), 'rings')
