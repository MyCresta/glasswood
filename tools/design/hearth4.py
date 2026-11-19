# The calm village: only the buildings that work, smaller, with room to breathe.
import math, random
from geo import dseg
import hearth2 as H
from hearth2 import cottage, ruin, stump_house, villager, spruce, oak, vine, glowdot, fairy
from hearth3 import *
from hearth3 import HOT, P, terrain, stairs, townhall, pond, STREAM

def hearth_calm(cx,cy,rx,ry):
    r=random.Random(5); g=cy+30
    o=[f'<clipPath id="hl3"><ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"/></clipPath><g clip-path="url(#hl3)"><rect x="{cx-rx}" y="{cy-ry}" width="{2*rx}" height="{2*ry}" fill="#2c4a2e"/>',terrain(cx,g)]
    items=[]
    def add(x,z,fn,dy=0,hot=None,hw=60,hh=110):
        X,Y=P(cx,g,x,z); items.append((Y+dy,fn(X,Y)))
        if hot: HOT.setdefault(hot,[]).append([round(X,1),round(Y,1),hw,hh])
    lanes=[((0,3),(-.4,6.4)),((.7,-3),(.2,-6.4)),((-3,.3),(-5.4,.8)),((3.8,-.1),(5.4,.4))]
    for i in range(520):
        x=r.uniform(-5.2,5.2); z=r.uniform(-6.4,6.4); d=math.hypot(x,z)
        if d<3.5: continue
        if min(dseg(x,z,a,b) for a,b in lanes)<.42 or min(dseg(x,z,STREAM[k],STREAM[k+1]) for k in range(len(STREAM)-1))<.4: continue
        if d<4.2 and r.random()<.45: continue
        h=r.uniform(56,96)
        if r.random()<.62: add(x,z,lambda X,Y,h=h,c=r.random():spruce(X,Y,h,['#1e4430','#24503a','#1a3a2a'][int(c*3)]))
        else: add(x,z,lambda X,Y,h=h,c=r.random():oak(X,Y,h*.85,['#3a6a34','#2f5e34','#4a7a3a'][int(c*3)]))
    for i in range(16):
        a=r.uniform(0,math.tau); d=r.uniform(3.4,4.3); x,z=math.cos(a)*d,math.sin(a)*d
        if r.random()<.55: add(x,z,lambda X,Y,c=r.random():(f'<circle cx="{X:.0f}" cy="{Y-5:.0f}" r="16" fill="url(#{"vg" if c<.5 else "cy"})"/>')+f'<path d="M{X-1.5:.0f} {Y:.0f} v-6 h3 v6z" fill="#efe3cf"/><path d="M{X-6:.0f} {Y-5:.0f} q6 -9 12 0z" fill="{"#7b55c9" if c<.5 else "#2fb3a0"}" stroke="#14261c" stroke-width="1"/>')
        else: add(x,z,lambda X,Y,s=r.uniform(7,12):f'<ellipse cx="{X:.0f}" cy="{Y-s*.35:.0f}" rx="{s:.0f}" ry="{s*.62:.0f}" fill="#77726c" stroke="#2a2622" stroke-width="1.1"/><ellipse cx="{X-s*.2:.0f}" cy="{Y-s*.6:.0f}" rx="{s*.7:.0f}" ry="{s*.3:.0f}" fill="#4f7a3a"/>')
    n=70
    for k in range(n):
        a=k/n*math.tau
        if abs(a-math.pi/2)<.14 or abs(a-3*math.pi/2)<.1 or abs(a)<.08 or abs(a-math.pi)<.1: continue
        x,z=math.cos(a)*3.15,math.sin(a)*3.15
        add(x,z,lambda X,Y,k=k:f'<ellipse cx="{X:.1f}" cy="{Y-4:.1f}" rx="9" ry="6.5" fill="{["#8a8580","#77726c","#99948c"][k%3]}" stroke="#2a2622" stroke-width="1"/>'+(f'<rect x="{X-3:.1f}" y="{Y-30:.1f}" width="6" height="26" fill="#5a3e22" stroke="#21150c"/>'+glowdot(X,Y-32,'#ffd27a',14,2.6) if k%9==0 else '')+(f'<circle cx="{X+3:.1f}" cy="{Y-9:.1f}" r="4" fill="#4f7a3a"/>' if k%2 else ''))
    add(0,3.2,hot='walls',hw=40,hh=70,fn=lambda X,Y:f'<path d="M{X-28} {Y} V{Y-50} M{X+28} {Y} V{Y-50}" stroke="#4a2e18" stroke-width="8" stroke-linecap="round"/><path d="M{X-36} {Y-46} Q{X} {Y-66} {X+36} {Y-46}" stroke="#4a2e18" stroke-width="7" fill="none" stroke-linecap="round"/>'+vine(X-30,Y-52,40,seed=31)+vine(X+26,Y-50,34,seed=32)+glowdot(X-28,Y-40,'#ffd27a',20,3.5)+glowdot(X+28,Y-40,'#ffd27a',20,3.5))
    add(3.75,0.0,lambda X,Y:f'<path d="M{X-30} {Y-2} q30 -16 60 0 v7 q-30 -14 -60 0z" fill="#6b4a2e" stroke="#21150c" stroke-width="1.4"/>'+''.join(f'<path d="M{X-26+k*10} {Y-8+abs(k-2.5)*1.5} v-10" stroke="#4a2e18" stroke-width="2"/>' for k in range(6)))
    # buildings, each one different
    add(2.15,1.95,lambda X,Y:pond(X,Y))
    add(-1.95,2.4,lambda X,Y:''.join(f'<path d="M{X-34} {Y-20+k*8} h50" stroke="#5a3e22" stroke-width="5"/><path d="M{X-32} {Y-21+k*8} h46" stroke="#9fd16b" stroke-width="3" stroke-dasharray="4 4"/>' for k in range(3)))
    for x,z,c,carry,face in [(.35,1.0,'#c4553b','lantern',1),(-.45,-.45,'#7b4a9a',None,-1),(1.3,-.15,'#3f6fb0','wood',1),(-1.15,.6,'#2f8f8a','basket',-1),(.2,2.55,'#d9a23a','lantern',1),(-1.05,-.2,'#e98fb5',None,1),(-1.7,-1.0,'#3f6fb0',None,1)]:
        add(x,z,lambda X,Y,c=c,carry=carry,face=face:villager(X,Y,c,carry=carry,face=face))
    for x,z in []:
        add(x,z,lambda X,Y:f'<ellipse cx="{X}" cy="{Y-5}" rx="6" ry="5" fill="#f4ecd8" stroke="#21150c"/><circle cx="{X+5}" cy="{Y-10}" r="3" fill="#f4ecd8" stroke="#21150c"/><path d="M{X+7} {Y-10} l3 1 l-3 1z" fill="#e0a93a"/><path d="M{X+4} {Y-13} l1 -2 l1 2z" fill="#c43d36"/>')
    # the three buildings that work, smaller, and the Town Hall up on the terrace
    add(-1.62,-1.48,lambda X,Y:townhall(X,Y,80),hot='townhall',hw=46,hh=104)
    items.append((P(cx,g,-1.3,.14)[1]-1,stairs(cx,g)))
    add(0,0,lambda X,Y:f'<g transform="translate({X} {Y}) scale(.74) translate({-X} {-Y})">'+H.tower(X,Y)+'</g>',hot='archery',hw=36,hh=196)
    # where the other buildings stood: trees, flowers and lanterns
    r2=random.Random(11)
    for x,z in [(2.0,.4),(3.0,-1.7),(1.05,-2.75),(2.62,-.7),(-2.65,.55),(1.4,1.55),(-1.5,1.4),(1.7,-1.5)]:
        add(x,z,lambda X,Y,h=r2.uniform(46,62),c=r2.random():oak(X,Y,h,['#3a6a34','#2f5e34','#4a7a3a'][int(c*3)]))
    for x,z in [(1.1,-.9),(-.7,-2.2),(2.3,-1.2),(-2.2,1.0)]:
        add(x,z,lambda X,Y:''.join(f'<circle cx="{X+dx:.0f}" cy="{Y+dy:.0f}" r="3.2" fill="{c}"/>' for dx,dy,c in [(-10,-2,'#f2c14e'),(-3,-6,'#e98fb5'),(5,-1,'#c39bff'),(11,-5,'#f4ecd8'),(1,3,'#f2c14e')]))
    for x,z in [(.9,.95),(-.95,.9),(.95,-1.0),(-.85,-.6)]:
        add(x,z,lambda X,Y:f'<circle cx="{X}" cy="{Y-34}" r="20" fill="url(#warm)"/><path d="M{X} {Y} V{Y-30}" stroke="#2a1a0c" stroke-width="3"/><rect x="{X-5}" y="{Y-40}" width="10" height="11" rx="2" fill="#ffd27a" stroke="#2a1a0c" stroke-width="1.5"/>')
    items.sort(key=lambda t:t[0])
    o+=[t[1] for t in items]
    T0=P(cx,g,0,0); top=(T0[0],T0[1]-112)
    for x,z in [(-1.62,-1.48)]:
        X,Y=P(cx,g,x,z); o.append(fairy([(top[0]+(-40 if x<0 else 40),top[1]+6),(X,Y-50)]))
    o+=[f'<circle cx="{cx+r.uniform(-rx,rx):.0f}" cy="{cy+r.uniform(-ry,ry):.0f}" r="10" fill="url(#gl)"/>' for _ in range(28)]
    o.append(f'<rect x="{cx-rx}" y="{cy-ry}" width="{2*rx}" height="{2*ry}" fill="#1c1440" opacity=".2"/></g>')
    return ''.join(o)
