# The globe, redrawn: a glass sphere resting in a turned wooden stand, seen from
# above with the slightest tilt, lit by the candle at the top right of the desk.
# Also the mountains of the Wilds and the lens frames that lie above the notes.
import math, random
from geo import scatter, smooth
import desk as D, scene2 as S2, scene5 as S5
GX, GY, GR = 640, 424, 350
R_ZOOM = 10.4 / 2.95          # how much the reading glass magnifies the globe
LIGHT = (0.62, -0.78)         # towards the candle (top right)
STAND_DROP = 26               # how far the stand's foot shows below, from the tilt

def stand():
    """Shadow, feet and turned wooden stand. Everything under the sphere."""
    o = []
    # long soft shadow away from the candle (down and to the left)
    o.append(f'<ellipse cx="{GX-46}" cy="{GY+64}" rx="{GR+70}" ry="{GR+58}" fill="#000" opacity=".55" filter="url(#soft)"/>')
    o.append(f'<ellipse cx="{GX-14}" cy="{GY+STAND_DROP+18}" rx="{GR+48}" ry="{GR+40}" fill="#000" opacity=".5" filter="url(#soft4)"/>')
    # three bun feet, seen just under the stand's rim
    for a in (130, 50, 270):
        t = math.radians(a)
        x = GX + math.cos(t) * (GR + 20); y = GY + STAND_DROP + 14 + math.sin(t) * (GR + 14)
        if a == 270: continue  # hidden behind
        o.append(f'<ellipse cx="{x-5:.0f}" cy="{y+12:.0f}" rx="30" ry="15" fill="#000" opacity=".5" filter="url(#soft4)"/>')
        o.append(f'<ellipse cx="{x:.0f}" cy="{y+4:.0f}" rx="24" ry="13" fill="url(#bunfoot)" stroke="#2a180a" stroke-width="1.4"/>')
        o.append(f'<ellipse cx="{x+5:.0f}" cy="{y-1:.0f}" rx="9" ry="4" fill="#fff4cc" opacity=".35"/>')
    # the stand: a wide turned disc. Its side shows as a band at the bottom.
    rx, ry = GR + 40, GR + 36
    top = GY + 8
    for k in range(STAND_DROP, 0, -2):  # the side, stacked so it reads as a solid band
        o.append(f'<ellipse cx="{GX}" cy="{top+k}" rx="{rx}" ry="{ry}" fill="url(#standside)"/>')
    # turned grooves on the side band
    for k in (7, 15, 21):
        o.append(f'<path d="M{GX-rx:.0f} {top+k} A{rx} {ry} 0 0 0 {GX+rx:.0f} {top+k}" fill="none" stroke="#1c0c06" stroke-width="1.6" opacity=".7"/>')
        o.append(f'<path d="M{GX-rx:.0f} {top+k+2} A{rx} {ry} 0 0 0 {GX+rx:.0f} {top+k+2}" fill="none" stroke="#c98a5a" stroke-width=".8" opacity=".25"/>')
    # the top face of the stand
    o.append(f'<ellipse cx="{GX}" cy="{top}" rx="{rx}" ry="{ry}" fill="url(#standtop)"/>')
    o.append(f'<ellipse cx="{GX}" cy="{top}" rx="{rx-1}" ry="{ry-1}" fill="none" stroke="#f0c48a" stroke-opacity=".35" stroke-width="1.5"/>')
    # wood grain rings
    r = random.Random(5)
    for k in range(9):
        d = r.uniform(4, 34)
        o.append(f'<ellipse cx="{GX+r.uniform(-3,3):.1f}" cy="{top+r.uniform(-2,2):.1f}" rx="{rx-d:.1f}" ry="{ry-d:.1f}" fill="none" stroke="#2a1208" stroke-width="{r.uniform(.5,1.1):.1f}" opacity=".35"/>')
    # brass horizon ring inlaid in the stand, with marks and the four winds
    hr, hry = GR + 22, GR + 20
    o.append(f'<ellipse cx="{GX}" cy="{top}" rx="{hr}" ry="{hry}" fill="none" stroke="#2a1608" stroke-width="13" opacity=".7"/>')
    o.append(f'<ellipse cx="{GX}" cy="{top}" rx="{hr}" ry="{hry}" fill="none" stroke="url(#brassH)" stroke-width="10"/>')
    for k in range(72):
        t = k * math.tau / 72; L = 5 if k % 6 == 0 else 2.6
        o.append(f'<path d="M{GX+math.cos(t)*(hr-L):.1f} {top+math.sin(t)*(hry-L):.1f} L{GX+math.cos(t)*(hr+L):.1f} {top+math.sin(t)*(hry+L):.1f}" stroke="#4a2c10" stroke-width="{1.2 if k%6==0 else .7}" opacity=".8"/>')
    for lab, a in [('N', -90), ('E', 0), ('S', 90), ('W', 180)]:
        t = math.radians(a); x = GX + math.cos(t) * (hr + 1); y = top + math.sin(t) * (hry + 1)
        o.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="9" fill="#2a1608"/><text x="{x:.0f}" y="{y+4.5:.0f}" text-anchor="middle" font-family="Georgia, serif" font-size="12.5" font-weight="bold" fill="#f0cf8a">{lab}</text>')
    # the sphere sits in a shallow brass cup: a thin collar, and dark where glass meets wood
    o.append(f'<circle cx="{GX-6}" cy="{GY+9}" r="{GR+4}" fill="#000" opacity=".55" filter="url(#soft4)"/>')
    o.append(f'<circle cx="{GX}" cy="{GY+3}" r="{GR+5}" fill="none" stroke="#3a2410" stroke-width="7"/>')
    o.append(f'<circle cx="{GX}" cy="{GY+2}" r="{GR+4}" fill="none" stroke="url(#brass)" stroke-width="4"/>')
    return ''.join(o)

STAND_DEFS = '''
<radialGradient id="bunfoot" cx=".65" cy=".3" r=".8"><stop offset="0" stop-color="#f6dca0"/><stop offset=".45" stop-color="#b8853e"/><stop offset="1" stop-color="#4a2e10"/></radialGradient>
<linearGradient id="standside" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1e0d07"/><stop offset=".4" stop-color="#3d1d10"/><stop offset=".75" stop-color="#6a3519"/><stop offset=".92" stop-color="#8a4a26"/><stop offset="1" stop-color="#3a1a0c"/></linearGradient>
<radialGradient id="standtop" gradientUnits="userSpaceOnUse" cx="980" cy="120" r="900"><stop offset="0" stop-color="#9a5a32"/><stop offset=".45" stop-color="#6e3a1f"/><stop offset="1" stop-color="#3a1c0f"/></radialGradient>
<linearGradient id="brassH" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6dca0"/><stop offset=".3" stop-color="#c99a4e"/><stop offset=".7" stop-color="#8a6024"/><stop offset="1" stop-color="#5a3c14"/></linearGradient>
<radialGradient id="sphereedge" cx=".5" cy=".5" r=".5"><stop offset=".86" stop-color="#0c0a1a" stop-opacity="0"/><stop offset=".965" stop-color="#0c0a1a" stop-opacity=".35"/><stop offset="1" stop-color="#0c0a1a" stop-opacity=".7"/></radialGradient>
<radialGradient id="spherelight" gradientUnits="userSpaceOnUse" cx="900" cy="140" r="760"><stop offset="0" stop-color="#ffe2b0" stop-opacity=".16"/><stop offset=".6" stop-color="#ffe2b0" stop-opacity="0"/></radialGradient>
<radialGradient id="glint" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".3" stop-color="#fff2d0" stop-opacity=".4"/><stop offset="1" stop-color="#fff2d0" stop-opacity="0"/></radialGradient>
'''

# ---------- mountains, lit from the top right ----------
def mountain(X, Y, rad, seed, snowy=True):
    j = random.Random(seed)
    h = rad * j.uniform(.8, 1.08); w = rad * j.uniform(1.35, 1.75)
    sx = X + j.uniform(-.15, .15) * w
    foot = Y + rad * .3
    J = lambda: j.uniform(-.04, .04) * h
    pts = [(X - w, foot), (X - w * .8, Y - h * .1 + J()), (X - w * .58, Y - h * .32 + J()), (X - w * .4, Y - h * .5 + J())]
    if j.random() < .5: pts += [(X - w * .3, Y - h * .66), (X - w * .2, Y - h * .62)]
    pts += [(sx - w * .1, Y - h * .9), (sx, Y - h), (sx + w * .12, Y - h * .88)]
    if j.random() < .55: pts += [(X + w * .3, Y - h * .66), (X + w * .38, Y - h * .7), (X + w * .48, Y - h * .56)]
    pts += [(X + w * .62, Y - h * .34 + J()), (X + w * .82, Y - h * .12 + J()), (X + w, foot)]
    I = lambda x, z: (x, z)
    top = smooth(pts, I)
    sil = top + f' Q{X:.1f} {foot + rad*.25:.1f} {X-w:.1f} {foot:.1f}Z'
    cid = f'mt{seed}'
    lit, mid, shade = j.choice([('#a29ab6', '#7c7598', '#4f496c'), ('#97a0b8', '#717a98', '#465070'), ('#a896ac', '#806e90', '#54466a')])
    ridge = [(sx, Y - h), (sx - w * .05 + j.uniform(-2, 2), Y - h * .55), (X - w * .08, Y - h * .15), (X - w * .16, foot + rad * .2)]
    shade_d = smooth(ridge, I) + f' L{X-w*1.3:.1f} {foot+rad:.1f} L{X-w*1.3:.1f} {Y-h*1.2:.1f}Z'
    o = [f'<clipPath id="{cid}"><path d="{sil}"/></clipPath>']
    o.append(f'<path d="{sil}" fill="#140f1e" opacity=".3" transform="translate(-5 4)"/>')
    o.append(f'<g clip-path="url(#{cid})"><path d="{sil}" fill="{lit}"/>')
    # gullies on the lit side, a few soft strokes running down from the ridge line
    for k in range(j.randint(2, 3)):
        gx = sx + w * j.uniform(.12, .5)
        o.append(f'<path d="M{gx-w*.08:.1f} {Y-h*j.uniform(.55,.8):.1f} Q{gx:.1f} {Y-h*.3:.1f} {gx+w*.08:.1f} {foot:.1f}" stroke="{mid}" stroke-width="{max(1.2,rad*.05):.1f}" fill="none" opacity=".32" stroke-linecap="round"/>')
    o.append(f'<path d="{shade_d}" fill="{shade}"/>')
    o.append(f'<path d="{smooth(ridge, I)}" stroke="{lit}" stroke-width="1" fill="none" opacity=".35"/>')
    # moss and grass climbing the lower slopes
    wav = [(X - w * 1.1, foot - rad * .05)] + [(X - w + k * w * .25, foot - rad * .12 - h * (.06 + .14 * j.random())) for k in range(9)] + [(X + w * 1.1, foot - rad * .06)]
    moss = f'{smooth(wav, I)} L{X+w*1.2:.1f} {foot+rad:.1f} L{X-w*1.2:.1f} {foot+rad:.1f}Z'
    o.append(f'<path d="{moss}" fill="#56763f"/><path d="{shade_d}" fill="#20382a" opacity=".5"/>')
    o.append(f'<path d="{smooth(wav, I)}" stroke="#7d9c58" stroke-width="1.2" fill="none" opacity=".5"/>')
    if snowy and rad > 21:
        cap = [(sx + w * .3, Y - h * .64), (sx + w * .2, Y - h * .72), (sx + w * .1, Y - h * .66), (sx, Y - h * .75), (sx - w * .1, Y - h * .67), (sx - w * .18, Y - h * .73), (sx - w * .28, Y - h * .66)]
        o.append(f'<path d="M{sx:.1f} {Y-h-2:.1f} L{sx+w*.36:.1f} {Y-h*.58:.1f} ' + smooth(cap, I).replace('M', 'L', 1) + f' L{sx-w*.36:.1f} {Y-h*.6:.1f}Z" fill="#eef0f6"/>')
        o.append(f'<path d="M{sx:.1f} {Y-h-2:.1f} L{sx-w*.04:.1f} {Y-h*.64:.1f} L{sx-w*.18:.1f} {Y-h*.73:.1f} L{sx-w*.28:.1f} {Y-h*.66:.1f} L{sx-w*.36:.1f} {Y-h*.6:.1f}Z" fill="#b4b8d0"/>')
    o.append('</g>')
    o.append(f'<path d="{top}" fill="none" stroke="#2e2840" stroke-width=".9" stroke-linejoin="round" opacity=".7"/>')
    return ''.join(o)

def pines(X, Y, n, seed, spread=10):
    j = random.Random(seed); o = []
    for _ in range(n):
        tx = X + j.uniform(-spread, spread); ty = Y + j.uniform(-spread * .5, spread * .5); ts = j.uniform(3.2, 5)
        o.append((ty, f'<path d="M{tx:.1f} {ty-ts*1.7:.1f} L{tx+ts*.6:.1f} {ty:.1f} L{tx-ts*.6:.1f} {ty:.1f}Z" fill="#1c3d2c"/><path d="M{tx:.1f} {ty-ts*1.7:.1f} L{tx+ts*.6:.1f} {ty:.1f} L{tx+ts*.1:.1f} {ty:.1f}Z" fill="#35643e"/>'))
    return o

def hill(X, Y, rad, seed):
    j = random.Random(seed)
    w = rad * j.uniform(1.6, 2.2); h = rad * j.uniform(.4, .6)
    d = f'M{X-w:.1f} {Y:.1f} C{X-w*.55:.1f} {Y-h*1.25:.1f} {X+w*.45:.1f} {Y-h*1.3:.1f} {X+w:.1f} {Y:.1f} Q{X:.1f} {Y+h*.35:.1f} {X-w:.1f} {Y:.1f}Z'
    o = f'<path d="{d}" fill="#0e1a10" opacity=".14" transform="translate(-3 2)"/><path d="{d}" fill="{j.choice(["#5a7a43","#52713e","#61814a"])}"/>'
    o += f'<path d="M{X-w:.1f} {Y:.1f} C{X-w*.55:.1f} {Y-h*1.25:.1f} {X-w*.15:.1f} {Y-h*1.2:.1f} {X:.1f} {Y-h*.92:.1f} Q{X-w*.25:.1f} {Y-h*.1:.1f} {X-w*.15:.1f} {Y+h*.25:.1f} Q{X-w*.6:.1f} {Y+h*.15:.1f} {X-w:.1f} {Y:.1f}Z" fill="#2c4630" opacity=".28"/>'
    return o

def mountains(s):
    T = lambda x, z: (GX + x * s, GY + z * s)
    items = []
    for seed, step, lo, hi, big in ((17, 7.6, 1.08, 9, 1.0), (19, 10.5, .85, 1.08, .8)):
        for x, z, a, b in scatter(seed, -110, 110, -110, 110, step, lambda x, z: lo < S5.mount_score(x, z) <= hi):
            X, Y = T(x, z); sc = S5.mount_score(x, z)
            items.append((Y, mountain(X, Y, s * big * (4.4 + a * 2.6 + min(3, (sc - .85) * 3)), int(x * 31 + z * 7 + seed))))
    for x, z, a, b in scatter(23, -110, 110, -110, 110, 9.0, lambda x, z: .45 < S5.mount_score(x, z) <= .85):
        X, Y = T(x, z)
        if b < .7: items.append((Y, hill(X, Y, s * (2.4 + a * 1.4), int(x * 13 + z * 17))))
        else: items += pines(X, Y, 4 + int(a * 4), int(x * 5 + z * 11))
    items.sort(key=lambda t: t[0])
    return ''.join(t[1] for t in items)

# ---------- the terrain inside the sphere ----------
def terrain(s=2.95, miniature=None):
    """The world under the glass. `miniature` is the Watch's forest map (SVG,
    in its own 10.4 px/unit space centred at 630,410), drawn small at the village."""
    R = GR - 2; r = random.Random(4); T = lambda x, z: (GX + x * s, GY + z * s); o = []
    o.append(f'<clipPath id="gtop"><circle cx="{GX}" cy="{GY}" r="{R}"/></clipPath><g clip-path="url(#gtop)"><circle cx="{GX}" cy="{GY}" r="{R}" fill="#5f7f42"/>')
    for i in range(900):
        x = r.uniform(-104, 104); z = r.uniform(-104, 104); X, Y = T(x, z); n = S2.noise(x, z)
        o.append(f'<circle cx="{X:.0f}" cy="{Y:.0f}" r="{r.uniform(6,14):.0f}" fill="{["#6f8f4a","#56763c","#7a9a52","#4d6b37"][int((n+1)*1.99)%4]}" opacity=".5"/>')
    o += [f'<circle cx="{T(r.uniform(-100,100),0)[0]:.0f}" cy="{T(0,r.uniform(-100,100))[1]:.0f}" r="1.3" fill="{r.choice(["#f2c14e","#e98fb5","#f4ecd8","#c39bff"])}"/>' for _ in range(260)]
    o.append(f'<path d="{smooth(D.RIVER,T)}" fill="none" stroke="#4a5e3a" stroke-width="{8*s+5:.0f}" stroke-linecap="round"/><path d="{smooth(D.RIVER,T)}" fill="none" stroke="url(#puddle)" stroke-width="{8*s:.0f}" stroke-linecap="round"/><path d="{smooth(D.RIVER,T)}" fill="none" stroke="#9fb4ff" stroke-width="1.4" stroke-dasharray="6 18" opacity=".6"/>')
    X, Y = T(*D.WLAKE[:2]); o.append(f'<circle cx="{X}" cy="{Y}" r="{D.WLAKE[2]*s+3}" fill="#4a5e3a"/><circle cx="{X}" cy="{Y}" r="{D.WLAKE[2]*s}" fill="url(#puddle)"/>')
    for t in D.TRAILS[:5]: o.append(f'<path d="{smooth(t,T)}" fill="none" stroke="#c9b48a" stroke-width="2" stroke-dasharray="3 5" opacity=".75"/>')
    for x, z, a, b in sorted(scatter(7, -104, 104, -104, 104, 2.6, lambda x, z: True), key=lambda p: p[1]):
        X, Y = T(x, z)
        if S5.mount_score(x, z) > .4: continue
        if math.hypot(x, z) < 31: continue  # the forest around the village is the miniature
        if S2.is_forest(x, z):
            rad = s * (1.6 + a * 1.2); c = ['#24503a', '#2f6440', '#1e4430', '#3a6a34'][int(b * 4)]
            o.append(f'<circle cx="{X-1:.1f}" cy="{Y+1.5:.1f}" r="{rad:.1f}" fill="#0a1a10" opacity=".45"/><circle cx="{X:.1f}" cy="{Y:.1f}" r="{rad:.1f}" fill="{c}"/><circle cx="{X+rad*.3:.1f}" cy="{Y-rad*.3:.1f}" r="{rad*.45:.1f}" fill="#8fc45a" opacity=".22"/>')
        elif b > .94: o.append(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="{s*1.2:.1f}" fill="#41763a"/>')
    if miniature:
        k = 1 / R_ZOOM
        o.append(f'<radialGradient id="minifade" gradientUnits="userSpaceOnUse" cx="630" cy="410" r="350"><stop offset=".8" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><mask id="minimask" maskUnits="userSpaceOnUse" x="270" y="50" width="720" height="720"><circle cx="630" cy="410" r="350" fill="url(#minifade)"/></mask>')
        o.append(f'<g transform="translate({GX} {GY}) scale({k:.5f}) translate(-630 -410)"><g mask="url(#minimask)">{miniature}</g></g>')
    o.append(mountains(s))
    u = s / 3.6 * 1.6
    for id_, kd, n, p in D.LOC:
        X, Y = T(*p)
        if kd == 'home': continue
        if kd == 'village': o.append(f'<circle cx="{X}" cy="{Y}" r="{22*u}" fill="url(#eg)"/>' + D.roofs(X, Y, 6, u * 1.1, hash(id_) % 99))
        elif kd == 'ruins': o.append(''.join(f'<rect x="{X+math.cos(a)*8*u-2.5*u:.1f}" y="{Y+math.sin(a)*8*u-2*u:.1f}" width="{5*u:.1f}" height="{4*u:.1f}" fill="#a39e95" stroke="#3a3530" stroke-width=".8"/>' for a in [j * .9 for j in range(6)]))
        elif kd == 'dungeon':
            g = 'cy' if id_ == 'crystal' else 'vg'; o.append(f'<circle cx="{X}" cy="{Y}" r="{26*u}" fill="url(#{g})"/><ellipse cx="{X}" cy="{Y}" rx="{6*u}" ry="{4.5*u}" fill="#0d070a" stroke="#4a2e1e" stroke-width="{1.6*u:.1f}"/>')
        elif id_ == 'quarry': o.append(f'<rect x="{X-8*u}" y="{Y-6*u}" width="{16*u}" height="{12*u}" fill="#b8ab92" stroke="#5a4e3c"/>')
        else: o.append(''.join(f'<circle cx="{X+math.cos(a)*7*u:.1f}" cy="{Y+math.sin(a)*7*u:.1f}" r="{1.6*u:.1f}" fill="#c9c4bb" stroke="#3a3530"/>' for a in [j * math.tau / 7 for j in range(7)]))
    o += [f'<circle cx="{GX+r.uniform(-R,R):.0f}" cy="{GY+r.uniform(-R,R):.0f}" r="6" fill="url(#gl)"/>' for _ in range(26)]
    o.append('</g>')
    return ''.join(o)

def sphere_glass():
    """What the glass itself adds on top of the world: a darker rim where the
    glass is thick, candle light, and reflections."""
    R = GR
    o = f'<circle cx="{GX}" cy="{GY}" r="{R}" fill="url(#sphereedge)"/><circle cx="{GX}" cy="{GY}" r="{R}" fill="url(#spherelight)"/>'
    o += f'<circle cx="{GX}" cy="{GY}" r="{R}" fill="url(#fres)"/><circle cx="{GX}" cy="{GY}" r="{R-.8}" fill="none" stroke="#eef8ff" stroke-opacity=".55" stroke-width="1.6"/>'
    # the candle reflected, top right, and a window-like streak
    o += f'<ellipse cx="{GX+R*.5:.0f}" cy="{GY-R*.6:.0f}" rx="34" ry="16" fill="url(#glint)" transform="rotate(-38 {GX+R*.5:.0f} {GY-R*.6:.0f})"/>'
    o += f'<circle cx="{GX+R*.5+6:.0f}" cy="{GY-R*.6-4:.0f}" r="3.2" fill="#fff"/>'
    o += f'<path d="M{GX+R*.2:.0f} {GY-R*.9:.0f} A{R*.93:.0f} {R*.93:.0f} 0 0 1 {GX+R*.86:.0f} {GY-R*.28:.0f}" fill="none" stroke="#fff3da" stroke-opacity=".32" stroke-width="7" stroke-linecap="round"/>'
    o += f'<path d="M{GX+R*.32:.0f} {GY-R*.78:.0f} A{R*.82:.0f} {R*.82:.0f} 0 0 1 {GX+R*.62:.0f} {GY-R*.5:.0f}" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="2.5" stroke-linecap="round"/>'
    # faint bounce light at the bottom left, where the glass curves away
    o += f'<path d="M{GX-R*.86:.0f} {GY+R*.4:.0f} A{R*.94:.0f} {R*.94:.0f} 0 0 0 {GX-R*.36:.0f} {GY+R*.85:.0f}" fill="none" stroke="#bfe0ff" stroke-opacity=".12" stroke-width="4" stroke-linecap="round"/>'
    return o

# ---------- lenses ----------
def lens_frame(cx, cy, R, ring=18, handle_ang=135, length=250):
    """The reading glass: its shadow, handle, rim and the glass. Drawn above the notes."""
    o = []
    # shadows away from the candle
    o.append(f'<circle cx="{cx-26}" cy="{cy+34}" r="{R+ring*.5}" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="{ring+12}" filter="url(#soft4)"/>')
    a = math.radians(handle_ang); x0 = cx + math.cos(a) * (R + ring - 4); y0 = cy + math.sin(a) * (R + ring - 4); deg = handle_ang - 90
    o.append(f'<g transform="translate({x0-26:.0f} {y0+34:.0f}) rotate({deg})" opacity=".5" filter="url(#soft4)"><rect x="-18" y="0" width="36" height="{length+46}" rx="17" fill="#000"/></g>')
    # handle
    o.append(f'''<g transform="translate({x0:.0f} {y0:.0f}) rotate({deg})"><rect x="-12" y="-6" width="24" height="38" fill="url(#brassV)" stroke="#3a2410"/><rect x="-16" y="30" width="32" height="13" rx="3" fill="url(#brassV)" stroke="#3a2410"/><rect x="-17" y="43" width="34" height="{length}" rx="16" fill="url(#handlewood)" stroke="#1e0e07" stroke-width="1.5"/><path d="M7 62 V{length+22}" stroke="#d9925a" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/><path d="M-9 70 V{length+10}" stroke="#1a0a04" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/><circle cx="0" cy="{length+30}" r="5.5" fill="url(#brassV)" stroke="#3a2410"/></g>''')
    o.append(lens_glass(cx, cy, R, ring))
    return ''.join(o)

def lens_glass(cx, cy, R, ring):
    o = []
    # the thick edge of the glass: content near the rim looks squeezed and dark
    o.append(f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="url(#lensbevel)"/>')
    o.append(f'<circle cx="{cx}" cy="{cy}" r="{R-3}" fill="none" stroke="#ff8a6a" stroke-opacity=".22" stroke-width="2.5"/><circle cx="{cx}" cy="{cy}" r="{R-6}" fill="none" stroke="#7ad8ff" stroke-opacity=".18" stroke-width="2.5"/>')
    o.append(f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="url(#lenslight)"/>')
    # reflections: candle at the top right
    o.append(f'<path d="M{cx+R*.15:.0f} {cy-R*.88:.0f} A{R*.9:.0f} {R*.9:.0f} 0 0 1 {cx+R*.84:.0f} {cy-R*.3:.0f}" fill="none" stroke="#fff6e0" stroke-opacity=".4" stroke-width="8" stroke-linecap="round"/>')
    o.append(f'<ellipse cx="{cx+R*.45:.0f}" cy="{cy-R*.55:.0f}" rx="{R*.11:.0f}" ry="{R*.045:.0f}" fill="url(#glint)" transform="rotate(-40 {cx+R*.45:.0f} {cy-R*.55:.0f})"/>')
    o.append(f'<path d="M{cx-R*.8:.0f} {cy+R*.45:.0f} A{R*.92:.0f} {R*.92:.0f} 0 0 0 {cx-R*.3:.0f} {cy+R*.86:.0f}" fill="none" stroke="#cfe8ff" stroke-opacity=".14" stroke-width="4" stroke-linecap="round"/>')
    # brass rim with depth: the inner wall shows on the lower left, light on the upper right
    o.append(f'<circle cx="{cx}" cy="{cy}" r="{R+2}" fill="none" stroke="#2a1608" stroke-width="5"/>')
    o.append(f'<circle cx="{cx}" cy="{cy}" r="{R+ring/2}" fill="none" stroke="url(#brassRim)" stroke-width="{ring}"/>')
    o.append(f'<circle cx="{cx}" cy="{cy}" r="{R+ring-2}" fill="none" stroke="#fff0c0" stroke-opacity=".35" stroke-width="1.2"/>')
    o.append(f'<circle cx="{cx}" cy="{cy}" r="{R+ring}" fill="none" stroke="#2a1608" stroke-width="1.6"/><circle cx="{cx}" cy="{cy}" r="{R+1}" fill="none" stroke="#2a1608" stroke-width="1.2"/>')
    return ''.join(o)

LENS_DEFS = '''
<radialGradient id="lensbevel" cx=".5" cy=".5" r=".5"><stop offset=".9" stop-color="#05040c" stop-opacity="0"/><stop offset=".975" stop-color="#05040c" stop-opacity=".32"/><stop offset="1" stop-color="#05040c" stop-opacity=".65"/></radialGradient>
<radialGradient id="lenslight" cx=".78" cy=".18" r=".9"><stop offset="0" stop-color="#fff0d0" stop-opacity=".14"/><stop offset=".5" stop-color="#fff0d0" stop-opacity="0"/><stop offset="1" stop-color="#0a0818" stop-opacity=".18"/></radialGradient>
<linearGradient id="brassRim" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbe3a8"/><stop offset=".25" stop-color="#d4a457"/><stop offset=".55" stop-color="#9a6a2a"/><stop offset=".8" stop-color="#6a4416"/><stop offset="1" stop-color="#3e260c"/></linearGradient>
<linearGradient id="brassV" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#5a3a12"/><stop offset=".35" stop-color="#e8c47e"/><stop offset=".6" stop-color="#b8853e"/><stop offset="1" stop-color="#4a2e10"/></linearGradient>
<linearGradient id="handlewood" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#2a140b"/><stop offset=".3" stop-color="#8a4a2a"/><stop offset=".55" stop-color="#5e2f19"/><stop offset="1" stop-color="#1e0d07"/></linearGradient>
'''

def loupe_frame(cx, cy, rx, ry, ring=24):
    """The big loupe on its jointed arm, clamped somewhere above the top edge."""
    o = []
    p0 = (cx + math.cos(-2.05) * (rx + ring - 4), cy + math.sin(-2.05) * (ry + ring - 4))
    pts = [p0, (p0[0] - 70, p0[1] - 120), (p0[0] - 120, p0[1] - 330)]
    o.append(f'<ellipse cx="{cx-28}" cy="{cy+36}" rx="{rx+ring*.5}" ry="{ry+ring*.5}" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="{ring+14}" filter="url(#soft4)"/>')
    o.append(''.join(f'<path d="M{pts[i][0]-26:.0f} {pts[i][1]+34:.0f} L{pts[i+1][0]-26:.0f} {pts[i+1][1]+34:.0f}" stroke="#000" stroke-opacity=".45" stroke-width="26" stroke-linecap="round" filter="url(#soft4)"/>' for i in range(2)))
    o.append(''.join(f'<path d="M{pts[i][0]:.0f} {pts[i][1]:.0f} L{pts[i+1][0]:.0f} {pts[i+1][1]:.0f}" stroke="#2a1a0c" stroke-width="22" stroke-linecap="round"/><path d="M{pts[i][0]:.0f} {pts[i][1]:.0f} L{pts[i+1][0]:.0f} {pts[i+1][1]:.0f}" stroke="url(#brassV)" stroke-width="15" stroke-linecap="round"/><path d="M{pts[i][0]+3:.0f} {pts[i][1]:.0f} L{pts[i+1][0]+3:.0f} {pts[i+1][1]:.0f}" stroke="#fff0c0" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/>' for i in range(2)))
    o.append(''.join(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="17" fill="url(#brassRim)" stroke="#2a1608" stroke-width="2"/><circle cx="{x:.0f}" cy="{y:.0f}" r="6" fill="#2a1608"/><circle cx="{x+5:.0f}" cy="{y-5:.0f}" r="3" fill="#fff0c0" opacity=".5"/>' for x, y in pts[:2]))
    # glass
    o.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="url(#lensbevel)"/><ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="url(#lenslight)"/>')
    o.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx-3}" ry="{ry-3}" fill="none" stroke="#ff8a6a" stroke-opacity=".2" stroke-width="2.5"/><ellipse cx="{cx}" cy="{cy}" rx="{rx-6}" ry="{ry-6}" fill="none" stroke="#7ad8ff" stroke-opacity=".16" stroke-width="2.5"/>')
    o.append(f'<path d="M{cx+rx*.15:.0f} {cy-ry*.88:.0f} A{rx*.9:.0f} {ry*.9:.0f} 0 0 1 {cx+rx*.84:.0f} {cy-ry*.3:.0f}" fill="none" stroke="#fff6e0" stroke-opacity=".38" stroke-width="9" stroke-linecap="round"/>')
    o.append(f'<ellipse cx="{cx+rx*.48:.0f}" cy="{cy-ry*.56:.0f}" rx="{rx*.1:.0f}" ry="{ry*.04:.0f}" fill="url(#glint)" transform="rotate(-38 {cx+rx*.48:.0f} {cy-ry*.56:.0f})"/>')
    # thick tilted rim: its lower band shows
    o.append(f'<ellipse cx="{cx}" cy="{cy+9}" rx="{rx+ring/2}" ry="{ry+ring/2}" fill="none" stroke="#3e260c" stroke-width="{ring}"/>')
    o.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx+2}" ry="{ry+2}" fill="none" stroke="#2a1608" stroke-width="5"/>')
    o.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx+ring/2}" ry="{ry+ring/2}" fill="none" stroke="url(#brassRim)" stroke-width="{ring}"/>')
    o.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx+ring-2}" ry="{ry+ring-2}" fill="none" stroke="#fff0c0" stroke-opacity=".35" stroke-width="1.2"/><ellipse cx="{cx}" cy="{cy}" rx="{rx+ring}" ry="{ry+ring}" fill="none" stroke="#2a1608" stroke-width="1.6"/>')
    o.append(''.join(f'<circle cx="{cx+math.cos(a)*(rx+ring/2):.1f}" cy="{cy+math.sin(a)*(ry+ring/2):.1f}" r="3.5" fill="#2a1608"/><circle cx="{cx+math.cos(a)*(rx+ring/2)+1:.1f}" cy="{cy+math.sin(a)*(ry+ring/2)-1:.1f}" r="1.3" fill="#fff0c0" opacity=".6"/>' for a in [k * math.tau / 10 + .2 for k in range(10)]))
    return ''.join(o)
