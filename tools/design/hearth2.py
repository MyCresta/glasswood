import math, random
from geo import dseg
S=94; K=.84; HF=.55
R0=random.Random(1)
def hgt(x,z):
    return .7*math.exp(-((x+2.6)**2+(z+2.2)**2)/2.6)+.4*math.exp(-((z+5.6)**2)/2.2)+.3*math.exp(-((x-1.7)**2+(z+2.9)**2)/1.4)+.3*math.exp(-((x+4.4)**2+(z-1.8)**2)/2)
STREAM=[(3.4,-6),(2.9,-3.6),(3.9,-1.8),(3.6,.6),(4.3,2.9),(4.0,6)]
def P(cx,cy,x,z,up=0): return (cx+x*S, cy+z*S*K-(hgt(x,z)+up)*S*HF)
def ground(cx,cy):
    o=[]; st=.2; r=random.Random(2)
    for zi in range(int(12.6/st)+1):
        z=-6.3+zi*st
        for xi in range(int(10.4/st)+1):
            x=-5.2+xi*st; h=hgt(x,z)
            sx=(hgt(x+.05,z)-hgt(x-.05,z))/.1; sz=(hgt(x,z+.05)-hgt(x,z-.05))/.1
            light=-sx*.6-sz*.8
            base=(66,98,52) if math.hypot(x,z)>3.4 else (84,112,58)
            if math.hypot(x,z)<1.15: base=(150,128,96)
            f=1+light*.38+(r.random()-.5)*.08
            c=tuple(max(0,min(255,int(v*f))) for v in base)
            q=[P(cx,cy,x,z),P(cx,cy,x+st,z),P(cx,cy,x+st,z+st),P(cx,cy,x,z+st)]
            o.append(f'<path d="M{q[0][0]:.1f} {q[0][1]:.1f} L{q[1][0]:.1f} {q[1][1]:.1f} L{q[2][0]:.1f} {q[2][1]:.1f} L{q[3][0]:.1f} {q[3][1]:.1f}Z" fill="rgb{c}" stroke="rgb{c}" stroke-width=".6"/>')
    # moss, clover and flower specks
    for i in range(700):
        x=r.uniform(-5,5); z=r.uniform(-6,6); X,Y=P(cx,cy,x,z)
        o.append(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="{r.uniform(.8,2.2):.1f}" fill="{r.choice(["#6f9a48","#3e5a2e","#8aa85a","#f2c14e","#e98fb5","#4a7a3a"])}" opacity=".8"/>')
    pts=[P(cx,cy,x,z,-.02) for x,z in STREAM]; d='M'+' L'.join(f'{x:.1f} {y:.1f}' for x,y in pts)
    o.append(f'<path d="{d}" fill="none" stroke="#2f4a2a" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/><path d="{d}" fill="none" stroke="#24406e" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/><path d="{d}" fill="none" stroke="#7fd6ff" stroke-width="2" stroke-dasharray="8 20" opacity=".7"/>')
    def lane(pts,w,stones=True):
        pp=[P(cx,cy,x,z,.004) for x,z in pts]; d='M'+' L'.join(f'{x:.1f} {y:.1f}' for x,y in pp)
        s=f'<path d="{d}" fill="none" stroke="#5e4a34" stroke-width="{w+5}" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/><path d="{d}" fill="none" stroke="#8e7656" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'
        if stones:
            for (x0,z0),(x1,z1) in zip(pts,pts[1:]):
                L=math.dist((x0,z0),(x1,z1)); n=int(L/.22)
                for k in range(n):
                    t=(k+.5)/n; X,Y=P(cx,cy,x0+(x1-x0)*t+R0.uniform(-.06,.06),z0+(z1-z0)*t+R0.uniform(-.06,.06),.006)
                    s+=f'<ellipse cx="{X:.1f}" cy="{Y:.1f}" rx="{w*.28:.1f}" ry="{w*.2:.1f}" fill="#a8977e" stroke="#4a3e30" stroke-width=".8"/>'
        return s
    for pts,w in [([(0,1.1),(0,2.2),(.15,3.1),(0,4.6),(-.4,6.4)],18),([(0,-1.1),(-.3,-2.3),(0,-3.1),(.5,-4.5),(.2,-6.4)],15),([(-1.1,.2),(-2.2,.5),(-3.1,.2),(-5.4,.8)],14),([(1.1,.1),(2.3,.4),(3.1,.2),(3.8,-.1),(5.4,.4)],14),([(.8,.9),(1.3,1.5)],10),([(-.8,.9),(-1.4,1.3)],10),([(-.8,-.8),(-1.8,-1.6)],9),([(.8,-.8),(1.5,-1.1)],9)]:
        o.append(lane(pts,w))
    return ''.join(o)
LEAFC=['#3f7a3a','#55893e','#2f6440','#6a9a48']
def vine(x0,y0,length,down=True,seed=0):
    r=random.Random(seed); d=f'M{x0:.1f} {y0:.1f}'; x,y=x0,y0; leaves=''
    for i in range(int(length/7)):
        nx=x+r.uniform(-4,4); ny=y+7; d+=f' Q{x+r.uniform(-5,5):.1f} {y+3.5:.1f} {nx:.1f} {ny:.1f}'; x,y=nx,ny
        leaves+=f'<ellipse cx="{x+r.choice([-3,3]):.1f}" cy="{y-2:.1f}" rx="3.2" ry="2" fill="{r.choice(LEAFC)}" transform="rotate({r.uniform(-50,50):.0f} {x:.1f} {y:.1f})"/>'
        if r.random()<.15: leaves+=f'<circle cx="{x:.1f}" cy="{y:.1f}" r="1.6" fill="{r.choice(["#f2c14e","#e98fb5","#f4ecd8"])}"/>'
    return f'<path d="{d}" fill="none" stroke="#2c4a24" stroke-width="1.6"/>'+leaves
def glowdot(X,Y,c='#ffcf6b',r=22,core=3): return f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="{r}" fill="url(#eg)"/><circle cx="{X:.1f}" cy="{Y:.1f}" r="{core}" fill="{c}"/>'
def cottage(X,Y,w,seed=0,mirror=False,sign=None,big=False):
    r=random.Random(seed); hw=w*.34; rh=w*.62; m=-1 if mirror else 1
    o=f'<ellipse cx="{X+6:.1f}" cy="{Y+3:.1f}" rx="{w*.66:.1f}" ry="{w*.2:.1f}" fill="#000" opacity=".35"/>'
    o+=f'<circle cx="{X:.1f}" cy="{Y-hw:.1f}" r="{w*.95:.1f}" fill="url(#eg)"/>'
    # stone footing
    o+=''.join(f'<ellipse cx="{X-w/2+k*w/6+4:.1f}" cy="{Y-2:.1f}" rx="{w/12+1:.1f}" ry="3.6" fill="{r.choice(["#8a8580","#a39e95","#77726c"])}" stroke="#2a2622" stroke-width=".8"/>' for k in range(6))
    # plank walls
    o+=f'<rect x="{X-w/2:.1f}" y="{Y-hw-3:.1f}" width="{w:.1f}" height="{hw:.1f}" fill="#6b4a2e" stroke="#21150c" stroke-width="1.5"/>'
    o+=''.join(f'<path d="M{X-w/2+k:.1f} {Y-hw-3:.1f} V{Y-3:.1f}" stroke="#4a3020" stroke-width="1"/>' for k in [w*t/7 for t in range(1,7)])
    o+=f'<rect x="{X-w/2-2:.1f}" y="{Y-hw-4:.1f}" width="5" height="{hw+2:.1f}" fill="#4a2e18" stroke="#21150c"/><rect x="{X+w/2-3:.1f}" y="{Y-hw-4:.1f}" width="5" height="{hw+2:.1f}" fill="#4a2e18" stroke="#21150c"/>'
    dx=-w*.2*m
    o+=f'<path d="M{X+dx-5:.1f} {Y-3:.1f} v-{hw*.62:.1f} a5 5 0 0 1 10 0 v{hw*.62:.1f}z" fill="#3a2414" stroke="#21150c" stroke-width="1.1"/><circle cx="{X+dx+3:.1f}" cy="{Y-hw*.36:.1f}" r="1" fill="#e0a93a"/>'
    o+=glowdot(X+dx+10*m,Y-hw*.62,'#ffd27a',16,2.4)+f'<rect x="{X+dx+8*m-2:.1f}" y="{Y-hw*.62-3:.1f}" width="5" height="6" rx="1" fill="#ffd27a" stroke="#21150c" stroke-width=".8"/>'
    wx=X+w*.2*m
    o+=f'<circle cx="{wx:.1f}" cy="{Y-hw*.6:.1f}" r="{w*.09+4:.1f}" fill="url(#eg)"/><circle cx="{wx:.1f}" cy="{Y-hw*.6:.1f}" r="{w*.09:.1f}" fill="#ffcf6b" stroke="#21150c" stroke-width="1.4"/><path d="M{wx-w*.09:.1f} {Y-hw*.6:.1f} h{w*.18:.1f} M{wx:.1f} {Y-hw*.6-w*.09:.1f} v{w*.18:.1f}" stroke="#4a2e18" stroke-width="1.1"/>'
    # mossy thatched roof seen mostly from above
    top=Y-hw-3-rh; L=X-w/2-9; Rr=X+w/2+9
    o+=f'<path d="M{L:.1f} {Y-hw-1:.1f} Q{L-4:.1f} {(Y-hw+top)/2:.1f} {X-w*.36:.1f} {top:.1f} L{X+w*.36:.1f} {top:.1f} Q{Rr+4:.1f} {(Y-hw+top)/2:.1f} {Rr:.1f} {Y-hw-1:.1f} Q{X:.1f} {Y-hw+7:.1f} {L:.1f} {Y-hw-1:.1f}Z" fill="#4f7a3a" stroke="#1e2e16" stroke-width="1.6"/>'
    for k in range(1,5):
        yy=Y-hw-1-rh*k/5; xl=L+(X-w*.36-L)*k/5; xr=Rr-(Rr-X-w*.36)*k/5
        o+=f'<path d="M{xl:.1f} {yy:.1f} '+''.join(f'q{(xr-xl)/8:.1f} 5 {(xr-xl)/4:.1f} 0 ' for _ in range(4))+'" fill="none" stroke="#2c4a24" stroke-width="1.2" opacity=".7"/>'
    o+=f'<path d="M{X-w*.36:.1f} {top:.1f} H{X+w*.36:.1f}" stroke="#5a3e22" stroke-width="5" stroke-linecap="round"/><path d="M{X-w*.36:.1f} {top-1:.1f} H{X+w*.36:.1f}" stroke="#8a6a46" stroke-width="1.5" stroke-linecap="round"/>'
    for k in range(int(w/9)):
        mx=r.uniform(L+6,Rr-6); my=r.uniform(top+6,Y-hw-6)
        o+=f'<circle cx="{mx:.1f}" cy="{my:.1f}" r="{r.uniform(3,6):.1f}" fill="{r.choice(["#6a9a48","#5a8a40","#8a6a3e"])}" opacity=".8"/>'
    # roof mushrooms that glow
    for k in range(2):
        mx=r.uniform(L+10,Rr-10); my=Y-hw-2-r.uniform(0,8); c=r.choice(['#7b55c9','#2fb3a0'])
        o+=f'<circle cx="{mx:.1f}" cy="{my-3:.1f}" r="10" fill="url(#{"vg" if c=="#7b55c9" else "cy"})"/><path d="M{mx-1:.1f} {my:.1f} v-3 h2 v3z" fill="#efe3cf"/><path d="M{mx-4:.1f} {my-3:.1f} q4 -6 8 0z" fill="{c}"/>'
    # chimney with smoke
    chx=X+w*.28*m
    o+=f'<rect x="{chx-5:.1f}" y="{top-6:.1f}" width="10" height="{rh*.45:.1f}" fill="#8a8580" stroke="#2a2622" stroke-width="1.1"/><path d="M{chx-5:.1f} {top:.1f} h10 M{chx-5:.1f} {top+6:.1f} h10" stroke="#2a2622" stroke-opacity=".4"/>'
    o+=''.join(f'<circle cx="{chx+2+k*4*m:.1f}" cy="{top-12-k*9:.1f}" r="{3+k*1.6:.1f}" fill="#d9d4cc" opacity="{.4-k*.09:.2f}"/>' for k in range(4))
    # vines down the walls
    o+=vine(X-w/2+3,Y-hw-2,hw*.9,seed=seed)+vine(X+w/2-4,Y-hw-1,hw*.7,seed=seed+3)
    if sign: o+=f'<path d="M{X+w/2*m:.1f} {Y-hw*.85:.1f} h{12*m}" stroke="#21150c" stroke-width="2"/><rect x="{X+w/2*m+(4 if m>0 else -18):.1f}" y="{Y-hw*.85:.1f}" width="14" height="11" rx="2" fill="{sign}" stroke="#21150c" stroke-width="1.1"/>'
    # barrel or crates by the door
    o+=f'<ellipse cx="{X-w*.42*m:.1f}" cy="{Y-6:.1f}" rx="6" ry="7" fill="#7a4a26" stroke="#21150c" stroke-width="1"/><path d="M{X-w*.42*m-6:.1f} {Y-8:.1f} h12 M{X-w*.42*m-6:.1f} {Y-3:.1f} h12" stroke="#3a2414" stroke-width="1"/>'
    return o
def stump_house(X,Y,w):
    hw=w*.62
    o=f'<ellipse cx="{X+6}" cy="{Y+3}" rx="{w*.62}" ry="{w*.18}" fill="#000" opacity=".35"/><circle cx="{X}" cy="{Y-hw*.5}" r="{w}" fill="url(#eg)"/>'
    o+=f'<path d="M{X-w/2} {Y} Q{X-w*.56} {Y-hw*.5} {X-w*.46} {Y-hw} L{X+w*.46} {Y-hw} Q{X+w*.56} {Y-hw*.5} {X+w/2} {Y}Z" fill="#6b4a2e" stroke="#21150c" stroke-width="1.6"/>'
    o+=''.join(f'<path d="M{X-w*.4+k*w*.16} {Y-hw+2} q{(-2+k)*1.5} {hw*.5} 0 {hw-4}" stroke="#4a3020" stroke-width="1.4" fill="none"/>' for k in range(6))
    o+=f'<path d="M{X-w*.62} {Y+1} q8 -10 16 -2 M{X+w*.62} {Y+1} q-8 -10 -16 -2" stroke="#5a3e22" stroke-width="5" fill="none" stroke-linecap="round"/>'
    o+=f'<ellipse cx="{X}" cy="{Y-hw}" rx="{w*.5}" ry="{w*.2}" fill="#8a6a46" stroke="#21150c" stroke-width="1.4"/>'+''.join(f'<ellipse cx="{X}" cy="{Y-hw}" rx="{w*.5*k}" ry="{w*.2*k}" fill="none" stroke="#5a3e22" stroke-width=".8"/>' for k in (.3,.55,.8))
    o+=f'<path d="M{X-w*.55} {Y-hw-2} Q{X} {Y-hw-w*.6} {X+w*.55} {Y-hw-2} Q{X} {Y-hw+8} {X-w*.55} {Y-hw-2}Z" fill="#c43d36" stroke="#2a0f14" stroke-width="1.6"/>'+''.join(f'<circle cx="{X+dx}" cy="{Y-hw-dy}" r="{rr}" fill="#f6ead2"/>' for dx,dy,rr in [(-14,10,4),(6,16,5),(18,6,3),(-2,6,3)])
    o+=f'<path d="M{X-6} {Y} v-14 a6 6 0 0 1 12 0 v14z" fill="#3a2414" stroke="#21150c"/><circle cx="{X+w*.28}" cy="{Y-hw*.55}" r="10" fill="url(#eg)"/><circle cx="{X+w*.28}" cy="{Y-hw*.55}" r="5" fill="#ffcf6b" stroke="#21150c"/>'
    o+=vine(X-w*.45,Y-hw+4,hw*.7,seed=9)
    return o
def ruin(X,Y,w,sel=False,seed=0):
    r=random.Random(seed); hw=w*.32
    o=f'<ellipse cx="{X+6:.1f}" cy="{Y+3:.1f}" rx="{w*.62:.1f}" ry="{w*.2:.1f}" fill="#000" opacity=".3"/>'
    if sel: o+=f'<ellipse cx="{X:.1f}" cy="{Y-6:.1f}" rx="{w*.85:.1f}" ry="{w*.42:.1f}" fill="none" stroke="#ffe08a" stroke-width="3" stroke-dasharray="9 6"/><circle cx="{X:.1f}" cy="{Y-hw:.1f}" r="{w*.9:.1f}" fill="url(#eg)" opacity=".7"/>'
    o+=''.join(f'<ellipse cx="{X-w/2+k*w/6+4:.1f}" cy="{Y-2:.1f}" rx="{w/12+1:.1f}" ry="3.6" fill="#8a8580" stroke="#2a2622" stroke-width=".8"/>' for k in range(6))
    o+=f'<path d="M{X-w/2:.1f} {Y-3:.1f} V{Y-hw-6:.1f} L{X-w*.3:.1f} {Y-hw:.1f} L{X-w*.1:.1f} {Y-hw-10:.1f} L{X+w*.05:.1f} {Y-hw*.5:.1f} L{X+w*.3:.1f} {Y-hw*.7:.1f} L{X+w/2:.1f} {Y-hw*.3:.1f} V{Y-3:.1f}Z" fill="#5a3e28" stroke="#21150c" stroke-width="1.4"/>'
    o+=''.join(f'<path d="M{X-w/2+k:.1f} {Y-hw:.1f} V{Y-3:.1f}" stroke="#3a2818" stroke-width="1"/>' for k in [w*t/6 for t in range(1,6)])
    o+=f'<path d="M{X-w*.55:.1f} {Y-hw*.2:.1f} L{X+w*.2:.1f} {Y-hw-w*.45:.1f} L{X+w*.55:.1f} {Y-hw*.1:.1f}" fill="none" stroke="#4a2e18" stroke-width="5" stroke-linecap="round"/><path d="M{X-w*.2:.1f} {Y-hw-w*.2:.1f} L{X+w*.35:.1f} {Y-hw*.6:.1f}" stroke="#4a2e18" stroke-width="3.5" stroke-linecap="round"/>'
    o+=vine(X-w*.3,Y-hw-6,hw+2,seed=seed)+vine(X+w*.2,Y-hw-w*.3,hw*1.2,seed=seed+5)
    o+=''.join(f'<circle cx="{X+r.uniform(-w*.5,w*.5):.1f}" cy="{Y-r.uniform(2,hw):.1f}" r="{r.uniform(4,8):.1f}" fill="{r.choice(LEAFC)}"/>' for _ in range(5))
    o+=f'<circle cx="{X+w*.4:.1f}" cy="{Y-8:.1f}" r="12" fill="url(#vg)"/><path d="M{X+w*.4-1:.1f} {Y-4:.1f} v-4 h2 v4z" fill="#efe3cf"/><path d="M{X+w*.4-5:.1f} {Y-8:.1f} q5 -7 10 0z" fill="#7b55c9"/>'
    return o
def tower(X,Y):
    o=f'<ellipse cx="{X+14}" cy="{Y+3}" rx="58" ry="18" fill="#000" opacity=".35"/><circle cx="{X}" cy="{Y-150}" r="150" fill="url(#warm)"/>'
    o+=''.join(f'<ellipse cx="{X-38+k*12}" cy="{Y-2}" rx="7" ry="4" fill="#8a8580" stroke="#2a2622" stroke-width=".8"/>' for k in range(7))
    o+=f'<path d="M{X-36} {Y-2} V{Y-130} H{X+36} V{Y-2}Z" fill="#8f8a80" stroke="#2a2622" stroke-width="2"/>'
    rr=random.Random(4)
    o+=''.join(f'<rect x="{X-36+(k%3)*24+(6 if (k//3)%2 else 0)}" y="{Y-130+(k//3)*12}" width="22" height="11" fill="none" stroke="#5a554e" stroke-width=".9"/>' for k in range(30))
    o+=f'<path d="M{X+8} {Y-2} V{Y-130} H{X+36} V{Y-2}Z" fill="#000" opacity=".16"/>'
    o+=vine(X-30,Y-128,110,seed=21)+vine(X-12,Y-126,70,seed=22)+vine(X+26,Y-120,90,seed=23)
    o+=f'<path d="M{X-8} {Y-2} v-24 a8 8 0 0 1 16 0 v24z" fill="#3a2414" stroke="#21150c" stroke-width="1.4"/>'+glowdot(X-16,Y-20,'#ffd27a',16,2.6)+glowdot(X+16,Y-20,'#ffd27a',16,2.6)
    o+=f'<circle cx="{X}" cy="{Y-72}" r="8" fill="#ffcf6b" stroke="#21150c" stroke-width="1.4"/>'
    # wooden hoarding on top with mossy roof and archers
    o+=f'<rect x="{X-46}" y="{Y-156}" width="92" height="28" fill="#6b4a2e" stroke="#21150c" stroke-width="1.6"/>'+''.join(f'<path d="M{X-46+k*11.5} {Y-156} V{Y-128}" stroke="#4a3020"/>' for k in range(1,8))
    o+=f'<rect x="{X-40}" y="{Y-150}" width="80" height="10" fill="#ffd27a"/>'+''.join(f'<circle cx="{X+dx}" cy="{Y-160}" r="4.5" fill="#e8c7a8" stroke="#21150c"/><path d="M{X+dx-4} {Y-156} h8 v6 h-8z" fill="#2f6b55" stroke="#21150c"/>' for dx in (-30,-10,10,30))
    o+=f'<path d="M{X-58} {Y-154} Q{X-60} {Y-200} {X} {Y-246} Q{X+60} {Y-200} {X+58} {Y-154} Q{X} {Y-144} {X-58} {Y-154}Z" fill="#4f7a3a" stroke="#1e2e16" stroke-width="2"/>'
    o+=''.join(f'<path d="M{X-50+k*4} {Y-160-k*14} '+''.join(f'q{(100-k*8)/10:.1f} 5 {(100-k*8)/5:.1f} 0 ' for _ in range(5))+'" fill="none" stroke="#2c4a24" stroke-width="1.2" opacity=".7"/>' for k in range(5))
    o+=f'<path d="M{X} {Y-246} v-22" stroke="#21150c" stroke-width="2"/><path d="M{X} {Y-268} l22 6 l-22 7z" fill="#d9a23a" stroke="#21150c" stroke-width="1.2"/>'
    o+=''.join(f'<circle cx="{X+dx}" cy="{Y-dy}" r="{rr_}" fill="{c}" opacity=".85"/>' for dx,dy,rr_,c in [(-30,170,7,'#6a9a48'),(24,190,8,'#5a8a40'),(-8,214,6,'#8a6a3e'),(36,166,6,'#6a9a48')])
    return o
def villager(X,Y,c,hair='#5a3a22',carry=None,face=1):
    o=f'<ellipse cx="{X+2:.1f}" cy="{Y+1:.1f}" rx="8" ry="3" fill="#000" opacity=".35"/><path d="M{X-6:.1f} {Y:.1f} q-1 -13 6 -14 q7 1 6 14z" fill="{c}" stroke="#21150c" stroke-width="1.2"/><circle cx="{X:.1f}" cy="{Y-18:.1f}" r="6.2" fill="#e8c7a8" stroke="#21150c" stroke-width="1.2"/><path d="M{X-6.5:.1f} {Y-19:.1f} q6.5 -10 13 0 q-6.5 -4 -13 0z" fill="{hair}"/><circle cx="{X-2.2*face:.1f}" cy="{Y-17.5:.1f}" r="1" fill="#21150c"/><circle cx="{X+2.2*face:.1f}" cy="{Y-17.5:.1f}" r="1" fill="#21150c"/>'
    if carry=='lantern': o+=glowdot(X+10,Y-8,'#ffd27a',16,3)
    if carry=='basket': o+=f'<path d="M{X-13:.1f} {Y-9:.1f} h9 l-2 6 h-5z" fill="#a8642a" stroke="#21150c"/><circle cx="{X-10:.1f}" cy="{Y-10:.1f}" r="2" fill="#c43d36"/>'
    if carry=='wood': o+=f'<path d="M{X+5:.1f} {Y-12:.1f} l10 -4 M{X+5:.1f} {Y-9:.1f} l10 -4" stroke="#7a4a26" stroke-width="3" stroke-linecap="round"/>'
    return o
def spruce(X,Y,h,dark='#1e4430'):
    w=h*.36
    return f'<ellipse cx="{X+6:.1f}" cy="{Y+2:.1f}" rx="{w:.1f}" ry="{w*.4:.1f}" fill="#000" opacity=".3"/><rect x="{X-2.5:.1f}" y="{Y-h*.2:.1f}" width="5" height="{h*.2:.1f}" fill="#4a2e18"/>'+''.join(f'<path d="M{X-w*(1-i*.24):.1f} {Y-h*(.16+i*.24):.1f} L{X:.1f} {Y-h*(.46+i*.24):.1f} L{X+w*(1-i*.24):.1f} {Y-h*(.16+i*.24):.1f} Q{X:.1f} {Y-h*(.10+i*.24):.1f} {X-w*(1-i*.24):.1f} {Y-h*(.16+i*.24):.1f}Z" fill="{dark}" stroke="#0f2016" stroke-width="1.1"/><path d="M{X:.1f} {Y-h*(.46+i*.24):.1f} L{X-w*(1-i*.24)*.7:.1f} {Y-h*(.2+i*.24):.1f}" stroke="#4f7a3a" stroke-width="1.6" opacity=".7"/>' for i in range(3))
def oak(X,Y,h,c='#3a6a34'):
    r=h*.3
    return f'<ellipse cx="{X+6:.1f}" cy="{Y+2:.1f}" rx="{r*1.1:.1f}" ry="{r*.42:.1f}" fill="#000" opacity=".3"/><path d="M{X-3:.1f} {Y:.1f} L{X-2:.1f} {Y-h*.4:.1f} L{X+2:.1f} {Y-h*.4:.1f} L{X+4:.1f} {Y:.1f}Z" fill="#5a3e22" stroke="#21150c"/>'+''.join(f'<circle cx="{X+dx*r:.1f}" cy="{Y-h*.55+dy*r:.1f}" r="{rr*r:.1f}" fill="{c}" stroke="#0f2016" stroke-width="1.1"/>' for dx,dy,rr in [(-.6,.15,.7),(.6,.12,.72),(0,-.25,.9)])+f'<circle cx="{X-r*.35:.1f}" cy="{Y-h*.68:.1f}" r="{r*.35:.1f}" fill="#7ab04a" opacity=".4"/>'
def fairy(pts):
    o=''
    for (x0,y0),(x1,y1) in zip(pts,pts[1:]):
        mx=(x0+x1)/2; my=(y0+y1)/2+18
        o+=f'<path d="M{x0:.1f} {y0:.1f} Q{mx:.1f} {my:.1f} {x1:.1f} {y1:.1f}" stroke="#2a1d14" stroke-width="1" fill="none"/>'
        for k in range(1,8):
            t=k/8; x=(1-t)**2*x0+2*(1-t)*t*mx+t*t*x1; y=(1-t)**2*y0+2*(1-t)*t*my+t*t*y1
            c=['#ffd27a','#9ff6ff','#ffb3d9','#c8ff8a'][k%4]
            o+=f'<circle cx="{x:.1f}" cy="{y:.1f}" r="5" fill="{c}" opacity=".25"/><circle cx="{x:.1f}" cy="{y:.1f}" r="1.8" fill="{c}"/>'
    return o
def hearth(cx,cy,rx,ry):
    r=random.Random(5); g=cy+26
    o=[f'<clipPath id="hl2"><ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"/></clipPath><g clip-path="url(#hl2)"><rect x="{cx-rx}" y="{cy-ry}" width="{2*rx}" height="{2*ry}" fill="#2c4a2e"/>',ground(cx,g)]
    items=[]
    def add(x,z,fn): X,Y=P(cx,g,x,z); items.append((Y,fn(X,Y)))
    lanes=[((0,3),(-.4,6.4)),((0,-3),(.2,-6.4)),((-3,.2),(-5.4,.8)),((3.8,-.1),(5.4,.4))]
    for i in range(520):
        x=r.uniform(-5.2,5.2); z=r.uniform(-6.4,6.4); d=math.hypot(x,z)
        if d<3.5: continue
        if min(dseg(x,z,a,b) for a,b in lanes)<.42 or min(dseg(x,z,STREAM[k],STREAM[k+1]) for k in range(len(STREAM)-1))<.38: continue
        if d<4.2 and r.random()<.45: continue
        h=r.uniform(56,96)
        if r.random()<.62: add(x,z,lambda X,Y,h=h,c=r.random():spruce(X,Y,h,['#1e4430','#24503a','#1a3a2a'][int(c*3)]))
        else: add(x,z,lambda X,Y,h=h,c=r.random():oak(X,Y,h*.85,['#3a6a34','#2f5e34','#4a7a3a'][int(c*3)]))
    for i in range(40):
        a=r.uniform(0,math.tau); d=r.uniform(3.4,4.3); x,z=math.cos(a)*d,math.sin(a)*d
        if r.random()<.55: add(x,z,lambda X,Y,c=r.random():(f'<circle cx="{X:.0f}" cy="{Y-5:.0f}" r="16" fill="url(#{"vg" if c<.5 else "cy"})"/>')+f'<path d="M{X-1.5:.0f} {Y:.0f} v-6 h3 v6z" fill="#efe3cf"/><path d="M{X-6:.0f} {Y-5:.0f} q6 -9 12 0z" fill="{"#7b55c9" if c<.5 else "#2fb3a0"}" stroke="#14261c" stroke-width="1"/>')
        else: add(x,z,lambda X,Y,s=r.uniform(7,12):f'<ellipse cx="{X:.0f}" cy="{Y-s*.35:.0f}" rx="{s:.0f}" ry="{s*.62:.0f}" fill="#77726c" stroke="#2a2622" stroke-width="1.1"/><ellipse cx="{X-s*.2:.0f}" cy="{Y-s*.6:.0f}" rx="{s*.7:.0f}" ry="{s*.3:.0f}" fill="#4f7a3a"/>')
    # low stone-and-root wall with posts instead of a palisade
    n=70
    for k in range(n):
        a=k/n*math.tau
        if abs(a-math.pi/2)<.14 or abs(a-3*math.pi/2)<.1 or abs(a)<.08 or abs(a-math.pi)<.1: continue
        x,z=math.cos(a)*3.15,math.sin(a)*3.15
        add(x,z,lambda X,Y,k=k:f'<ellipse cx="{X:.1f}" cy="{Y-4:.1f}" rx="9" ry="6.5" fill="{["#8a8580","#77726c","#99948c"][k%3]}" stroke="#2a2622" stroke-width="1"/>'+(f'<rect x="{X-3:.1f}" y="{Y-30:.1f}" width="6" height="26" fill="#5a3e22" stroke="#21150c"/>'+glowdot(X,Y-32,'#ffd27a',14,2.6) if k%9==0 else '')+(f'<circle cx="{X+3:.1f}" cy="{Y-9:.1f}" r="4" fill="#4f7a3a"/>' if k%2 else ''))
    add(0,3.2,lambda X,Y:f'<path d="M{X-28} {Y} V{Y-50} M{X+28} {Y} V{Y-50}" stroke="#4a2e18" stroke-width="8" stroke-linecap="round"/><path d="M{X-36} {Y-46} Q{X} {Y-66} {X+36} {Y-46}" stroke="#4a2e18" stroke-width="7" fill="none" stroke-linecap="round"/>'+vine(X-30,Y-52,40,seed=31)+vine(X+26,Y-50,34,seed=32)+glowdot(X-28,Y-40,'#ffd27a',20,3.5)+glowdot(X+28,Y-40,'#ffd27a',20,3.5))
    add(3.75,0.0,lambda X,Y:f'<path d="M{X-30} {Y-2} q30 -16 60 0 v7 q-30 -14 -60 0z" fill="#6b4a2e" stroke="#21150c" stroke-width="1.4"/>'+''.join(f'<path d="M{X-26+k*10} {Y-8+abs(k-2.5)*1.5} v-10" stroke="#4a2e18" stroke-width="2"/>' for k in range(6))+vine(X-22,Y-12,14,seed=40))
    B=[(1.15,1.5,100,'cottage',dict(seed=1,sign='#d9a23a')),(-1.45,1.35,88,'cottage',dict(seed=2,mirror=True,sign='#c4553b')),(-2.2,-1.75,70,'stump',None),(-0.7,-2.4,74,'ruin',dict(seed=4)),
       (1.75,-1.3,82,'cottage',dict(seed=5)),(2.0,0.3,78,'ruin',dict(seed=6,sel=True)),(-2.3,0.3,72,'ruin',dict(seed=7)),(0.95,-0.85,58,'cottage',dict(seed=8,mirror=True)),(-0.9,2.3,80,'cottage',dict(seed=9,mirror=True))]
    for x,z,w,k,opt in B:
        if k=='cottage': add(x,z,lambda X,Y,w=w,opt=opt:cottage(X,Y,w,**opt))
        elif k=='stump': add(x,z,lambda X,Y,w=w:stump_house(X,Y,w))
        else: add(x,z,lambda X,Y,w=w,opt=opt:ruin(X,Y,w,**opt))
    add(-1.9,2.35,lambda X,Y:''.join(f'<path d="M{X-40} {Y-20+k*8} h58" stroke="#5a3e22" stroke-width="5"/><path d="M{X-38} {Y-21+k*8} h54" stroke="#9fd16b" stroke-width="3" stroke-dasharray="4 4"/>' for k in range(3))+f'<circle cx="{X+26}" cy="{Y-8}" r="5" fill="#d98a2e" stroke="#21150c"/><circle cx="{X+34}" cy="{Y-4}" r="4" fill="#d98a2e" stroke="#21150c"/>')
    add(0.5,0.6,lambda X,Y:f'<path d="M{X-16} {Y} v-16 M{X+16} {Y} v-16" stroke="#4a2e18" stroke-width="2.5"/><path d="M{X-20} {Y-16} q20 -10 40 0 l-4 -8 q-16 -6 -32 0z" fill="#2f6b55" stroke="#21150c" stroke-width="1.2"/><rect x="{X-14}" y="{Y-9}" width="28" height="7" fill="#6b4a2e" stroke="#21150c"/><circle cx="{X-6}" cy="{Y-11}" r="3" fill="#c43d36"/><circle cx="{X+4}" cy="{Y-11}" r="3" fill="#f2c14e"/>'+glowdot(X+18,Y-18,'#9ff6ff',14,2.5))
    add(-0.6,0.7,lambda X,Y:f'<ellipse cx="{X}" cy="{Y-6}" rx="12" ry="5" fill="#77726c" stroke="#2a2622" stroke-width="1.2"/><path d="M{X-12} {Y-6} v-6 a12 5 0 0 0 24 0 v6" fill="#8a8580" stroke="#2a2622" stroke-width="1.2"/><ellipse cx="{X}" cy="{Y-12}" rx="8" ry="3" fill="#24406e"/><path d="M{X-11} {Y-12} V{Y-28} H{X+11} V{Y-12}" stroke="#4a2e18" stroke-width="2.5" fill="none"/><path d="M{X-15} {Y-28} Q{X} {Y-40} {X+15} {Y-28}Z" fill="#4f7a3a" stroke="#1e2e16"/>'+vine(X-11,Y-28,14,seed=50))
    add(2.25,-1.9,lambda X,Y:''.join(f'<ellipse cx="{X-14+k*9}" cy="{Y-5-(k%2)*6}" rx="5" ry="5" fill="#8a5a2e" stroke="#21150c"/><circle cx="{X-14+k*9}" cy="{Y-5-(k%2)*6}" r="2" fill="#c49a6a"/>' for k in range(4)))
    for x,z,c,carry,face in [(.4,1.1,'#c4553b','lantern',1),(-.5,-.5,'#7b4a9a',None,-1),(1.3,-.2,'#3f6fb0','wood',1),(-1.2,.6,'#2f8f8a','basket',-1),(.2,2.6,'#d9a23a','lantern',1),(-1.5,-1.0,'#e98fb5',None,1)]:
        add(x,z,lambda X,Y,c=c,carry=carry,face=face:villager(X,Y,c,carry=carry,face=face))
    add(1.5,2.15,lambda X,Y:f'<path d="M{X-8} {Y} q-2 -10 6 -10 l2 -4 l2 4 l2 -4 l2 4 q4 4 0 10z" fill="#2a2622"/><path d="M{X-8} {Y-2} q-8 -2 -6 -10" stroke="#2a2622" stroke-width="2.5" fill="none"/><circle cx="{X+2}" cy="{Y-8}" r=".9" fill="#ffd27a"/><circle cx="{X+5}" cy="{Y-8}" r=".9" fill="#ffd27a"/>')
    for x,z in [(-1.6,2.85),(-1.3,2.95),(-1.95,2.75)]:
        add(x,z,lambda X,Y:f'<ellipse cx="{X}" cy="{Y-5}" rx="6" ry="5" fill="#f4ecd8" stroke="#21150c"/><circle cx="{X+5}" cy="{Y-10}" r="3" fill="#f4ecd8" stroke="#21150c"/><path d="M{X+7} {Y-10} l3 1 l-3 1z" fill="#e0a93a"/><path d="M{X+4} {Y-13} l1 -2 l1 2z" fill="#c43d36"/>')
    add(0,0,lambda X,Y:tower(X,Y))
    items.sort(key=lambda t:t[0])
    o+=[t[1] for t in items]
    # strings of glowing lights between the tower and houses
    T0=P(cx,g,0,0); top=(T0[0],T0[1]-150)
    for x,z in [(1.15,1.5),(-1.45,1.35),(1.75,-1.3),(-0.9,2.3)]:
        X,Y=P(cx,g,x,z); o.append(fairy([(top[0]+(-40 if x<0 else 40),top[1]+6),(X,Y-50)]))
    o+=[f'<circle cx="{cx+r.uniform(-rx,rx):.0f}" cy="{cy+r.uniform(-ry,ry):.0f}" r="10" fill="url(#gl)"/>' for _ in range(28)]
    o.append(f'<rect x="{cx-rx}" y="{cy-ry}" width="{2*rx}" height="{2*ry}" fill="#1c1440" opacity=".2"/></g>')
    return ''.join(o)
