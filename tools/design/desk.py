# The desk and the globe terrarium: world inside, lenses for Defence and Village.
import math, random
from geo import *
from cozy import creature_defs, place
W,H=1440,900
GX,GY,GR=660,450,352
LEAF=['#b4492c','#c98a2e','#8a3550','#a8642a','#6f3b5e']
MOSS=['#2f5e34','#41763a','#244c36','#55893e']
LOC=[('home','home',None,(0,0)),('whispering','wilds','Whispering Woods',(-26,-16)),('quarry','wilds','Old Quarry',(30,-8)),('brindlecross','village','Brindlecross',(-10,42)),('chapel','ruins','Sunken Chapel',(-38,22)),('warrens','dungeon','Goblin Warrens',(16,-40)),('trollbridge','ruins','Troll Bridge',(46,26)),('oakmere','village','Oakmere',(54,-36)),('watch','ruins','Fallen Watch',(10,66)),('crypt','dungeon','Moonlit Crypt',(-60,-32)),('crystal','dungeon','Crystal Hollow',(-50,60))]
RIVER=[(30,-98),(36,-50),(40,-20),(46,26),(62,52),(96,78)]
WLAKE=(66,-44,9)
def defs():
    return f'''<defs>{creature_defs()}
<radialGradient id="candle" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffcf7a" stop-opacity=".5"/><stop offset=".35" stop-color="#ff9a4a" stop-opacity=".16"/><stop offset="1" stop-color="#ff9a4a" stop-opacity="0"/></radialGradient>
<radialGradient id="room" cx=".75" cy=".1" r="1.1"><stop offset="0" stop-color="#4a2e22"/><stop offset=".45" stop-color="#2a1a16"/><stop offset="1" stop-color="#0f0a0c"/></radialGradient>
<radialGradient id="warm"><stop offset="0" stop-color="#ffd58a" stop-opacity=".85"/><stop offset=".4" stop-color="#ffb35a" stop-opacity=".25"/><stop offset="1" stop-color="#ffb35a" stop-opacity="0"/></radialGradient>
<radialGradient id="eg"><stop offset="0" stop-color="#ffcf6b" stop-opacity=".4"/><stop offset="1" stop-color="#ffcf6b" stop-opacity="0"/></radialGradient>
<radialGradient id="gl"><stop offset="0" stop-color="#d8ff8a" stop-opacity=".8"/><stop offset="1" stop-color="#b6ff7a" stop-opacity="0"/></radialGradient>
<radialGradient id="vg"><stop offset="0" stop-color="#d3a4ff" stop-opacity=".8"/><stop offset="1" stop-color="#9b5cff" stop-opacity="0"/></radialGradient>
<radialGradient id="cy"><stop offset="0" stop-color="#9ff6ff" stop-opacity=".85"/><stop offset="1" stop-color="#6fe6ff" stop-opacity="0"/></radialGradient>
<radialGradient id="glassedge" cx=".5" cy=".5" r=".5"><stop offset=".86" stop-color="#cfe9ff" stop-opacity="0"/><stop offset=".965" stop-color="#cfe9ff" stop-opacity=".10"/><stop offset="1" stop-color="#0b1420" stop-opacity=".35"/></radialGradient>
<radialGradient id="lensedge" cx=".5" cy=".5" r=".5"><stop offset=".8" stop-color="#000" stop-opacity="0"/><stop offset=".97" stop-color="#0a0a1a" stop-opacity=".28"/><stop offset="1" stop-color="#0a0a1a" stop-opacity=".55"/></radialGradient>
<radialGradient id="caustic"><stop offset="0" stop-color="#ffe2a8" stop-opacity=".32"/><stop offset="1" stop-color="#ffe2a8" stop-opacity="0"/></radialGradient>
<linearGradient id="brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0cf8a"/><stop offset=".35" stop-color="#b8853e"/><stop offset=".6" stop-color="#e2b86e"/><stop offset="1" stop-color="#6e4a1c"/></linearGradient>
<linearGradient id="wood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a1d12"/><stop offset=".45" stop-color="#7a4126"/><stop offset="1" stop-color="#2e160d"/></linearGradient>
<linearGradient id="puddle" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3f58a8"/><stop offset="1" stop-color="#18204a"/></linearGradient>
<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="soft4" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter>
<filter id="lift"><feDropShadow dx="1" dy="2.5" stdDeviation="1.8" flood-color="#0a0608" flood-opacity=".6"/></filter>
<filter id="tex" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .18 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
<symbol id="leaf" viewBox="-10 -5 20 10" overflow="visible"><path d="M-10 0 Q0 -7 10 0 Q0 7 -10 0Z"/><path d="M-9 0 H9" stroke="#000" stroke-opacity=".25" stroke-width=".8"/></symbol>
</defs>'''
def desk():
    r=random.Random(2); o=f'<rect width="{W}" height="{H}" fill="url(#room)"/>'
    for i,x in enumerate(range(-40,W,190)):
        o+=f'<rect x="{x}" y="0" width="190" height="{H}" fill="{["#5a3322","#4e2c1e","#55301f"][i%3]}" opacity=".35"/><path d="M{x} 0 V{H}" stroke="#120806" stroke-width="3" opacity=".7"/>'
        for k in range(9):
            gx=x+r.uniform(10,180); o+=f'<path d="M{gx:.0f} 0 C{gx+r.uniform(-30,30):.0f} 300 {gx+r.uniform(-30,30):.0f} 600 {gx+r.uniform(-20,20):.0f} {H}" stroke="#1a0c08" stroke-width="{r.uniform(.6,1.6):.1f}" fill="none" opacity=".35"/>'
    o+=f'<circle cx="1360" cy="60" r="520" fill="url(#candle)"/>'
    # candle in a brass dish, top-right corner
    o+=f'<g transform="translate(1368 64)"><circle r="54" fill="url(#brass)" opacity=".9"/><circle r="44" fill="#6e4a1c" opacity=".5"/><circle r="30" fill="#efe1c6" stroke="#b39b78" stroke-width="2"/><circle r="5" fill="#2a1a12"/><path d="M0 0 q-7 -16 0 -30 q7 14 0 30z" fill="#ffd27a"/><circle r="70" fill="url(#warm)"/></g>'
    # a few fallen leaves and seeds on the desk
    for lx,ly,rot,c,s in [(150,520,30,'#b4492c',3.0),(1010,860,-20,'#c98a2e',2.6),(230,880,70,'#8a3550',2.2),(1180,520,10,'#a8642a',2.4)]:
        o+=f'<use href="#leaf" x="-10" y="-5" width="20" height="10" fill="{c}" transform="translate({lx} {ly}) rotate({rot}) scale({s})" filter="url(#lift)"/>'
    return o
# ---------- the world inside ----------
def wd(x,z,pts):
    return min(dseg(x,z,pts[i],pts[i+1]) for i in range(len(pts)-1))
def trail(a,b,seed):
    r=random.Random(seed); mx=(a[0]+b[0])/2+r.uniform(-8,8); mz=(a[1]+b[1])/2+r.uniform(-8,8)
    return [a,(mx,mz),b]
TRAILS=[trail((0,0),p,i) for i,(_,k,_,p) in enumerate(LOC) if k!='home']
def wopen(x,z):
    d=min(math.hypot(x-p[0],z-p[1])-(11 if k=='home' else 7) for _,k,_,p in LOC)
    d=min(d,min(wd(x,z,t)-1.6 for t in TRAILS))
    d=min(d,wd(x,z,RIVER)-4.5, math.hypot(x-WLAKE[0],z-WLAKE[1])-WLAKE[2]-2)
    return d
def roofs(X,Y,n,sc,seed,warm=True):
    r=random.Random(seed); o=''; col=['#c4553b','#2f8f8a','#d9a23a','#7b4a9a','#3f6fb0']
    for i in range(n):
        a=i/n*math.tau+r.random()*.3; rr=sc*(5+r.random()*3)
        x=X+math.cos(a)*rr; y=Y+math.sin(a)*rr
        if warm: o+=f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{sc*4:.1f}" fill="url(#eg)"/>'
        o+=f'<rect x="{x-sc*2.2:.1f}" y="{y-sc*1.6:.1f}" width="{sc*4.4:.1f}" height="{sc*3.2:.1f}" fill="{col[i%5]}" stroke="#1d1712" stroke-width=".8" transform="rotate({math.degrees(a):.0f} {x:.1f} {y:.1f})"/>'
    return o
def world(s,cx,cy,clipr,detail=1.0):
    T=lambda x,z:(cx+x*s,cy+z*s); r=random.Random(11)
    o=[f'<clipPath id="wc{clipr}"><circle cx="{cx}" cy="{cy}" r="{clipr}"/></clipPath><g clip-path="url(#wc{clipr})">',f'<circle cx="{cx}" cy="{cy}" r="{clipr}" fill="#2a1d1c"/>']
    for i in range(int(900*detail)):
        x=r.uniform(-100,100); z=r.uniform(-100,100)
        if wopen(x,z)<0: continue
        X,Y=T(x,z); o.append(f'<use href="#leaf" x="-10" y="-5" width="20" height="10" fill="{r.choice(LEAF)}" opacity="{r.uniform(.45,.8):.2f}" transform="translate({X:.0f} {Y:.0f}) rotate({r.uniform(0,360):.0f}) scale({r.uniform(.5,1.0):.2f})"/>')
    # clearings
    for _,k,_,p in LOC:
        X,Y=T(*p); o.append(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="{(11 if k=="home" else 7)*s:.1f}" fill="#4f6e3a"/>')
    for t in TRAILS:
        o.append(f'<path d="{smooth(t,T)}" fill="none" stroke="#a88d68" stroke-width="{2.6*s:.1f}" stroke-linecap="round"/>')
    o.append(f'<path d="{smooth(RIVER,T)}" fill="none" stroke="#5a4636" stroke-width="{9*s+4:.1f}" stroke-linecap="round"/><path d="{smooth(RIVER,T)}" fill="none" stroke="url(#puddle)" stroke-width="{9*s:.1f}" stroke-linecap="round"/><path d="{smooth(RIVER,T)}" fill="none" stroke="#9fb4ff" stroke-width="1.4" stroke-dasharray="6 18" opacity=".6"/>')
    X,Y=T(WLAKE[0],WLAKE[1]); o.append(f'<circle cx="{X}" cy="{Y}" r="{WLAKE[2]*s+3}" fill="#5a4636"/><circle cx="{X}" cy="{Y}" r="{WLAKE[2]*s}" fill="url(#puddle)"/>'+''.join(f'<circle cx="{X+r.uniform(-20,20)*s/3.6:.0f}" cy="{Y+r.uniform(-20,20)*s/3.6:.0f}" r="1" fill="#e9eaff"/>' for _ in range(8)))
    pts=scatter(5,-100,100,-100,100,3.2/detail**.5,lambda x,z: wopen(x,z)>1.2); pts.sort(key=lambda p:p[1])
    for x,z,a,b in pts:
        X,Y=T(x,z)
        if b<.72:
            rad=s*(2.0+a*1.4); c=MOSS[int(a*4)]
            o.append(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="{rad:.1f}" fill="{c}" filter="url(#lift)"/><circle cx="{X-rad*.3:.1f}" cy="{Y-rad*.3:.1f}" r="{rad*.4:.1f}" fill="#8fc45a" opacity=".22"/>')
        elif b<.86 and (x<-60 or z<-60 or x>70):
            rad=s*(2+a*2); o.append(f'<ellipse cx="{X:.1f}" cy="{Y:.1f}" rx="{rad:.1f}" ry="{rad*.8:.1f}" fill="#8a8580" stroke="#3a3530" stroke-width="1" filter="url(#lift)"/><ellipse cx="{X-rad*.3:.1f}" cy="{Y-rad*.3:.1f}" rx="{rad*.35:.1f}" ry="{rad*.25:.1f}" fill="#b9b4ad"/>')
        elif b<.93:
            rad=s*(1+a*.7); red=a<.65
            if not red: o.append(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="{rad*2:.1f}" fill="url(#vg)"/>')
            o.append(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="{rad:.1f}" fill="{"#c43d36" if red else "#7b55c9"}" stroke="#2a0f14" stroke-width=".8" filter="url(#lift)"/>'+(f'<circle cx="{X+rad*.3:.1f}" cy="{Y-rad*.2:.1f}" r="{rad*.2:.1f}" fill="#f6ead2"/>' if red else ''))
    # locations
    for id_,k,n,p in LOC:
        X,Y=T(*p); u=s/3.6*1.7
        if k=='home':
            o.append(f'<circle cx="{X}" cy="{Y}" r="{60*u}" fill="url(#warm)"/><circle cx="{X}" cy="{Y}" r="{9*u}" fill="#9c9893" stroke="#3d3428" stroke-width="1"/>'+roofs(X,Y,8,u*1.4,1)+f'<circle cx="{X}" cy="{Y}" r="{4*u}" fill="#c4553b" stroke="#2c2620"/><circle cx="{X}" cy="{Y}" r="{1.4*u}" fill="#ffe08a"/>')
        elif k=='village': o.append(roofs(X,Y,6,u*1.2,hash(id_)%99))
        elif k=='ruins':
            o.append(''.join(f'<rect x="{X+math.cos(a)*9*u-3*u:.1f}" y="{Y+math.sin(a)*9*u-2*u:.1f}" width="{6*u:.1f}" height="{4*u:.1f}" fill="#9a958d" stroke="#3a3530" stroke-width=".8"/>' for a in [j*.9 for j in range(6)]))
            if id_=='trollbridge': o.append(f'<rect x="{X-16*u}" y="{Y-4*u}" width="{32*u}" height="{8*u}" rx="2" fill="#8a8580" stroke="#3a3530" transform="rotate(-50 {X} {Y})"/>')
        elif k=='dungeon':
            g='cy' if id_=='crystal' else 'vg'
            o.append(f'<circle cx="{X}" cy="{Y}" r="{30*u}" fill="url(#{g})"/><ellipse cx="{X}" cy="{Y}" rx="{7*u}" ry="{5*u}" fill="#0d070a" stroke="#4a2e1e" stroke-width="{2*u:.1f}"/>')
            if id_=='crystal': o.append(''.join(f'<path d="M{X+dx*u} {Y+dy*u} l{2*u} {-8*u} l{2*u} {8*u}z" fill="#9ff6ff" stroke="#1f5a66"/>' for dx,dy in [(-12,-4),(9,-6),(11,6),(-10,8)]))
        elif id_=='quarry': o.append(f'<rect x="{X-9*u}" y="{Y-7*u}" width="{18*u}" height="{14*u}" fill="#b8ab92" stroke="#5a4e3c" stroke-width="1.2"/><path d="M{X-9*u} {Y} h{18*u} M{X} {Y-7*u} v{14*u}" stroke="#7a6e5a"/>')
        else:  # whispering woods: standing stones
            o.append(''.join(f'<rect x="{X+math.cos(a)*7*u-1.5*u:.1f}" y="{Y+math.sin(a)*7*u-1.5*u:.1f}" width="{3*u:.1f}" height="{3*u:.1f}" fill="#c9c4bb" stroke="#3a3530"/>' for a in [j*math.tau/7 for j in range(7)]))
    o.append(f'<circle cx="{cx}" cy="{cy}" r="{clipr}" fill="#1c1440" opacity=".22"/>')
    for id_,k,n,p in LOC:
        if k in ('home','village'):
            X,Y=T(*p); o.append(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="{(30 if k=="home" else 20)*s/3.6}" fill="url(#warm)"/>')
    o+= [f'<circle cx="{cx+r.uniform(-clipr,clipr):.0f}" cy="{cy+r.uniform(-clipr,clipr):.0f}" r="6" fill="url(#gl)"/>' for _ in range(28)]
    o.append('</g>'); return ''.join(o)
def glass(cx,cy,R):
    return (f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="url(#glassedge)"/>'
     f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="none" stroke="#eef8ff" stroke-opacity=".55" stroke-width="1.6"/>'
     f'<circle cx="{cx}" cy="{cy}" r="{R-7}" fill="none" stroke="#eef8ff" stroke-opacity=".12" stroke-width="1"/>'
     f'<path d="M{cx-R*.9:.0f} {cy-R*.12:.0f} A{R*.93:.0f} {R*.93:.0f} 0 0 1 {cx-R*.35:.0f} {cy-R*.84:.0f}" fill="none" stroke="#fff" stroke-opacity=".42" stroke-width="5" stroke-linecap="round"/>'
     f'<path d="M{cx-R*.82:.0f} {cy-R*.02:.0f} A{R*.86:.0f} {R*.86:.0f} 0 0 1 {cx-R*.74:.0f} {cy-R*.36:.0f}" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2.5" stroke-linecap="round"/>'
     f'<ellipse cx="{cx+R*.55:.0f}" cy="{cy-R*.6:.0f}" rx="18" ry="9" fill="#ffd9a0" opacity=".55" transform="rotate(40 {cx+R*.55:.0f} {cy-R*.6:.0f})"/><circle cx="{cx+R*.62:.0f}" cy="{cy-R*.52:.0f}" r="3" fill="#fff" opacity=".8"/>'
     f'<path d="M{cx+R*.5:.0f} {cy+R*.78:.0f} A{R*.93:.0f} {R*.93:.0f} 0 0 0 {cx+R*.84:.0f} {cy+R*.42:.0f}" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="3" stroke-linecap="round"/>')
def globe(dim=0):
    o=f'<ellipse cx="{GX-60}" cy="{GY+70}" rx="{GR*.55}" ry="{GR*.45}" fill="url(#caustic)"/>'
    o+=f'<circle cx="{GX+26}" cy="{GY+34}" r="{GR+6}" fill="#000" opacity=".55" filter="url(#soft)"/>'
    o+=world(3.62,GX,GY,GR-3)
    if dim: o+=f'<circle cx="{GX}" cy="{GY}" r="{GR}" fill="#120c1c" opacity="{dim}"/>'
    o+=glass(GX,GY,GR)
    return o
# ---------- defence map (forest floor colours) ----------
def defence_map(s,cx,cy,clipr,night=False,battle=False):
    T=lambda x,z:(cx+x*s,cy+z*s); r=random.Random(3)
    o=[f'<clipPath id="dc{clipr}"><circle cx="{cx}" cy="{cy}" r="{clipr}"/></clipPath><g clip-path="url(#dc{clipr})">',f'<circle cx="{cx}" cy="{cy}" r="{clipr}" fill="#2a1d1c"/>']
    for i in range(800):
        x=r.uniform(-28,28); z=r.uniform(-28,28)
        if openness(x,z)<.1: continue
        X,Y=T(x,z); o.append(f'<use href="#leaf" x="-10" y="-5" width="20" height="10" fill="{r.choice(LEAF)}" opacity="{r.uniform(.5,.85):.2f}" transform="translate({X:.0f} {Y:.0f}) rotate({r.uniform(0,360):.0f}) scale({r.uniform(.7,1.6):.2f})"/>')
    for nm,w,pts in PATHS:
        d=smooth(pts,T); o.append(f'<path d="{d}" fill="none" stroke="#7a6248" stroke-width="{w*s*.9+5:.1f}" stroke-linecap="round" stroke-linejoin="round"/><path d="{d}" fill="none" stroke="#a88d68" stroke-width="{w*s*.9:.1f}" stroke-linecap="round" stroke-linejoin="round"/>')
    o.append(f'<circle cx="{cx}" cy="{cy}" r="{CLEAR*s+5}" fill="#a88d68"/><circle cx="{cx}" cy="{cy}" r="{CLEAR*s-5}" fill="#4f6e3a"/>')
    for i in range(400):
        x=r.uniform(-24,24); z=r.uniform(-24,24)
        if openness(x,z)<-.1: X,Y=T(x,z); o.append(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="{r.uniform(.8,2):.1f}" fill="{r.choice(["#d9c39a","#8e7656","#c2a77d"])}"/>')
    X,Y=T(LAKE[0],LAKE[1]); o.append(f'<ellipse cx="{X}" cy="{Y}" rx="{LAKE[2]*s+3}" ry="{LAKE[2]*s*.8+3}" fill="#5a4636"/><ellipse cx="{X}" cy="{Y}" rx="{LAKE[2]*s}" ry="{LAKE[2]*s*.8}" fill="url(#puddle)"/>'+''.join(f'<circle cx="{X+r.uniform(-26,26):.0f}" cy="{Y+r.uniform(-18,18):.0f}" r="1" fill="#e9eaff"/>' for _ in range(10)))
    pts=scatter(41,-28,28,-28,28,1.2,lambda x,z: openness(x,z)>.45 and not inlake(x,z,1)); pts.sort(key=lambda p:p[1])
    for x,z,a,b in pts:
        X,Y=T(x,z)
        if b<.66:
            rad=s*(.6+a*.45); c=MOSS[int(a*4)]
            o.append(f'<g filter="url(#lift)"><circle cx="{X:.1f}" cy="{Y:.1f}" r="{rad:.1f}" fill="{c}"/>'+''.join(f'<circle cx="{X+math.cos(k*1.3+a*5)*rad*.55:.1f}" cy="{Y+math.sin(k*1.3+a*5)*rad*.55:.1f}" r="{rad*.33:.1f}" fill="#8fc45a" opacity=".22"/>' for k in range(4))+'</g>')
        elif b<.86:
            rad=s*(.3+a*.2); ang=a*6
            o.append(f'<g filter="url(#lift)" fill="#4f9a4a" stroke="#2c5a2c" stroke-width="1">'+''.join(f'<path d="M{X:.1f} {Y:.1f} q{math.cos(ang+k*2.09-0.6)*rad*2:.1f} {math.sin(ang+k*2.09-0.6)*rad*2:.1f} {math.cos(ang+k*2.09)*rad*2:.1f} {math.sin(ang+k*2.09)*rad*2:.1f} q{-math.cos(ang+k*2.09+0.6)*rad*.9:.1f} {-math.sin(ang+k*2.09+0.6)*rad*.9:.1f} {-math.cos(ang+k*2.09)*rad*2:.1f} {-math.sin(ang+k*2.09)*rad*2:.1f}z"/>' for k in range(3))+'</g>')
        elif b<.92:
            rad=s*(.45+a*.4); red=a<.7
            if not red: o.append(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="{rad*1.8:.1f}" fill="url(#vg)"/>')
            o.append(f'<g filter="url(#lift)"><circle cx="{X:.1f}" cy="{Y:.1f}" r="{rad:.1f}" fill="{"#c43d36" if red else "#7b55c9"}" stroke="#2a0f14" stroke-width="1.2"/>'+(''.join(f'<circle cx="{X+math.cos(k*2.1+a)*rad*.5:.1f}" cy="{Y+math.sin(k*2.1+a)*rad*.5:.1f}" r="{rad*.16:.1f}" fill="#f6ead2"/>' for k in range(3)) if red else '')+'</g>')
        else:
            o.append(f'<g filter="url(#lift)"><ellipse cx="{X:.1f}" cy="{Y:.1f}" rx="{s*.5:.1f}" ry="{s*.42:.1f}" fill="#8a6a3e" stroke="#3a2614" stroke-width="1.2"/><path d="M{X-s*.4:.1f} {Y-2:.1f} h{s*.8:.1f}" stroke="#5a3e22" stroke-width="1.4"/></g>')
    R=WALL*s
    o.append(f'<g filter="url(#lift)"><ellipse cx="{cx}" cy="{cy}" rx="{R+12}" ry="{R+10}" fill="#9c9893"/></g>')
    col=['#c4553b','#2f8f8a','#d9a23a','#7b4a9a','#3f6fb0']
    for i,(deg,rr,n) in enumerate(BUILD):
        x,z=bpos(deg,rr); X,Y=T(x,z); a=math.degrees(math.atan2(z,x))+90
        o.append(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="13" fill="url(#eg)"/><g transform="translate({X:.1f} {Y:.1f}) rotate({a:.0f})" filter="url(#lift)"><rect x="-6.5" y="-4.5" width="13" height="9" rx="1" fill="{col[i%5]}" stroke="#1d1712" stroke-width="1.1"/><path d="M-6.5 0 h13" stroke="#1d1712"/></g>')
    o.append(''.join(f'<circle cx="{cx+math.cos(t)*R:.1f}" cy="{cy+math.sin(t)*R:.1f}" r="2.4" fill="#5a3e22"/>' for t in [k*math.tau/40 for k in range(40)]))
    o.append(f'<circle cx="{cx}" cy="{cy}" r="70" fill="url(#warm)"/><g filter="url(#lift)"><circle cx="{cx}" cy="{cy}" r="13" fill="#b9b3aa" stroke="#2c2620" stroke-width="1.5"/><circle cx="{cx}" cy="{cy}" r="8.5" fill="#c4553b" stroke="#2c2620" stroke-width="1.3"/><circle cx="{cx}" cy="{cy}" r="3" fill="#ffe08a"/></g>')
    for name,(x,z),act in SPAWNS:
        X,Y=T(x,z)
        if act: o.append(f'<circle cx="{X}" cy="{Y}" r="40" fill="url(#vg)"/>')
        o.append(f'<path d="M{X-20} {Y-6} q9 -13 20 -7 q13 -6 20 7" stroke="#4a2e1e" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="{X}" cy="{Y+2}" rx="12" ry="8" fill="#0d070a"/>')
    if not battle:
        for nm in ('north','west'):
            pp=[p for p in PATHS if p[0]==nm][0][2]
            o+=[f'<circle cx="{T(x,z)[0]:.1f}" cy="{T(x,z)[1]:.1f}" r="2" fill="#ffe08a" opacity=".9"/>' for x,z,_ in enemies_on(pp,[i/34 for i in range(34)])]
    if night: o.append(f'<circle cx="{cx}" cy="{cy}" r="{clipr}" fill="#1a1450" opacity=".3"/><circle cx="{cx}" cy="{cy}" r="60" fill="url(#eg)"/>')
    else: o.append(f'<circle cx="{cx}" cy="{cy}" r="{clipr}" fill="#1c1440" opacity=".14"/>')
    if battle:
        o.append(f'<circle cx="{cx}" cy="{cy}" r="{8.5*s}" fill="none" stroke="#ffd27a" stroke-opacity=".5" stroke-width="1.5" stroke-dasharray="2 6" stroke-linecap="round"/>')
        ens=[]
        for nm,ts,sym in (('north',[.42,.5,.57,.66,.74],'gob'),('west',[.5,.62],'wolf'),('west',[.78],'gob'),('kings',[.8],'gob')):
            pp=[p for p in PATHS if p[0]==nm][0][2]
            for x,z,h in enemies_on(pp,ts): ens.append((x,z,h,sym))
        for x,z,h,sym in ens:
            X,Y=T(x,z); o.append(f'<circle cx="{X:.1f}" cy="{Y-6:.1f}" r="16" fill="url(#eg)"/>'+place(sym,X,Y,1.15,*((28,28) if sym=='gob' else (36,22)),flip=math.sin(h)<0))
            if (x+z)%3<1.2: o.append(f'<rect x="{X-12:.1f}" y="{Y-38:.1f}" width="24" height="4" rx="2" fill="#2a1414"/><rect x="{X-12:.1f}" y="{Y-38:.1f}" width="{10+abs(x)%12:.1f}" height="4" rx="2" fill="#e0603e"/>')
        for x,z,_,_ in ens[:5]:
            X,Y=T(x,z); a=math.atan2(Y-cy,X-cx); k=.62
            o.append(f'<path d="M{cx+(X-cx)*k:.1f} {cy+(Y-cy)*k:.1f} l{math.cos(a)*14:.1f} {math.sin(a)*14:.1f}" stroke="#f3e2bf" stroke-width="2" stroke-linecap="round"/>')
        o.append(''.join(f'<circle cx="{T(x,z)[0]+r.uniform(-8,8):.0f}" cy="{T(x,z)[1]+r.uniform(-14,0):.0f}" r="2" fill="#ffd27a"/>' for x,z,_,_ in ens[:4]))
    elif not night:
        pass
    else:
        for nm,ts,sym in (('north',[.14,.21,.28,.36,.47],'gob'),('west',[.3,.42],'wolf')):
            pp=[p for p in PATHS if p[0]==nm][0][2]
            for x,z,h in enemies_on(pp,ts):
                X,Y=T(x,z); o.append(f'<circle cx="{X:.1f}" cy="{Y-6:.1f}" r="16" fill="url(#eg)"/>'+place(sym,X,Y,1.15,*((28,28) if sym=='gob' else (36,22)),flip=math.sin(h)<0))
    o+= [f'<circle cx="{cx+r.uniform(-clipr,clipr):.0f}" cy="{cy+r.uniform(-clipr,clipr):.0f}" r="7" fill="url(#gl)"/>' for _ in range(22)]
    o.append('</g>'); return ''.join(o)
def lens(cx,cy,R,handle_to=None,ring=16):
    o=f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="url(#lensedge)"/>'
    o+=f'<circle cx="{cx}" cy="{cy}" r="{R-2}" fill="none" stroke="#ff7a7a" stroke-opacity=".18" stroke-width="2"/><circle cx="{cx}" cy="{cy}" r="{R-5}" fill="none" stroke="#7ad8ff" stroke-opacity=".14" stroke-width="2"/>'
    o+=f'<path d="M{cx-R*.86:.0f} {cy-R*.2:.0f} A{R*.9:.0f} {R*.9:.0f} 0 0 1 {cx-R*.25:.0f} {cy-R*.86:.0f}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="6" stroke-linecap="round"/>'
    o+=f'<ellipse cx="{cx+R*.45:.0f}" cy="{cy-R*.55:.0f}" rx="{R*.12:.0f}" ry="{R*.05:.0f}" fill="#fff" opacity=".22" transform="rotate(40 {cx+R*.45:.0f} {cy-R*.55:.0f})"/>'
    o+=f'<circle cx="{cx}" cy="{cy}" r="{R+ring/2}" fill="none" stroke="url(#brass)" stroke-width="{ring}"/><circle cx="{cx}" cy="{cy}" r="{R+ring}" fill="none" stroke="#3a2410" stroke-width="1.5"/><circle cx="{cx}" cy="{cy}" r="{R}" fill="none" stroke="#3a2410" stroke-width="1.5"/>'
    return o
def lens_shadow(cx,cy,R,ring=16):
    return f'<circle cx="{cx+22}" cy="{cy+30}" r="{R+ring}" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="{ring+10}" filter="url(#soft4)"/>'
def handle(cx,cy,R,ang,length=230):
    a=math.radians(ang); x0=cx+math.cos(a)*(R+14); y0=cy+math.sin(a)*(R+14); deg=ang-90
    sh=f'<g transform="translate({x0+20:.0f} {y0+26:.0f}) rotate({deg})" opacity=".5" filter="url(#soft4)"><rect x="-17" y="0" width="34" height="{length+40}" rx="16" fill="#000"/></g>'
    return sh+f'''<g transform="translate({x0:.0f} {y0:.0f}) rotate({deg})"><rect x="-11" y="-4" width="22" height="34" fill="url(#brass)" stroke="#3a2410"/><rect x="-15" y="30" width="30" height="12" rx="3" fill="url(#brass)" stroke="#3a2410"/><rect x="-16" y="42" width="32" height="{length}" rx="15" fill="url(#wood)" stroke="#1e0e07" stroke-width="1.5"/><path d="M-6 60 V{length+20}" stroke="#a8643a" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/><circle cx="0" cy="{length+30}" r="5" fill="url(#brass)"/></g>'''
# ---------- village close-up ----------
def village_map(cx,cy,clipr,sel='Blacksmith'):
    s=100; T=lambda x,z:(cx+x*s,cy+z*s); r=random.Random(8)
    o=[f'<clipPath id="vc"><circle cx="{cx}" cy="{cy}" r="{clipr}"/></clipPath><g clip-path="url(#vc)">',f'<circle cx="{cx}" cy="{cy}" r="{clipr}" fill="#4f6e3a"/>']
    for i in range(1200):
        x=r.uniform(-4,4); z=r.uniform(-4,4); X,Y=T(x,z)
        o.append(f'<path d="M{X:.0f} {Y:.0f} l{r.uniform(-2,2):.1f} -5" stroke="{r.choice(["#6a8d48","#3e5a2e","#7a9a52"])}" stroke-width="1.4" stroke-linecap="round"/>')
    # paths out of the clearing (north and south roads) and inner lanes
    for nm in ('north','south','west','east','kings','bog'):
        pp=[p for p in PATHS if p[0]==nm][0][2]; e=pp[-1]; d=math.hypot(*e); u=(e[0]/d,e[1]/d)
        o.append(f'<path d="M{cx+u[0]*WALL*s:.0f} {cy+u[1]*WALL*s:.0f} L{cx+u[0]*500:.0f} {cy+u[1]*500:.0f}" stroke="#a88d68" stroke-width="60" stroke-linecap="round"/>')
    # forest edge outside walls
    pts=scatter(3,-4.5,4.5,-4.5,4.5,.33,lambda x,z: math.hypot(x,z)>WALL+.45 and openness(x,z)>-1.2+0*x and min(dpath(x,z,p) for p in PATHS)>.9)
    for x,z,a,b in pts:
        if math.hypot(x,z)<WALL+.75 and b<.6: continue
        X,Y=T(x,z); rad=24+a*20
        o.append(f'<g filter="url(#lift)"><circle cx="{X:.0f}" cy="{Y:.0f}" r="{rad:.0f}" fill="{MOSS[int(a*4)]}"/><circle cx="{X-rad*.3:.0f}" cy="{Y-rad*.3:.0f}" r="{rad*.4:.0f}" fill="#8fc45a" opacity=".22"/></g>')
        if b>.9: o.append(f'<circle cx="{X+rad*.6:.0f}" cy="{Y+rad*.5:.0f}" r="9" fill="#c43d36" stroke="#2a0f14" stroke-width="1.2"/><circle cx="{X+rad*.6+3:.0f}" cy="{Y+rad*.5-2:.0f}" r="2" fill="#f6ead2"/>')
    R=WALL*s
    o.append(f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="#5d7f43"/>')
    for i in range(500):
        a=r.uniform(0,math.tau); rr=r.uniform(0,R); X=cx+math.cos(a)*rr; Y=cy+math.sin(a)*rr
        o.append(f'<path d="M{X:.0f} {Y:.0f} l{r.uniform(-2,2):.1f} -5" stroke="{r.choice(["#7a9a52","#4a6a34"])}" stroke-width="1.3"/>')
    # lanes and plaza
    for deg,rr,n in BUILD:
        x,z=bpos(deg,rr); X,Y=T(x,z)
        o.append(f'<path d="M{cx} {cy} L{X:.0f} {Y:.0f}" stroke="#b39a73" stroke-width="16" stroke-linecap="round"/>')
    o.append(f'<path d="M{cx} {cy} L{cx} {cy+R+10}" stroke="#b39a73" stroke-width="26"/>')
    o.append(f'<circle cx="{cx}" cy="{cy}" r="78" fill="#b39a73"/>'+''.join(f'<rect x="{cx+math.cos(a)*rr-5:.0f}" y="{cy+math.sin(a)*rr-4:.0f}" width="10" height="8" rx="2" fill="{r.choice(["#c9b48f","#a58e6a","#bda780"])}" transform="rotate({math.degrees(a):.0f} {cx+math.cos(a)*rr:.0f} {cy+math.sin(a)*rr:.0f})"/>' for rr in (56,68) for a in [k*math.tau/(28 if rr==56 else 34) for k in range(28 if rr==56 else 34)]))
    # flowers
    for i in range(90):
        a=r.uniform(0,math.tau); rr=r.uniform(110,R-30); X=cx+math.cos(a)*rr; Y=cy+math.sin(a)*rr
        o.append(f'<circle cx="{X:.0f}" cy="{Y:.0f}" r="2.6" fill="{r.choice(["#f2c14e","#e98fb5","#f4ecd8","#9fb7ff"])}"/>')
    # buildings
    col=['#c4553b','#2f8f8a','#d9a23a','#7b4a9a','#3f6fb0']
    ruins={'Blacksmith','Workshop','Library','Quarry','Mine','Mage Tower','Temple','Storehouse','Tavern'}
    for i,(deg,rr,n) in enumerate(BUILD):
        x,z=bpos(deg,rr); X,Y=T(x,z); a=math.degrees(math.atan2(z,x))+90
        if n in ruins:
            o.append(f'<g transform="translate({X:.0f} {Y:.0f}) rotate({a:.0f})" filter="url(#lift)"><rect x="-30" y="-20" width="60" height="40" fill="#8a857c"/><rect x="-26" y="-16" width="52" height="32" fill="#5d7f43"/><rect x="-30" y="-20" width="24" height="8" fill="#a39e95"/><rect x="10" y="10" width="20" height="10" fill="#a39e95"/><circle cx="-8" cy="4" r="8" fill="#41763a"/><circle cx="12" cy="-6" r="6" fill="#55893e"/><path d="M-30 -20 l14 22 M18 -20 l-6 18" stroke="#5a4636" stroke-width="3"/></g>')
        else:
            c=col[i%5]
            o.append(f'<circle cx="{X:.0f}" cy="{Y:.0f}" r="56" fill="url(#eg)"/><g transform="translate({X:.0f} {Y:.0f}) rotate({a:.0f})" filter="url(#lift)"><rect x="-32" y="-22" width="64" height="44" fill="{c}" stroke="#1d1712" stroke-width="2"/><rect x="-32" y="0" width="64" height="22" fill="#000" opacity=".22"/><path d="M-32 0 H32" stroke="#1d1712" stroke-width="2"/>'+''.join(f'<path d="M-32 {k} H32" stroke="#000" stroke-opacity=".18"/>' for k in (-14,-7,7,14))+f'<rect x="14" y="-30" width="9" height="12" fill="#6b5a4a" stroke="#1d1712" stroke-width="1.5"/></g>')
            if n=='Farmstead':
                o.append(''.join(f'<rect x="{X+dx}" y="{Y+dy}" width="44" height="12" fill="#8a6a3e" stroke="#5a3e22"/><path d="M{X+dx+4} {Y+dy+6} h36" stroke="#9fd16b" stroke-width="3" stroke-dasharray="3 3"/>' for dx,dy in [(-90,-30),(-90,-12)]))
        if n==sel:
            o.append(f'<circle cx="{X:.0f}" cy="{Y:.0f}" r="50" fill="none" stroke="#ffe08a" stroke-width="3" stroke-dasharray="10 7"/>')
    # palisade logs
    n=120
    o.append(''.join(f'<circle cx="{cx+math.cos(k/n*math.tau)*R:.1f}" cy="{cy+math.sin(k/n*math.tau)*R:.1f}" r="8.5" fill="#7a5a3a" stroke="#2c1d10" stroke-width="1.4"/><circle cx="{cx+math.cos(k/n*math.tau)*R:.1f}" cy="{cy+math.sin(k/n*math.tau)*R:.1f}" r="4" fill="#a07a4e"/>' for k in range(n) if not (28<k<32)))
    o.append(f'<g filter="url(#lift)"><rect x="{cx-30}" y="{cy+R-16}" width="18" height="30" fill="#6b4a2e" stroke="#2c1d10" stroke-width="1.5"/><rect x="{cx+12}" y="{cy+R-16}" width="18" height="30" fill="#6b4a2e" stroke="#2c1d10" stroke-width="1.5"/></g>')
    # tower from above
    o.append(f'<circle cx="{cx}" cy="{cy}" r="150" fill="url(#warm)"/><g filter="url(#lift)"><circle cx="{cx}" cy="{cy}" r="54" fill="#9c9893" stroke="#2c2620" stroke-width="2.5"/>'+''.join(f'<rect x="{cx+math.cos(k/16*math.tau)*50-5:.1f}" y="{cy+math.sin(k/16*math.tau)*50-5:.1f}" width="10" height="10" fill="#b9b3aa" stroke="#2c2620" stroke-width="1.2" transform="rotate({k*22.5} {cx+math.cos(k/16*math.tau)*50:.1f} {cy+math.sin(k/16*math.tau)*50:.1f})"/>' for k in range(16))+f'<circle cx="{cx}" cy="{cy}" r="40" fill="#c4553b" stroke="#2c2620" stroke-width="2"/>'+''.join(f'<path d="M{cx} {cy} L{cx+math.cos(k/12*math.tau)*40:.1f} {cy+math.sin(k/12*math.tau)*40:.1f}" stroke="#7a2a1c" stroke-width="1.5"/>' for k in range(12))+f'<path d="M{cx} {cy} L{cx+40} {cy} A40 40 0 0 1 {cx} {cy+40}Z" fill="#000" opacity=".18"/><circle cx="{cx}" cy="{cy}" r="4" fill="#d9a23a"/><path d="M{cx} {cy} l26 -6 l-4 12z" fill="#d9a23a" stroke="#5a3b10"/></g>')
    # archers on the walk
    for k in range(4):
        a=k/4*math.tau+.4; X=cx+math.cos(a)*47; Y=cy+math.sin(a)*47
        o.append(f'<circle cx="{X:.0f}" cy="{Y:.0f}" r="5" fill="#3f6fb0" stroke="#1d1712"/>')
    # villagers
    for k,(x,y,c) in enumerate([(-120,60,'#c4553b'),(90,110,'#d9a23a'),(140,-60,'#2f8f8a'),(-60,-150,'#7b4a9a'),(30,190,'#3f6fb0'),(-170,-40,'#e98fb5')]):
        X=cx+x; Y=cy+y; o.append(f'<g filter="url(#lift)"><ellipse cx="{X}" cy="{Y}" rx="9" ry="7" fill="{c}" stroke="#1d1712" stroke-width="1.3"/><circle cx="{X}" cy="{Y-1}" r="4.5" fill="#e8c7a8" stroke="#1d1712" stroke-width="1"/></g>')
    o.append(f'<circle cx="{cx}" cy="{cy}" r="{clipr}" fill="#2a1a40" opacity=".12"/>')
    o+= [f'<circle cx="{cx+r.uniform(-clipr,clipr):.0f}" cy="{cy+r.uniform(-clipr,clipr):.0f}" r="9" fill="url(#gl)"/>' for _ in range(16)]
    o.append('</g>'); return ''.join(o)
def stand(cx,cy,R):
    # articulated arm of a desk magnifier, clamped off the top edge
    pts=[(cx+math.cos(-.75)*(R+22),cy+math.sin(-.75)*(R+22)),(1110,150),(1200,-30)]
    sh=''.join(f'<path d="M{pts[i][0]+20:.0f} {pts[i][1]+28:.0f} L{pts[i+1][0]+20:.0f} {pts[i+1][1]+28:.0f}" stroke="#000" stroke-opacity=".45" stroke-width="22" stroke-linecap="round" filter="url(#soft4)"/>' for i in range(2))
    arm=''.join(f'<path d="M{pts[i][0]:.0f} {pts[i][1]:.0f} L{pts[i+1][0]:.0f} {pts[i+1][1]:.0f}" stroke="#2a1a0c" stroke-width="20" stroke-linecap="round"/><path d="M{pts[i][0]:.0f} {pts[i][1]:.0f} L{pts[i+1][0]:.0f} {pts[i+1][1]:.0f}" stroke="url(#brass)" stroke-width="14" stroke-linecap="round"/>' for i in range(2))
    joint=''.join(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="15" fill="url(#brass)" stroke="#3a2410" stroke-width="2"/><circle cx="{x:.0f}" cy="{y:.0f}" r="5" fill="#3a2410"/>' for x,y in pts[:2])
    return sh+arm+joint
def svg(body): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'+defs()+body+f'<rect width="{W}" height="{H}" filter="url(#tex)"/></svg>'
def vign(a=.55): return f'<radialGradient id="vv" cx=".46" cy=".5" r=".75"><stop offset=".5" stop-color="#07050a" stop-opacity="0"/><stop offset="1" stop-color="#07050a" stop-opacity="{a}"/></radialGradient><rect width="{W}" height="{H}" fill="url(#vv)"/>'
if __name__=='__main__':
    # scenes
    LX,LY,LR=640,440,300
    scenes={}
    scenes['world']=svg(desk()+globe()+vign())
    scenes['defence']=svg(desk()+globe(dim=.25)+lens_shadow(LX,LY,LR)+handle(LX,LY,LR,128)+defence_map(12.2,LX,LY,LR)+lens(LX,LY,LR)+vign())
    scenes['night']=svg(desk()+globe(dim=.45)+lens_shadow(LX,LY,LR)+handle(LX,LY,LR,128)+defence_map(12.2,LX,LY,LR,night=True,battle=True)+lens(LX,LY,LR)+f'<rect width="{W}" height="{H}" fill="#140f3a" opacity=".28"/>'+vign(.7))
    VX,VY,VR=650,450,372
    village_scene=desk()+globe(dim=.3)+stand(VX,VY,VR)+lens_shadow(VX,VY,VR,22)+village_map(VX,VY,VR)+lens(VX,VY,VR,ring=22)+''.join(f'<circle cx="{VX+math.cos(a)*(VR+11):.1f}" cy="{VY+math.sin(a)*(VR+11):.1f}" r="3.5" fill="#3a2410"/>' for a in [k*math.tau/8+.2 for k in range(8)])+vign()
    scenes['village']=svg(village_scene)
    scenes['cards']=svg(village_scene+f'<rect width="{W}" height="{H}" fill="#0d0912" opacity=".35"/>')
    for k,v in scenes.items(): open(f'desk/{k}.svg','w').write(v)
    print({k:len(v)//1024 for k,v in scenes.items()})
