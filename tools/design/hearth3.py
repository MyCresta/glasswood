import math, random
from geo import dseg
import hearth2 as H
from hearth2 import cottage, ruin, stump_house, villager, spruce, oak, vine, glowdot, fairy, LEAFC
S=94; K=.84; HF=.55
HOT={}
PC=(-1.6,-1.45); PR=.95; PH=1.05
def blob_r(a): return PR*(1+.08*math.sin(3*a+1)+.05*math.sin(5*a+2))
def in_plateau(x,z):
    dx,dz=x-PC[0],z-PC[1]; return math.hypot(dx,dz)<blob_r(math.atan2(dz,dx))
def base_h(x,z):
    return .4*math.exp(-((z+5.6)**2)/2.2)+.3*math.exp(-((x+4.4)**2+(z-1.8)**2)/2)+.25*math.exp(-((x-1.2)**2+(z+3.6)**2)/1.2)+.18*math.sin(x*1.3)*math.cos(z*1.1)*(1 if math.hypot(x,z)>3.4 else .2)
def hgt(x,z): return base_h(x,z)+(PH if in_plateau(x,z) else 0)
H.hgt=hgt
STREAM=H.STREAM
def P(cx,cy,x,z,up=0): return (cx+x*S, cy+z*S*K-(hgt(x,z)+up)*S*HF)
def Pb(cx,cy,x,z,h): return (cx+x*S, cy+z*S*K-h*S*HF)
def terrain(cx,cy):
    o=[]; st=.2; r=random.Random(2)
    for zi in range(int(12.6/st)+1):
        z=-6.3+zi*st
        for xi in range(int(10.4/st)+1):
            x=-5.2+xi*st
            if in_plateau(x+st/2,z+st/2): continue
            h=base_h(x,z); sx=(base_h(x+.05,z)-base_h(x-.05,z))/.1; sz=(base_h(x,z+.05)-base_h(x,z-.05))/.1
            base=(62,94,50) if math.hypot(x,z)>3.4 else (82,110,56)
            if math.hypot(x,z)<1.15: base=(150,128,96)
            f=1+(-sx*.6-sz*.8)*.4+(r.random()-.5)*.08
            c=tuple(max(0,min(255,int(v*f))) for v in base)
            q=[Pb(cx,cy,x,z,h),Pb(cx,cy,x+st,z,base_h(x+st,z)),Pb(cx,cy,x+st,z+st,base_h(x+st,z+st)),Pb(cx,cy,x,z+st,base_h(x,z+st))]
            o.append(f'<path d="M{q[0][0]:.1f} {q[0][1]:.1f} L{q[1][0]:.1f} {q[1][1]:.1f} L{q[2][0]:.1f} {q[2][1]:.1f} L{q[3][0]:.1f} {q[3][1]:.1f}Z" fill="rgb{c}" stroke="rgb{c}" stroke-width=".6"/>')
    for i in range(700):
        x=r.uniform(-5,5); z=r.uniform(-6,6)
        if in_plateau(x,z): continue
        X,Y=P(cx,cy,x,z); o.append(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="{r.uniform(.8,2.2):.1f}" fill="{r.choice(["#6f9a48","#3e5a2e","#8aa85a","#f2c14e","#e98fb5","#4a7a3a"])}" opacity=".8"/>')
    # stream with banks
    pts=[Pb(cx,cy,x,z,base_h(x,z)-.02) for x,z in STREAM]; d='M'+' L'.join(f'{x:.1f} {y:.1f}' for x,y in pts)
    o.append(f'<path d="{d}" fill="none" stroke="#2f4a2a" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/><path d="{d}" fill="none" stroke="#24406e" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/><path d="{d}" fill="none" stroke="#7fd6ff" stroke-width="2" stroke-dasharray="8 20" opacity=".7"/>')
    # lanes with stepping stones
    def lane(pts,w):
        pp=[P(cx,cy,x,z,.004) for x,z in pts]; dd='M'+' L'.join(f'{x:.1f} {y:.1f}' for x,y in pp)
        s=f'<path d="{dd}" fill="none" stroke="#5e4a34" stroke-width="{w+5}" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/><path d="{dd}" fill="none" stroke="#8e7656" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'
        for (x0,z0),(x1,z1) in zip(pts,pts[1:]):
            L=math.dist((x0,z0),(x1,z1)); n=int(L/.22)
            for k in range(n):
                t=(k+.5)/n; X,Y=P(cx,cy,x0+(x1-x0)*t+r.uniform(-.06,.06),z0+(z1-z0)*t+r.uniform(-.06,.06),.006)
                s+=f'<ellipse cx="{X:.1f}" cy="{Y:.1f}" rx="{w*.28:.1f}" ry="{w*.2:.1f}" fill="#a8977e" stroke="#4a3e30" stroke-width=".8"/>'
        return s
    for pts,w in [([(0,1.1),(0,2.2),(.15,3.1),(0,4.6),(-.4,6.4)],18),([(0,-1.1),(.4,-1.9),(.7,-3.1),(.5,-4.5),(.2,-6.4)],15),([(-1.1,.3),(-2.2,.6),(-3.1,.3),(-5.4,.8)],14),([(1.1,.1),(2.3,.4),(3.1,.2),(3.8,-.1),(5.4,.4)],14),([(.8,.9),(1.3,1.5)],10),([(-.8,.9),(-1.4,1.3)],10),([(-1.3,.12),(-1.4,-.4)],10),([(.9,-.7),(1.5,-1.3),(2.6,-1.6)],10)]:
        o.append(lane(pts,w))
    # the plateau: cliff faces first, then the top
    N=72; bnd=[]
    for k in range(N):
        a=k/N*math.tau; rr=blob_r(a); bnd.append((PC[0]+math.cos(a)*rr,PC[1]+math.sin(a)*rr))
    for k in range(N):
        (x0,z0),(x1,z1)=bnd[k],bnd[(k+1)%N]; nz=(x1-x0)
        if nz<0:  # faces the viewer
            b0=Pb(cx,cy,x0,z0,base_h(x0,z0)); b1=Pb(cx,cy,x1,z1,base_h(x1,z1)); t0=Pb(cx,cy,x0,z0,base_h(x0,z0)+PH); t1=Pb(cx,cy,x1,z1,base_h(x1,z1)+PH)
            sh=.75+.25*math.sin(k/N*math.tau+1.2)
            c=tuple(int(v*sh) for v in (128,122,112))
            o.append(f'<path d="M{t0[0]:.1f} {t0[1]:.1f} L{t1[0]:.1f} {t1[1]:.1f} L{b1[0]:.1f} {b1[1]:.1f} L{b0[0]:.1f} {b0[1]:.1f}Z" fill="rgb{c}" stroke="rgb{c}" stroke-width=".8"/>')
            for j in range(1,5):
                ya=t0[1]+(b0[1]-t0[1])*j/5; yb=t1[1]+(b1[1]-t1[1])*j/5
                o.append(f'<path d="M{t0[0]:.1f} {ya:.1f} L{t1[0]:.1f} {yb:.1f}" stroke="#3a3530" stroke-width=".9" opacity=".55"/>')
                if (k+j)%2: o.append(f'<path d="M{(t0[0]+t1[0])/2:.1f} {(ya+yb)/2:.1f} v{(b0[1]-t0[1])/5:.1f}" stroke="#3a3530" stroke-width=".8" opacity=".5"/>')
    top=[Pb(cx,cy,x,z,base_h(x,z)+PH) for x,z in bnd]
    o.append('<path d="M'+' L'.join(f'{x:.1f} {y:.1f}' for x,y in top)+'Z" fill="#5f8a48" stroke="#2c3a20" stroke-width="2"/>')
    for i in range(160):
        a=r.uniform(0,math.tau); rr=r.uniform(0,PR*.95); x,z=PC[0]+math.cos(a)*rr,PC[1]+math.sin(a)*rr
        X,Y=P(cx,cy,x,z); o.append(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="{r.uniform(1,2.4):.1f}" fill="{r.choice(["#7aa852","#4a7a3a","#f2c14e","#e98fb5"])}" opacity=".8"/>')
    # moss and vines hanging over the cliff lip
    for k in range(0,N,2):
        (x0,z0),(x1,z1)=bnd[k],bnd[(k+1)%N]
        if x1-x0<0:
            t=Pb(cx,cy,x0,z0,base_h(x0,z0)+PH)
            o.append(f'<circle cx="{t[0]:.1f}" cy="{t[1]+2:.1f}" r="{r.uniform(4,7):.1f}" fill="{r.choice(LEAFC)}"/>')
            if r.random()<.35: o.append(vine(t[0],t[1]+2,r.uniform(20,44),seed=k))
    return ''.join(o)
def stairs(cx,cy):
    x0,z0=-1.42,-.55; x1,z1=-1.3,.14; o=''; n=8
    for k in range(n):
        t=k/n; x=x0+(x1-x0)*t; z=z0+(z1-z0)*t; h=base_h(x,z)+PH*(1-t)
        X,Y=Pb(cx,cy,x,z,h); w=34
        o+=f'<path d="M{X-w/2:.1f} {Y:.1f} h{w} v{PH*S*HF/n+2:.1f} h{-w}z" fill="#77726c" stroke="#2a2622" stroke-width="1"/><path d="M{X-w/2:.1f} {Y:.1f} h{w} l-2 -5 h{-w+4}z" fill="#a39e95" stroke="#2a2622" stroke-width="1"/>'
    for side in (-1,1):
        a=Pb(cx,cy,x0+side*.2,z0,base_h(x0,z0)+PH); b=Pb(cx,cy,x1+side*.2,z1,base_h(x1,z1))
        o+=f'<path d="M{a[0]:.1f} {a[1]-16:.1f} L{b[0]:.1f} {b[1]-16:.1f}" stroke="#4a2e18" stroke-width="3"/><path d="M{a[0]:.1f} {a[1]:.1f} v-18 M{b[0]:.1f} {b[1]:.1f} v-18" stroke="#4a2e18" stroke-width="3.5"/>'+glowdot(b[0],b[1]-20,'#ffd27a',16,3)
    return o
# ------------- unique buildings -------------
OL='#21150c'
def library(X,Y,w):
    hw=w*.62; o=f'<ellipse cx="{X+6}" cy="{Y+3}" rx="{w*.6}" ry="{w*.2}" fill="#000" opacity=".35"/><circle cx="{X}" cy="{Y-hw}" r="{w*1.1}" fill="url(#eg)"/>'
    o+=f'<path d="M{X-w/2} {Y} V{Y-hw} H{X+w/2} V{Y}Z" fill="#9a948a" stroke="{OL}" stroke-width="1.6"/>'+''.join(f'<path d="M{X-w/2} {Y-hw*k/5} H{X+w/2}" stroke="#5a554e" stroke-width=".9"/>' for k in range(1,5))
    o+=f'<path d="M{X+w*.15} {Y} V{Y-hw} H{X+w/2} V{Y}Z" fill="#000" opacity=".15"/>'
    for wx,wy in [(-w*.24,hw*.55),(w*.24,hw*.55)]:
        o+=glowdot(X+wx,Y-wy,'#ffcf6b',22,0)+f'<path d="M{X+wx-8} {Y-wy+10} v-12 a8 8 0 0 1 16 0 v12z" fill="#ffcf6b" stroke="{OL}" stroke-width="1.4"/><path d="M{X+wx} {Y-wy+10} v-20 M{X+wx-8} {Y-wy} h16" stroke="{OL}" stroke-width="1"/>'
    o+=f'<path d="M{X-7} {Y} v-18 a7 7 0 0 1 14 0 v18z" fill="#3a2414" stroke="{OL}"/>'
    o+=f'<path d="M{X-w/2-8} {Y-hw} Q{X-w/2} {Y-hw-w*.75} {X} {Y-hw-w*.82} Q{X+w/2} {Y-hw-w*.75} {X+w/2+8} {Y-hw} Q{X} {Y-hw+8} {X-w/2-8} {Y-hw}Z" fill="#3f6fb0" stroke="{OL}" stroke-width="1.8"/>'
    o+=''.join(f'<path d="M{X+dx} {Y-hw+4} Q{X+dx*.6} {Y-hw-w*.5} {X} {Y-hw-w*.8}" stroke="#2c4a80" stroke-width="1.4" fill="none"/>' for dx in (-w*.36,-w*.12,w*.12,w*.36))
    o+=f'<circle cx="{X}" cy="{Y-hw-w*.55}" r="11" fill="#ffcf6b" stroke="{OL}" stroke-width="1.6"/><circle cx="{X}" cy="{Y-hw-w*.55}" r="16" fill="url(#eg)"/><path d="M{X} {Y-hw-w*.82} v-14" stroke="{OL}" stroke-width="2"/><circle cx="{X}" cy="{Y-hw-w*.82-16}" r="4" fill="#d9a23a" stroke="{OL}"/>'
    o+=''.join(f'<circle cx="{X+dx}" cy="{Y-hw-dy}" r="{rr}" fill="{c}" opacity=".85"/>' for dx,dy,rr,c in [(-30,10,8,'#5a8a40'),(26,18,7,'#6a9a48'),(-14,30,6,'#4f7a3a')])
    o+=f'<rect x="{X+w/2+4}" y="{Y-22}" width="18" height="6" fill="#c4553b" stroke="{OL}"/><rect x="{X+w/2+6}" y="{Y-16}" width="16" height="6" fill="#2f8f8a" stroke="{OL}"/><rect x="{X+w/2+3}" y="{Y-10}" width="20" height="7" fill="#d9a23a" stroke="{OL}"/>'
    o+=vine(X-w/2+4,Y-hw+2,hw*.8,seed=61)+vine(X+w/2-6,Y-hw+2,hw*.6,seed=62)
    return o
def tavern(X,Y,w):
    hw=w*.3; uw=w*1.12; uh=w*.3; o=f'<ellipse cx="{X+6}" cy="{Y+3}" rx="{w*.7}" ry="{w*.2}" fill="#000" opacity=".35"/><circle cx="{X}" cy="{Y-hw}" r="{w*1.1}" fill="url(#eg)"/>'
    o+=f'<rect x="{X-w/2}" y="{Y-hw}" width="{w}" height="{hw}" fill="#6b4a2e" stroke="{OL}" stroke-width="1.6"/>'+''.join(f'<path d="M{X-w/2+k} {Y-hw} V{Y}" stroke="#4a3020"/>' for k in [w*t/8 for t in range(1,8)])
    o+=f'<rect x="{X-w*.38}" y="{Y-hw*.8}" width="{w*.3}" height="{hw*.55}" rx="3" fill="#ffcf6b" stroke="{OL}" stroke-width="1.4"/><path d="M{X-w*.23} {Y-hw*.8} v{hw*.55} M{X-w*.38} {Y-hw*.52} h{w*.3}" stroke="{OL}" stroke-width="1"/>'
    o+=f'<path d="M{X+w*.12} {Y} v-{hw*.85} h{w*.2} v{hw*.85}z" fill="#3a2414" stroke="{OL}"/>'
    # jettied upper floor
    y2=Y-hw; o+=f'<rect x="{X-uw/2}" y="{y2-uh}" width="{uw}" height="{uh}" fill="#e6d4b0" stroke="{OL}" stroke-width="1.6"/><path d="M{X-uw/2} {y2} H{X+uw/2}" stroke="#4a2e18" stroke-width="5"/>'
    o+=''.join(f'<path d="M{X-uw/2+k*uw/4} {y2-uh} V{y2} M{X-uw/2+k*uw/4} {y2-uh} L{X-uw/2+(k+1)*uw/4} {y2}" stroke="#5a3a1e" stroke-width="3"/>' for k in range(4))+f'<path d="M{X+uw/2} {y2-uh} V{y2}" stroke="#5a3a1e" stroke-width="3"/>'
    o+=f'<circle cx="{X+uw*.25}" cy="{y2-uh*.5}" r="8" fill="#ffcf6b" stroke="{OL}" stroke-width="1.4"/>'+glowdot(X+uw*.25,y2-uh*.5,'#ffcf6b',20,0)
    rt=y2-uh; o+=f'<path d="M{X-uw/2-8} {rt+2} L{X-uw*.3} {rt-w*.5} L{X+uw*.3} {rt-w*.5} L{X+uw/2+8} {rt+2}Z" fill="#4f7a3a" stroke="#1e2e16" stroke-width="1.8"/>'+''.join(f'<path d="M{X-uw/2-6+k*3} {rt-k*w*.1} '+''.join(f'q{(uw+12-k*6)/10:.1f} 4 {(uw+12-k*6)/5:.1f} 0 ' for _ in range(5))+'" fill="none" stroke="#2c4a24" stroke-width="1.2" opacity=".7"/>' for k in range(1,5))
    o+=f'<path d="M{X-uw*.3} {rt-w*.5} H{X+uw*.3}" stroke="#5a3e22" stroke-width="5" stroke-linecap="round"/><rect x="{X-uw*.36}" y="{rt-w*.6}" width="11" height="{w*.25}" fill="#8a8580" stroke="{OL}"/>'+''.join(f'<circle cx="{X-uw*.36+6+k*5}" cy="{rt-w*.66-k*10}" r="{3+k*1.6}" fill="#d9d4cc" opacity="{.4-k*.1:.2f}"/>' for k in range(3))
    # hanging sign with a mug
    o+=f'<path d="M{X+w/2} {y2-4} h20" stroke="{OL}" stroke-width="2.4"/><rect x="{X+w/2+8}" y="{y2-2}" width="26" height="22" rx="3" fill="#d9a23a" stroke="{OL}" stroke-width="1.4"/><path d="M{X+w/2+15} {y2+3} h10 v12 h-10z M{X+w/2+25} {y2+6} q5 0 5 4 q0 4 -5 4" fill="#fff2d0" stroke="{OL}"/>'
    # outdoor table
    tx=X-w*.62; o+=f'<rect x="{tx-18}" y="{Y-6}" width="36" height="8" fill="#7a4a26" stroke="{OL}"/><path d="M{tx-14} {Y+2} v8 M{tx+14} {Y+2} v8" stroke="{OL}" stroke-width="2"/><rect x="{tx-10}" y="{Y-14}" width="6" height="8" fill="#fff2d0" stroke="{OL}"/><rect x="{tx+4}" y="{Y-14}" width="6" height="8" fill="#fff2d0" stroke="{OL}"/>'+glowdot(tx,Y-18,'#ffd27a',14,2.4)
    o+=vine(X-w/2+3,Y-hw,hw*.9,seed=71)
    return o
def townhall(X,Y,w):
    hw=w*.34; o=f'<ellipse cx="{X+6}" cy="{Y+3}" rx="{w*.66}" ry="{w*.2}" fill="#000" opacity=".35"/><circle cx="{X}" cy="{Y-hw}" r="{w}" fill="url(#eg)"/>'
    o+=''.join(f'<ellipse cx="{X-w/2+k*w/7+4}" cy="{Y-2}" rx="{w/14+1}" ry="3.6" fill="#8a8580" stroke="#2a2622" stroke-width=".8"/>' for k in range(7))
    o+=f'<rect x="{X-w/2}" y="{Y-hw-3}" width="{w}" height="{hw}" fill="#d8c8a6" stroke="{OL}" stroke-width="1.6"/>'+''.join(f'<path d="M{X-w/2+k*w/6} {Y-hw-3} V{Y-3}" stroke="#5a3a1e" stroke-width="3"/>' for k in range(7))
    o+=''.join(f'<rect x="{X-w/2+k*w/6+w/12-6}" y="{Y-hw*.8}" width="12" height="13" rx="2" fill="#ffcf6b" stroke="{OL}" stroke-width="1.2"/>' for k in (0,1,4,5))
    o+=f'<path d="M{X-12} {Y-3} v-{hw*.75} a12 10 0 0 1 24 0 v{hw*.75}z" fill="#5a2e1a" stroke="{OL}" stroke-width="1.4"/><path d="M{X} {Y-3} v-{hw*.75+8}" stroke="{OL}"/>'
    rt=Y-hw-3; o+=f'<path d="M{X-w/2-9} {rt+1} L{X-w*.38} {rt-w*.48} L{X+w*.38} {rt-w*.48} L{X+w/2+9} {rt+1}Z" fill="#9a4a32" stroke="{OL}" stroke-width="1.8"/>'+''.join(f'<path d="M{X-w/2-6+k*3} {rt-k*w*.096} H{X+w/2+6-k*3}" stroke="#6a2e1e" stroke-width="1.4"/>' for k in range(1,5))
    o+=''.join(f'<circle cx="{X+dx}" cy="{rt-dy}" r="{rr}" fill="{c}" opacity=".85"/>' for dx,dy,rr,c in [(-w*.3,10,7,'#5a8a40'),(w*.28,22,6,'#6a9a48')])
    # bell cupola
    by=rt-w*.48; o+=f'<rect x="{X-12}" y="{by-26}" width="24" height="26" fill="#d8c8a6" stroke="{OL}" stroke-width="1.4"/><path d="M{X-8} {by-4} v-16 a8 8 0 0 1 16 0 v16" fill="#2a1d14"/><path d="M{X-5} {by-8} q5 -12 10 0z" fill="#d9a23a" stroke="{OL}"/><path d="M{X-17} {by-24} L{X} {by-48} L{X+17} {by-24}Z" fill="#9a4a32" stroke="{OL}" stroke-width="1.4"/><path d="M{X} {by-48} v-12" stroke="{OL}" stroke-width="2"/><path d="M{X} {by-60} l16 4 l-16 5z" fill="#c4553b" stroke="{OL}"/>'
    o+=vine(X-w/2+2,Y-hw-3,hw*.9,seed=81)+vine(X+w/2-3,Y-hw-3,hw*.7,seed=82)
    return o
def mill(X,Y,w):
    hw=w*.42; o=f'<ellipse cx="{X+6}" cy="{Y+3}" rx="{w*.6}" ry="{w*.2}" fill="#000" opacity=".35"/><circle cx="{X}" cy="{Y-hw}" r="{w*.9}" fill="url(#eg)"/>'
    # water wheel on the stream side (east)
    wx=X+w*.62; wy=Y-hw*.45; R=w*.4
    o+=f'<circle cx="{wx}" cy="{wy}" r="{R}" fill="none" stroke="#5a3a1e" stroke-width="6"/><circle cx="{wx}" cy="{wy}" r="{R*.25}" fill="#7a4a26" stroke="{OL}" stroke-width="1.4"/>'+''.join(f'<path d="M{wx} {wy} L{wx+math.cos(k*math.pi/4)*R:.1f} {wy+math.sin(k*math.pi/4)*R:.1f}" stroke="#6b4022" stroke-width="3"/><rect x="{wx+math.cos(k*math.pi/4)*R-5:.1f}" y="{wy+math.sin(k*math.pi/4)*R-5:.1f}" width="10" height="10" fill="#8a5a32" stroke="{OL}" transform="rotate({k*45} {wx+math.cos(k*math.pi/4)*R:.1f} {wy+math.sin(k*math.pi/4)*R:.1f})"/>' for k in range(8))
    o+=f'<path d="M{wx-R} {wy+R*.6} q{R} 12 {R*2} 0" stroke="#bfe8ff" stroke-width="3" fill="none" opacity=".7"/>'
    o+=f'<rect x="{X-w/2}" y="{Y-hw}" width="{w}" height="{hw}" fill="#7a5436" stroke="{OL}" stroke-width="1.6"/>'+''.join(f'<path d="M{X-w/2} {Y-hw+k} H{X+w/2}" stroke="#5a3a20"/>' for k in [hw*t/7 for t in range(1,7)])
    o+=f'<rect x="{X-w*.12}" y="{Y-hw*.85}" width="14" height="14" rx="2" fill="#ffcf6b" stroke="{OL}" stroke-width="1.2"/><path d="M{X-w*.36} {Y} v-{hw*.6} h{w*.2} v{hw*.6}z" fill="#3a2414" stroke="{OL}"/>'
    o+=f'<path d="M{X-w/2-8} {Y-hw+1} L{X} {Y-hw-w*.85} L{X+w/2+8} {Y-hw+1}Z" fill="#4f7a3a" stroke="#1e2e16" stroke-width="1.8"/><path d="M{X} {Y-hw-w*.85} L{X+w/2+8} {Y-hw+1} L{X+w*.1} {Y-hw+1}Z" fill="#000" opacity=".15"/>'+''.join(f'<path d="M{X-w/2-4+k*w*.1:.1f} {Y-hw-k*w*.17:.1f} H{X+w/2+4-k*w*.1:.1f}" stroke="#2c4a24" stroke-width="1.2" opacity=".7"/>' for k in range(1,5))
    o+=f'<path d="M{X-w*.3} {Y+4} q-6 6 -16 4" stroke="#d9c39a" stroke-width="5"/><ellipse cx="{X-w*.55}" cy="{Y-4}" rx="9" ry="7" fill="#e6d4a8" stroke="{OL}"/><ellipse cx="{X-w*.72}" cy="{Y-2}" rx="8" ry="6" fill="#e6d4a8" stroke="{OL}"/>'
    o+=vine(X-w/2+3,Y-hw,hw*.8,seed=91)
    return o
def barn(X,Y,w):
    hw=w*.4; o=f'<ellipse cx="{X+6}" cy="{Y+3}" rx="{w*.66}" ry="{w*.2}" fill="#000" opacity=".35"/><circle cx="{X}" cy="{Y-hw}" r="{w*.8}" fill="url(#eg)"/>'
    o+=f'<rect x="{X-w/2}" y="{Y-hw}" width="{w}" height="{hw}" fill="#8a3a2a" stroke="{OL}" stroke-width="1.6"/>'+''.join(f'<path d="M{X-w/2+k} {Y-hw} V{Y}" stroke="#5a2418"/>' for k in [w*t/9 for t in range(1,9)])
    o+=f'<rect x="{X-w*.2}" y="{Y-hw*.85}" width="{w*.4}" height="{hw*.85}" fill="#6a2a1e" stroke="#f0e2c8" stroke-width="2"/><path d="M{X-w*.2} {Y-hw*.85} L{X+w*.2} {Y} M{X+w*.2} {Y-hw*.85} L{X-w*.2} {Y}" stroke="#f0e2c8" stroke-width="2"/>'
    rt=Y-hw; o+=f'<path d="M{X-w/2-6} {rt+1} L{X-w*.46} {rt-w*.24} L{X-w*.2} {rt-w*.5} L{X+w*.2} {rt-w*.5} L{X+w*.46} {rt-w*.24} L{X+w/2+6} {rt+1}Z" fill="#6a5a3e" stroke="{OL}" stroke-width="1.8"/><path d="M{X-w*.46} {rt-w*.24} H{X+w*.46}" stroke="{OL}" stroke-width="1.2"/>'
    o+=''.join(f'<circle cx="{X+dx}" cy="{rt-dy}" r="{rr}" fill="{c}" opacity=".85"/>' for dx,dy,rr,c in [(-w*.3,8,7,'#5a8a40'),(w*.1,w*.4,6,'#6a9a48')])
    o+=f'<rect x="{X-w*.08}" y="{rt-w*.4}" width="{w*.16}" height="{w*.12}" fill="#ffcf6b" stroke="{OL}"/>'
    for k,(dx,dy) in enumerate([(w*.62,-4),(w*.78,0),(w*.7,-14)]):
        o+=f'<ellipse cx="{X+dx}" cy="{Y+dy}" rx="11" ry="8" fill="#d9b860" stroke="{OL}" stroke-width="1.2"/><path d="M{X+dx-9} {Y+dy} h18" stroke="#a8862e"/>'
    return o
def scarecrow(X,Y):
    return f'<path d="M{X} {Y} v-34 M{X-14} {Y-26} h28" stroke="#5a3a1e" stroke-width="3"/><path d="M{X-10} {Y-26} h20 l-3 14 h-14z" fill="#3f6fb0" stroke="{OL}"/><circle cx="{X}" cy="{Y-36}" r="6" fill="#d9b860" stroke="{OL}"/><path d="M{X-10} {Y-40} h20 l-4 -6 h-12z" fill="#7a4a26" stroke="{OL}"/><circle cx="{X+14}" cy="{Y-30}" r="3" fill="#1a1a1a"/>'
def magetower_ruin(X,Y):
    o=f'<ellipse cx="{X+6}" cy="{Y+3}" rx="40" ry="12" fill="#000" opacity=".35"/>'
    o+=''.join(f'<ellipse cx="{X+dx}" cy="{Y-dy}" rx="{rx}" ry="{rx*.7}" fill="#77726c" stroke="#2a2622" stroke-width="1.2"/>' for dx,dy,rx in [(-28,4,14),(26,2,12),(-6,8,16),(14,10,10)])
    o+=f'<path d="M{X-18} {Y-6} L{X-14} {Y-92} L{X-2} {Y-80} L{X+4} {Y-104} L{X+14} {Y-70} L{X+20} {Y-6}Z" fill="#8a8580" stroke="#2a2622" stroke-width="1.6" transform="rotate(6 {X} {Y})"/>'+''.join(f'<path d="M{X-18} {Y-6-k*14} h38" stroke="#4a4540" stroke-width=".9" transform="rotate(6 {X} {Y})"/>' for k in range(1,6))
    o+=f'<rect x="{X-4}" y="{Y-56}" width="9" height="14" rx="4" fill="#9ff6ff" stroke="#1f5a66" transform="rotate(6 {X} {Y})"/>'
    for dx,dy,s in [(-34,0,1),(30,-2,.8),(-10,-6,.7),(40,6,.6)]:
        o+=f'<circle cx="{X+dx}" cy="{Y+dy-8}" r="{18*s}" fill="url(#cy)"/><path d="M{X+dx} {Y+dy} l{4*s} {-20*s} l{4*s} {20*s}z M{X+dx+5*s} {Y+dy} l{3*s} {-12*s} l{4*s} {12*s}z" fill="#9ff6ff" stroke="#1f5a66" stroke-width="1"/>'
    o+=vine(X-14,Y-88,60,seed=101)
    return o
def shrine(X,Y,lit=False):
    o=f'<ellipse cx="{X}" cy="{Y-2}" rx="44" ry="16" fill="#8a8580" opacity=".35"/>'
    for k in range(6):
        a=k/6*math.tau+.3; x=X+math.cos(a)*38; y=Y+math.sin(a)*13
        tilt=(k%3-1)*8 if not lit else 0
        o+=(f'<circle cx="{x:.0f}" cy="{y-12:.0f}" r="14" fill="url(#vg)"/>' if lit else '')+f'<path d="M{x-5:.0f} {y:.0f} v-20 q5 -6 10 0 v20z" fill="#8a857c" stroke="#2a2622" stroke-width="1.2" transform="rotate({tilt} {x:.0f} {y:.0f})"/><path d="M{x-2:.0f} {y-14:.0f} l2 -4 l2 4 l-2 4z" fill="{"#d3a4ff" if lit else "#5a5650"}"/><circle cx="{x+3:.0f}" cy="{y-4:.0f}" r="4" fill="#4f7a3a"/>'
    o+=f'<rect x="{X-10}" y="{Y-14}" width="20" height="12" fill="#8a857c" stroke="#2a2622"/>'+(glowdot(X,Y-18,'#d3a4ff',22,3) if lit else vine(X-8,Y-14,12,seed=77))
    return o
def pond(X,Y):
    o=f'<ellipse cx="{X}" cy="{Y}" rx="46" ry="26" fill="#5e4a34"/><ellipse cx="{X}" cy="{Y}" rx="42" ry="22" fill="#24406e"/><ellipse cx="{X-10}" cy="{Y-6}" rx="16" ry="5" fill="#7fd6ff" opacity=".3"/>'
    o+=''.join(f'<path d="M{X+dx} {Y+dy} a6 4 0 1 1 1 0z" fill="#4f9a4a" stroke="#2c5a2c"/>' for dx,dy in [(-20,4),(14,-6),(24,8),(-4,10)])+f'<circle cx="{X+16}" cy="{Y-8}" r="3" fill="#ffb3d9"/><circle cx="{X-18}" cy="{Y+2}" r="2.6" fill="#f4ecd8"/>'
    o+=''.join(f'<path d="M{X+dx} {Y-20} q-2 -14 0 -22" stroke="#4f7a3a" stroke-width="2" fill="none"/><ellipse cx="{X+dx}" cy="{Y-42}" rx="2.4" ry="6" fill="#6b4022"/>' for dx in (-40,-34,36,42))
    return o
def laundry(a,b):
    mx=(a[0]+b[0])/2; my=(a[1]+b[1])/2+14
    o=f'<path d="M{a[0]} {a[1]} Q{mx} {my} {b[0]} {b[1]}" stroke="#d9c39a" stroke-width="1.2" fill="none"/>'
    for k,c in enumerate(['#c4553b','#f4ecd8','#3f6fb0','#d9a23a','#7b4a9a']):
        t=(k+1)/6; x=(1-t)**2*a[0]+2*(1-t)*t*mx+t*t*b[0]; y=(1-t)**2*a[1]+2*(1-t)*t*my+t*t*b[1]
        o+=f'<path d="M{x-6:.0f} {y:.0f} h12 l-1 12 h-10z" fill="{c}" stroke="{OL}" stroke-width="1"/>'
    return o
def lumber(X,Y):
    o=f'<ellipse cx="{X+6}" cy="{Y+3}" rx="46" ry="12" fill="#000" opacity=".3"/>'
    o+=f'<path d="M{X-40} {Y} V{Y-34} M{X} {Y} V{Y-44} M{X-44} {Y-32} L{X+4} {Y-46}" stroke="#4a2e18" stroke-width="4"/><path d="M{X-48} {Y-30} L{X+8} {Y-48} L{X+10} {Y-40} L{X-46} {Y-24}Z" fill="#4f7a3a" stroke="#1e2e16" stroke-width="1.4"/>'
    o+=''.join(f'<ellipse cx="{X-34+k*10+(r_%2)*5}" cy="{Y-6-r_*9}" rx="6" ry="6" fill="#8a5a2e" stroke="{OL}"/><circle cx="{X-34+k*10+(r_%2)*5}" cy="{Y-6-r_*9}" r="2.4" fill="#c49a6a"/>' for r_ in range(3) for k in range(4-r_))
    o+=f'<path d="M{X+20} {Y} l8 -16 M{X+40} {Y} l-8 -16 M{X+18} {Y-14} h26" stroke="#5a3a1e" stroke-width="3"/><rect x="{X+14}" y="{Y-22}" width="34" height="8" rx="4" fill="#8a5a2e" stroke="{OL}"/>'
    o+=f'<ellipse cx="{X+58}" cy="{Y-4}" rx="10" ry="6" fill="#7a4a26" stroke="{OL}"/><ellipse cx="{X+58}" cy="{Y-8}" rx="10" ry="5" fill="#c49a6a" stroke="{OL}"/><path d="M{X+56} {Y-8} l6 -16" stroke="#6b4022" stroke-width="2.4"/><path d="M{X+60} {Y-26} l8 2 l-4 6z" fill="#9aa0a6" stroke="{OL}"/>'
    return o
def store(X,Y):
    o=f'<ellipse cx="{X+6}" cy="{Y+3}" rx="34" ry="10" fill="#000" opacity=".3"/><rect x="{X-26}" y="{Y-30}" width="52" height="30" fill="#6b4a2e" stroke="{OL}" stroke-width="1.4"/><path d="M{X-32} {Y-28} L{X-22} {Y-58} L{X+22} {Y-58} L{X+32} {Y-28}Z" fill="#4f7a3a" stroke="#1e2e16" stroke-width="1.6"/><rect x="{X-8}" y="{Y-24}" width="16" height="24" fill="#3a2414" stroke="{OL}"/>'
    o+=f'<rect x="{X+30}" y="{Y-16}" width="16" height="16" fill="#a8743e" stroke="{OL}"/><path d="M{X+30} {Y-16} l16 16 M{X+46} {Y-16} l-16 16" stroke="{OL}" stroke-width=".8"/><ellipse cx="{X-34}" cy="{Y-8}" rx="8" ry="10" fill="#e6d4a8" stroke="{OL}"/>'
    return o
def blacksmith_ruin(X,Y,w):
    o=ruin(X,Y,w,sel=False,seed=6)
    o+=f'<rect x="{X+w*.35}" y="{Y-50}" width="18" height="50" fill="#77726c" stroke="#2a2622" stroke-width="1.2"/>'+''.join(f'<path d="M{X+w*.35} {Y-50+k*10} h18" stroke="#2a2622" stroke-opacity=".5"/>' for k in range(1,5))
    o+=f'<path d="M{X-w*.62} {Y-2} h22 l-4 -6 h4 v-6 h-22 v6 h4z" fill="#3a3a40" stroke="{OL}" stroke-width="1.2"/>'
    return o
def hearth(cx,cy,rx,ry):
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
    for i in range(40):
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
    add(-1.62,-1.48,lambda X,Y:library(X,Y,92),hot='library',hw=58,hh=150)
    items.append((P(cx,g,-1.3,.14)[1]-1,stairs(cx,g)))
    add(-1.45,1.35,lambda X,Y:tavern(X,Y,86),hot='tavern',hw=62,hh=120)
    add(1.2,1.5,lambda X,Y:townhall(X,Y,104),hot='townhall',hw=64,hh=150)
    add(3.0,-1.7,lambda X,Y:mill(X,Y,70),hot='farmstead',hw=70,hh=110)
    add(2.0,.4,lambda X,Y:blacksmith_ruin(X,Y,76),hot='blacksmith',hw=56,hh=80)
    add(-0.95,2.45,lambda X,Y:barn(X,Y,84),hot='farmstead',hw=60,hh=90)
    add(-2.65,.55,lambda X,Y:stump_house(X,Y,62))
    add(1.05,-2.75,lambda X,Y:magetower_ruin(X,Y),hot='magetower',hw=46,hh=110)
    add(1.0,-.8,lambda X,Y:store(X,Y),hot='storehouse',hw=40,hh=60)
    add(1.6,-1.6,lambda X,Y:lumber(X,Y),hot='lumber',hw=56,hh=56)
    add(-.6,-2.1,lambda X,Y:shrine(X,Y),hot='temple',hw=48,hh=40)
    add(2.62,-.55,lambda X,Y:ruin(X,Y,66,seed=7),hot='workshop',hw=44,hh=64)
    add(2.15,1.95,lambda X,Y:pond(X,Y))
    add(-1.95,2.4,lambda X,Y:''.join(f'<path d="M{X-34} {Y-20+k*8} h50" stroke="#5a3e22" stroke-width="5"/><path d="M{X-32} {Y-21+k*8} h46" stroke="#9fd16b" stroke-width="3" stroke-dasharray="4 4"/>' for k in range(3))+scarecrow(X-8,Y-26))
    add(.5,.6,hot='market',hw=26,hh=34,fn=lambda X,Y:f'<path d="M{X-16} {Y} v-16 M{X+16} {Y} v-16" stroke="#4a2e18" stroke-width="2.5"/><path d="M{X-20} {Y-16} q20 -10 40 0 l-4 -8 q-16 -6 -32 0z" fill="#2f6b55" stroke="#21150c" stroke-width="1.2"/><rect x="{X-14}" y="{Y-9}" width="28" height="7" fill="#6b4a2e" stroke="#21150c"/><circle cx="{X-6}" cy="{Y-11}" r="3" fill="#c43d36"/><circle cx="{X+4}" cy="{Y-11}" r="3" fill="#f2c14e"/>'+glowdot(X+18,Y-18,'#9ff6ff',14,2.5))
    add(-.6,.75,lambda X,Y:f'<ellipse cx="{X}" cy="{Y-6}" rx="12" ry="5" fill="#77726c" stroke="#2a2622" stroke-width="1.2"/><path d="M{X-12} {Y-6} v-6 a12 5 0 0 0 24 0 v6" fill="#8a8580" stroke="#2a2622" stroke-width="1.2"/><ellipse cx="{X}" cy="{Y-12}" rx="8" ry="3" fill="#24406e"/><path d="M{X-11} {Y-12} V{Y-28} H{X+11} V{Y-12}" stroke="#4a2e18" stroke-width="2.5" fill="none"/><path d="M{X-15} {Y-28} Q{X} {Y-40} {X+15} {Y-28}Z" fill="#4f7a3a" stroke="#1e2e16"/>')
    add(.5,1.05,lambda X,Y:f'<rect x="{X-16}" y="{Y-8}" width="32" height="6" rx="2" fill="#7a4a26" stroke="#21150c"/><path d="M{X-12} {Y-2} v6 M{X+12} {Y-2} v6" stroke="#21150c" stroke-width="2"/>')
    for x,z,c,carry,face in [(.35,1.0,'#c4553b','lantern',1),(-.45,-.45,'#7b4a9a',None,-1),(1.3,-.15,'#3f6fb0','wood',1),(-1.15,.6,'#2f8f8a','basket',-1),(.2,2.55,'#d9a23a','lantern',1),(-1.05,-.2,'#e98fb5',None,1),(-1.7,-1.0,'#3f6fb0',None,1)]:
        add(x,z,lambda X,Y,c=c,carry=carry,face=face:villager(X,Y,c,carry=carry,face=face))
    add(1.75,2.25,lambda X,Y:f'<path d="M{X-8} {Y} q-2 -10 6 -10 l2 -4 l2 4 l2 -4 l2 4 q4 4 0 10z" fill="#2a2622"/><path d="M{X-8} {Y-2} q-8 -2 -6 -10" stroke="#2a2622" stroke-width="2.5" fill="none"/><circle cx="{X+2}" cy="{Y-8}" r=".9" fill="#ffd27a"/><circle cx="{X+5}" cy="{Y-8}" r=".9" fill="#ffd27a"/>')
    for x,z in [(-.35,2.85),(-.1,2.95),(-.55,2.75)]:
        add(x,z,lambda X,Y:f'<ellipse cx="{X}" cy="{Y-5}" rx="6" ry="5" fill="#f4ecd8" stroke="#21150c"/><circle cx="{X+5}" cy="{Y-10}" r="3" fill="#f4ecd8" stroke="#21150c"/><path d="M{X+7} {Y-10} l3 1 l-3 1z" fill="#e0a93a"/><path d="M{X+4} {Y-13} l1 -2 l1 2z" fill="#c43d36"/>')
    add(0,0,lambda X,Y:H.tower(X,Y),hot='archery',hw=50,hh=270)
    items.sort(key=lambda t:t[0])
    o+=[t[1] for t in items]
    ta=P(cx,g,-1.45,1.35); tb=P(cx,g,-2.65,.55); o.append(laundry((ta[0]-40,ta[1]-60),(tb[0]+20,tb[1]-50)))
    T0=P(cx,g,0,0); top=(T0[0],T0[1]-150)
    for x,z in [(1.2,1.5),(-1.45,1.35),(1.0,-.8),(-.95,2.45)]:
        X,Y=P(cx,g,x,z); o.append(fairy([(top[0]+(-40 if x<0 else 40),top[1]+6),(X,Y-50)]))
    o+=[f'<circle cx="{cx+r.uniform(-rx,rx):.0f}" cy="{cy+r.uniform(-ry,ry):.0f}" r="10" fill="url(#gl)"/>' for _ in range(28)]
    o.append(f'<rect x="{cx-rx}" y="{cy-ry}" width="{2*rx}" height="{2*ry}" fill="#1c1440" opacity=".2"/></g>')
    return ''.join(o)
