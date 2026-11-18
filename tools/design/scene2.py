# Round 4 scenes: standing globe, Wilds / Watch / Hearth.
import math, random, heapq
from geo import scatter, smooth, dseg
from cozy import creature_defs, place
import desk as D
W,H=1440,900
GX,GY,GR=650,392,330
DX,DY,DRX,DRY=GX,GY+86,292,182   # the ground disc inside the globe
def noise(x,z,seed=0):
    return (math.sin(x*.071+seed)*math.cos(z*.063-seed*1.3)+math.sin((x+z)*.041+seed*2.1)*.6+math.sin(x*.17-z*.13+seed)*.35)/1.95
def defs(): return D.defs().replace('</defs>','''
<radialGradient id="air" cx=".5" cy=".42" r=".55"><stop offset="0" stop-color="#1c2a30" stop-opacity=".35"/><stop offset=".7" stop-color="#0d151a" stop-opacity=".6"/><stop offset="1" stop-color="#05080b" stop-opacity=".8"/></radialGradient>
<radialGradient id="fres" cx=".5" cy=".5" r=".5"><stop offset=".78" stop-color="#d9efff" stop-opacity="0"/><stop offset=".95" stop-color="#d9efff" stop-opacity=".13"/><stop offset="1" stop-color="#d9efff" stop-opacity=".3"/></radialGradient>
<linearGradient id="soil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a3426"/><stop offset=".5" stop-color="#3a281e"/><stop offset="1" stop-color="#6b5a46"/></linearGradient>
<linearGradient id="plinth" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a140b"/><stop offset=".35" stop-color="#6e3a22"/><stop offset=".55" stop-color="#8a4c2c"/><stop offset="1" stop-color="#22100a"/></linearGradient>
<linearGradient id="brassH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a3a14"/><stop offset=".3" stop-color="#e2b86e"/><stop offset=".5" stop-color="#f6dca0"/><stop offset=".75" stop-color="#b8853e"/><stop offset="1" stop-color="#4a2e10"/></linearGradient>
<radialGradient id="dusk2" cx=".5" cy=".5" r=".5"><stop offset=".3" stop-color="#1c1440" stop-opacity=".05"/><stop offset="1" stop-color="#1c1440" stop-opacity=".45"/></radialGradient>
<filter id="blur3"><feGaussianBlur stdDeviation="3"/></filter>
</defs>''')
# ---------- the open world inside the globe ----------
LOC=D.LOC; RIVER=D.RIVER; WLAKE=D.WLAKE
def world_disc(s=3.05):
    R=DRX; r=random.Random(4); T=lambda x,z:(x*s,z*s); o=[]
    o.append(f'<clipPath id="disc"><circle cx="0" cy="0" r="{R}"/></clipPath><g clip-path="url(#disc)"><circle r="{R}" fill="#5f7f42"/>')
    # meadow tones and flowers
    for i in range(700):
        x=r.uniform(-100,100); z=r.uniform(-100,100); X,Y=T(x,z); n=noise(x,z)
        o.append(f'<circle cx="{X:.0f}" cy="{Y:.0f}" r="{r.uniform(6,14):.0f}" fill="{["#6f8f4a","#56763c","#7a9a52","#4d6b37"][int((n+1)*1.99)%4]}" opacity=".55"/>')
    for i in range(300):
        x=r.uniform(-100,100); z=r.uniform(-100,100); X,Y=T(x,z)
        o.append(f'<circle cx="{X:.0f}" cy="{Y:.0f}" r="1.3" fill="{r.choice(["#f2c14e","#e98fb5","#f4ecd8","#c39bff"])}"/>')
    # river and lake
    o.append(f'<path d="{smooth(RIVER,T)}" fill="none" stroke="#4a5e3a" stroke-width="{8*s+5:.0f}" stroke-linecap="round"/><path d="{smooth(RIVER,T)}" fill="none" stroke="url(#puddle)" stroke-width="{8*s:.0f}" stroke-linecap="round"/>')
    X,Y=T(WLAKE[0],WLAKE[1]); o.append(f'<circle cx="{X}" cy="{Y}" r="{WLAKE[2]*s+3}" fill="#4a5e3a"/><circle cx="{X}" cy="{Y}" r="{WLAKE[2]*s}" fill="url(#puddle)"/>')
    # faint trails only to places you know
    for t in D.TRAILS[:5]:
        o.append(f'<path d="{smooth(t,T)}" fill="none" stroke="#c9b48a" stroke-width="2" stroke-dasharray="3 5" opacity=".7"/>')
    o.append('</g>')
    return ''.join(o)
def is_forest(x,z): return noise(x,z,1)>.12 and math.hypot(x,z)>14 and D.wd(x,z,RIVER)>6 and math.hypot(x-WLAKE[0],z-WLAKE[1])>WLAKE[2]+3 and all(math.hypot(x-p[0],z-p[1])>8 for _,_,_,p in LOC)
def is_mount(x,z): return (x<-45 and z<-35) or (x>40 and z>55) or (z<-80)
def world_sprites(s=3.05,K=.62):
    # standing sprites projected onto the tilted disc: trees, hills, buildings
    r=random.Random(9); items=[]
    P=lambda x,z:(DX+x*s, DY+z*s*K)
    for x,z,a,b in scatter(7,-96,96,-96,96,3.0,lambda x,z: math.hypot(x,z)<94):
        X,Y=P(x,z)
        if is_mount(x,z) and b<.5:
            h=18+a*22; items.append((Y,f'<path d="M{X-h*.8:.0f} {Y:.0f} L{X:.0f} {Y-h:.0f} L{X+h*.8:.0f} {Y:.0f}Z" fill="#6f6a66" stroke="#2c2826" stroke-width="1"/><path d="M{X:.0f} {Y-h:.0f} L{X+h*.8:.0f} {Y:.0f} L{X+h*.2:.0f} {Y:.0f}Z" fill="#4a4644"/><path d="M{X-h*.25:.0f} {Y-h*.7:.0f} L{X:.0f} {Y-h:.0f} L{X+h*.25:.0f} {Y-h*.7:.0f} L{X:.0f} {Y-h*.6:.0f}Z" fill="#d9dde0"/>'))
        elif is_forest(x,z):
            h=9+a*7; c=['#24503a','#2f6440','#1e4430'][int(b*3)]
            if b<.8: items.append((Y,f'<path d="M{X-h*.42:.1f} {Y:.1f} L{X:.1f} {Y-h:.1f} L{X+h*.42:.1f} {Y:.1f}Z" fill="{c}"/><path d="M{X:.1f} {Y-h:.1f} L{X+h*.42:.1f} {Y:.1f} L{X:.1f} {Y:.1f}Z" fill="#000" opacity=".22"/>'))
            else: items.append((Y,f'<circle cx="{X:.1f}" cy="{Y-h*.55:.1f}" r="{h*.42:.1f}" fill="#41763a"/><circle cx="{X-1.5:.1f}" cy="{Y-h*.65:.1f}" r="{h*.2:.1f}" fill="#7ab04a" opacity=".5"/>'))
        elif b>.9 and not is_mount(x,z):
            items.append((Y,f'<circle cx="{X:.1f}" cy="{Y-4:.1f}" r="4.5" fill="#41763a"/>'))
    col=['#c4553b','#2f8f8a','#d9a23a','#7b4a9a','#3f6fb0']
    for id_,k,n,p in LOC:
        X,Y=P(*p)
        if k=='home':
            items.append((Y+.1,f'<ellipse cx="{X}" cy="{Y}" rx="26" ry="14" fill="url(#warm)"/>'+''.join(f'<rect x="{X+dx-4}" y="{Y+dy-6}" width="8" height="6" fill="#e6d6b8" stroke="#2a1d1c" stroke-width=".8"/><path d="M{X+dx-5} {Y+dy-6} L{X+dx} {Y+dy-10} L{X+dx+5} {Y+dy-6}Z" fill="{col[i%5]}" stroke="#2a1d1c" stroke-width=".8"/>' for i,(dx,dy) in enumerate([(-14,2),(12,3),(-8,8),(8,9),(-16,-4),(15,-4)]))+f'<rect x="{X-3}" y="{Y-26}" width="6" height="26" fill="#c2b8a6" stroke="#2a1d1c" stroke-width=".8"/><path d="M{X-5} {Y-26} L{X} {Y-34} L{X+5} {Y-26}Z" fill="#c4553b" stroke="#2a1d1c" stroke-width=".8"/><circle cx="{X}" cy="{Y-24}" r="2" fill="#ffd27a"/>'))
        elif k=='village':
            items.append((Y,f'<ellipse cx="{X}" cy="{Y}" rx="18" ry="10" fill="url(#eg)"/>'+''.join(f'<rect x="{X+dx-3.5}" y="{Y+dy-5}" width="7" height="5" fill="#e6d6b8" stroke="#2a1d1c" stroke-width=".7"/><path d="M{X+dx-4.5} {Y+dy-5} L{X+dx} {Y+dy-8.5} L{X+dx+4.5} {Y+dy-5}Z" fill="{col[(i+2)%5]}" stroke="#2a1d1c" stroke-width=".7"/>' for i,(dx,dy) in enumerate([(-8,0),(6,1),(0,6),(-3,-5)]))))
        elif k=='ruins':
            items.append((Y,''.join(f'<rect x="{X+dx}" y="{Y+dy-h}" width="4" height="{h}" fill="#a39e95" stroke="#3a3530" stroke-width=".7"/>' for dx,dy,h in [(-9,0,10),(-3,2,6),(4,0,12),(9,-2,5)])+(f'<path d="M{X-16} {Y+2} q16 -14 32 0" stroke="#8a8580" stroke-width="5" fill="none"/>' if id_=='trollbridge' else '')))
        elif k=='dungeon':
            g='cy' if id_=='crystal' else 'vg'
            items.append((Y,f'<ellipse cx="{X}" cy="{Y}" rx="26" ry="16" fill="url(#{g})"/><path d="M{X-10} {Y} q10 -16 20 0z" fill="#0d070a" stroke="#4a2e1e" stroke-width="2"/>'+(''.join(f'<path d="M{X+dx} {Y+dy} l2 -9 l2 9z" fill="#9ff6ff" stroke="#1f5a66" stroke-width=".7"/>' for dx,dy in [(-14,2),(10,1),(13,6)]) if id_=='crystal' else '')))
        elif id_=='quarry':
            items.append((Y,f'<path d="M{X-12} {Y} L{X-8} {Y-8} H{X+8} L{X+12} {Y}Z" fill="#b8ab92" stroke="#5a4e3c"/><path d="M{X+4} {Y-8} V{Y-20} L{X+12} {Y-16}" stroke="#5a3e22" stroke-width="1.6" fill="none"/>'))
        else:
            items.append((Y,''.join(f'<rect x="{X+math.cos(a)*10-1.5:.1f}" y="{Y+math.sin(a)*5-8:.1f}" width="3" height="8" fill="#c9c4bb" stroke="#3a3530" stroke-width=".6"/>' for a in [j*math.tau/7 for j in range(7)])))
    items.sort(key=lambda t:t[0])
    o=''.join(t[1] for t in items)
    o+=''.join(f'<circle cx="{DX+r.uniform(-280,280):.0f}" cy="{DY+r.uniform(-170,120):.0f}" r="5" fill="url(#gl)"/>' for _ in range(24))
    return o
def plinth_back():
    py=GY+GR+6
    return (f'<ellipse cx="{GX+40}" cy="{py+70}" rx="300" ry="56" fill="#000" opacity=".6" filter="url(#soft)"/>'
      f'<ellipse cx="{GX-120}" cy="{py+40}" rx="160" ry="36" fill="url(#caustic)"/>'
      f'<path d="M{GX-200} {py} V{py+44} A200 36 0 0 0 {GX+200} {py+44} V{py}Z" fill="url(#plinth)" stroke="#1a0b05" stroke-width="2"/>'
      f'<path d="M{GX-200} {py+30} A200 36 0 0 0 {GX+200} {py+30}" fill="none" stroke="url(#brassH)" stroke-width="5"/>'
      f'<ellipse cx="{GX}" cy="{py}" rx="200" ry="36" fill="#5a2e1a" stroke="#1a0b05" stroke-width="2"/><ellipse cx="{GX}" cy="{py}" rx="184" ry="30" fill="#6e3a22"/>'
      +''.join(f'<path d="M{GX+math.cos(a)*170:.0f} {py+math.sin(a)*27:.0f} q{math.cos(a)*-20:.0f} 4 {math.cos(a)*-40:.0f} 2" stroke="#3a1d10" stroke-width="1.2" fill="none" opacity=".5"/>' for a in [k*.7 for k in range(9)]))
def cradle_back():
    cy=GY+GR-70
    return f'<path d="M{GX-236} {cy} A236 44 0 0 1 {GX+236} {cy}" fill="none" stroke="url(#brassH)" stroke-width="10" opacity=".45"/>'
def cradle_front():
    cy=GY+GR-70; py=GY+GR+6
    legs=''.join(f'<path d="M{GX+dx} {cy+dy} L{GX+dx*0.78:.0f} {py-4}" stroke="url(#brassH)" stroke-width="9" stroke-linecap="round"/>' for dx,dy in [(-200,22),(200,22),(-80,40),(80,40)])
    return legs+f'<path d="M{GX-236} {cy} A236 44 0 0 0 {GX+236} {cy}" fill="none" stroke="#3a2410" stroke-width="14"/><path d="M{GX-236} {cy} A236 44 0 0 0 {GX+236} {cy}" fill="none" stroke="url(#brassH)" stroke-width="10"/>'+''.join(f'<circle cx="{GX+math.cos(a)*236:.0f}" cy="{cy+math.sin(a)*44:.0f}" r="4" fill="#f6dca0" stroke="#5a3a14"/>' for a in [.4,1.2,1.94,2.74])
def sphere_glass():
    o=f'<circle cx="{GX}" cy="{GY}" r="{GR}" fill="url(#fres)"/>'
    o+=f'<circle cx="{GX}" cy="{GY}" r="{GR}" fill="none" stroke="#eef8ff" stroke-opacity=".6" stroke-width="1.6"/>'
    o+=f'<path d="M{GX-GR*.88:.0f} {GY+GR*.05:.0f} A{GR*.92:.0f} {GR*.92:.0f} 0 0 1 {GX-GR*.3:.0f} {GY-GR*.86:.0f}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="7" stroke-linecap="round"/>'
    o+=f'<path d="M{GX-GR*.78:.0f} {GY-GR*.1:.0f} A{GR*.82:.0f} {GR*.82:.0f} 0 0 1 {GX-GR*.62:.0f} {GY-GR*.45:.0f}" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="3" stroke-linecap="round"/>'
    o+=f'<rect x="{GX+GR*.32:.0f}" y="{GY-GR*.72:.0f}" width="52" height="76" rx="16" fill="#fff" opacity=".1" transform="rotate(28 {GX+GR*.32:.0f} {GY-GR*.72:.0f})"/><rect x="{GX+GR*.5:.0f}" y="{GY-GR*.56:.0f}" width="22" height="60" rx="10" fill="#fff" opacity=".08" transform="rotate(28 {GX+GR*.5:.0f} {GY-GR*.56:.0f})"/>'
    o+=f'<circle cx="{GX-GR*.5:.0f}" cy="{GY-GR*.62:.0f}" r="5" fill="#fff" opacity=".85"/><ellipse cx="{GX+GR*.62:.0f}" cy="{GY-GR*.42:.0f}" rx="12" ry="6" fill="#ffd9a0" opacity=".5" transform="rotate(50 {GX+GR*.62:.0f} {GY-GR*.42:.0f})"/>'
    o+=f'<path d="M{GX-GR*.6:.0f} {GY+GR*.78:.0f} A{GR*.98:.0f} {GR*.98:.0f} 0 0 0 {GX+GR*.6:.0f} {GY+GR*.78:.0f}" fill="none" stroke="#bfe3ff" stroke-opacity=".3" stroke-width="3"/>'
    # stopper at the top
    o+=f'<ellipse cx="{GX}" cy="{GY-GR+10}" rx="66" ry="15" fill="url(#brassH)" stroke="#3a2410" stroke-width="2"/><ellipse cx="{GX}" cy="{GY-GR+6}" rx="48" ry="10" fill="#8a6a46"/><ellipse cx="{GX}" cy="{GY-GR+3}" rx="44" ry="8" fill="#b08a5a"/>'
    return o
def globe_scene(dim=0, blur=False):
    o=plinth_back()+cradle_back()
    o+=f'<circle cx="{GX+30}" cy="{GY+40}" r="{GR}" fill="#000" opacity=".35" filter="url(#soft)"/>'
    o+=f'<clipPath id="sph"><circle cx="{GX}" cy="{GY}" r="{GR-2}"/></clipPath><g clip-path="url(#sph)"{" filter=\"url(#blur3)\"" if blur else ""}>'
    o+=f'<circle cx="{GX}" cy="{GY}" r="{GR}" fill="url(#air)"/>'
    # soil band under the disc
    o+=f'<path d="M{DX-DRX} {DY} A{DRX} {DRY} 0 0 0 {DX+DRX} {DY} L{DX+DRX} {DY+52} A{DRX} {DRY} 0 0 1 {DX-DRX} {DY+52}Z" fill="url(#soil)"/>'
    rr=random.Random(3)
    for k in range(70):
        a=rr.uniform(.15,math.pi-.15); X=DX+math.cos(a)*DRX*rr.uniform(.9,1); Y=DY+math.sin(a)*DRY+rr.uniform(8,48)
        o+=f'<ellipse cx="{X:.0f}" cy="{Y:.0f}" rx="{rr.uniform(3,8):.0f}" ry="{rr.uniform(2,5):.0f}" fill="{rr.choice(["#c9b48a","#8d7b62","#b7aa92","#5a4636"])}"/>'
    o+=f'<path d="M{DX-DRX} {DY+20} A{DRX} {DRY} 0 0 0 {DX+DRX} {DY+20}" fill="none" stroke="#2a1a12" stroke-width="2" opacity=".5"/>'
    o+=f'<g transform="translate({DX} {DY}) scale(1 .62)">{world_disc()}</g>'
    o+=f'<ellipse cx="{DX}" cy="{DY}" rx="{DRX}" ry="{DRY}" fill="url(#dusk2)"/>'
    o+=world_sprites()
    if dim: o+=f'<circle cx="{GX}" cy="{GY}" r="{GR}" fill="#0c0814" opacity="{dim}"/>'
    o+='</g>'+sphere_glass()+cradle_front()
    return o
# ---------- Watch: path network ----------
def build_graph():
    r=random.Random(12); N={}; E=[]
    N['c']=(0,0)
    for i,a in enumerate([-90,0,90,180]): N[f'g{i}']=(math.cos(math.radians(a))*5.6,math.sin(math.radians(a))*5.6)
    for i in range(8):
        a=math.radians(-67.5+i*45); rr=8.8+r.uniform(-.7,.7); N[f'a{i}']=(math.cos(a)*rr,math.sin(a)*rr)
    for i in range(10):
        a=math.radians(-90+i*36+r.uniform(-6,6)); rr=15+r.uniform(-1.4,1.4); N[f'b{i}']=(math.cos(a)*rr,math.sin(a)*rr)
    sp=[('Hollow Gate',(0,-23.5)),('Mossy Cave',(-22.5,7)),('Ravine Stair',(22.4,8)),("Old King's Road",(-16.5,-17.5)),('Bog Mouth',(16.5,-17.5)),('Sunken Arch',(3,23.5))]
    for i,(n,p) in enumerate(sp): N[f's{i}']=p
    d=lambda a,b: math.dist(N[a],N[b])
    for i in range(4): E.append(('c',f'g{i}'))
    gate_a={0:['a7','a0'],1:['a1','a2'],2:['a3','a4'],3:['a5','a6']}
    for g,al in gate_a.items():
        for a in al: E.append((f'g{g}',a))
    for i in range(8):
        if i!=3: E.append((f'a{i}',f'a{(i+1)%8}'))
    for i in range(8):
        nb=sorted(range(10),key=lambda j:d(f'a{i}',f'b{j}'))[:2 if i%2==0 else 1]
        for j in nb: E.append((f'a{i}',f'b{j}'))
    for i in range(10):
        if i not in (1,5,8): E.append((f'b{i}',f'b{(i+1)%10}'))
    for k in range(6):
        nb=sorted(range(10),key=lambda j:d(f's{k}',f'b{j}'))[:2]
        for j in nb: E.append((f's{k}',f'b{j}'))
    E=list(dict.fromkeys(tuple(sorted(e)) for e in E))
    curves={}
    for a,b in E:
        (ax,az),(bx,bz)=N[a],N[b]; mx,mz=(ax+bx)/2,(az+bz)/2; L=math.dist(N[a],N[b]); nx,nz=-(bz-az)/L,(bx-ax)/L; k=r.uniform(-.18,.18)*L
        curves[(a,b)]=[N[a],(mx+nx*k,mz+nz*k),N[b]]
    return N,E,curves,sp
N,E,CURVES,SP=build_graph()
LAKE2=(11.8,-1.0,2.0)
def wopen(x,z):
    d=math.hypot(x,z)-5.6
    for c in CURVES.values(): d=min(d,min(dseg(x,z,c[i],c[i+1]) for i in range(2))-.62)
    for k in range(6): d=min(d,math.dist((x,z),N[f's{k}'])-1.3)
    return d
def route(src,blocked=()):
    adj={}
    for (a,b),c in CURVES.items():
        if (a,b) in blocked or (b,a) in blocked: continue
        L=math.dist(c[0],c[1])+math.dist(c[1],c[2]); adj.setdefault(a,[]).append((b,L)); adj.setdefault(b,[]).append((a,L))
    dist={src:0}; prev={}; q=[(0,src)]
    while q:
        dd,u=heapq.heappop(q)
        if u=='c': break
        if dd>dist[u]: continue
        for v,L in adj.get(u,[]):
            if dd+L<dist.get(v,1e9): dist[v]=dd+L; prev[v]=u; heapq.heappush(q,(dd+L,v))
    path=['c']
    while path[-1]!=src: path.append(prev[path[-1]])
    return path[::-1], dist['c']
def route_pts(nodes):
    pts=[]
    for a,b in zip(nodes,nodes[1:]):
        c=CURVES.get((a,b)) or CURVES.get((b,a))[::-1]
        # sample the quadratic-ish polyline via catmull: just use the 3 points densified
        for i in range(2):
            for t in [k/6 for k in range(6)]:
                pts.append((c[i][0]+(c[i+1][0]-c[i][0])*t, c[i][1]+(c[i+1][1]-c[i][1])*t))
    pts.append((0,0)); return pts
def along(pts,ts):
    L=[math.dist(pts[i],pts[i+1]) for i in range(len(pts)-1)]; tot=sum(L); out=[]
    for t in ts:
        d=t*tot
        for i,l in enumerate(L):
            if d<=l or i==len(L)-1:
                a,b=pts[i],pts[i+1]; k=d/l if l else 0; out.append((a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,math.atan2(b[0]-a[0],b[1]-a[1]))); break
            d-=l
    return out
BLOCK=[('a0','g0'),('a7','g0')]
def watch_map(s,cx,cy,clipr,night=False,battle=False):
    T=lambda x,z:(cx+x*s,cy+z*s); r=random.Random(3); o=[]
    o.append(f'<clipPath id="wm{clipr}"><circle cx="{cx}" cy="{cy}" r="{clipr}"/></clipPath><g clip-path="url(#wm{clipr})"><circle cx="{cx}" cy="{cy}" r="{clipr}" fill="#2a1d1c"/>')
    for i in range(900):
        x=r.uniform(-28,28); z=r.uniform(-28,28)
        if wopen(x,z)<.15: continue
        X,Y=T(x,z); o.append(f'<use href="#leaf" x="-10" y="-5" width="20" height="10" fill="{r.choice(D.LEAF)}" opacity="{r.uniform(.5,.85):.2f}" transform="translate({X:.0f} {Y:.0f}) rotate({r.uniform(0,360):.0f}) scale({r.uniform(.7,1.5):.2f})"/>')
    for c in CURVES.values():
        d=smooth(c,T); o.append(f'<path d="{d}" fill="none" stroke="#6e5840" stroke-width="{1.0*s+4:.1f}" stroke-linecap="round"/>')
    for c in CURVES.values():
        d=smooth(c,T); o.append(f'<path d="{d}" fill="none" stroke="#a88d68" stroke-width="{1.0*s:.1f}" stroke-linecap="round"/>')
    o.append(f'<circle cx="{cx}" cy="{cy}" r="{5.6*s+4}" fill="#a88d68"/><circle cx="{cx}" cy="{cy}" r="{5.0*s}" fill="#4f6e3a"/>')
    X,Y=T(LAKE2[0],LAKE2[1]); o.append(f'<ellipse cx="{X}" cy="{Y}" rx="{LAKE2[2]*s+3}" ry="{LAKE2[2]*s*.85+3}" fill="#5a4636"/><ellipse cx="{X}" cy="{Y}" rx="{LAKE2[2]*s}" ry="{LAKE2[2]*s*.85}" fill="url(#puddle)"/>'+''.join(f'<circle cx="{X+r.uniform(-18,18):.0f}" cy="{Y+r.uniform(-12,12):.0f}" r="1" fill="#e9eaff"/>' for _ in range(7)))
    pts=scatter(41,-28,28,-28,28,1.05,lambda x,z: wopen(x,z)>.35 and math.dist((x,z),LAKE2[:2])>LAKE2[2]+.8); pts.sort(key=lambda p:p[1])
    for x,z,a,b in pts:
        X,Y=T(x,z); far=math.hypot(x,z)>18
        if b<.5 or (far and b<.8):
            rad=s*(.62+a*.5)*(1.25 if far else 1); c=D.MOSS[int(a*4)] if not far else ['#1e4430','#24503a','#2a5a3c','#1a3a2a'][int(a*4)]
            o.append(f'<g filter="url(#lift)"><circle cx="{X:.1f}" cy="{Y:.1f}" r="{rad:.1f}" fill="{c}"/><circle cx="{X-rad*.3:.1f}" cy="{Y-rad*.3:.1f}" r="{rad*.45:.1f}" fill="#8fc45a" opacity=".2"/></g>')
        elif b<.8:
            rad=s*(.3+a*.2); ang=a*6
            o.append(f'<g filter="url(#lift)" fill="#4f9a4a" stroke="#2c5a2c" stroke-width="1">'+''.join(f'<path d="M{X:.1f} {Y:.1f} q{math.cos(ang+k*2.09-0.6)*rad*2:.1f} {math.sin(ang+k*2.09-0.6)*rad*2:.1f} {math.cos(ang+k*2.09)*rad*2:.1f} {math.sin(ang+k*2.09)*rad*2:.1f} q{-math.cos(ang+k*2.09+0.6)*rad*.9:.1f} {-math.sin(ang+k*2.09+0.6)*rad*.9:.1f} {-math.cos(ang+k*2.09)*rad*2:.1f} {-math.sin(ang+k*2.09)*rad*2:.1f}z"/>' for k in range(3))+'</g>')
        elif b<.88:
            rad=s*(.4+a*.35); red=a<.7
            if not red: o.append(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="{rad*1.8:.1f}" fill="url(#vg)"/>')
            o.append(f'<g filter="url(#lift)"><circle cx="{X:.1f}" cy="{Y:.1f}" r="{rad:.1f}" fill="{"#c43d36" if red else "#7b55c9"}" stroke="#2a0f14" stroke-width="1.1"/>'+(f'<circle cx="{X+rad*.3:.1f}" cy="{Y-rad*.2:.1f}" r="{rad*.18:.1f}" fill="#f6ead2"/><circle cx="{X-rad*.35:.1f}" cy="{Y+rad*.2:.1f}" r="{rad*.14:.1f}" fill="#f6ead2"/>' if red else '')+'</g>')
        else:
            rad=s*(.9+a*.5)
            o.append(f'<g filter="url(#lift)"><circle cx="{X+3:.1f}" cy="{Y+4:.1f}" r="{rad:.1f}" fill="#000" opacity=".3"/><circle cx="{X:.1f}" cy="{Y:.1f}" r="{rad:.1f}" fill="#1e4430"/><circle cx="{X-rad*.25:.1f}" cy="{Y-rad*.3:.1f}" r="{rad*.6:.1f}" fill="#2f6440"/><circle cx="{X-rad*.35:.1f}" cy="{Y-rad*.4:.1f}" r="{rad*.25:.1f}" fill="#55893e" opacity=".6"/></g>')
    # village
    R=3*s; col=['#c4553b','#2f8f8a','#d9a23a','#7b4a9a','#3f6fb0']
    o.append(f'<g filter="url(#lift)"><ellipse cx="{cx}" cy="{cy}" rx="{R+12}" ry="{R+10}" fill="#9c9893"/></g>')
    for i,(deg,rr,n) in enumerate(D.BUILD):
        x,z=D.bpos(deg,rr); X,Y=T(x,z); a=math.degrees(math.atan2(z,x))+90
        o.append(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="13" fill="url(#eg)"/><g transform="translate({X:.1f} {Y:.1f}) rotate({a:.0f})" filter="url(#lift)"><rect x="-7" y="-5" width="14" height="10" rx="1" fill="{col[i%5]}" stroke="#1d1712" stroke-width="1.1"/><path d="M-7 0 h14" stroke="#1d1712"/></g>')
    o.append(''.join(f'<circle cx="{cx+math.cos(t)*R:.1f}" cy="{cy+math.sin(t)*R:.1f}" r="2.6" fill="#5a3e22"/>' for t in [k*math.tau/42 for k in range(42)]))
    o.append(f'<circle cx="{cx}" cy="{cy}" r="60" fill="url(#eg)"/><g filter="url(#lift)"><circle cx="{cx}" cy="{cy}" r="14" fill="#b9b3aa" stroke="#2c2620" stroke-width="1.5"/><circle cx="{cx}" cy="{cy}" r="9" fill="#c4553b" stroke="#2c2620" stroke-width="1.3"/><circle cx="{cx}" cy="{cy}" r="3" fill="#ffe08a"/></g>')
    # burrows
    for k,(n,p) in enumerate(SP):
        X,Y=T(*p); act=k<2
        if act: o.append(f'<circle cx="{X}" cy="{Y}" r="42" fill="url(#vg)"/>')
        o.append(f'<path d="M{X-20} {Y-6} q9 -13 20 -7 q13 -6 20 7" stroke="#4a2e1e" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="{X}" cy="{Y+2}" rx="12" ry="8" fill="#0d070a"/>')
    # barricades
    for a,b in BLOCK:
        c=CURVES.get((a,b)) or CURVES.get((b,a)); X,Y=T(*c[1]); ang=math.degrees(math.atan2(c[2][1]-c[0][1],c[2][0]-c[0][0]))+90
        o.append(f'<g transform="translate({X:.1f} {Y:.1f}) rotate({ang:.0f}) scale(1.5)" filter="url(#lift)"><rect x="-15" y="-4" width="30" height="8" rx="2" fill="#a07a4e" stroke="#2a1d1c" stroke-width="1.3"/><path d="M-10 -10 L-4 10 M10 -10 L4 10" stroke="#5a3e22" stroke-width="4" stroke-linecap="round"/><path d="M-12 -2 h24" stroke="#c9a06a" stroke-width="1.2"/></g>')
    # routes
    blocked_path,_=route('s0'); new_path,_=route('s0',BLOCK); west,_=route('s1',BLOCK)
    if not battle:
        rp=route_pts(route('s0')[0]); 
        o.append(f'<path d="{smooth(rp[::3]+[(0,0)],T)}" fill="none" stroke="#e0603e" stroke-width="3" stroke-dasharray="3 7" stroke-linecap="round" opacity=".8"/>')
        for nodes in (new_path,west):
            o+=[f'<circle cx="{T(x,z)[0]:.1f}" cy="{T(x,z)[1]:.1f}" r="2.2" fill="#ffe08a"/>' for x,z,_ in along(route_pts(nodes),[i/60 for i in range(60)])]
    if night: o.append(f'<circle cx="{cx}" cy="{cy}" r="{clipr}" fill="#1a1450" opacity=".3"/><circle cx="{cx}" cy="{cy}" r="70" fill="url(#eg)"/>')
    else: o.append(f'<circle cx="{cx}" cy="{cy}" r="{clipr}" fill="url(#dusk2)"/>')
    if battle:
        o.append(f'<circle cx="{cx}" cy="{cy}" r="{8.5*s}" fill="none" stroke="#ffd27a" stroke-opacity=".5" stroke-width="1.5" stroke-dasharray="2 6" stroke-linecap="round"/>')
        ens=[]
        for nodes,ts,sym in ((new_path,[.38,.45,.52,.6,.68],'gob'),(west,[.42,.52],'wolf'),(west,[.7],'gob')):
            for x,z,h in along(route_pts(nodes),ts): ens.append((x,z,h,sym))
        for x,z,h,sym in ens:
            X,Y=T(x,z); o.append(f'<circle cx="{X:.1f}" cy="{Y-6:.1f}" r="16" fill="url(#eg)"/>'+place(sym,X,Y,1.15,*((28,28) if sym=='gob' else (36,22)),flip=math.sin(h)<0))
            if (abs(x)+abs(z))%3<1.4: o.append(f'<rect x="{X-12:.1f}" y="{Y-38:.1f}" width="24" height="4" rx="2" fill="#2a1414"/><rect x="{X-12:.1f}" y="{Y-38:.1f}" width="{10+abs(x)%12:.1f}" height="4" rx="2" fill="#e0603e"/>')
        for x,z,_,_ in ens[:6]:
            X,Y=T(x,z); a=math.atan2(Y-cy,X-cx); k=.6
            if math.hypot(X-cx,Y-cy)<8.5*s+20: o.append(f'<path d="M{cx+(X-cx)*k:.1f} {cy+(Y-cy)*k:.1f} l{math.cos(a)*14:.1f} {math.sin(a)*14:.1f}" stroke="#f3e2bf" stroke-width="2" stroke-linecap="round"/>')
    o+= [f'<circle cx="{cx+r.uniform(-clipr,clipr):.0f}" cy="{cy+r.uniform(-clipr,clipr):.0f}" r="7" fill="url(#gl)"/>' for _ in range(20)]
    o.append('</g>'); return ''.join(o)
