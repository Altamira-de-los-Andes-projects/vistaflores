# Uco map v2: natural satellite base (Sentinel-2 cloudless 2016, EOX, CC BY 4.0) + soft hillshade,
# and the three official Geographical Indications as zones:
#   Vista Flores  — INV Res. C.11/2012: the administrative district (OSM relation 3030379)
#   La Consulta   — INV Res. 19/2014: W Río Tunuyán, E RN40, N their crossing, S Calle Los Indios + 4 coords
#   Paraje Altamira — INV Res. 82-E/2017: W Río Tunuyán, E 1,000 m contour, N Calle La Superiora,
#                     S Calle El Indio + 25 coords
import os, math, json, urllib.request, io
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

D = os.path.dirname(os.path.abspath(__file__))
LON_W, LON_E, LAT_N, LAT_S = -69.52, -68.90, -33.54, -33.89
Z = 13
OUT_W = 2400

def merc(lon, lat, z):
    n = 2 ** z * 256
    return (lon + 180) / 360 * n, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n

X0, Y0 = merc(LON_W, LAT_N, Z)
X1, Y1 = merc(LON_E, LAT_S, Z)
S = OUT_W / (X1 - X0)
OUT_H = round((Y1 - Y0) * S)
def P(lon, lat):
    x, y = merc(lon, lat, Z)
    return ((x - X0) * S, (y - Y0) * S)
print('frame', OUT_W, OUT_H)

# ── 1. satellite base ────────────────────────────────────────────────────────
base_p = os.path.join(D, 's2_base.png')
if not os.path.exists(base_p):
    tx0, ty0, tx1, ty1 = int(X0 // 256), int(Y0 // 256), int(X1 // 256), int(Y1 // 256)
    mos = Image.new('RGB', ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256))
    os.makedirs(os.path.join(D, 's2'), exist_ok=True)
    for ty in range(ty0, ty1 + 1):
        for tx in range(tx0, tx1 + 1):
            p = os.path.join(D, 's2', f'{Z}_{tx}_{ty}.jpg')
            if not os.path.exists(p):
                url = f'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{Z}/{ty}/{tx}.jpg'
                req = urllib.request.Request(url, headers={'User-Agent': 'AltamiraSiteMap/1.0'})
                open(p, 'wb').write(urllib.request.urlopen(req, timeout=30).read())
            mos.paste(Image.open(p).convert('RGB'), ((tx - tx0) * 256, (ty - ty0) * 256))
    crop = mos.crop((round(X0 - tx0 * 256), round(Y0 - ty0 * 256), round(X1 - tx0 * 256), round(Y1 - ty0 * 256)))
    crop.resize((OUT_W, OUT_H), Image.LANCZOS).save(base_p)
base = np.asarray(Image.open(base_p).convert('RGB'), dtype=np.float64)

# ── 2. elevation on the output grid (from the z12 DEM) ───────────────────────
elev12 = np.load(os.path.join(D, 'elev.npy')).astype(np.float32)
m12 = eval(open(os.path.join(D, 'elev_meta.txt')).read())
ex0, ey0 = merc(LON_W, LAT_N, 12); ex1, ey1 = merc(LON_E, LAT_S, 12)
box = (ex0 - m12['px0'], ey0 - m12['py0'], ex1 - m12['px0'], ey1 - m12['py0'])
e = np.asarray(Image.fromarray(elev12, mode='F').transform((OUT_W, OUT_H), Image.EXTENT, box, Image.BICUBIC), dtype=np.float64)
np.save(os.path.join(D, 'elev_v2.npy'), e)

# soft hillshade for depth (satellite already carries colour and texture)
cell = 156543.03 * math.cos(math.radians(-33.72)) / 2 ** Z / S
def blur(a, s):
    r = int(3 * s); k = np.exp(-0.5 * (np.arange(-r, r + 1) / s) ** 2); k /= k.sum()
    p = np.pad(a, r, mode='edge')
    p = np.apply_along_axis(lambda v: np.convolve(v, k, 'valid'), 1, p)
    return np.apply_along_axis(lambda v: np.convolve(v, k, 'valid'), 0, p)
es = blur(e, 1.5)
gy, gx = np.gradient(es, cell)
def shade(az, alt, zf):
    az, alt = math.radians(az), math.radians(alt)
    slope = np.arctan(zf * np.hypot(gx, gy)); aspect = np.arctan2(-gx, gy)
    return np.clip(np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect), 0, 1)
hs = 0.7 * shade(315, 40, 1.6) + 0.3 * shade(250, 55, 1.6)
hs /= (0.7 * math.sin(math.radians(40)) + 0.3 * math.sin(math.radians(55)))
rel = np.clip(0.62 + 0.42 * hs, 0.35, 1.25)[..., None]
img = base * rel
# gentle grade: a touch of warmth and contrast, still natural
img = (img - 128) * 1.06 + 128
img[..., 0] *= 1.03; img[..., 2] *= 0.96
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(os.path.join(D, 'uco-sat.jpg'), quality=86, optimize=True, progressive=True)
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(os.path.join(D, 'uco-sat.webp'), quality=80, method=6)

# ── 3. OSM lines ─────────────────────────────────────────────────────────────
ov = json.load(open(os.path.join(D, 'ov5.json'), encoding='utf8'))
def ways(pred):
    return [[P(g['lon'], g['lat']) for g in el['geometry']] for el in ov['elements'] if el['type'] == 'way' and pred(el['tags'])]
river = ways(lambda t: t.get('waterway') == 'river')
rn40 = ways(lambda t: t.get('highway') in ('trunk',) and 'RN40' in t.get('ref', ''))
superiora = ways(lambda t: 'Superiora' in t.get('name', ''))
vfj = json.load(open(os.path.join(D, 'vf.json'), encoding='utf8'))
nodes = {n['id']: (n['lon'], n['lat']) for n in vfj['elements'] if n['type'] == 'node'}
vf_ways = [[nodes[i] for i in w['nodes']] for w in vfj['elements'] if w['type'] == 'way']

# assemble the Vista Flores outer ring from its member ways
segs = [list(w) for w in vf_ways]
ring = segs.pop(0)
while segs:
    end = ring[-1]
    for i, s in enumerate(segs):
        if s[0] == end: ring += s[1:]; segs.pop(i); break
        if s[-1] == end: ring += s[::-1][1:]; segs.pop(i); break
    else:
        break
print('VF ring closed:', ring[0] == ring[-1], 'left over', len(segs))
vf_poly = [P(*p) for p in ring]

dms = lambda d, m, s: -(d + m / 60 + s / 3600)
lc_south = [(dms(69, 3, 30.74), dms(33, 45, 55.60)), (dms(69, 5, 24.70), dms(33, 45, 1.08)),
            (dms(69, 6, 24.04), dms(33, 47, 45.82)), (dms(69, 10, 45.42), dms(33, 48, 53.99))]
alt_south = [(-69.24840, -33.78119), (-69.24462, -33.78449), (-69.24213, -33.78677), (-69.23843, -33.78803),
             (-69.23597, -33.78762), (-69.23129, -33.78736), (-69.22660, -33.78695), (-69.22272, -33.78688),
             (-69.21621, -33.78769), (-69.21237, -33.78647), (-69.20894, -33.78643), (-69.20479, -33.78773),
             (-69.19816, -33.79063), (-69.19129, -33.79057), (-69.18854, -33.79147), (-69.18497, -33.79286),
             (-69.18189, -33.79329), (-69.17882, -33.79433), (-69.17650, -33.79489), (-69.17360, -33.79685),
             (-69.17141, -33.79896), (-69.16811, -33.80197), (-69.16615, -33.80415), (-69.16432, -33.80678),
             (-69.16253, -33.81060)]
json.dump({'river': river, 'rn40': rn40, 'superiora': superiora, 'vf': vf_poly,
           'lc_south': [P(*p) for p in lc_south], 'alt_south': [P(*p) for p in alt_south],
           'frame': [OUT_W, OUT_H]}, open(os.path.join(D, 'v2_lines.json'), 'w'))

# preview with every line, the 1,000 m contour and the coordinate lines
pv = Image.open(os.path.join(D, 'uco-sat.jpg')).convert('RGB')
dr = ImageDraw.Draw(pv)
for l in river: dr.line(l, fill=(80, 170, 255), width=4)
for l in rn40: dr.line(l, fill=(255, 220, 60), width=3)
for l in superiora: dr.line(l, fill=(255, 60, 200), width=4)
dr.line(vf_poly, fill=(255, 80, 80), width=3)
dr.line([P(*p) for p in lc_south], fill=(120, 255, 120), width=4)
dr.line([P(*p) for p in alt_south], fill=(255, 140, 0), width=4)
c1000 = (e >= 1000).astype(np.uint8) * 255
edge = np.asarray(Image.fromarray(c1000).filter(ImageFilter.FIND_EDGES)) > 0
arr = np.asarray(pv).copy(); arr[edge] = (255, 255, 255)
Image.fromarray(arr).resize((OUT_W // 2, OUT_H // 2), Image.LANCZOS).save(os.path.join(D, 'v2-preview.jpg'), quality=85)
print('done')
