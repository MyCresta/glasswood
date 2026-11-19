# Hearth, drawn in layers so the village can change as it grows:
#   hearth-base     soft painted ground, terrace, stream, lanes, trees behind
#   hearth-front    the trees in front of the walls
#   b-<id>-<stage>  each building in three stages (ruin, restored, grown),
#                   cropped to its own box and placed live by the game
# Lit by the candle at the top right, like the globe and the forest.
import math, random, inspect
from geo import dseg
import hearth2 as H
import hearth3 as H3
from hearth2 import ruin, villager, spruce, oak, vine, glowdot, fairy
from hearth3 import P, Pb, STREAM, stairs, townhall, tavern, lumber as lumber_camp, base_h, in_plateau

CX, CY, RX, RY = 636, 430, 400, 374
G = CY + 30  # ground origin used by the projection

# ---------- the ground ----------
_src = inspect.getsource(H3.terrain)
_a = _src.index('    for zi in range(')
_b = _src.index('    for i in range(700):')
_src = _src[:_a] + '    o.append(SOFT_GROUND(cx,cy))\n' + _src[_b:]
_src = _src.replace('def terrain(cx,cy):', 'def terrain_soft(cx,cy):')
_src = _src.replace('fill="#a8977e" stroke="#4a3e30" stroke-width=".8"', 'fill="#a8977e" stroke="#4a3e30" stroke-width=".6" opacity=".55"')
_src = _src.replace('stroke="#8e7656" stroke-width="{w}"', 'stroke="#8e7656" stroke-width="{w}" opacity=".85"')
_ns = dict(vars(H3))

def SOFT_GROUND(cx, cy):
    """Moss and grass as soft overlapping patches instead of a grid of tiles."""
    r = random.Random(9)
    o = [f'<ellipse cx="{CX}" cy="{CY}" rx="{RX}" ry="{RY}" fill="#41653a"/>']
    # the village clearing is a little lighter than the forest floor
    X0, Y0 = P(cx, cy, 0, 0)
    o.append(f'<ellipse cx="{X0}" cy="{Y0-6}" rx="{3.4*80:.0f}" ry="{3.4*55:.0f}" fill="#507a3e" opacity=".7" filter="url(#soft)"/>')
    o.append('<g filter="url(#soft4)">')
    for _ in range(320):
        x = r.uniform(-5.6, 5.6); z = r.uniform(-6.6, 6.6)
        X, Y = P(cx, cy, x, z)
        d = math.hypot(x, z)
        c = r.choice(['#476f3a', '#3f6434', '#4c743d', '#43693a']) if d > 3.3 else r.choice(['#55803f', '#5a8644', '#507a3e'])
        o.append(f'<ellipse cx="{X:.0f}" cy="{Y:.0f}" rx="{r.uniform(30,60):.0f}" ry="{r.uniform(18,34):.0f}" fill="{c}" opacity=".45"/>')
    # the worn square around the tower
    X, Y = P(cx, cy, 0, 0)
    o.append(f'<ellipse cx="{X}" cy="{Y+4}" rx="{1.35*80:.0f}" ry="{1.05*55:.0f}" fill="#8a7454" opacity=".85"/><ellipse cx="{X}" cy="{Y+4}" rx="{1.0*80:.0f}" ry="{.8*55:.0f}" fill="#9c8562" opacity=".8"/>')
    o.append('</g>')
    # cobbles scattered on the square
    for _ in range(70):
        a = r.uniform(0, math.tau); d = r.uniform(.2, 1.15)
        Xc, Yc = P(cx, cy, math.cos(a) * d, math.sin(a) * d)
        o.append(f'<ellipse cx="{Xc:.1f}" cy="{Yc:.1f}" rx="{r.uniform(3,5):.1f}" ry="{r.uniform(2,3.2):.1f}" fill="#b4a283" stroke="#5a4a36" stroke-width=".6" opacity=".7"/>')
    # candle light from the top right, shade towards the bottom left
    o.append(f'<ellipse cx="{CX}" cy="{CY}" rx="{RX}" ry="{RY}" fill="url(#hlight)"/>')
    return ''.join(o)

_ns['SOFT_GROUND'] = SOFT_GROUND
exec(_src, _ns)
terrain_soft = _ns['terrain_soft']

DEFS = '''
<radialGradient id="hlight" gradientUnits="userSpaceOnUse" cx="980" cy="120" r="900"><stop offset="0" stop-color="#ffd9a0" stop-opacity=".22"/><stop offset=".45" stop-color="#ffd9a0" stop-opacity="0"/><stop offset=".8" stop-color="#0e0a1e" stop-opacity=".12"/><stop offset="1" stop-color="#0e0a1e" stop-opacity=".35"/></radialGradient>
<radialGradient id="ao" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#0a0806" stop-opacity=".55"/><stop offset="1" stop-color="#0a0806" stop-opacity="0"/></radialGradient>
'''

# ---------- where things stand (village units; the tower is the centre) ----------
SPOTS = {
    'archery': (0, 0), 'townhall': (-1.62, -1.48), 'tavern': (1.55, -1.75),
    'workshop': (2.3, -0.55), 'lumber': (-2.3, 1.45), 'quarry': (1.85, 1.85), 'walls': (0, 3.2),
}
# the crop box of each building's sprite, around its foot: half-width, height above, depth below
BOX = {'archery': (70, 230, 24), 'townhall': (80, 170, 24), 'tavern': (70, 150, 24), 'workshop': (64, 120, 24),
       'lumber': (70, 110, 24), 'quarry': (70, 100, 30)}

LANES = [((0, 3), (-.4, 6.4)), ((.7, -3), (.2, -6.4)), ((-3, .3), (-5.4, .8)), ((3.8, -.1), (5.4, .4))]

def trees(front):
    """The forest around the village. front=True gives only the trees that stand
    in front of the walls (drawn over everything)."""
    r = random.Random(5); items = []
    for i in range(520):
        x = r.uniform(-5.2, 5.2); z = r.uniform(-6.4, 6.4); d = math.hypot(x, z)
        h = r.uniform(56, 96); kind = r.random(); c = r.random()
        if d < 3.5: continue
        if min(dseg(x, z, a, b) for a, b in LANES) < .42 or min(dseg(x, z, STREAM[k], STREAM[k + 1]) for k in range(len(STREAM) - 1)) < .4: continue
        if d < 4.2 and r.random() < .45: continue
        if (z > 2.6) != front: continue
        X, Y = P(CX, G, x, z)
        t = spruce(X, Y, h, ['#1e4430', '#24503a', '#1a3a2a'][int(c * 3)]) if kind < .62 else oak(X, Y, h * .85, ['#3a6a34', '#2f5e34', '#4a7a3a'][int(c * 3)])
        items.append((Y, f'<ellipse cx="{X-6:.0f}" cy="{Y+3:.0f}" rx="{h*.32:.0f}" ry="{h*.1:.0f}" fill="#0a0806" opacity=".3"/>' + t))
    items.sort(key=lambda t: t[0])
    return ''.join(t[1] for t in items)

def base():
    o = [f'<clipPath id="hb"><ellipse cx="{CX}" cy="{CY}" rx="{RX}" ry="{RY}"/></clipPath><g clip-path="url(#hb)">', terrain_soft(CX, G)]
    items = []
    def add(x, z, s): X, Y = P(CX, G, x, z); items.append((Y, s(X, Y)))
    # mushrooms and stones in the grass
    r = random.Random(14)
    for i in range(14):
        a = r.uniform(0, math.tau); d = r.uniform(3.4, 4.3); x, z = math.cos(a) * d, math.sin(a) * d
        add(x, z, lambda X, Y, c=r.random(): f'<circle cx="{X:.0f}" cy="{Y-5:.0f}" r="14" fill="url(#{"vg" if c < .5 else "cy"})"/><path d="M{X-1.5:.0f} {Y:.0f} v-6 h3 v6z" fill="#efe3cf"/><ellipse cx="{X:.0f}" cy="{Y-6:.0f}" rx="5" ry="3.2" fill="{"#c39bff" if c < .5 else "#7fd6ff"}"/>')
    # the bridge over the stream, flowers, lanterns on the square
    add(3.75, 0.0, lambda X, Y: f'<path d="M{X-30} {Y-2} q30 -16 60 0 v7 q-30 -14 -60 0z" fill="#6b4a2e" stroke="#21150c" stroke-width="1.4"/>' + ''.join(f'<path d="M{X-26+k*10} {Y-8+abs(k-2.5)*1.5} v-10" stroke="#4a2e18" stroke-width="2"/>' for k in range(6)))
    for x, z in [(1.1, -.9), (-.7, -2.2), (-2.2, 0.0), (.5, 1.9), (-1.0, 2.3)]:
        add(x, z, lambda X, Y: ''.join(f'<circle cx="{X+dx:.0f}" cy="{Y+dy:.0f}" r="3" fill="{c}"/>' for dx, dy, c in [(-10, -2, '#f2c14e'), (-3, -6, '#e98fb5'), (5, -1, '#c39bff'), (11, -5, '#f4ecd8'), (1, 3, '#f2c14e')]))
    for x, z in [(.9, .95), (-.95, .9), (.95, -1.0), (-.85, -.6)]:
        add(x, z, lambda X, Y: f'<circle cx="{X}" cy="{Y-34}" r="20" fill="url(#warm)"/><path d="M{X} {Y} V{Y-30}" stroke="#2a1a0c" stroke-width="3"/><rect x="{X-5}" y="{Y-40}" width="10" height="11" rx="2" fill="#ffd27a" stroke="#2a1a0c" stroke-width="1.5"/>')
    items.append((P(CX, G, -1.3, .14)[1] - 1, stairs(CX, G)))
    items.sort(key=lambda t: t[0])
    o += [t[1] for t in items]
    o.append(trees(False))
    o.append('</g>')
    return ''.join(o)

def front():
    return f'<clipPath id="hf"><ellipse cx="{CX}" cy="{CY}" rx="{RX}" ry="{RY}"/></clipPath><g clip-path="url(#hf)">{trees(True)}</g>'

# ---------- buildings in stages ----------
def ao(X, Y, w):
    return f'<ellipse cx="{X-4:.0f}" cy="{Y+2:.0f}" rx="{w:.0f}" ry="{w*.32:.0f}" fill="url(#ao)"/>'

def scaled(X, Y, k, s):
    return f'<g transform="translate({X} {Y}) scale({k}) translate({-X} {-Y})">{s}</g>'

def tower(stage, X, Y):
    if stage == 0:  # a stump of a tower: broken stone, a platform, a ladder and one lantern
        return ao(X, Y, 48) + f'''<path d="M{X-30} {Y} L{X-28} {Y-46} L{X-18} {Y-52} L{X-10} {Y-44} L{X+2} {Y-56} L{X+14} {Y-48} L{X+26} {Y-54} L{X+30} {Y} Q{X} {Y+8} {X-30} {Y}Z" fill="#8a8478" stroke="#2a2622" stroke-width="1.6"/>
<path d="M{X-30} {Y} L{X-28} {Y-46} L{X-10} {Y-44} L{X-6} {Y+4} Q{X-20} {Y+5} {X-30} {Y}Z" fill="#5e5950"/>
{''.join(f'<path d="M{X-28} {Y-12-k*11} H{X+29}" stroke="#3a3530" stroke-width=".9" opacity=".6"/>' for k in range(4))}
<rect x="{X-34}" y="{Y-62}" width="68" height="8" fill="#6b4a2e" stroke="#21150c" stroke-width="1.3"/>
<path d="M{X-30} {Y-62} v-16 M{X+30} {Y-62} v-16 M{X-30} {Y-74} H{X+30}" stroke="#5a3e22" stroke-width="3"/>
<path d="M{X+18} {Y} L{X+24} {Y-60} M{X+28} {Y} L{X+34} {Y-60}" stroke="#6b4a2e" stroke-width="2.4"/>{''.join(f'<path d="M{X+19+k*.6} {Y-8-k*10} h10" stroke="#6b4a2e" stroke-width="2"/>' for k in range(6))}
{glowdot(X-22, Y-70, '#ffd27a', 24, 3.5)}{villager(X+2, Y-62, '#3f6fb0', face=1)}{vine(X-26, Y-46, 30, seed=3)}{vine(X+12, Y-48, 24, seed=4)}'''
    if stage == 1:
        return ao(X, Y, 52) + scaled(X, Y, .6, H.tower(X, Y))
    return ao(X, Y, 60) + scaled(X, Y, .78, H.tower(X, Y)) + f'<circle cx="{X}" cy="{Y-190}" r="34" fill="url(#warm)"/><path d="M{X-7} {Y-182} q7 -22 14 0z" fill="#ff8a3a"/><path d="M{X-3} {Y-183} q3 -12 6 0z" fill="#ffe08a"/>'

def walls(stage):
    o = []
    n = 120 if stage == 0 else 70
    for k in range(n):
        a = k / n * math.tau
        if abs(a - math.pi / 2) < .14 or abs(a - 3 * math.pi / 2) < .1 or abs(a) < .08 or abs(a - math.pi) < .1: continue
        x, z = math.cos(a) * 3.15, math.sin(a) * 3.15
        X, Y = P(CX, G, x, z)
        if stage == 0:  # sharpened stakes and wicker
            x2, z2 = math.cos(a + math.tau / n) * 3.15, math.sin(a + math.tau / n) * 3.15
            X2, Y2 = P(CX, G, x2, z2)
            o.append((Y, f'<path d="M{X:.1f} {Y-12:.1f} L{X2:.1f} {Y2-12:.1f}" stroke="#5a3e22" stroke-width="2.5"/><path d="M{X-3:.1f} {Y:.1f} V{Y-20:.1f} L{X:.1f} {Y-26:.1f} L{X+3:.1f} {Y-20:.1f} V{Y:.1f}Z" fill="{["#7a5534", "#6b4a2e", "#86603c"][k % 3]}" stroke="#21150c" stroke-width=".9"/>'))
        else:
            big = 1.25 if stage == 2 else 1
            o.append((Y, f'<ellipse cx="{X:.1f}" cy="{Y-4*big:.1f}" rx="{9*big:.1f}" ry="{6.5*big:.1f}" fill="{["#8a8580", "#77726c", "#99948c"][k % 3]}" stroke="#2a2622" stroke-width="1"/>' + (f'<ellipse cx="{X:.1f}" cy="{Y-12*big:.1f}" rx="{7*big:.1f}" ry="{5*big:.1f}" fill="{["#99948c", "#8a8580", "#77726c"][k % 3]}" stroke="#2a2622" stroke-width="1"/>' if stage == 2 or k % 2 else '')))
    if stage == 2:  # small towers on the wall
        for a in [math.pi * .25, math.pi * .75, math.pi * 1.25, math.pi * 1.75]:
            X, Y = P(CX, G, math.cos(a) * 3.15, math.sin(a) * 3.15)
            o.append((Y + 1, f'<rect x="{X-12:.0f}" y="{Y-42:.0f}" width="24" height="42" fill="#8a8580" stroke="#2a2622" stroke-width="1.3"/><path d="M{X-15:.0f} {Y-42:.0f} L{X:.0f} {Y-60:.0f} L{X+15:.0f} {Y-42:.0f}Z" fill="#6b3a2a" stroke="#21150c"/>{glowdot(X, Y-30, "#ffd27a", 16, 3)}'))
    X, Y = P(CX, G, 0, 3.2)
    if stage == 0:
        gate = f'<path d="M{X-26} {Y} V{Y-34} M{X+26} {Y} V{Y-34}" stroke="#5a3e22" stroke-width="6" stroke-linecap="round"/><path d="M{X-24} {Y-30} H{X+24}" stroke="#7a5534" stroke-width="4"/>' + ''.join(f'<path d="M{X-22+k*9} {Y-2} V{Y-28}" stroke="#86603c" stroke-width="3"/>' for k in range(6)) + glowdot(X - 26, Y - 36, '#ffd27a', 16, 3)
    else:
        gate = f'<path d="M{X-28} {Y} V{Y-50} M{X+28} {Y} V{Y-50}" stroke="#4a2e18" stroke-width="8" stroke-linecap="round"/><path d="M{X-36} {Y-46} Q{X} {Y-66} {X+36} {Y-46}" stroke="#4a2e18" stroke-width="7" fill="none" stroke-linecap="round"/>' + vine(X - 30, Y - 52, 40, seed=31) + vine(X + 26, Y - 50, 34, seed=32) + glowdot(X - 28, Y - 40, '#ffd27a', 20, 3.5) + glowdot(X + 28, Y - 40, '#ffd27a', 20, 3.5)
        if stage == 2:
            gate = f'<rect x="{X-44}" y="{Y-60}" width="20" height="60" fill="#8a8580" stroke="#2a2622" stroke-width="1.3"/><rect x="{X+24}" y="{Y-60}" width="20" height="60" fill="#8a8580" stroke="#2a2622" stroke-width="1.3"/><path d="M{X-34} {Y-60} v-16 l10 4 -10 4" fill="#9e3426" stroke="#21150c"/>' + gate
    o.append((Y, gate))
    o.sort(key=lambda t: t[0])
    return f'<clipPath id="hw"><ellipse cx="{CX}" cy="{CY}" rx="{RX}" ry="{RY}"/></clipPath><g clip-path="url(#hw)">' + ''.join(t[1] for t in o) + '</g>'

def ruin2(X, Y, w, seed=0):
    r = random.Random(seed); h = w * .5
    o = ao(X, Y, w * .8)
    # back wall, broken along the top
    top = [(X - w / 2 + k * w / 8, Y - h * .55 - r.uniform(0, h * .55)) for k in range(9)]
    o += f'<path d="M{X-w/2:.0f} {Y-8:.0f} ' + ' '.join(f'L{x:.0f} {y:.0f}' for x, y in top) + f' L{X+w/2:.0f} {Y-8:.0f}Z" fill="#7d7468" stroke="#2a2622" stroke-width="1.4"/>'
    o += ''.join(f'<path d="M{X-w/2+2:.0f} {Y-12-k*9:.0f} H{X+w/2-2:.0f}" stroke="#3a3530" stroke-width=".8" opacity=".55"/>' for k in range(int(h / 9)))
    # an empty window and the doorway
    o += f'<rect x="{X-w*.3:.0f}" y="{Y-h*.7:.0f}" width="{w*.14:.0f}" height="{h*.24:.0f}" fill="#1a1410"/><path d="M{X+w*.05:.0f} {Y-8:.0f} v-{h*.45:.0f} q{w*.08:.0f} -{h*.12:.0f} {w*.16:.0f} 0 v{h*.45:.0f}z" fill="#1a1410"/>'
    # front wall, mostly fallen
    o += f'<path d="M{X-w/2-4:.0f} {Y+4:.0f} L{X-w/2-2:.0f} {Y-h*.35:.0f} L{X-w*.3:.0f} {Y-h*.2:.0f} L{X-w*.18:.0f} {Y-2:.0f}Z" fill="#8a8478" stroke="#2a2622" stroke-width="1.2"/>'
    # a fallen roof beam and a few rafters
    o += f'<path d="M{X-w*.45:.0f} {Y-h*.95:.0f} L{X+w*.42:.0f} {Y-6:.0f}" stroke="#5a3e22" stroke-width="6" stroke-linecap="round"/><path d="M{X-w*.45:.0f} {Y-h*.95:.0f} L{X+w*.42:.0f} {Y-6:.0f}" stroke="#7a5534" stroke-width="2" stroke-linecap="round"/>'
    o += ''.join(f'<path d="M{X-w*.2+k*w*.18:.0f} {Y-h*.6+k*h*.18:.0f} l{w*.1:.0f} -{h*.35:.0f}" stroke="#4a2e18" stroke-width="3" stroke-linecap="round"/>' for k in range(3))
    # rubble and moss
    o += ''.join(f'<ellipse cx="{X+r.uniform(-w*.6,w*.6):.0f}" cy="{Y+r.uniform(-2,8):.0f}" rx="{r.uniform(4,8):.0f}" ry="{r.uniform(3,5):.0f}" fill="{r.choice(["#8a8478","#77726c","#99948c"])}" stroke="#2a2622" stroke-width=".8"/>' for _ in range(8))
    o += ''.join(f'<circle cx="{x+r.uniform(-4,4):.0f}" cy="{y+2:.0f}" r="{r.uniform(4,7):.0f}" fill="{r.choice(["#46703a","#527d40","#3f6234"])}"/>' for x, y in top[::2])
    o += vine(X - w * .3, Y - h * .8, 30, seed=seed) + vine(X + w * .3, Y - h * .7, 26, seed=seed + 1)
    return o

def shed(X, Y, w, big=False):
    h = w * .62
    o = ao(X, Y, w * .8)
    o += f'<rect x="{X-w/2}" y="{Y-h}" width="{w}" height="{h}" fill="#7a5534" stroke="#21150c" stroke-width="1.5"/>' + ''.join(f'<path d="M{X-w/2} {Y-h+k*8} H{X+w/2}" stroke="#5a3e22" stroke-width="1" opacity=".7"/>' for k in range(1, int(h / 8)))
    o += f'<path d="M{X-w/2-8} {Y-h} L{X} {Y-h-w*.42} L{X+w/2+8} {Y-h}Z" fill="#5c7a3a" stroke="#21150c" stroke-width="1.5"/><path d="M{X-w/2-8} {Y-h} L{X} {Y-h-w*.42} L{X-4} {Y-h}Z" fill="#46602e"/>'
    o += f'<rect x="{X-10}" y="{Y-24}" width="20" height="24" fill="#3a2410"/><rect x="{X+w/2-20}" y="{Y-h+10}" width="12" height="10" fill="#ffd27a" stroke="#21150c"/>'
    o += f'<path d="M{X+w/2+6} {Y} l8 -16 l8 16 M{X+w/2+4} {Y-10} h22" stroke="#6b4a2e" stroke-width="3" fill="none"/>'
    if big:
        o += ''.join(f'<g transform="translate({X-w/2-30+k*4} {Y-6-k*9})"><rect x="0" y="0" width="30" height="6" rx="1.5" fill="#a07a4e" stroke="#23170f"/><path d="M5 -4 L8 10 M22 -4 L25 10" stroke="#5a3e22" stroke-width="2.5"/></g>' for k in range(3))
        o += glowdot(X + w / 2 + 2, Y - h - 4, '#ffd27a', 20, 3)
    return o

def quarry(stage, X, Y):
    o = f'<ellipse cx="{X}" cy="{Y}" rx="56" ry="26" fill="#6e6658" stroke="#2a2622" stroke-width="1.4"/><ellipse cx="{X+4}" cy="{Y+4}" rx="44" ry="18" fill="#4e483e"/>'
    if stage == 0:
        return o + ''.join(f'<circle cx="{X+dx}" cy="{Y+dy}" r="{rr}" fill="{c}"/>' for dx, dy, rr, c in [(-30, -6, 12, '#3f6234'), (20, 2, 14, '#46703a'), (-6, 8, 10, '#36522e'), (34, -10, 8, '#527d40')]) + f'<path d="M{X-14} {Y-2} l10 -4 l6 6 l-9 3z" fill="#8a8478" stroke="#2a2622"/>'
    o += ''.join(f'<rect x="{X+dx}" y="{Y+dy}" width="{w}" height="{hh}" fill="#b0a690" stroke="#3a3530" stroke-width="1"/>' for dx, dy, w, hh in [(-34, -10, 18, 12), (-14, -14, 16, 12), (8, -6, 20, 14), (26, -16, 14, 10)])
    o += f'<path d="M{X+44} {Y-4} l14 -22" stroke="#6b4a2e" stroke-width="3"/><path d="M{X+52} {Y-30} l12 4 -4 6z" fill="#8a8478" stroke="#2a2622"/>'
    if stage == 2:  # a wooden crane
        o += f'<path d="M{X-48} {Y-2} V{Y-86} L{X+10} {Y-70}" stroke="#5a3e22" stroke-width="5" fill="none"/><path d="M{X+6} {Y-70} V{Y-30}" stroke="#2a1a0c" stroke-width="1.5"/><rect x="{X-2}" y="{Y-32}" width="16" height="12" fill="#b0a690" stroke="#3a3530"/><circle cx="{X-48}" cy="{Y-30}" r="9" fill="none" stroke="#6b4a2e" stroke-width="3"/>' + glowdot(X - 52, Y - 90, '#ffd27a', 18, 3)
    return o

def lumber(stage, X, Y):
    if stage == 0:
        return ao(X, Y, 30) + f'<ellipse cx="{X}" cy="{Y-4}" rx="18" ry="8" fill="#6b4a2e" stroke="#21150c" stroke-width="1.3"/><ellipse cx="{X}" cy="{Y-8}" rx="16" ry="6" fill="#c9a26a" stroke="#21150c"/><path d="M{X+2} {Y-10} l18 -22" stroke="#6b4a2e" stroke-width="3"/><path d="M{X+16} {Y-34} l10 2 -4 8z" fill="#8a8478" stroke="#2a2622"/>' + ''.join(f'<circle cx="{X+dx}" cy="{Y+dy}" r="{rr}" fill="#46703a"/>' for dx, dy, rr in [(-24, -2, 9), (22, 4, 7), (-10, 8, 6)])
    o = ao(X, Y, 60) + lumber_camp(X, Y)
    if stage == 2:
        o += ''.join(f'<g transform="translate({X-62} {Y-4-k*8})"><rect x="{k*3}" y="0" width="{44-k*6}" height="9" rx="4.5" fill="#8a5a32" stroke="#21150c"/><circle cx="{k*3+3}" cy="4.5" r="4" fill="#c9a26a" stroke="#21150c"/></g>' for k in range(4))
        o += f'<path d="M{X+30} {Y} l10 -18 l10 18 M{X+28} {Y-12} h26" stroke="#6b4a2e" stroke-width="3" fill="none"/>' + glowdot(X + 36, Y - 40, '#ffd27a', 18, 3)
    return o

def building(bid, stage, X, Y):
    if bid == 'archery': return tower(stage, X, Y)
    if bid == 'townhall': return ao(X, Y, 60) + (ruin2(X, Y, 92, seed=3) if stage == 0 else townhall(X, Y, 80 if stage == 1 else 94) + (f'<path d="M{X+30} {Y-150} v-30 l18 6 -18 6" fill="#9e3426" stroke="#21150c"/>' if stage == 2 else ''))
    if bid == 'tavern': return ao(X, Y, 56) + (ruin2(X, Y, 82, seed=5) if stage == 0 else tavern(X, Y, 72 if stage == 1 else 86) + (glowdot(X - 50, Y - 10, '#ffd27a', 22, 3) + f'<rect x="{X-62}" y="{Y-14}" width="22" height="4" fill="#6b4a2e"/>' if stage == 2 else ''))
    if bid == 'workshop': return ruin2(X, Y, 70, seed=7) if stage == 0 else shed(X, Y, 62 if stage == 1 else 74, stage == 2)
    if bid == 'lumber': return lumber(stage, X, Y)
    if bid == 'quarry': return quarry(stage, X, Y)

def sprite_box(bid):
    X, Y = P(CX, G, *SPOTS[bid])
    hw, up, down = BOX[bid]
    return X, Y, (X - hw, Y - up, hw * 2, up + down)

VILLAGER_COLORS = ['#3f6fb0', '#c4553b', '#2f8f8a', '#7b4a9a', '#d9a23a', '#e98fb5', '#5a8a3a', '#b06a3a']
def villager_svg(c):
    return villager(0, 0, c, face=1)
