# Close-up satellite base for the vineyards map (Viñedos page, `UcoMap` in App.tsx).
# Same source as build_v2.py — Sentinel-2 cloudless 2016 by EOX (CC BY 4.0; the 2018+ layers are
# non-commercial, never use them) — but at zoom 14 and only around the three estates, so the map
# can sit close to the vineyards like the Google Maps list "Fincas Altamira de los Andes"
# (shared by Leonardo Gerbi). Everything stays in the ucomap.ts pixel space (uco-sat.webp,
# 2400×1629) so zones and the river still line up; the image is turned west-up (Andes on top).
# Writes public/assets/uco-fincas-wup.webp and src/ucofincas.ts.
import os, math, json, urllib.request
from PIL import Image

D = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(D, '..', '..'))
LON_W, LON_E, LAT_N, LAT_S = -69.52, -68.90, -33.54, -33.89   # uco-sat.webp frame (build_v2.py)
Z_BASE, W_BASE = 13, 2400
Z = 14
PX_PER_UNIT = 2.0   # output pixels per ucomap unit (one unit ≈ 24 m)

def merc(lon, lat, z):
    n = 2 ** z * 256
    return (lon + 180) / 360 * n, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n

BX0, BY0 = merc(LON_W, LAT_N, Z_BASE)
BX1, _ = merc(LON_E, LAT_S, Z_BASE)
S = W_BASE / (BX1 - BX0)            # ucomap units per z13 pixel
K = 2 ** (Z - Z_BASE)               # z14 pixels per z13 pixel

def unit(lon, lat):
    x, y = merc(lon, lat, Z_BASE)
    return ((x - BX0) * S, (y - BY0) * S)

def dms(d, m, s):
    return -(d + m / 60 + s / 3600)

# Leonardo Gerbi's pins (Google Maps list "Fincas Altamira de los Andes"), all S / W
FINCAS = {
    'altamira': (dms(69, 9, 59.2), dms(33, 45, 37.1)),
    'vistaFlores': (dms(69, 11, 59.2), dms(33, 39, 6.8)),
    'laConsulta': (dms(69, 8, 57.6), dms(33, 43, 18.9)),
}

# image extent in north-up ucomap units (x = east, y = south)
UX0, UX1, UY0, UY1 = 250, 1800, 0, 1629

tx0, ty0 = int((BX0 + UX0 / S) * K // 256), int((BY0 + UY0 / S) * K // 256)
tx1, ty1 = int((BX0 + UX1 / S) * K // 256), int((BY0 + UY1 / S) * K // 256)
cache = os.path.join(D, 's2z14')
os.makedirs(cache, exist_ok=True)
mos = Image.new('RGB', ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256))
for ty in range(ty0, ty1 + 1):
    for tx in range(tx0, tx1 + 1):
        p = os.path.join(cache, f'{Z}_{tx}_{ty}.jpg')
        if not os.path.exists(p):
            url = f'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{Z}/{ty}/{tx}.jpg'
            req = urllib.request.Request(url, headers={'User-Agent': 'AltamiraSiteMap/1.0'})
            open(p, 'wb').write(urllib.request.urlopen(req, timeout=30).read())
        mos.paste(Image.open(p).convert('RGB'), ((tx - tx0) * 256, (ty - ty0) * 256))

def mpx(ux, uy):  # ucomap units → mosaic pixels
    return ((BX0 + ux / S) * K - tx0 * 256, (BY0 + uy / S) * K - ty0 * 256)

l, t = mpx(UX0, UY0)
r, b = mpx(UX1, UY1)
crop = mos.crop((round(l), round(t), round(r), round(b)))
crop = crop.resize((round((UX1 - UX0) * PX_PER_UNIT), round((UY1 - UY0) * PX_PER_UNIT)), Image.LANCZOS)

# Relief: the client wants the Andes to stand out beside the estates. Hillshade from the z12 DEM
# (fetch_dem.py), stronger than uco-sat's, plus a lift on high ground; the flat valley stays untouched.
import numpy as np
m12 = eval(open(os.path.join(D, 'elev_meta.txt')).read())
elev12 = np.load(os.path.join(D, 'elev.npy')).astype(np.float32)
dx0, dy0 = (BX0 + UX0 / S) / 2 - m12['px0'], (BY0 + UY0 / S) / 2 - m12['py0']
dx1, dy1 = (BX0 + UX1 / S) / 2 - m12['px0'], (BY0 + UY1 / S) / 2 - m12['py0']
e = np.asarray(Image.fromarray(elev12, mode='F').transform(crop.size, Image.EXTENT, (dx0, dy0, dx1, dy1), Image.BICUBIC), dtype=np.float64)
def blur(a, s):
    r = int(3 * s); k = np.exp(-0.5 * (np.arange(-r, r + 1) / s) ** 2); k /= k.sum()
    p = np.pad(a, r, mode='edge')
    p = np.apply_along_axis(lambda v: np.convolve(v, k, 'valid'), 1, p)
    return np.apply_along_axis(lambda v: np.convolve(v, k, 'valid'), 0, p)
cell = 156543.03 * math.cos(math.radians(-33.72)) / 2 ** Z_BASE / S / PX_PER_UNIT   # metres per output pixel
gy, gx = np.gradient(blur(e, 6), cell)
slope = np.arctan(2.4 * np.hypot(gx, gy)); aspect = np.arctan2(-gx, gy)
def shade(az, alt):
    az, alt = math.radians(az), math.radians(alt)
    return np.clip(np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect), 0, 1)
hs = (0.75 * shade(315, 35) + 0.25 * shade(250, 55)) / (0.75 * math.sin(math.radians(35)) + 0.25 * math.sin(math.radians(55)))
high = np.clip((blur(e, 6) - 1100) / 1400, 0, 1)   # 0 on the valley floor → 1 well up the range
rel = np.clip(0.42 + 0.85 * hs, 0.3, 1.45) * (1 + 0.35 * high)
arr = np.asarray(crop, dtype=np.float64) * rel[..., None]
crop = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

# same gentle grade as uco-sat (a touch of warmth and contrast, still natural)
px = crop.load()
lut_r = [min(255, max(0, round(((v - 128) * 1.06 + 128) * 1.03))) for v in range(256)]
lut_g = [min(255, max(0, round((v - 128) * 1.06 + 128))) for v in range(256)]
lut_b = [min(255, max(0, round(((v - 128) * 1.06 + 128) * 0.96))) for v in range(256)]
crop = Image.merge('RGB', [c.point(lut) for c, lut in zip(crop.split(), (lut_r, lut_g, lut_b))])

wup = crop.rotate(-90, expand=True)   # west-up: turn 90° clockwise
out = os.path.join(ROOT, 'public', 'assets', 'uco-fincas-wup.webp')
wup.save(out, quality=80, method=6)

UCO_H = 1629
rot = lambda ux, uy: [round(UCO_H - uy, 1), round(ux, 1)]   # same as ucoRot in App.tsx
pins = {k: rot(*unit(lon, lat)) for k, (lon, lat) in FINCAS.items()}
# image box in rotated (west-up) units: X' = UCO_H - y, Y' = x
box = [UCO_H - UY1, UX0, UY1 - UY0, UX1 - UX0]
ts = f"""// Generated by tools/map/build_fincas.py — do not edit by hand.
// Close-up base public/assets/uco-fincas-wup.webp (Sentinel-2 cloudless 2016 by EOX, CC BY 4.0) and the
// three estates from the Google Maps list "Fincas Altamira de los Andes". All values are in the
// west-up ucomap space (X' = UCO_H - y, Y' = x); FINCAS_IMG is [x, y, width, height].
export const FINCAS_IMG = {json.dumps(box)} as const;
export const FINCAS_PT = {json.dumps(pins)} as const;
"""
open(os.path.join(ROOT, 'src', 'ucofincas.ts'), 'w', encoding='utf-8', newline='\n').write(ts)
print('tiles', (tx1 - tx0 + 1) * (ty1 - ty0 + 1), 'image', wup.size, round(os.path.getsize(out) / 1048576, 2), 'MB')
print(ts)
