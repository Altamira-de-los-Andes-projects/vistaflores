# Builds the La Consulta and Paraje Altamira zones by flood-filling between their legal
# boundary lines (river, RN40, streets, coordinate lines, 1,000 m contour), then traces the outline.
import os, json, math
import numpy as np
from PIL import Image, ImageDraw

D = os.path.dirname(os.path.abspath(__file__))
L = json.load(open(os.path.join(D, 'v2_lines.json')))
W, H = L['frame']
e = np.load(os.path.join(D, 'elev_v2.npy'))
LON_W, LON_E, LAT_N, LAT_S, Z = -69.52, -68.90, -33.54, -33.89, 13
def merc(lon, lat):
    n = 2 ** Z * 256
    return (lon + 180) / 360 * n, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
X0, Y0 = merc(LON_W, LAT_N); X1, _ = merc(LON_E, LAT_S); S = W / (X1 - X0)
def P(lon, lat):
    x, y = merc(lon, lat); return ((x - X0) * S, (y - Y0) * S)

def nearest(pt, lines):
    best = None
    for l in lines:
        for q in l:
            d = math.hypot(q[0] - pt[0], q[1] - pt[1])
            if best is None or d < best[0]: best = (d, q)
    return best[1]
def extend(a, b, k):
    dx, dy = b[0] - a[0], b[1] - a[1]; n = math.hypot(dx, dy) or 1
    return (b[0] + dx / n * k, b[1] + dy / n * k)

def flood(barrier_lines, seed, extra_block=None):
    im = Image.new('L', (W, H), 0)
    dr = ImageDraw.Draw(im)
    for l in barrier_lines:
        dr.line([tuple(p) for p in l], fill=255, width=5)
    a = np.asarray(im).copy()
    if extra_block is not None: a[extra_block] = 255
    im = Image.fromarray(a).copy()
    sx, sy = (int(v) for v in seed); print("seed", sx, sy, "val", im.getpixel((sx, sy)))
    ImageDraw.floodfill(im, (sx, sy), 128)
    m = np.asarray(im) == 128
    # grow back over the 5 px barrier so neighbouring zones meet the line itself
    g = Image.fromarray((m * 255).astype(np.uint8)).filter(__import__('PIL.ImageFilter', fromlist=['x']).MaxFilter(5))
    return np.asarray(g) > 0

river = L['river']; rn40 = L['rn40']
alt_s = [tuple(p) for p in L['alt_south']]
lc_s = [tuple(p) for p in L['lc_south']]

# ── Paraje Altamira ──
sup = max(L['superiora'], key=len)            # main La Superiora way
sup_all = [tuple(p) for l in L['superiora'] for p in l]
sup_all.sort(key=lambda p: p[0])              # west → east
sup_line = [extend(sup_all[1], sup_all[0], 40)] + sup_all + [extend(sup_all[-2], sup_all[-1], 60)]
alt_line = [nearest(alt_s[0], river)] + alt_s + [(alt_s[-1][0] + 500, alt_s[-1][1])]   # El Indio ≈ east to the contour
low = e < 1000
alt = flood(river + [sup_line, alt_line], P(-69.19, -33.765), extra_block=low)
alt &= ~low

# ── La Consulta ──
rn_pt = nearest(lc_s[0], rn40)                 # Calle Los Indios meets RN40
lc_line = [rn_pt] + lc_s + list(reversed(alt_line[1:-1])) + [alt_line[0]]
lc = flood(river + rn40 + [lc_line], P(-69.118, -33.736))

# ── Vista Flores (district polygon) ──
im = Image.new('L', (W, H), 0); ImageDraw.Draw(im).polygon([tuple(p) for p in L['vf']], fill=255)
vf = np.asarray(im) > 0

print('areas km2:', {k: round(v.sum() * (156543.03 * math.cos(math.radians(33.72)) / 2 ** Z / S) ** 2 / 1e6, 1) for k, v in [('alt', alt), ('lc', lc), ('vf', vf)]})

# ── trace outer boundary (Moore neighbour) of the largest blob ──
def trace(mask):
    ys, xs = np.nonzero(mask)
    i = np.lexsort((xs, ys))[0]; start = (int(xs[i]), int(ys[i]))
    ring = [(-1, 0), (-1, -1), (0, -1), (1, -1), (1, 0), (1, 1), (0, 1), (-1, 1)]  # clockwise from W
    inside = lambda x, y: 0 <= x < W and 0 <= y < H and mask[y, x]
    c, b = start, (start[0] - 1, start[1])
    b0 = b; pts = [c]
    for _ in range(400000):
        k0 = ring.index((b[0] - c[0], b[1] - c[1]))
        prev = b
        for k in range(1, 9):
            dx, dy = ring[(k0 + k) % 8]
            n = (c[0] + dx, c[1] + dy)
            if inside(*n):
                b, c = prev, n
                break
            prev = n
        if c == start and b == b0:
            break
        pts.append(c)
    return pts

def rdp(pts, eps):
    if len(pts) < 3: return pts
    a, b = np.array(pts[0], float), np.array(pts[-1], float)
    P_ = np.array(pts, float); ab = b - a; n = np.hypot(*ab)
    d = np.abs(np.cross(ab, P_ - a)) / n if n else np.hypot(*(P_ - a).T)
    i = int(np.argmax(d))
    if d[i] > eps: return rdp(pts[:i + 1], eps)[:-1] + rdp(pts[i:], eps)
    return [pts[0], pts[-1]]
def chaikin(pts, it=2):
    for _ in range(it):
        o = []
        for i in range(len(pts)):
            a, b = pts[i], pts[(i + 1) % len(pts)]
            o += [(0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]), (0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1])]
        pts = o
    return pts
def keep_largest(mask):
    im = Image.fromarray((mask * 255).astype(np.uint8))
    # cheap: flood from the trace start of the biggest component isn't trivial; assume one blob
    return mask
from PIL import ImageFilter as _IF
def soften(m, r=5):
    im = Image.fromarray((m * 255).astype(np.uint8)).filter(_IF.GaussianBlur(r))
    return np.asarray(im) >= 128
alt, lc, vf = soften(alt), soften(lc), soften(vf, 2)
out = {}
for k, m in [('altamira', alt), ('laConsulta', lc), ('vistaFlores', vf)]:
    t = trace(m)
    s = chaikin(rdp(t, 1.6), 2)
    out[k] = [[round(x, 1), round(y, 1)] for x, y in s]
    ys, xs = np.nonzero(m)
    out[k + '_c'] = [float(xs.mean()), float(ys.mean())]
    print(k, len(t), '→', len(s))
json.dump(out, open(os.path.join(D, 'zones_v2.json'), 'w'))

pv = Image.open(os.path.join(D, 'uco-sat.jpg')).convert('RGBA')
ov = Image.new('RGBA', pv.size); dr = ImageDraw.Draw(ov)
for k, c in [('laConsulta', (143, 160, 110, 120)), ('altamira', (200, 155, 90, 140)), ('vistaFlores', (150, 60, 80, 120))]:
    dr.polygon([tuple(p) for p in out[k]], fill=c, outline=(255, 250, 235, 255))
Image.alpha_composite(pv, ov).convert('RGB').resize((W // 2, H // 2), Image.LANCZOS).save(os.path.join(D, 'zones-preview.jpg'), quality=85)
