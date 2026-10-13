# Downloads AWS Terrain Tiles (terrarium PNG, public domain-ish: Mapzen/AWS open data)
# for the Uco Valley frame and stitches them into one elevation array (metres).
import math, os, sys, urllib.request, io
import numpy as np
from PIL import Image

OUT = os.path.dirname(os.path.abspath(__file__))
Z = 12
LON_W, LON_E = -69.95, -68.70
LAT_N, LAT_S = -33.30, -34.08

def tile_xy(lon, lat, z):
    n = 2 ** z
    x = (lon + 180) / 360 * n
    y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
    return x, y

x0, y0 = tile_xy(LON_W, LAT_N, Z)
x1, y1 = tile_xy(LON_E, LAT_S, Z)
tx0, ty0, tx1, ty1 = int(x0), int(y0), int(x1), int(y1)
W = (tx1 - tx0 + 1) * 256
H = (ty1 - ty0 + 1) * 256
elev = np.zeros((H, W), dtype=np.float32)
os.makedirs(os.path.join(OUT, 'tiles'), exist_ok=True)
for ty in range(ty0, ty1 + 1):
    for tx in range(tx0, tx1 + 1):
        p = os.path.join(OUT, 'tiles', f'{Z}_{tx}_{ty}.png')
        if not os.path.exists(p):
            url = f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{tx}/{ty}.png'
            data = urllib.request.urlopen(url, timeout=30).read()
            open(p, 'wb').write(data)
        a = np.asarray(Image.open(p).convert('RGB'), dtype=np.float32)
        e = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
        elev[(ty - ty0) * 256:(ty - ty0 + 1) * 256, (tx - tx0) * 256:(tx - tx0 + 1) * 256] = e

# crop to the exact frame
cx0, cy0 = int((x0 - tx0) * 256), int((y0 - ty0) * 256)
cx1, cy1 = int((x1 - tx0) * 256), int((y1 - ty0) * 256)
elev = elev[cy0:cy1, cx0:cx1]
np.save(os.path.join(OUT, 'elev.npy'), elev)
meta = dict(Z=Z, px0=tx0 * 256 + cx0, py0=ty0 * 256 + cy0, w=elev.shape[1], h=elev.shape[0])
open(os.path.join(OUT, 'elev_meta.txt'), 'w').write(repr(meta))
print(meta, 'min', elev.min(), 'max', elev.max())

def sample(lon, lat):
    x, y = tile_xy(lon, lat, Z)
    return elev[int(y * 256 - meta['py0']), int(x * 256 - meta['px0'])]
for name, lon, lat in [('Vista Flores', -69.1555, -33.6509), ('La Consulta', -69.1181, -33.7363),
                       ('Altamira (approx)', -69.17, -33.80), ('Tunuyán', -69.0154, -33.5813),
                       ('San Carlos', -69.0404, -33.7721), ('Tupungato', -69.1476, -33.3728)]:
    print(f'{name:20s} {sample(lon, lat):7.0f} m')
