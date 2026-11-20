# Hearth, revision 6: a walled village on a low hill, seen through the loupe.
# Drawn fresh in one consistent style: warm candle light from the top left,
# chunky dark outlines, lit windows, cobbles and lanes. Layers:
#   hearth-base     ground, plaza, lanes, cottages (never change), trees behind
#   walls-<stage>   palisade, then a stone wall, then towers and a gatehouse
#   b-<id>-<stage>  the Great Tower, Shrine and Workshop in three stages
#   hearth-front    trees in front of the walls
import math, random

CX, CY, RX, RY = 636, 430, 400, 374
G = CY + 30
S, K, HF = 94, .84, .55
WALL_R = 3.15

def P(cx, cy, x, z, up=0):
    """Village units (x right, z towards the viewer, up in units) to the desk."""
    return (cx + x * S, cy + z * S * K - up * S * HF)

OUT = '#2a1a10'  # every outline
LIGHT = '#ffd27a'

DEFS = '''
<radialGradient id="h6light" gradientUnits="userSpaceOnUse" cx="420" cy="120" r="900"><stop offset="0" stop-color="#ffe2b0" stop-opacity=".28"/><stop offset=".5" stop-color="#ffd9a0" stop-opacity="0"/><stop offset=".85" stop-color="#0e0a1e" stop-opacity=".18"/><stop offset="1" stop-color="#0e0a1e" stop-opacity=".45"/></radialGradient>
<radialGradient id="h6glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd27a" stop-opacity=".75"/><stop offset=".4" stop-color="#ffb04a" stop-opacity=".28"/><stop offset="1" stop-color="#ff9a3a" stop-opacity="0"/></radialGradient>
<radialGradient id="h6teal" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#9ff6ff" stop-opacity=".8"/><stop offset=".45" stop-color="#5fd0e0" stop-opacity=".25"/><stop offset="1" stop-color="#5fd0e0" stop-opacity="0"/></radialGradient>
<radialGradient id="h6ao" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#0a0806" stop-opacity=".6"/><stop offset="1" stop-color="#0a0806" stop-opacity="0"/></radialGradient>
<linearGradient id="h6water" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3f7fa0"/><stop offset="1" stop-color="#24506e"/></linearGradient>
<filter id="h6soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="h6blur2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2"/></filter>
'''

def f(v): return f'{v:.1f}'

# ---------- small pieces ----------
def glow(X, Y, r=22, kind='h6glow'):
    return f'<circle cx="{f(X)}" cy="{f(Y)}" r="{r}" fill="url(#{kind})"/>'

def ao(X, Y, w):
    return f'<ellipse cx="{f(X+6)}" cy="{f(Y+3)}" rx="{f(w)}" ry="{f(w*.34)}" fill="url(#h6ao)"/>'

def window(x, y, w=9, h=11, lit=True, arch=False):
    top = f'M{f(x)} {f(y+h)} V{f(y+w/2)} A{f(w/2)} {f(w/2)} 0 0 1 {f(x+w)} {f(y+w/2)} V{f(y+h)}Z' if arch else f'M{f(x)} {f(y)} h{f(w)} v{f(h)} h{f(-w)}Z'
    fill = LIGHT if lit else '#2a2420'
    o = glow(x + w / 2, y + h / 2, w * 1.6) if lit else ''
    o += f'<path d="{top}" fill="{fill}" stroke="{OUT}" stroke-width="1.3"/>'
    if lit: o += f'<path d="M{f(x+w/2)} {f(y+1)} V{f(y+h)} M{f(x)} {f(y+h*.5)} H{f(x+w)}" stroke="#8a5a20" stroke-width=".9"/>'
    return o

def lantern(X, Y, h=34):
    return (glow(X, Y - h - 4, 26) + f'<path d="M{f(X)} {f(Y)} V{f(Y-h)}" stroke="{OUT}" stroke-width="3"/>'
            f'<rect x="{f(X-5)}" y="{f(Y-h-10)}" width="10" height="11" rx="2" fill="{LIGHT}" stroke="{OUT}" stroke-width="1.5"/>'
            f'<path d="M{f(X-6)} {f(Y-h-10)} h12 l-6 -5z" fill="#3a2a1a" stroke="{OUT}" stroke-width="1"/>')

def bush(X, Y, s=1, c='#3f6a34'):
    return ''.join(f'<circle cx="{f(X+dx*s)}" cy="{f(Y+dy*s)}" r="{f(rr*s)}" fill="{cc}" stroke="{OUT}" stroke-width=".9"/>'
                   for dx, dy, rr, cc in [(-7, -4, 7, c), (6, -5, 8, c), (0, -9, 8, '#4f7d3e')]) + \
        f'<circle cx="{f(X-2*s)}" cy="{f(Y-12*s)}" r="{f(3*s)}" fill="#78a650" opacity=".7"/>'

def flowers(X, Y, seed):
    r = random.Random(seed)
    return ''.join(f'<circle cx="{f(X+r.uniform(-14,14))}" cy="{f(Y+r.uniform(-5,5))}" r="2.6" fill="{r.choice(["#f2c14e","#e98fb5","#f4ecd8","#c39bff"])}" stroke="#3a2a1a" stroke-width=".5"/>' for _ in range(7))

def spruce(X, Y, h, c):
    w = h * .42
    o = f'<path d="M{f(X-2.5)} {f(Y)} v{f(-h*.16)} h5 v{f(h*.16)}z" fill="#3a2414"/>'
    for k in range(3):
        y0 = Y - h * .14 - k * h * .26; ww = w * (1 - k * .24)
        o += f'<path d="M{f(X-ww)} {f(y0)} L{f(X)} {f(y0-h*.44)} L{f(X+ww)} {f(y0)} Q{f(X)} {f(y0+5)} {f(X-ww)} {f(y0)}Z" fill="{c}" stroke="{OUT}" stroke-width="1.1"/>'
        o += f'<path d="M{f(X-ww*.75)} {f(y0-2)} L{f(X)} {f(y0-h*.4)} L{f(X-ww*.15)} {f(y0-1)}Z" fill="#ffffff" opacity=".07"/>'
    return o

def oak(X, Y, h, c):
    r = h * .34
    o = f'<path d="M{f(X-3)} {f(Y)} v{f(-h*.35)} h6 v{f(h*.35)}z" fill="#4a2e18" stroke="{OUT}" stroke-width=".8"/>'
    for dx, dy, rr in [(-r * .55, -h * .55, r * .7), (r * .55, -h * .55, r * .72), (0, -h * .78, r * .8)]:
        o += f'<circle cx="{f(X+dx)}" cy="{f(Y+dy)}" r="{f(rr)}" fill="{c}" stroke="{OUT}" stroke-width="1.1"/>'
    o += f'<circle cx="{f(X-r*.3)}" cy="{f(Y-h*.85)}" r="{f(r*.32)}" fill="#ffffff" opacity=".09"/>'
    return o

def person(X, Y, c):
    return (f'<ellipse cx="{f(X+1)}" cy="{f(Y+1)}" rx="6" ry="2.2" fill="#000" opacity=".35"/>'
            f'<path d="M{f(X-4.5)} {f(Y)} q-.5 -10 4.5 -11 q5 1 4.5 11z" fill="{c}" stroke="{OUT}" stroke-width="1"/>'
            f'<circle cx="{f(X)}" cy="{f(Y-14)}" r="4.4" fill="#e8c7a8" stroke="{OUT}" stroke-width="1"/>'
            f'<path d="M{f(X-4.6)} {f(Y-15)} q4.6 -7 9.2 0 q-4.6 -3 -9.2 0z" fill="#5a3a22"/>')

# ---------- a cottage in 3/4 view: front gable, right side in shade ----------
WALLS = ['#e8d8b8', '#dccaa4', '#e4cfa8', '#d8c09a']
ROOFS = ['#a8462e', '#8e3a2a', '#4e5a6a', '#9a5a2e', '#6a3a4a']

def house(X, Y, w, d, h, rh, wall, roof, seed=0, door=True, chimney=True, timber=False, lit=True):
    r = random.Random(seed)
    dx, dy = d * .5, d * .42  # the depth goes up and to the right
    e = 6  # roof overhang
    o = ao(X + dx / 2, Y - dy / 2, w * .75 + d * .3)
    # right side wall, in shade
    o += f'<path d="M{f(X+w/2)} {f(Y)} l{f(dx)} {f(-dy)} v{f(-h)} l{f(-dx)} {f(dy)}Z" fill="{wall}" stroke="{OUT}" stroke-width="1.4"/>'
    o += f'<path d="M{f(X+w/2)} {f(Y)} l{f(dx)} {f(-dy)} v{f(-h)} l{f(-dx)} {f(dy)}Z" fill="#2a1a3a" opacity=".32"/>'
    # front wall (the gable end)
    o += f'<path d="M{f(X-w/2)} {f(Y)} V{f(Y-h)} L{f(X)} {f(Y-h-rh)} L{f(X+w/2)} {f(Y-h)} V{f(Y)}Z" fill="{wall}" stroke="{OUT}" stroke-width="1.4"/>'
    if timber:
        o += f'<path d="M{f(X-w/2)} {f(Y-h)} H{f(X+w/2)} M{f(X-w/2+3)} {f(Y-h)} L{f(X)} {f(Y-h-rh+3)} L{f(X+w/2-3)} {f(Y-h)} M{f(X)} {f(Y-h)} V{f(Y-h-rh+4)}" stroke="#5a3a20" stroke-width="2.4" fill="none"/>'
    # stone footing
    o += f'<path d="M{f(X-w/2)} {f(Y)} v-5 h{f(w)} v5z M{f(X+w/2)} {f(Y)} l{f(dx)} {f(-dy)} v-5 l{f(-dx)} {f(dy)}z" fill="#8a8274" stroke="{OUT}" stroke-width="1"/>'
    # the roof's right slope, lit along the ridge
    rx0, ry0 = X, Y - h - rh
    o += f'<path d="M{f(rx0)} {f(ry0)} l{f(dx)} {f(-dy)} L{f(X+w/2+e+dx)} {f(Y-h-dy+3)} L{f(X+w/2+e)} {f(Y-h+3)}Z" fill="{roof}" stroke="{OUT}" stroke-width="1.5"/>'
    o += ''.join(f'<path d="M{f(rx0+(X+w/2+e-rx0)*t)} {f(ry0+(Y-h+3-ry0)*t)} l{f(dx)} {f(-dy)}" stroke="#000" stroke-width="1" opacity=".22"/>' for t in (.33, .66))
    # the front edge of the roof (bargeboards)
    o += f'<path d="M{f(X-w/2-e)} {f(Y-h+3)} L{f(rx0)} {f(ry0-2)} L{f(X+w/2+e)} {f(Y-h+3)}" stroke="{OUT}" stroke-width="5" fill="none" stroke-linejoin="round"/>'
    o += f'<path d="M{f(X-w/2-e)} {f(Y-h+3)} L{f(rx0)} {f(ry0-2)} L{f(X+w/2+e)} {f(Y-h+3)}" stroke="{roof}" stroke-width="2.6" fill="none" stroke-linejoin="round"/>'
    if chimney:
        cx_ = X + w * .22 + dx * .6; cy_ = Y - h - rh * .45 - dy * .6
        o += f'<path d="M{f(cx_)} {f(cy_)} v-16 h8 v{f(16-3)}z" fill="#8a7a6a" stroke="{OUT}" stroke-width="1.2"/><rect x="{f(cx_-1.5)}" y="{f(cy_-19)}" width="11" height="4" fill="#6a5a4a" stroke="{OUT}" stroke-width="1"/>'
        o += ''.join(f'<circle cx="{f(cx_+4+k*3)}" cy="{f(cy_-26-k*8)}" r="{4+k*1.5}" fill="#cfc4b8" opacity="{.28-k*.07:.2f}"/>' for k in range(3))
    if door:
        o += f'<path d="M{f(X-5)} {f(Y-1)} v-14 q5 -6 10 0 v14z" fill="#5a3418" stroke="{OUT}" stroke-width="1.2"/><circle cx="{f(X+2.5)}" cy="{f(Y-8)}" r="1" fill="{LIGHT}"/>'
        wx = [X - w / 2 + 5] if w < 44 else [X - w / 2 + 5, X + w / 2 - 14]
    else:
        wx = [X - 4.5]
    for x in wx: o += window(x, Y - h + 7, 9, 10, lit and r.random() < .85)
    if rh > 14: o += window(X - 4, Y - h - rh * .55, 8, 8, lit, arch=True)
    # a side window
    o += f'<path d="M{f(X+w/2+dx*.35)} {f(Y-dy*.35-h*.35)} l{f(dx*.3)} {f(-dy*.3)} v-9 l{f(-dx*.3)} {f(dy*.3)}z" fill="{LIGHT if lit else "#2a2420"}" stroke="{OUT}" stroke-width="1"/>'
    return o

# ---------- the ground ----------
LANES = [((0, 1.0), (0, 3.6)), ((0, 3.6), (-.3, 6.4)), ((-1.0, -.4), (-2.5, -.9)), ((1.0, -.35), (2.6, -.6)), ((0, -1.1), (0, -2.8))]

def dseg(x, z, a, b):
    ax, az = a; bx, bz = b
    vx, vz = bx - ax, bz - az
    t = max(0, min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)))
    return math.hypot(x - ax - vx * t, z - az - vz * t)

STREAM = [(4.9, -6.4), (4.4, -3.6), (4.0, -1.2), (4.3, 1.4), (3.7, 3.8), (4.2, 6.4)]

# where the cottages stand (x, z, width, depth, height, seed); none on the
# Great Tower, Shrine or Workshop, nor on the lanes
COTTAGES = [(-2.25, .45, 38, 30, 26, 1), (-1.35, 1.55, 42, 30, 28, 2), (1.4, 1.5, 44, 32, 28, 3), (2.3, .55, 36, 28, 25, 4),
            (-.75, -2.25, 34, 26, 24, 5), (.9, -2.3, 38, 28, 25, 6), (-2.55, -.75, 30, 26, 22, 7), (-1.0, 2.25, 32, 26, 22, 8), (1.05, 2.3, 30, 26, 22, 9)]

def ground():
    r = random.Random(3)
    o = [f'<ellipse cx="{CX}" cy="{CY}" rx="{RX}" ry="{RY}" fill="#2f4d2c"/>']
    # soft forest floor patches
    o.append('<g filter="url(#h6soft)">')
    for _ in range(240):
        x = r.uniform(-5.6, 5.6); z = r.uniform(-6.8, 6.8)
        X, Y = P(CX, G, x, z)
        o.append(f'<ellipse cx="{f(X)}" cy="{f(Y)}" rx="{r.uniform(26,54):.0f}" ry="{r.uniform(16,30):.0f}" fill="{r.choice(["#36573a","#2c4a2e","#3a5e36","#33533a"])}" opacity=".6"/>')
    o.append('</g>')
    # the village green inside the walls, a little raised and lighter
    X0, Y0 = P(CX, G, 0, 0)
    o.append(f'<ellipse cx="{f(X0)}" cy="{f(Y0+8)}" rx="{f((WALL_R+.35)*S)}" ry="{f((WALL_R+.35)*S*K)}" fill="#3a5a30"/>')
    o.append(f'<ellipse cx="{f(X0)}" cy="{f(Y0)}" rx="{f((WALL_R+.2)*S)}" ry="{f((WALL_R+.2)*S*K)}" fill="#5a8644"/>')
    o.append('<g filter="url(#h6soft)">' + ''.join(
        f'<ellipse cx="{f(P(CX,G,x,z)[0])}" cy="{f(P(CX,G,x,z)[1])}" rx="{r.uniform(20,40):.0f}" ry="{r.uniform(12,22):.0f}" fill="{r.choice(["#649250","#527e40","#6a9a54"])}" opacity=".6"/>'
        for x, z in [(r.uniform(-3, 3), r.uniform(-3, 3)) for _ in range(90)] if math.hypot(x, z) < WALL_R) + '</g>')
    # the stream outside the walls on the right
    pts = [P(CX, G, x, z) for x, z in STREAM]
    d = 'M' + ' L'.join(f'{f(X)} {f(Y)}' for X, Y in pts)
    o.append(f'<path d="{d}" fill="none" stroke="#1f3a4a" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/><path d="{d}" fill="none" stroke="url(#h6water)" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>')
    o.append(f'<path d="{d}" fill="none" stroke="#9fd4ea" stroke-width="2" stroke-dasharray="10 26" opacity=".6"/>')
    # lanes of packed earth
    for a, b in LANES:
        (X1, Y1), (X2, Y2) = P(CX, G, *a), P(CX, G, *b)
        o.append(f'<path d="M{f(X1)} {f(Y1)} L{f(X2)} {f(Y2)}" stroke="#6e5a40" stroke-width="30" stroke-linecap="round"/><path d="M{f(X1)} {f(Y1)} L{f(X2)} {f(Y2)}" stroke="#a88d68" stroke-width="24" stroke-linecap="round"/>')
    # the cobbled square round the Great Tower
    o.append(f'<ellipse cx="{f(X0)}" cy="{f(Y0)}" rx="{f(1.35*S)}" ry="{f(1.35*S*K)}" fill="#6e5a40"/><ellipse cx="{f(X0)}" cy="{f(Y0-1)}" rx="{f(1.3*S)}" ry="{f(1.3*S*K)}" fill="#b09a78"/>')
    for ring in range(1, 8):
        rr = ring * .18
        n = int(10 + ring * 7)
        for k in range(n):
            a = k / n * math.tau + ring * .3
            X, Y = P(CX, G, math.cos(a) * rr, math.sin(a) * rr)
            o.append(f'<ellipse cx="{f(X)}" cy="{f(Y)}" rx="{r.uniform(5,7):.1f}" ry="{r.uniform(3,4.2):.1f}" fill="{r.choice(["#c4b08c","#b8a27c","#cbb994"])}" stroke="#6a5638" stroke-width=".7"/>')
    # a well on the square
    X, Y = P(CX, G, .78, .72)
    o.append(f'<ellipse cx="{f(X)}" cy="{f(Y)}" rx="14" ry="7" fill="#8a8274" stroke="{OUT}" stroke-width="1.3"/><ellipse cx="{f(X)}" cy="{f(Y-1)}" rx="9" ry="4" fill="#1f3a4a"/><path d="M{f(X-12)} {f(Y)} v-22 M{f(X+12)} {f(Y)} v-22" stroke="#5a3a20" stroke-width="3"/><path d="M{f(X-17)} {f(Y-20)} L{f(X)} {f(Y-32)} L{f(X+17)} {f(Y-20)}Z" fill="#8e3a2a" stroke="{OUT}" stroke-width="1.3"/>')
    o.append(f'<ellipse cx="{CX}" cy="{CY}" rx="{RX}" ry="{RY}" fill="url(#h6light)"/>')
    return ''.join(o)

def trees(front):
    """The forest round the village; front=True gives the trees in front of the walls."""
    r = random.Random(5); items = []
    for _ in range(620):
        x = r.uniform(-5.6, 5.6); z = r.uniform(-6.8, 6.8); d = math.hypot(x, z)
        if d < WALL_R + .55: continue
        if min(dseg(x, z, a, b) for a, b in LANES) < .45: continue
        if min(dseg(x, z, STREAM[k], STREAM[k + 1]) for k in range(len(STREAM) - 1)) < .42: continue
        if (z > 2.2) != front: continue
        X, Y = P(CX, G, x, z)
        h = r.uniform(58, 92) * (1.1 if d > 4.5 else .95)
        c = r.random()
        t = spruce(X, Y, h, ['#1e4430', '#24503a', '#1a3a2a', '#2a5a3c'][int(c * 4)]) if r.random() < .6 else oak(X, Y, h * .8, ['#3a6a34', '#2f5e34', '#4a7a3a'][int(c * 3)])
        items.append((Y, f'<ellipse cx="{f(X+5)}" cy="{f(Y+2)}" rx="{f(h*.3)}" ry="{f(h*.09)}" fill="#0a0806" opacity=".35"/>' + t))
    items.sort(key=lambda t: t[0])
    return ''.join(t[1] for t in items)

def clip(id_, body):
    return f'<clipPath id="{id_}"><ellipse cx="{CX}" cy="{CY}" rx="{RX}" ry="{RY}"/></clipPath><g clip-path="url({"#" + id_})">{body}</g>'

def base():
    items = []
    def add(x, z, svg): items.append((P(CX, G, x, z)[1], svg))
    for i, (x, z, w, d, h, sd) in enumerate(COTTAGES):
        X, Y = P(CX, G, x, z)
        rr = random.Random(sd)
        add(x, z, house(X, Y, w, d, h, rr.uniform(16, 24), rr.choice(WALLS), rr.choice(ROOFS), seed=sd, timber=rr.random() < .45))
        add(x - .25, z + .25, bush(X - w * .55, Y + 6, .9))
    for x, z in [(-.9, .9), (.95, -1.0), (-.9, -.95), (1.15, .5)]:
        X, Y = P(CX, G, x, z); add(x, z, lantern(X, Y))
    for x, z, sd in [(-1.9, 1.1, 1), (1.9, 1.0, 2), (-.4, -1.6, 3), (2.4, -1.6, 4), (-2.6, -1.6, 5)]:
        X, Y = P(CX, G, x, z); add(x, z, flowers(X, Y, sd))
    # villagers about the square
    for x, z, c in [(-.5, .7, '#3f6fb0'), (.3, 1.05, '#c4553b'), (-1.1, .2, '#2f8f8a'), (.6, -.85, '#d9a23a')]:
        X, Y = P(CX, G, x, z); add(x, z, person(X, Y, c))
    items.sort(key=lambda t: t[0])
    return clip('h6b', ground() + trees(False) + ''.join(t[1] for t in items))

def front():
    return clip('h6f', trees(True))

# ---------- the walls ----------
def wall_ring(height, stone, step=.035):
    """The ring of the walls as a band: back half first, gaps at the gate."""
    out = []
    n = int(math.tau / step)
    for k in range(n):
        a0 = k / n * math.tau; a1 = (k + 1) / n * math.tau
        mid = (a0 + a1) / 2
        if abs(((mid - math.pi / 2 + math.pi) % math.tau) - math.pi) < .2: continue  # the gate, at the front
        (X0, Y0), (X1, Y1) = P(CX, G, math.cos(a0) * WALL_R, math.sin(a0) * WALL_R), P(CX, G, math.cos(a1) * WALL_R, math.sin(a1) * WALL_R)
        h = height * S * HF
        shade = .5 + .5 * math.cos(mid - 2.4)  # lit from the top left
        col = stone(k, shade)
        face = f'<path d="M{f(X0)} {f(Y0)} L{f(X1)} {f(Y1)} L{f(X1)} {f(Y1-h)} L{f(X0)} {f(Y0-h)}Z" fill="{col}" stroke="{col}" stroke-width=".8"/>'
        out.append((Y0 + Y1, mid, X0, Y0, X1, Y1, h, face))
    return out

def mix(a, b, t):
    a = [int(a[i:i + 2], 16) for i in (1, 3, 5)]; b = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
    return '#' + ''.join(f'{round(x + (y - x) * t):02x}' for x, y in zip(a, b))

def walls(stage):
    o = []
    if stage == 0:
        # a palisade of sharpened stakes
        n = 150
        for k in range(n):
            a = k / n * math.tau
            if abs(((a - math.pi / 2 + math.pi) % math.tau) - math.pi) < .2: continue
            X, Y = P(CX, G, math.cos(a) * WALL_R, math.sin(a) * WALL_R)
            sh = .5 + .5 * math.cos(a - 2.4)
            c = mix('#5a3a22', '#9a6a3e', sh)
            hgt = 30 + (k * 7 % 5)
            o.append((Y, f'<path d="M{f(X-3.6)} {f(Y+1)} V{f(Y-hgt)} L{f(X)} {f(Y-hgt-7)} L{f(X+3.6)} {f(Y-hgt)} V{f(Y+1)}Z" fill="{c}" stroke="{OUT}" stroke-width="1"/>'))
        # two rails
        for up in (10, 22):
            pts = [P(CX, G, math.cos(a) * WALL_R, math.sin(a) * WALL_R) for a in [k / 90 * math.tau for k in range(91)]]
        X, Y = P(CX, G, 0, WALL_R)
        gate = (f'<path d="M{f(X-30)} {f(Y+2)} V{f(Y-44)} M{f(X+30)} {f(Y+2)} V{f(Y-44)}" stroke="{OUT}" stroke-width="9" stroke-linecap="round"/>'
                f'<path d="M{f(X-30)} {f(Y+2)} V{f(Y-44)} M{f(X+30)} {f(Y+2)} V{f(Y-44)}" stroke="#7a5534" stroke-width="5.5" stroke-linecap="round"/>'
                f'<path d="M{f(X-36)} {f(Y-42)} H{f(X+36)}" stroke="{OUT}" stroke-width="8" stroke-linecap="round"/><path d="M{f(X-36)} {f(Y-42)} H{f(X+36)}" stroke="#8a6038" stroke-width="5" stroke-linecap="round"/>'
                + lantern(X - 38, Y + 2, 40) + lantern(X + 38, Y + 2, 40))
        o.append((Y + 2, gate))
    else:
        tall = 1 if stage == 1 else 1.6
        base_c = '#9a948a' if stage == 1 else '#a8a196'
        def stone(k, sh): return mix('#5e584f', base_c, sh * .85 + .15)
        ring = wall_ring(.42 * tall, stone)
        for key, mid, X0, Y0, X1, Y1, h, face in ring:
            seg = face
            # coursing lines
            seg += ''.join(f'<path d="M{f(X0)} {f(Y0-h*t)} L{f(X1)} {f(Y1-h*t)}" stroke="#3a342c" stroke-width=".7" opacity=".55"/>' for t in (.33, .66))
            # the walk along the top
            seg += f'<path d="M{f(X0)} {f(Y0-h)} L{f(X1)} {f(Y1-h)}" stroke="#c9c2b4" stroke-width="3.5"/><path d="M{f(X0)} {f(Y0-h-2)} L{f(X1)} {f(Y1-h-2)}" stroke="{OUT}" stroke-width="1"/>'
            if stage == 2 and int(mid * 40) % 2 == 0:  # crenellations
                seg += f'<path d="M{f(X0)} {f(Y0-h)} L{f(X1)} {f(Y1-h)} L{f(X1)} {f(Y1-h-7)} L{f(X0)} {f(Y0-h-7)}Z" fill="{stone(0, .5 + .5 * math.cos(mid - 2.4))}" stroke="{OUT}" stroke-width=".9"/>'
            seg += f'<path d="M{f(X0)} {f(Y0)} L{f(X1)} {f(Y1)}" stroke="{OUT}" stroke-width="1.6"/>'
            o.append((key / 2, seg))
        X, Y = P(CX, G, 0, WALL_R)
        hh = .42 * tall * S * HF
        if stage == 1:
            gate = (f'<path d="M{f(X-30)} {f(Y)} V{f(Y-hh-6)} H{f(X+30)} V{f(Y)}" fill="none" stroke="{OUT}" stroke-width="2"/>'
                    f'<rect x="{f(X-38)}" y="{f(Y-hh-14)}" width="12" height="{f(hh+14)}" fill="#8a8478" stroke="{OUT}" stroke-width="1.4"/><rect x="{f(X+26)}" y="{f(Y-hh-14)}" width="12" height="{f(hh+14)}" fill="#6e6a62" stroke="{OUT}" stroke-width="1.4"/>'
                    f'<path d="M{f(X-26)} {f(Y)} V{f(Y-hh+2)} H{f(X+26)} V{f(Y)}Z" fill="#6b4a2e" stroke="{OUT}" stroke-width="1.4"/>'
                    + ''.join(f'<path d="M{f(X-26+k*8.6)} {f(Y)} V{f(Y-hh+2)}" stroke="#4a2e18" stroke-width="1.2"/>' for k in range(1, 6))
                    + lantern(X - 44, Y + 3, 34) + lantern(X + 44, Y + 3, 34))
        else:
            gate = (f'<rect x="{f(X-46)}" y="{f(Y-hh-40)}" width="92" height="{f(hh+40)}" fill="#a8a196" stroke="{OUT}" stroke-width="1.6"/>'
                    f'<path d="M{f(X+46)} {f(Y)} l12 -10 v{f(-hh-40)} l-12 10z" fill="#77716a" stroke="{OUT}" stroke-width="1.4"/>'
                    + ''.join(f'<rect x="{f(X-46+k*16)}" y="{f(Y-hh-50)}" width="10" height="10" fill="#a8a196" stroke="{OUT}" stroke-width="1.2"/>' for k in range(6))
                    + f'<path d="M{f(X-22)} {f(Y)} V{f(Y-34)} A22 22 0 0 1 {f(X+22)} {f(Y-34)} V{f(Y)}Z" fill="#3a2414" stroke="{OUT}" stroke-width="1.5"/>'
                    + ''.join(f'<path d="M{f(X-22+k*7.3)} {f(Y)} V{f(Y-40)}" stroke="#1a100a" stroke-width="2"/>' for k in range(1, 6))
                    + ''.join(f'<path d="M{f(X-46)} {f(Y-12-k*12)} H{f(X+46)}" stroke="#4a443c" stroke-width=".8" opacity=".6"/>' for k in range(5))
                    + window(X - 5, Y - hh - 30, 10, 12, True, arch=True)
                    + f'<path d="M{f(X-30)} {f(Y-hh-50)} v-24" stroke="{OUT}" stroke-width="2.4"/><path d="M{f(X-30)} {f(Y-hh-74)} l20 6 -20 7z" fill="#9e3426" stroke="{OUT}" stroke-width="1.1"/>'
                    + lantern(X - 56, Y + 3, 36) + lantern(X + 58, Y + 1, 36))
            # round towers on the wall
            for a in [math.pi * .22, math.pi * .78, math.pi * 1.25, math.pi * 1.75]:
                tx, ty = P(CX, G, math.cos(a) * WALL_R, math.sin(a) * WALL_R)
                th = hh + 30
                sh = .5 + .5 * math.cos(a - 2.4)
                c = mix('#5e584f', '#b0a99c', sh)
                o.append((ty + 2, f'<ellipse cx="{f(tx)}" cy="{f(ty)}" rx="17" ry="7" fill="{c}" stroke="{OUT}" stroke-width="1.2"/>'
                                  f'<path d="M{f(tx-17)} {f(ty)} V{f(ty-th)} H{f(tx+17)} V{f(ty)}" fill="{c}" stroke="{OUT}" stroke-width="1.4"/>'
                                  f'<path d="M{f(tx+5)} {f(ty+1)} V{f(ty-th)} H{f(tx+17)} V{f(ty)}" fill="#2a1a3a" opacity=".25"/>'
                                  f'<path d="M{f(tx-21)} {f(ty-th)} L{f(tx)} {f(ty-th-30)} L{f(tx+21)} {f(ty-th)}Z" fill="#8e3a2a" stroke="{OUT}" stroke-width="1.4"/>'
                                  f'<path d="M{f(tx)} {f(ty-th-30)} L{f(tx+21)} {f(ty-th)} L{f(tx+6)} {f(ty-th)}Z" fill="#000" opacity=".2"/>'
                                  + window(tx - 4, ty - th + 10, 8, 10, True, arch=True)))
        o.append((Y + 1, gate))
    o.sort(key=lambda t: t[0])
    return clip('h6w', ''.join(t[1] for t in o))

# ---------- the three buildings that matter, in three stages ----------
SPOTS = {'archery': (0, -.05), 'shrine': (-1.75, -1.25), 'workshop': (1.85, -1.05), 'walls': (0, 3.2)}
# crop box of each sprite round its foot: half width, height above, depth below
BOX = {'archery': (78, 250, 28), 'shrine': (78, 190, 30), 'workshop': (80, 150, 30)}
# where the defenders stand above the tower's foot, per stage
TOWER_LIFT = [70, 112, 168]

def stone_cyl(X, Y, rw, h, c1='#b0a99c', c2='#6e6860', courses=True):
    """An upright round stone tower body, lit from the left."""
    o = f'<path d="M{f(X-rw)} {f(Y)} V{f(Y-h)} A{f(rw)} {f(rw*.38)} 0 0 1 {f(X+rw)} {f(Y-h)} V{f(Y)} A{f(rw)} {f(rw*.38)} 0 0 1 {f(X-rw)} {f(Y)}Z" fill="{c1}" stroke="{OUT}" stroke-width="1.6"/>'
    o += f'<path d="M{f(X+rw*.25)} {f(Y+rw*.37)} V{f(Y-h+rw*.37)} A{f(rw)} {f(rw*.38)} 0 0 0 {f(X+rw)} {f(Y-h)} V{f(Y)} A{f(rw)} {f(rw*.38)} 0 0 1 {f(X+rw*.25)} {f(Y+rw*.37)}Z" fill="{c2}" opacity=".55"/>'
    if courses:
        for k in range(1, int(h / 13)):
            yy = Y - k * 13
            o += f'<path d="M{f(X-rw)} {f(yy)} A{f(rw)} {f(rw*.38)} 0 0 0 {f(X+rw)} {f(yy)}" fill="none" stroke="#4a443c" stroke-width=".8" opacity=".55"/>'
            for j in range(4):
                xx = X - rw * .8 + j * rw * .55 + (k % 2) * rw * .27
                o += f'<path d="M{f(xx)} {f(yy+rw*.32)} v-12" stroke="#4a443c" stroke-width=".6" opacity=".45"/>'
    return o

def tower(stage, X, Y):
    o = ao(X, Y, 58 + stage * 6)
    if stage == 0:
        # a wooden watchtower: four posts, a railed platform, a ladder, a thatched cap
        top = Y - TOWER_LIFT[0]
        for px, py in [(-24, -6), (24, -6)]:
            o += f'<path d="M{f(X+px)} {f(Y+py)} V{f(top)}" stroke="{OUT}" stroke-width="7"/><path d="M{f(X+px)} {f(Y+py)} V{f(top)}" stroke="#6b4a2e" stroke-width="4.5"/>'
        o += f'<path d="M{f(X-24)} {f(Y-8)} L{f(X+24)} {f(top+12)} M{f(X+24)} {f(Y-8)} L{f(X-24)} {f(top+12)}" stroke="#4a2e18" stroke-width="3"/>'
        for px, py in [(-28, 4), (28, 4)]:
            o += f'<path d="M{f(X+px)} {f(Y+py)} V{f(top+2)}" stroke="{OUT}" stroke-width="8"/><path d="M{f(X+px)} {f(Y+py)} V{f(top+2)}" stroke="#86603c" stroke-width="5"/>'
        o += f'<path d="M{f(X-36)} {f(top+4)} h72 v8 h-72z" fill="#7a5534" stroke="{OUT}" stroke-width="1.5"/>'
        o += f'<path d="M{f(X-34)} {f(top+4)} v-14 h68 v14" fill="none" stroke="#5a3a20" stroke-width="3"/>'
        o += f'<path d="M{f(X+30)} {f(top+5)} v-38 M{f(X-30)} {f(top+5)} v-38" stroke="#5a3a20" stroke-width="3"/>'
        o += f'<path d="M{f(X-42)} {f(top-30)} L{f(X)} {f(top-62)} L{f(X+42)} {f(top-30)} Q{f(X)} {f(top-24)} {f(X-42)} {f(top-30)}Z" fill="#c8a25a" stroke="{OUT}" stroke-width="1.5"/>'
        o += ''.join(f'<path d="M{f(X-30+k*10)} {f(top-29)} L{f(X-4+k*1.5)} {f(top-58)}" stroke="#9a7a3a" stroke-width="1"/>' for k in range(7))
        o += f'<path d="M{f(X+12)} {f(Y+6)} L{f(X+18)} {f(top+12)} M{f(X+22)} {f(Y+6)} L{f(X+28)} {f(top+12)}" stroke="#7a5534" stroke-width="2.4"/>'
        o += ''.join(f'<path d="M{f(X+13+k*.4)} {f(Y-2-k*10)} h10" stroke="#7a5534" stroke-width="2"/>' for k in range(6))
        o += lantern(X - 30, top + 4, 22)
        return o
    if stage == 1:
        h = 110
        o += stone_cyl(X, Y, 34, h)
        o += window(X - 5, Y - 60, 10, 14, True, arch=True) + f'<path d="M{f(X-9)} {f(Y+12)} v-24 q9 -10 18 0 v24z" fill="#4a2e18" stroke="{OUT}" stroke-width="1.4"/>'
        top = Y - TOWER_LIFT[1]
        o += f'<ellipse cx="{f(X)}" cy="{f(top+2)}" rx="44" ry="15" fill="#7a5534" stroke="{OUT}" stroke-width="1.5"/><ellipse cx="{f(X)}" cy="{f(top-1)}" rx="40" ry="13" fill="#a07a4e"/>'
        o += f'<path d="M{f(X-40)} {f(top)} v-14 M{f(X+40)} {f(top)} v-14 M{f(X-40)} {f(top-12)} Q{f(X)} {f(top+6)} {f(X+40)} {f(top-12)}" stroke="#5a3a20" stroke-width="2.6" fill="none"/>'
        for px in (-38, 38):
            o += f'<path d="M{f(X+px)} {f(top)} V{f(top-44)}" stroke="#4a2e18" stroke-width="3.5"/>'
        o += f'<path d="M{f(X-52)} {f(top-40)} L{f(X)} {f(top-82)} L{f(X+52)} {f(top-40)} Q{f(X)} {f(top-32)} {f(X-52)} {f(top-40)}Z" fill="#a8462e" stroke="{OUT}" stroke-width="1.6"/>'
        o += f'<path d="M{f(X)} {f(top-82)} L{f(X+52)} {f(top-40)} Q{f(X+26)} {f(top-35)} {f(X+8)} {f(top-34)}Z" fill="#000" opacity=".2"/>'
        o += lantern(X + 46, top + 4, 22)
        return o
    # stage 2: a tall keep with a crenellated top, a brazier and a banner
    h = 160
    o += stone_cyl(X, Y, 40, h, '#b8b1a4')
    o += f'<path d="M{f(X-46)} {f(Y-h+6)} h92 v-10 h-92z" fill="#a8a196" stroke="{OUT}" stroke-width="1.4"/>'
    o += window(X - 6, Y - 70, 12, 16, True, arch=True) + window(X - 20, Y - 120, 9, 12, True, arch=True) + window(X + 10, Y - 118, 9, 12, True, arch=True)
    o += f'<path d="M{f(X-11)} {f(Y+14)} v-30 q11 -12 22 0 v30z" fill="#4a2e18" stroke="{OUT}" stroke-width="1.4"/>'
    top = Y - TOWER_LIFT[2]
    o += f'<ellipse cx="{f(X)}" cy="{f(top+6)}" rx="48" ry="16" fill="#8a8478" stroke="{OUT}" stroke-width="1.5"/><ellipse cx="{f(X)}" cy="{f(top+3)}" rx="42" ry="13" fill="#6e6a62"/>'
    for k in range(9):
        a = math.pi + k / 8 * math.pi
        bx, by = X + math.cos(a) * 46, top + 6 + math.sin(a) * -15 * -1
        if k % 2 == 0: o += f'<rect x="{f(bx-5)}" y="{f(by-14)}" width="10" height="13" fill="#b0a99c" stroke="{OUT}" stroke-width="1.1"/>'
    o += glow(X + 30, top - 30, 40) + f'<path d="M{f(X+24)} {f(top-4)} l6 -14 l6 14z" fill="#3a2a1a" stroke="{OUT}"/><path d="M{f(X+24)} {f(top-18)} q6 -22 12 0z" fill="#ff8a3a"/><path d="M{f(X+27)} {f(top-19)} q3 -12 6 0z" fill="#ffe08a"/>'
    o += f'<path d="M{f(X-30)} {f(top+2)} V{f(top-70)}" stroke="{OUT}" stroke-width="3"/><path d="M{f(X-30)} {f(top-70)} q20 6 36 2 q-6 10 0 22 q-18 4 -36 -2z" fill="#9e3426" stroke="{OUT}" stroke-width="1.3"/><circle cx="{f(X-14)}" cy="{f(top-58)}" r="4" fill="{LIGHT}"/>'
    return o

def shrine(stage, X, Y):
    o = ao(X, Y, 60)
    if stage == 0:
        # a ring of old standing stones round a little altar, faintly glowing
        o += f'<ellipse cx="{f(X)}" cy="{f(Y)}" rx="58" ry="22" fill="#4f7a3e" stroke="#2f4a28" stroke-width="1"/>'
        o += glow(X, Y - 8, 46, 'h6teal')
        ring = sorted([(math.cos(a) * 46, math.sin(a) * 18) for a in [k * math.tau / 7 + .4 for k in range(7)]], key=lambda p: p[1])
        r = random.Random(4)
        for dx, dz in ring:
            if dz > 0: continue
            h = r.uniform(24, 34); x0, y0 = X + dx, Y + dz
            o += f'<path d="M{f(x0-7)} {f(y0)} L{f(x0-6)} {f(y0-h)} Q{f(x0)} {f(y0-h-6)} {f(x0+6)} {f(y0-h)} L{f(x0+7)} {f(y0)}Z" fill="#9a948a" stroke="{OUT}" stroke-width="1.3"/><path d="M{f(x0+1)} {f(y0)} L{f(x0+1)} {f(y0-h-2)} L{f(x0+6)} {f(y0-h)} L{f(x0+7)} {f(y0)}Z" fill="#000" opacity=".2"/>'
        o += f'<path d="M{f(X-14)} {f(Y)} v-12 h28 v12z" fill="#8a8478" stroke="{OUT}" stroke-width="1.3"/><path d="M{f(X-17)} {f(Y-12)} h34 v-5 h-34z" fill="#a8a196" stroke="{OUT}" stroke-width="1.2"/><circle cx="{f(X)}" cy="{f(Y-21)}" r="4" fill="#9ff6ff" stroke="#2a5a6a"/>'
        for dx, dz in ring:
            if dz <= 0: continue
            h = r.uniform(20, 30); x0, y0 = X + dx, Y + dz
            o += f'<path d="M{f(x0-7)} {f(y0)} L{f(x0-6)} {f(y0-h)} Q{f(x0)} {f(y0-h-6)} {f(x0+6)} {f(y0-h)} L{f(x0+7)} {f(y0)}Z" fill="#9a948a" stroke="{OUT}" stroke-width="1.3"/>'
        return o
    if stage == 1:
        # a small stone chapel with a round window
        o += house(X, Y, 64, 54, 46, 38, '#b8b1a4', '#4e5a6a', seed=11, chimney=False, door=True)
        o += glow(X, Y - 70, 26, 'h6teal') + f'<circle cx="{f(X)}" cy="{f(Y-70)}" r="8" fill="#9ff6ff" stroke="{OUT}" stroke-width="1.4"/><path d="M{f(X-8)} {f(Y-70)} h16 M{f(X)} {f(Y-78)} v16" stroke="#2a5a6a" stroke-width="1"/>'
        o += f'<path d="M{f(X)} {f(Y-84)} v-14 M{f(X-5)} {f(Y-93)} h10" stroke="{OUT}" stroke-width="2.4"/>'
        return o
    # stage 2: the chapel grows a bell tower and glows from within
    o += house(X + 8, Y, 66, 56, 50, 40, '#c4bcae', '#4e5a6a', seed=12, chimney=False, door=True)
    tx, ty = X - 34, Y + 2
    o += f'<path d="M{f(tx-14)} {f(ty)} V{f(ty-104)} H{f(tx+14)} V{f(ty)}Z" fill="#b8b1a4" stroke="{OUT}" stroke-width="1.5"/><path d="M{f(tx+4)} {f(ty)} V{f(ty-104)} H{f(tx+14)} V{f(ty)}Z" fill="#000" opacity=".18"/>'
    o += window(tx - 5, ty - 92, 10, 16, True, arch=True)
    o += f'<path d="M{f(tx-19)} {f(ty-104)} L{f(tx)} {f(ty-150)} L{f(tx+19)} {f(ty-104)}Z" fill="#3e4a5a" stroke="{OUT}" stroke-width="1.5"/><path d="M{f(tx)} {f(ty-150)} v-12 M{f(tx-5)} {f(ty-157)} h10" stroke="{OUT}" stroke-width="2.4"/>'
    o += glow(X + 8, Y - 76, 34, 'h6teal') + f'<circle cx="{f(X+8)}" cy="{f(Y-76)}" r="9" fill="#9ff6ff" stroke="{OUT}" stroke-width="1.4"/>'
    for dx, dy in [(-50, -60), (40, -110), (60, -40), (-10, -130)]:
        o += glow(X + dx, Y + dy, 10, 'h6teal') + f'<circle cx="{f(X+dx)}" cy="{f(Y+dy)}" r="2.2" fill="#dffcff"/>'
    return o

def barricade_piece(X, Y):
    return (f'<path d="M{f(X-14)} {f(Y)} L{f(X-6)} {f(Y-18)} M{f(X+14)} {f(Y)} L{f(X+6)} {f(Y-18)}" stroke="{OUT}" stroke-width="5"/>'
            f'<path d="M{f(X-14)} {f(Y)} L{f(X-6)} {f(Y-18)} M{f(X+14)} {f(Y)} L{f(X+6)} {f(Y-18)}" stroke="#8a6038" stroke-width="3"/>'
            f'<rect x="{f(X-18)}" y="{f(Y-13)}" width="36" height="6" rx="1.5" fill="#a07a4e" stroke="{OUT}" stroke-width="1.2"/>')

def workshop(stage, X, Y):
    o = ao(X, Y, 62)
    if stage == 0:
        # an open lean-to over a workbench, tools and a few logs
        o += f'<path d="M{f(X-36)} {f(Y)} V{f(Y-46)} M{f(X+30)} {f(Y-4)} V{f(Y-34)}" stroke="{OUT}" stroke-width="6"/><path d="M{f(X-36)} {f(Y)} V{f(Y-46)} M{f(X+30)} {f(Y-4)} V{f(Y-34)}" stroke="#7a5534" stroke-width="3.5"/>'
        o += f'<path d="M{f(X-46)} {f(Y-44)} L{f(X+40)} {f(Y-30)} L{f(X+48)} {f(Y-40)} L{f(X-38)} {f(Y-56)}Z" fill="#8a6a3a" stroke="{OUT}" stroke-width="1.5"/>'
        o += ''.join(f'<path d="M{f(X-42+k*12)} {f(Y-48+k*2)} l8 -10" stroke="#5a3a20" stroke-width="1.2"/>' for k in range(8))
        o += f'<rect x="{f(X-24)}" y="{f(Y-20)}" width="40" height="7" fill="#a07a4e" stroke="{OUT}" stroke-width="1.2"/><path d="M{f(X-20)} {f(Y-13)} v13 M{f(X+12)} {f(Y-13)} v13" stroke="#5a3a20" stroke-width="3"/>'
        o += f'<path d="M{f(X-14)} {f(Y-20)} l8 -10 M{f(X)} {f(Y-20)} l3 -12" stroke="#4a443c" stroke-width="2.4"/>'
        o += ''.join(f'<g transform="translate({f(X+26)} {f(Y+4-k*8)})"><rect x="{k*3}" y="0" width="{30-k*6}" height="8" rx="4" fill="#8a5a32" stroke="{OUT}"/><circle cx="{k*3+3}" cy="4" r="3.6" fill="#d4ad72" stroke="{OUT}" stroke-width=".8"/></g>' for k in range(3))
        return o
    if stage == 1:
        o += house(X, Y, 58, 50, 40, 26, '#d8c09a', '#9a5a2e', seed=21, timber=True, chimney=True)
        o += f'<path d="M{f(X-14)} {f(Y)} v-26 h28 v26" fill="#4a2e18" stroke="{OUT}" stroke-width="1.4"/><path d="M{f(X)} {f(Y)} v-26" stroke="#2a1a10" stroke-width="1.2"/>'
        o += barricade_piece(X - 48, Y + 8)
        o += ''.join(f'<g transform="translate({f(X+44)} {f(Y+6-k*8)})"><rect x="{k*3}" y="0" width="{30-k*6}" height="8" rx="4" fill="#8a5a32" stroke="{OUT}"/><circle cx="{k*3+3}" cy="4" r="3.6" fill="#d4ad72" stroke="{OUT}" stroke-width=".8"/></g>' for k in range(3))
        return o
    # stage 2: a bigger workshop with a wheel crane and a stack of barricades
    o += house(X + 4, Y, 66, 56, 46, 30, '#d8c09a', '#9a5a2e', seed=22, timber=True, chimney=True)
    o += f'<path d="M{f(X-14)} {f(Y)} v-30 h36 v30" fill="#4a2e18" stroke="{OUT}" stroke-width="1.4"/>'
    o += f'<path d="M{f(X-50)} {f(Y+4)} V{f(Y-100)} L{f(X-6)} {f(Y-86)}" stroke="{OUT}" stroke-width="7" fill="none"/><path d="M{f(X-50)} {f(Y+4)} V{f(Y-100)} L{f(X-6)} {f(Y-86)}" stroke="#7a5534" stroke-width="4" fill="none"/>'
    o += f'<circle cx="{f(X-50)}" cy="{f(Y-40)}" r="14" fill="none" stroke="{OUT}" stroke-width="5"/><circle cx="{f(X-50)}" cy="{f(Y-40)}" r="14" fill="none" stroke="#8a6038" stroke-width="2.6"/>'
    o += f'<path d="M{f(X-10)} {f(Y-86)} V{f(Y-60)}" stroke="{OUT}" stroke-width="1.4"/><rect x="{f(X-18)}" y="{f(Y-62)}" width="16" height="10" fill="#a07a4e" stroke="{OUT}"/>'
    for k in range(3): o += barricade_piece(X + 48, Y + 10 - k * 9)
    o += lantern(X - 30, Y + 8, 30)
    return o

def building(bid, stage, X, Y):
    if bid == 'archery': return tower(stage, X, Y)
    if bid == 'shrine': return shrine(stage, X, Y)
    if bid == 'workshop': return workshop(stage, X, Y)

def sprite_box(bid):
    X, Y = P(CX, G, *SPOTS[bid])
    hw, up, down = BOX[bid]
    return X, Y, (X - hw, Y - up, hw * 2, up + down)

VILLAGER_COLORS = ['#3f6fb0', '#c4553b', '#2f8f8a', '#7b4a9a', '#d9a23a', '#e98fb5', '#5a8a3a', '#b06a3a']
def villager_svg(c):
    return person(0, 0, c)
