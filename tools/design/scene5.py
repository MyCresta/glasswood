import math, random, heapq
from geo import scatter, smooth, dseg
from cozy import place
import desk as D, scene2 as S2
W,H=1440,900
GX,GY,GR=640,424,350
def defs(): return S2.defs()
# ---------- top-down globe with a horizon ring that shows the stand ----------
def ring_and_feet():
    o=''
    # shadow
    o+=f'<ellipse cx="{GX+34}" cy="{GY+58}" rx="{GR+50}" ry="{GR+40}" fill="#000" opacity=".6" filter="url(#soft)"/>'
    # three brass feet poking out from under the ring
    for a in (115,65,270+0):
        if a==270: continue
        r=math.radians(a); x0=GX+math.cos(r)*(GR+30); y0=GY+28+math.sin(r)*(GR+26); x1=GX+math.cos(r)*(GR+78); y1=GY+42+math.sin(r)*(GR+64)
        o+=f'<path d="M{x0:.0f} {y0:.0f} Q{(x0+x1)/2+math.cos(r)*6:.0f} {(y0+y1)/2+18:.0f} {x1:.0f} {y1:.0f}" stroke="#2a1a0c" stroke-width="20" stroke-linecap="round" fill="none"/><path d="M{x0:.0f} {y0:.0f} Q{(x0+x1)/2+math.cos(r)*6:.0f} {(y0+y1)/2+18:.0f} {x1:.0f} {y1:.0f}" stroke="url(#brass)" stroke-width="13" stroke-linecap="round" fill="none"/><ellipse cx="{x1:.0f}" cy="{y1+6:.0f}" rx="18" ry="10" fill="url(#brass)" stroke="#3a2410" stroke-width="1.5"/>'
    # horizon ring: wooden band, slightly below centre, its side visible at the bottom
    cy=GY+20; rx=GR+40; ry=GR+34
    o+=f'<ellipse cx="{GX}" cy="{cy+12}" rx="{rx}" ry="{ry}" fill="none" stroke="#2a140b" stroke-width="34"/>'
    o+=f'<ellipse cx="{GX}" cy="{cy+6}" rx="{rx}" ry="{ry}" fill="none" stroke="#4a2414" stroke-width="34"/>'
    o+=f'<ellipse cx="{GX}" cy="{cy}" rx="{rx}" ry="{ry}" fill="none" stroke="#7a4426" stroke-width="32"/>'
    o+=f'<ellipse cx="{GX}" cy="{cy}" rx="{rx-15}" ry="{ry-15}" fill="none" stroke="url(#brassH)" stroke-width="2.5"/><ellipse cx="{GX}" cy="{cy}" rx="{rx+15}" ry="{ry+15}" fill="none" stroke="url(#brassH)" stroke-width="2.5"/>'
    o+=f'<ellipse cx="{GX}" cy="{cy}" rx="{rx-8}" ry="{ry-8}" fill="none" stroke="#c9a45a" stroke-width="1" opacity=".55"/>'
    o+=''.join(f'<path d="M{GX+math.cos(t)*(rx-14):.1f} {cy+math.sin(t)*(ry-14):.1f} L{GX+math.cos(t)*(rx-(8 if k%3 else 2)):.1f} {cy+math.sin(t)*(ry-(8 if k%3 else 2)):.1f}" stroke="#e2c27a" stroke-width="{1.4 if k%3==0 else .8}" opacity=".75"/>' for k,t in enumerate([j*math.tau/72 for j in range(72)]))
    for lab,a in [('N',-90),('E',0),('S',90),('W',180)]:
        t=math.radians(a); o+=f'<text x="{GX+math.cos(t)*(rx+1):.0f}" y="{cy+math.sin(t)*(ry+1)+5:.0f}" text-anchor="middle" font-family="Georgia, serif" font-size="15" fill="#f0cf8a">{lab}</text>'
    return o
def mount_score(x,z):
    import desk as _D
    v=S2.noise(x*1.3,z*1.3,5)*.7+(math.hypot(x,z)-74)/26+(.3 if (z<-40 and x<10) else 0)-(.6 if (x>20 and z<-10 and x<80 and z>-70) else 0)
    if _D.wd(x,z,_D.RIVER)<9: v-=1
    for _,_,_,p in _D.LOC:
        if math.hypot(x-p[0],z-p[1])<16: v-=1
    return v
def is_mount5(x,z): return mount_score(x,z)>.45
def world_top(s):
    R=GR-6; r=random.Random(4); T=lambda x,z:(GX+x*s,GY+z*s); o=[]
    o.append(f'<clipPath id="gtop"><circle cx="{GX}" cy="{GY}" r="{R}"/></clipPath><g clip-path="url(#gtop)"><circle cx="{GX}" cy="{GY}" r="{R}" fill="#5f7f42"/>')
    for i in range(900):
        x=r.uniform(-104,104); z=r.uniform(-104,104); X,Y=T(x,z); n=S2.noise(x,z)
        o.append(f'<circle cx="{X:.0f}" cy="{Y:.0f}" r="{r.uniform(6,14):.0f}" fill="{["#6f8f4a","#56763c","#7a9a52","#4d6b37"][int((n+1)*1.99)%4]}" opacity=".5"/>')
    o+= [f'<circle cx="{T(r.uniform(-100,100),0)[0]:.0f}" cy="{T(0,r.uniform(-100,100))[1]:.0f}" r="1.3" fill="{r.choice(["#f2c14e","#e98fb5","#f4ecd8","#c39bff"])}"/>' for _ in range(260)]
    o.append(f'<path d="{smooth(D.RIVER,T)}" fill="none" stroke="#4a5e3a" stroke-width="{8*s+5:.0f}" stroke-linecap="round"/><path d="{smooth(D.RIVER,T)}" fill="none" stroke="url(#puddle)" stroke-width="{8*s:.0f}" stroke-linecap="round"/><path d="{smooth(D.RIVER,T)}" fill="none" stroke="#9fb4ff" stroke-width="1.4" stroke-dasharray="6 18" opacity=".6"/>')
    X,Y=T(*D.WLAKE[:2]); o.append(f'<circle cx="{X}" cy="{Y}" r="{D.WLAKE[2]*s+3}" fill="#4a5e3a"/><circle cx="{X}" cy="{Y}" r="{D.WLAKE[2]*s}" fill="url(#puddle)"/>')
    for t in D.TRAILS[:5]: o.append(f'<path d="{smooth(t,T)}" fill="none" stroke="#c9b48a" stroke-width="2" stroke-dasharray="3 5" opacity=".75"/>')
    pts=scatter(7,-104,104,-104,104,2.6,lambda x,z:True); pts.sort(key=lambda p:p[1])
    import random as _r
    for x,z,a,b in pts:
        X,Y=T(x,z)
        if False:
            rad=s*(3.2+a*3.4); j=random.Random(int(x*7+z*13)); w1=rad*j.uniform(.9,1.2); w2=rad*j.uniform(.9,1.3); hgt=rad*j.uniform(1.0,1.35); sx=X+j.uniform(-.2,.2)*rad
            sil=f'M{X-w1:.1f} {Y+rad*.35:.1f} Q{X-w1*.55:.1f} {Y-hgt*.25:.1f} {X-w1*.3:.1f} {Y-hgt*.45:.1f} Q{sx-rad*.15:.1f} {Y-hgt*.9:.1f} {sx:.1f} {Y-hgt:.1f} Q{sx+rad*.2:.1f} {Y-hgt*.8:.1f} {X+w2*.35:.1f} {Y-hgt*.5:.1f} Q{X+w2*.7:.1f} {Y-hgt*.2:.1f} {X+w2:.1f} {Y+rad*.35:.1f} Q{X:.1f} {Y+rad*.55:.1f} {X-w1:.1f} {Y+rad*.35:.1f}Z'
            shade=f'M{sx:.1f} {Y-hgt:.1f} Q{sx+rad*.2:.1f} {Y-hgt*.8:.1f} {X+w2*.35:.1f} {Y-hgt*.5:.1f} Q{X+w2*.7:.1f} {Y-hgt*.2:.1f} {X+w2:.1f} {Y+rad*.35:.1f} Q{X+rad*.3:.1f} {Y+rad*.45:.1f} {X+rad*.05:.1f} {Y+rad*.4:.1f} Q{sx+rad*.05:.1f} {Y-hgt*.3:.1f} {sx:.1f} {Y-hgt:.1f}Z'
            snow=f'M{sx-rad*.32:.1f} {Y-hgt*.62:.1f} Q{sx-rad*.12:.1f} {Y-hgt*.92:.1f} {sx:.1f} {Y-hgt:.1f} Q{sx+rad*.18:.1f} {Y-hgt*.84:.1f} {sx+rad*.36:.1f} {Y-hgt*.62:.1f} L{sx+rad*.22:.1f} {Y-hgt*.66:.1f} L{sx+rad*.12:.1f} {Y-hgt*.56:.1f} L{sx:.1f} {Y-hgt*.68:.1f} L{sx-rad*.12:.1f} {Y-hgt*.58:.1f} L{sx-rad*.22:.1f} {Y-hgt*.66:.1f}Z'
            o.append(f'<g filter="url(#lift)"><path d="{sil}" fill="#77726a" stroke="#2c2826" stroke-width="1.1"/><path d="{shade}" fill="#4f4b47"/><path d="{snow}" fill="#e6e9ec"/><path d="M{X-w1*.4:.1f} {Y+rad*.1:.1f} q{rad*.3:.1f} -6 {rad*.6:.1f} 0" stroke="#5a5652" stroke-width="1" fill="none"/></g>')
        elif is_mount5(x,z) and b<.5:
            rr=s*(1+a); o.append(f'<ellipse cx="{X:.1f}" cy="{Y:.1f}" rx="{rr*1.3:.1f}" ry="{rr:.1f}" fill="#6a665f" stroke="#2c2826" stroke-width=".8" filter="url(#lift)"/><ellipse cx="{X-rr*.3:.1f}" cy="{Y-rr*.3:.1f}" rx="{rr*.5:.1f}" ry="{rr*.3:.1f}" fill="#8a857c"/>')
        elif is_mount5(x,z):
            o.append(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="{s*1.4:.1f}" fill="#1e4430" filter="url(#lift)"/>')
        elif S2.is_forest(x,z) and not is_mount5(x,z):
            rad=s*(1.6+a*1.2); c=['#24503a','#2f6440','#1e4430','#3a6a34'][int(b*4)]
            o.append(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="{rad:.1f}" fill="{c}" filter="url(#lift)"/><circle cx="{X-rad*.3:.1f}" cy="{Y-rad*.3:.1f}" r="{rad*.4:.1f}" fill="#8fc45a" opacity=".2"/>')
        elif b>.94: o.append(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="{s*1.2:.1f}" fill="#41763a" filter="url(#lift)"/>')
    peaks=scatter(17,-104,104,-104,104,7.2,lambda x,z: mount_score(x,z)>.75); peaks.sort(key=lambda p:p[1])
    for x,z,a,b in peaks:
        X,Y=T(x,z); rad=s*(4.5+a*4.5+min(2.5,(mount_score(x,z)-.6)*4)); j=random.Random(int(x*7+z*13)); w1=rad*j.uniform(.9,1.25); w2=rad*j.uniform(.9,1.3); hgt=rad*j.uniform(.95,1.3); sx=X+j.uniform(-.2,.2)*rad
        sil=f'M{X-w1:.1f} {Y+rad*.35:.1f} Q{X-w1*.6:.1f} {Y-hgt*.2:.1f} {X-w1*.32:.1f} {Y-hgt*.42:.1f} Q{sx-rad*.18:.1f} {Y-hgt*.88:.1f} {sx:.1f} {Y-hgt:.1f} Q{sx+rad*.22:.1f} {Y-hgt*.78:.1f} {X+w2*.38:.1f} {Y-hgt*.48:.1f} Q{X+w2*.72:.1f} {Y-hgt*.18:.1f} {X+w2:.1f} {Y+rad*.35:.1f} Q{X:.1f} {Y+rad*.6:.1f} {X-w1:.1f} {Y+rad*.35:.1f}Z'
        shade=f'M{sx:.1f} {Y-hgt:.1f} Q{sx+rad*.22:.1f} {Y-hgt*.78:.1f} {X+w2*.38:.1f} {Y-hgt*.48:.1f} Q{X+w2*.72:.1f} {Y-hgt*.18:.1f} {X+w2:.1f} {Y+rad*.35:.1f} Q{X+rad*.3:.1f} {Y+rad*.5:.1f} {X+rad*.05:.1f} {Y+rad*.45:.1f} Q{sx+rad*.06:.1f} {Y-hgt*.3:.1f} {sx:.1f} {Y-hgt:.1f}Z'
        snow=f'M{sx-rad*.34:.1f} {Y-hgt*.6:.1f} Q{sx-rad*.12:.1f} {Y-hgt*.92:.1f} {sx:.1f} {Y-hgt:.1f} Q{sx+rad*.2:.1f} {Y-hgt*.84:.1f} {sx+rad*.38:.1f} {Y-hgt*.6:.1f} Q{sx+rad*.26:.1f} {Y-hgt*.66:.1f} {sx+rad*.16:.1f} {Y-hgt*.55:.1f} Q{sx+rad*.06:.1f} {Y-hgt*.68:.1f} {sx-rad*.04:.1f} {Y-hgt*.6:.1f} Q{sx-rad*.18:.1f} {Y-hgt*.7:.1f} {sx-rad*.34:.1f} {Y-hgt*.6:.1f}Z'
        ridge=f'M{sx:.1f} {Y-hgt:.1f} Q{sx-rad*.1:.1f} {Y-hgt*.4:.1f} {X-rad*.2:.1f} {Y+rad*.3:.1f}'
        o.append(f'<g filter="url(#lift)"><path d="{sil}" fill="#7d776e" stroke="#2c2826" stroke-width="1.2"/><path d="{shade}" fill="#524d48"/><path d="{ridge}" stroke="#5f5a54" stroke-width="1.2" fill="none"/><path d="{snow}" fill="#e8ebee"/></g>')
    col=['#c4553b','#2f8f8a','#d9a23a','#7b4a9a','#3f6fb0']
    for id_,k,n,p in D.LOC:
        X,Y=T(*p); u=s/3.6*1.6
        if k=='home': o.append(f'<circle cx="{X}" cy="{Y}" r="{50*u}" fill="url(#warm)"/><circle cx="{X}" cy="{Y}" r="{9*u}" fill="#8a7a5e" stroke="#3d3428"/>'+D.roofs(X,Y,8,u*1.3,1)+f'<circle cx="{X}" cy="{Y}" r="{3.6*u}" fill="#c4553b" stroke="#2c2620"/><circle cx="{X}" cy="{Y}" r="{1.3*u}" fill="#ffe08a"/>')
        elif k=='village': o.append(f'<circle cx="{X}" cy="{Y}" r="{22*u}" fill="url(#eg)"/>'+D.roofs(X,Y,6,u*1.1,hash(id_)%99))
        elif k=='ruins': o.append(''.join(f'<rect x="{X+math.cos(a)*8*u-2.5*u:.1f}" y="{Y+math.sin(a)*8*u-2*u:.1f}" width="{5*u:.1f}" height="{4*u:.1f}" fill="#a39e95" stroke="#3a3530" stroke-width=".8"/>' for a in [j*.9 for j in range(6)]))
        elif k=='dungeon':
            g='cy' if id_=='crystal' else 'vg'; o.append(f'<circle cx="{X}" cy="{Y}" r="{26*u}" fill="url(#{g})"/><ellipse cx="{X}" cy="{Y}" rx="{6*u}" ry="{4.5*u}" fill="#0d070a" stroke="#4a2e1e" stroke-width="{1.6*u:.1f}"/>')
        elif id_=='quarry': o.append(f'<rect x="{X-8*u}" y="{Y-6*u}" width="{16*u}" height="{12*u}" fill="#b8ab92" stroke="#5a4e3c"/>')
        else: o.append(''.join(f'<circle cx="{X+math.cos(a)*7*u:.1f}" cy="{Y+math.sin(a)*7*u:.1f}" r="{1.6*u:.1f}" fill="#c9c4bb" stroke="#3a3530"/>' for a in [j*math.tau/7 for j in range(7)]))
    o+= [f'<circle cx="{GX+r.uniform(-R,R):.0f}" cy="{GY+r.uniform(-R,R):.0f}" r="6" fill="url(#gl)"/>' for _ in range(26)]
    o.append(f'<circle cx="{GX}" cy="{GY}" r="{R}" fill="url(#dusk2)"/>')
    # a sliver of soil at the bottom edge shows the slight tilt
    o.append(f'<path d="M{GX-R} {GY} A{R} {R} 0 0 0 {GX+R} {GY} L{GX+R} {GY+9} A{R} {R} 0 0 1 {GX-R} {GY+9}Z" fill="#3a281e" opacity="0"/>')
    o.append('</g>')
    o.append(f'<path d="M{GX-R*.97:.0f} {GY+R*.24:.0f} A{R} {R} 0 0 0 {GX+R*.97:.0f} {GY+R*.24:.0f}" fill="none" stroke="#3a281e" stroke-width="10" opacity=".85"/><path d="M{GX-R*.97:.0f} {GY+R*.24+4:.0f} A{R} {R} 0 0 0 {GX+R*.97:.0f} {GY+R*.24+4:.0f}" fill="none" stroke="#8d7b62" stroke-width="2" stroke-dasharray="3 6" opacity=".7"/>')
    return ''.join(o)
def glass():
    R=GR
    o=f'<circle cx="{GX}" cy="{GY}" r="{R}" fill="url(#fres)"/><circle cx="{GX}" cy="{GY}" r="{R}" fill="none" stroke="#eef8ff" stroke-opacity=".6" stroke-width="1.6"/>'
    o+=f'<path d="M{GX-R*.9:.0f} {GY-R*.1:.0f} A{R*.93:.0f} {R*.93:.0f} 0 0 1 {GX-R*.3:.0f} {GY-R*.86:.0f}" fill="none" stroke="#fff" stroke-opacity=".42" stroke-width="6" stroke-linecap="round"/>'
    o+=f'<path d="M{GX-R*.82:.0f} {GY-R*.05:.0f} A{R*.85:.0f} {R*.85:.0f} 0 0 1 {GX-R*.68:.0f} {GY-R*.42:.0f}" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2.5" stroke-linecap="round"/>'
    o+=f'<circle cx="{GX-R*.45:.0f}" cy="{GY-R*.6:.0f}" r="4" fill="#fff" opacity=".85"/><ellipse cx="{GX+R*.58:.0f}" cy="{GY-R*.5:.0f}" rx="14" ry="6" fill="#ffd9a0" opacity=".5" transform="rotate(48 {GX+R*.58:.0f} {GY-R*.5:.0f})"/>'
    o+=f'<path d="M{GX+R*.45:.0f} {GY+R*.82:.0f} A{R*.94:.0f} {R*.94:.0f} 0 0 0 {GX+R*.86:.0f} {GY+R*.36:.0f}" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="3" stroke-linecap="round"/>'
    return o
def globe(dim=0,blur=False):
    o=ring_and_feet()+f'<g{" filter=\"url(#blur3)\"" if blur else ""}>'+world_top(2.95)
    if dim: o+=f'<circle cx="{GX}" cy="{GY}" r="{GR}" fill="#0c0814" opacity="{dim}"/>'
    return o+'</g>'+glass()
# ---------- Watch: a bigger web of paths ----------
def build():
    r=random.Random(21); N={'c':(0,0)}; E=[]
    def ring(pref,n,rad,off=0,jit=.7):
        for i in range(n):
            a=math.radians(off+i*360/n+r.uniform(-4,4)); rr=rad+r.uniform(-jit,jit); N[f'{pref}{i}']=(math.cos(a)*rr,math.sin(a)*rr)
    N['gN']=(0,-5); N['gS']=(0,5)
    ring('a',12,9.2,-90,.3); ring('b',16,15,-90+11); ring('c',20,21.5,-90); ring('d',22,28,-90+8,1.0)
    sp=[('Hollow Gate',-90),('Mossy Cave',165),('Ravine Stair',15),("Old King's Road",-140),('Bog Mouth',-40),('Sunken Arch',95)]
    SP=[]
    for i,(n,a) in enumerate(sp):
        t=math.radians(a); N[f's{i}']=(math.cos(t)*32.5,math.sin(t)*32.5); SP.append((n,N[f's{i}']))
    d=lambda a,b: math.dist(N[a],N[b])
    near=lambda k,pref,cnt: sorted([n for n in N if n[0]==pref and n[1:].isdigit()],key=lambda n:d(k,n))[:cnt]
    E+= [('c','gN'),('c','gS'),('gN',near('gN','a',1)[0]),('gS',near('gS','a',1)[0])]
    for pref,n,skip in (('a',12,()),('b',16,(5,12)),('c',20,(3,9,15)),('d',22,(2,7,12,17,20))):
        for i in range(n):
            if i in skip: continue
            E.append((f'{pref}{i}',f'{pref}{(i+1)%n}'))
    # only four ways into the inner ring
    for i in (0,3,6,9): E.append((f'a{i}',near(f'a{i}','b',1)[0]))
    for i in range(16):
        E.append((f'b{i}',near(f'b{i}','c',1)[0]))
    for i in range(0,20,2): E.append((f'c{i}',near(f'c{i}','d',1)[0]))
    for i in range(1,20,4): E.append((f'c{i}',near(f'c{i}','d',2)[1]))
    for k in range(6):
        for nb in near(f's{k}','d',2): E.append((f's{k}',nb))
    E=list(dict.fromkeys(tuple(sorted(e)) for e in E))
    C={}
    for a,b in E:
        (ax,az),(bx,bz)=N[a],N[b]; L=math.dist(N[a],N[b]); mx,mz=(ax+bx)/2,(az+bz)/2
        # bend ring edges outward to follow the circle
        ra=math.hypot(ax,az); rb=math.hypot(bx,bz)
        if abs(ra-rb)<2.5 and ra>3:
            m=math.hypot(mx,mz); k=(ra+rb)/2/m if m else 1; mx,mz=mx*k,mz*k
        else:
            nx,nz=-(bz-az)/L,(bx-ax)/L; j=r.uniform(-.15,.15)*L; mx+=nx*j; mz+=nz*j
        C[(a,b)]=[N[a],(mx,mz),N[b]]
    return N,C,SP
N,C,SP=build()
def key(a,b): return (a,b) if (a,b) in C else (b,a)
A_SPOKE={i:None for i in (0,3,6,9)}
for (a,b) in C:
    for i in (0,3,6,9):
        if f'a{i}' in (a,b) and (a[0]=='b' or b[0]=='b'): A_SPOKE[i]=(a,b)
BLOCK=[A_SPOKE[0],A_SPOKE[3],A_SPOKE[9],key('gS',[n for n in ('a6','a5','a7') if key('gS',n) in C][0])]
def route(src,blocked=()):
    adj={}
    for (a,b),c in C.items():
        if (a,b) in blocked: continue
        L=math.dist(c[0],c[1])+math.dist(c[1],c[2]); adj.setdefault(a,[]).append((b,L)); adj.setdefault(b,[]).append((a,L))
    dist={src:0}; prev={}; q=[(0,src)]
    while q:
        dd,u=heapq.heappop(q)
        if u=='c': break
        if dd>dist[u]: continue
        for v,L in adj.get(u,[]):
            if dd+L<dist.get(v,1e9): dist[v]=dd+L; prev[v]=u; heapq.heappush(q,(dd+L,v))
    p=['c']
    while p[-1]!=src: p.append(prev[p[-1]])
    return p[::-1],dist['c']
def pts_of(nodes):
    out=[]
    for a,b in zip(nodes,nodes[1:]):
        c=C.get((a,b)) or C[(b,a)][::-1]
        for i in range(2):
            for t in [k/8 for k in range(8)]: out.append((c[i][0]+(c[i+1][0]-c[i][0])*t,c[i][1]+(c[i+1][1]-c[i][1])*t))
    out.append((0,0)); return out
def wopen(x,z):
    d=math.hypot(x,z)-4.8
    for c in C.values(): d=min(d,min(dseg(x,z,c[i],c[i+1]) for i in range(2))-.42)
    return d
LAKES=[(12,-3,1.8),(-18.5,9.5,1.6),(5,24.5,1.5)]
def watch(s,cx,cy,clipr,night=False,battle=False):
    T=lambda x,z:(cx+x*s,cy+z*s); r=random.Random(3); o=[]
    o.append(f'<clipPath id="wv{clipr}"><circle cx="{cx}" cy="{cy}" r="{clipr}"/></clipPath><g clip-path="url(#wv{clipr})"><circle cx="{cx}" cy="{cy}" r="{clipr}" fill="#2a1d1c"/>')
    for i in range(900):
        x=r.uniform(-36,36); z=r.uniform(-36,36)
        if wopen(x,z)<.15: continue
        X,Y=T(x,z); o.append(f'<use href="#leaf" x="-10" y="-5" width="20" height="10" fill="{r.choice(D.LEAF)}" opacity="{r.uniform(.5,.85):.2f}" transform="translate({X:.0f} {Y:.0f}) rotate({r.uniform(0,360):.0f}) scale({r.uniform(.5,1.1):.2f})"/>')
    for c in C.values(): o.append(f'<path d="{smooth(c,T)}" fill="none" stroke="#6e5840" stroke-width="{.85*s+4:.1f}" stroke-linecap="round"/>')
    for c in C.values(): o.append(f'<path d="{smooth(c,T)}" fill="none" stroke="#a88d68" stroke-width="{.85*s:.1f}" stroke-linecap="round"/>')
    o.append(f'<circle cx="{cx}" cy="{cy}" r="{5*s+3}" fill="#a88d68"/><circle cx="{cx}" cy="{cy}" r="{4.4*s}" fill="#4f6e3a"/>')
    for lx,lz,lr in LAKES:
        X,Y=T(lx,lz); o.append(f'<circle cx="{X}" cy="{Y}" r="{lr*s+3}" fill="#5a4636"/><circle cx="{X}" cy="{Y}" r="{lr*s}" fill="url(#puddle)"/>')
    pts=scatter(41,-36,36,-36,36,.95,lambda x,z: wopen(x,z)>.3 and all(math.dist((x,z),(lx,lz))>lr+.6 for lx,lz,lr in LAKES)); pts.sort(key=lambda p:p[1])
    for x,z,a,b in pts:
        X,Y=T(x,z)
        if b<.62:
            rad=s*(.55+a*.45); c=D.MOSS[int(a*4)] if math.hypot(x,z)<24 else ['#1e4430','#24503a','#2a5a3c','#1a3a2a'][int(a*4)]
            o.append(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="{rad:.1f}" fill="{c}" filter="url(#lift)"/><circle cx="{X-rad*.3:.1f}" cy="{Y-rad*.3:.1f}" r="{rad*.42:.1f}" fill="#8fc45a" opacity=".2"/>')
        elif b<.84:
            rad=s*(.85+a*.45); o.append(f'<g filter="url(#lift)"><circle cx="{X:.1f}" cy="{Y:.1f}" r="{rad:.1f}" fill="#1e4430"/><circle cx="{X-rad*.25:.1f}" cy="{Y-rad*.3:.1f}" r="{rad*.6:.1f}" fill="#2f6440"/><circle cx="{X-rad*.35:.1f}" cy="{Y-rad*.4:.1f}" r="{rad*.25:.1f}" fill="#55893e" opacity=".6"/></g>')
        elif b<.92:
            rad=s*(.35+a*.3); red=a<.7
            if not red: o.append(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="{rad*2:.1f}" fill="url(#vg)"/>')
            o.append(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="{rad:.1f}" fill="{"#c43d36" if red else "#7b55c9"}" stroke="#2a0f14" stroke-width="1" filter="url(#lift)"/>')
    # village
    R=3*s; col=['#c4553b','#2f8f8a','#d9a23a','#7b4a9a','#3f6fb0']
    o.append(f'<circle cx="{cx}" cy="{cy}" r="{R+8}" fill="#9c9893" filter="url(#lift)"/>')
    for i,(deg,rr,n) in enumerate(D.BUILD):
        x,z=D.bpos(deg,rr); X,Y=T(x,z); a=math.degrees(math.atan2(z,x))+90
        o.append(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="10" fill="url(#eg)"/><g transform="translate({X:.1f} {Y:.1f}) rotate({a:.0f})"><rect x="-5" y="-3.5" width="10" height="7" fill="{col[i%5]}" stroke="#1d1712"/></g>')
    o.append(''.join(f'<circle cx="{cx+math.cos(t)*R:.1f}" cy="{cy+math.sin(t)*R:.1f}" r="2" fill="#5a3e22"/>' for t in [k*math.tau/36 for k in range(36)]))
    o.append(f'<circle cx="{cx}" cy="{cy}" r="50" fill="url(#eg)"/><circle cx="{cx}" cy="{cy}" r="10" fill="#b9b3aa" stroke="#2c2620" stroke-width="1.4"/><circle cx="{cx}" cy="{cy}" r="6.5" fill="#c4553b" stroke="#2c2620"/><circle cx="{cx}" cy="{cy}" r="2.2" fill="#ffe08a"/>')
    for k,(n,p) in enumerate(SP):
        X,Y=T(*p); act=k<2
        if act: o.append(f'<circle cx="{X}" cy="{Y}" r="36" fill="url(#vg)"/>')
        o.append(f'<path d="M{X-16} {Y-5} q7 -11 16 -6 q11 -5 16 6" stroke="#4a2e1e" stroke-width="4.5" fill="none" stroke-linecap="round"/><ellipse cx="{X}" cy="{Y+2}" rx="10" ry="7" fill="#0d070a"/>')
    for e in BLOCK:
        c=C[e]; X,Y=T(*c[1]); ang=math.degrees(math.atan2(c[2][1]-c[0][1],c[2][0]-c[0][0]))+90
        o.append(f'<g transform="translate({X:.1f} {Y:.1f}) rotate({ang:.0f}) scale(1.25)" filter="url(#lift)"><rect x="-13" y="-3.5" width="26" height="7" rx="2" fill="#a07a4e" stroke="#2a1d1c" stroke-width="1.2"/><path d="M-9 -9 L-3 9 M9 -9 L3 9" stroke="#5a3e22" stroke-width="3.5" stroke-linecap="round"/></g>')
    open_r,L0=route('s0'); long_r,L1=route('s0',BLOCK); west_r,_=route('s1',BLOCK)
    if not battle:
        o.append(f'<path d="{smooth(pts_of(open_r)[::4]+[(0,0)],T)}" fill="none" stroke="#e0603e" stroke-width="3" stroke-dasharray="3 7" stroke-linecap="round" opacity=".75"/>')
        o+=[f'<circle cx="{T(x,z)[0]:.1f}" cy="{T(x,z)[1]:.1f}" r="2.3" fill="#ffe08a"/>' for x,z,_ in S2.along(pts_of(long_r),[i/110 for i in range(110)])]
        o+=[f'<circle cx="{T(x,z)[0]:.1f}" cy="{T(x,z)[1]:.1f}" r="1.8" fill="#ffe08a" opacity=".7"/>' for x,z,_ in S2.along(pts_of(west_r),[i/70 for i in range(70)])]
    if night: o.append(f'<circle cx="{cx}" cy="{cy}" r="{clipr}" fill="#1a1450" opacity=".3"/><circle cx="{cx}" cy="{cy}" r="60" fill="url(#eg)"/>')
    else: o.append(f'<circle cx="{cx}" cy="{cy}" r="{clipr}" fill="url(#dusk2)"/>')
    if battle:
        o.append(f'<circle cx="{cx}" cy="{cy}" r="{8.5*s}" fill="none" stroke="#ffd27a" stroke-opacity=".5" stroke-width="1.5" stroke-dasharray="2 6" stroke-linecap="round"/>')
        ens=[]
        for nodes,ts,sym in ((long_r,[.42,.48,.54,.6,.66,.74,.8],'gob'),(west_r,[.5,.6],'wolf')):
            for x,z,h in S2.along(pts_of(nodes),ts): ens.append((x,z,h,sym))
        for x,z,h,sym in ens:
            X,Y=T(x,z); o.append(f'<circle cx="{X:.1f}" cy="{Y-6:.1f}" r="15" fill="url(#eg)"/>'+place(sym,X,Y,1.0,*((28,28) if sym=='gob' else (36,22)),flip=math.sin(h)<0))
        for x,z,_,_ in ens:
            X,Y=T(x,z); a=math.atan2(Y-cy,X-cx)
            if math.hypot(X-cx,Y-cy)<8.5*s+10: o.append(f'<path d="M{cx+(X-cx)*.6:.1f} {cy+(Y-cy)*.6:.1f} l{math.cos(a)*12:.1f} {math.sin(a)*12:.1f}" stroke="#f3e2bf" stroke-width="2" stroke-linecap="round"/>')
    o+= [f'<circle cx="{cx+r.uniform(-clipr,clipr):.0f}" cy="{cy+r.uniform(-clipr,clipr):.0f}" r="6" fill="url(#gl)"/>' for _ in range(22)]
    o.append('</g>'); return ''.join(o), (L0,L1)
if __name__=='__main__':
    print(len(C), route('s0'), route('s0',BLOCK))
