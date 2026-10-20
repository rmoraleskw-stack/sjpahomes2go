"""Build docs/assets/coverage-map.svg from us-atlas county shapes.

Usage: npm i us-atlas@3.0.1 && python3 tools/mkmap.py node_modules/us-atlas/counties-10m.json docs/assets/coverage-map.svg
"""
import json, math, sys

topo = json.load(open(sys.argv[1]))
sx, sy = topo["transform"]["scale"]
tx, ty = topo["transform"]["translate"]
arcs = []
for a in topo["arcs"]:
    x = y = 0
    pts = []
    for dx, dy in a:
        x += dx; y += dy
        pts.append((x * sx + tx, y * sy + ty))
    arcs.append(pts)

LON0, LON1, LAT0, LAT1 = -75.45, -74.30, 39.50, 40.47
K = math.cos(math.radians(40.0))
W = 1000
S = W / ((LON1 - LON0) * K)

def proj(lon, lat):
    return (lon - LON0) * K * S, (LAT1 - lat) * S

H = round(proj(LON0, LAT0)[1])

def ring(r):
    pts = []
    for i in r:
        p = arcs[i] if i >= 0 else arcs[~i][::-1]
        pts.extend(p if not pts else p[1:])
    out, last = [], None
    for lon, lat in pts:
        q = tuple(round(v, 1) for v in proj(lon, lat))
        if q != last:
            out.append(q); last = q
    return "M" + "L".join("%g %g" % q for q in out) + "Z"

# county FIPS -> (key, label)
SERVED = {
    "34007": ("camden", "Camden County, NJ"),
    "34005": ("burlington", "Burlington County, NJ"),
    "34015": ("gloucester", "Gloucester County, NJ"),
    "34021": ("mercer", "Mercer County, NJ"),
    "42101": ("philadelphia", "Philadelphia County, PA"),
}
NEIGHBORS = ("42017", "42091", "42045", "42029", "10003")

base, served = [], []
for g in topo["objects"]["counties"]["geometries"]:
    fid = g.get("id", "")
    if not (fid.startswith("34") or fid in NEIGHBORS or fid in SERVED):
        continue
    polys = g["arcs"] if g["type"] == "MultiPolygon" else [g["arcs"]]
    d = "".join(ring(r) for poly in polys for r in poly)
    if fid in SERVED:
        key, name = SERVED[fid]
        served.append('<path class="cm-county" pathLength="1" d="%s" data-county="%s" tabindex="0" role="button" aria-label="%s"/>' % (d, key, name))
    else:
        base.append('<path class="cm-base%s" pathLength="1" d="%s"/>' % (" cm-nj" if fid.startswith("34") else "", d))

# (name, lon, lat, kind, label dx, label dy, anchor); kind: closing | hub
TOWNS = [
    ("Hamilton", -74.700, 40.208, "closing", 14, 7, "start"),
    ("Burlington", -74.865, 40.071, "closing", 14, 7, "start"),
    ("Delran", -74.955, 40.018, "closing", -14, -6, "end"),
    ("Lumberton", -74.807, 39.966, "closing", 14, 7, "start"),
    ("Mount Laurel", -74.891, 39.934, "closing", 6, 30, "start"),
    ("Cherry Hill", -75.031, 39.935, "hub", -14, 24, "end"),
    ("Center City", -75.165, 39.953, "hub", -14, -8, "end"),
]
dots = []
for i, (n, lon, lat, kind, dx, dy, anchor) in enumerate(TOWNS):
    x, y = proj(lon, lat)
    mark = '<circle class="cm-pulse" r="7"/><circle class="cm-dot" r="6"/>' if kind == "closing" else '<rect class="cm-hub" x="-6" y="-6" width="12" height="12" transform="rotate(45)"/>'
    dots.append('<g class="cm-town cm-%s" style="--i:%d" transform="translate(%.1f %.1f)"><title>%s</title>%s<text x="%d" y="%d" text-anchor="%s">%s</text></g>'
                % (kind, i, x, y, n, mark, dx, dy, anchor, n))

rx, ry = proj(-75.40, 39.76)
svg = ('<svg class="cm-svg" viewBox="0 0 %d %d" role="group" aria-label="Map of the five counties The Morales Group serves in New Jersey and Pennsylvania">'
       '<defs><radialGradient id="cm-fade" cx=".55" cy=".5" r=".64"><stop offset=".62" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'
       '<mask id="cm-mask"><rect width="100%%" height="100%%" fill="url(#cm-fade)"/></mask></defs>'
       '<g mask="url(#cm-mask)"><g class="cm-bases">%s</g><g class="cm-counties">%s</g></g>'
       '<text class="cm-river" transform="translate(%.0f %.0f) rotate(-52)">Delaware River</text>'
       '<g class="cm-towns">%s</g></svg>') % (W, H, "".join(base), "".join(served), rx, ry, "".join(dots))
open(sys.argv[2], "w").write(svg)
print(W, H, len(svg))
