import math, random
from geo import dseg, smooth
S=96; K=.6
def hgt(x,z):
    return .62*math.exp(-((x+2.5)**2+(z+2.3)**2)/2.6)+.45*math.exp(-((z+6.2)**2)/2.2)+.3*math.exp(-((x-1.6)**2+(z+2.8)**2)/1.4)+.25*math.exp(-((x+4.6)**2+(z-1.5)**2)/2)
STREAM=[(3.3,-7),(2.9,-4.2),(3.9,-2.2),(3.6,.6),(4.3,3.2),(4.0,7)]
def P(cx,cy,x,z,up=0): return (cx+x*S, cy+z*S*K-(hgt(x,z)+up)*S*.9)
def ground(cx,cy):
    o=[]; st=.22
    zs=[ -7.4+i*st for i in range(int(14.8/st)+1)]; xs=[-5.2+i*st for i in range(int(10.4/st)+1)]
    r=random.Random(2)
    for z in zs:
        for x in xs:
            h=hgt(x,z); sx=(hgt(x+.05,z)-hgt(x-.05,z))/.1; sz=(hgt(x,z+.05)-hgt(x,z-.05))/.1
            light=-sx*.6-sz*.9
            near=min(dseg(x,z,STREAM[i],STREAM[i+1]) for i in range(len(STREAM)-1))
            base=(86,122,62) if h<.2 else (98,132,68)
            if math.hypot(x,z)<1.4: base=(178,154,115)
            f=1+light*.35+(r.random()-.5)*.06
            c=tuple(max(0,min(255,int(v*f))) for v in base)
            q=[P(cx,cy,x,z),P(cx,cy,x+st,z),P(cx,cy,x+st,z+st),P(cx,cy,x,z+st)]
            o.append(f'<path d="M{q[0][0]:.1f} {q[0][1]:.1f} L{q[1][0]:.1f} {q[1][1]:.1f} L{q[2][0]:.1f} {q[2][1]:.1f} L{q[3][0]:.1f} {q[3][1]:.1f}Z" fill="rgb{c}" stroke="rgb{c}" stroke-width=".6"/>')
    # stream
    pts=[P(cx,cy,x,z,-.02) for x,z in STREAM]
    d='M'+' L'.join(f'{x:.1f} {y:.1f}' for x,y in pts)
    o.append(f'<path d="{d}" fill="none" stroke="#3d5a34" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/><path d="{d}" fill="none" stroke="#2e4a8a" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/><path d="{d}" fill="none" stroke="#8fb0ff" stroke-width="2" stroke-dasharray="10 22" opacity=".7"/>')
    # paths
    def lane(pts,w):
        pp=[P(cx,cy,x,z,.005) for x,z in pts]; d='M'+' L'.join(f'{x:.1f} {y:.1f}' for x,y in pp)
        return f'<path d="{d}" fill="none" stroke="#7e6748" stroke-width="{w+4}" stroke-linecap="round" stroke-linejoin="round"/><path d="{d}" fill="none" stroke="#b39a73" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'
    for pts,w in [([(0,1.2),(0,2.2),(.15,3.0),(0,4.6),(-.4,7)],22),([(0,-1.2),(-.3,-2.4),(0,-3),(.6,-4.6),(.2,-7.5)],18),([(-1.2,.2),(-2.2,.5),(-3,.2),(-5.5,.8)],16),([(1.2,.1),(2.3,.4),(3,.2),(3.8,-.1),(5.5,.4)],16),([(.9,.9),(1.4,1.6)],12),([(-.9,.9),(-1.4,1.4)],12),([(-.8,-.9),(-1.6,-1.7)],10),([(.8,-.9),(1.4,-1.2)],10)]:
        o.append(lane(pts,w))
    return ''.join(o)
def spruce(X,Y,h,dark='#24503a',light='#2f6440'):
    w=h*.42
    tiers=''.join(f'<path d="M{X-w*(1-i*.22):.1f} {Y-h*(.18+i*.24):.1f} L{X:.1f} {Y-h*(.5+i*.22):.1f} L{X+w*(1-i*.22):.1f} {Y-h*(.18+i*.24):.1f}Z" fill="{dark}" stroke="#14261c" stroke-width="1.2"/><path d="M{X:.1f} {Y-h*(.5+i*.22):.1f} L{X+w*(1-i*.22):.1f} {Y-h*(.18+i*.24):.1f} L{X:.1f} {Y-h*(.18+i*.24):.1f}Z" fill="{light}" opacity=".7"/>' for i in range(3))
    return f'<ellipse cx="{X+6:.1f}" cy="{Y:.1f}" rx="{w*.9:.1f}" ry="{w*.35:.1f}" fill="#000" opacity=".28"/><rect x="{X-2.5:.1f}" y="{Y-h*.22:.1f}" width="5" height="{h*.22:.1f}" fill="#5a3e22"/>'+tiers
def oak(X,Y,h,c='#41763a'):
    r=h*.32
    return f'<ellipse cx="{X+6:.1f}" cy="{Y:.1f}" rx="{r*1.1:.1f}" ry="{r*.4:.1f}" fill="#000" opacity=".28"/><rect x="{X-3:.1f}" y="{Y-h*.45:.1f}" width="6" height="{h*.45:.1f}" fill="#6b4a2e" stroke="#2a1d1c" stroke-width="1"/><circle cx="{X:.1f}" cy="{Y-h*.62:.1f}" r="{r:.1f}" fill="{c}" stroke="#14261c" stroke-width="1.2"/><circle cx="{X-r*.55:.1f}" cy="{Y-h*.5:.1f}" r="{r*.7:.1f}" fill="{c}" stroke="#14261c" stroke-width="1.2"/><circle cx="{X+r*.55:.1f}" cy="{Y-h*.52:.1f}" r="{r*.72:.1f}" fill="{c}" stroke="#14261c" stroke-width="1.2"/><circle cx="{X-r*.3:.1f}" cy="{Y-h*.75:.1f}" r="{r*.38:.1f}" fill="#8fc45a" opacity=".45"/>'
def house(X,Y,w,roof,name=None,chim=True,sign=None,mirror=False):
    hw=w*.5; rh=w*.42
    o=f'<ellipse cx="{X+8:.1f}" cy="{Y+2:.1f}" rx="{w*.62:.1f}" ry="{w*.14:.1f}" fill="#000" opacity=".3"/>'
    o+=f'<rect x="{X-w/2:.1f}" y="{Y-hw:.1f}" width="{w:.1f}" height="{hw:.1f}" fill="#eadbbd" stroke="#2a1d1c" stroke-width="1.6"/>'
    o+=''.join(f'<path d="M{X-w/2+k:.1f} {Y-hw:.1f} V{Y:.1f}" stroke="#7a5a3e" stroke-width="2"/>' for k in (w*.08,w*.92))+f'<path d="M{X-w/2:.1f} {Y-hw*.5:.1f} H{X+w/2:.1f}" stroke="#7a5a3e" stroke-width="1.5"/>'
    dx=-w*.18 if not mirror else w*.18
    o+=f'<path d="M{X+dx-5:.1f} {Y:.1f} v-12 a5 5 0 0 1 10 0 v12z" fill="#5a3a22" stroke="#2a1d1c" stroke-width="1.2"/>'
    o+=f'<rect x="{X-dx-6:.1f}" y="{Y-hw*.78:.1f}" width="12" height="10" rx="1.5" fill="#ffd27a" stroke="#2a1d1c" stroke-width="1.2"/><path d="M{X-dx:.1f} {Y-hw*.78:.1f} v10 M{X-dx-6:.1f} {Y-hw*.78+5:.1f} h12" stroke="#2a1d1c" stroke-width=".8"/><rect x="{X-dx-8:.1f}" y="{Y-hw*.78+10:.1f}" width="16" height="4" fill="#7a4a26"/><circle cx="{X-dx-4:.1f}" cy="{Y-hw*.78+9:.1f}" r="2" fill="#e98fb5"/><circle cx="{X-dx+3:.1f}" cy="{Y-hw*.78+9:.1f}" r="2" fill="#f2c14e"/>'
    o+=f'<path d="M{X-w/2-7:.1f} {Y-hw+1:.1f} L{X-w/2+5:.1f} {Y-hw-rh:.1f} L{X+w/2-5:.1f} {Y-hw-rh:.1f} L{X+w/2+7:.1f} {Y-hw+1:.1f}Z" fill="{roof}" stroke="#2a1d1c" stroke-width="1.6"/>'
    o+=''.join(f'<path d="M{X-w/2-7+4*k*.33:.1f} {Y-hw+1-rh*k*.33:.1f} H{X+w/2+7-4*k*.33:.1f}" stroke="#000" stroke-opacity=".2" stroke-width="1.2"/>' for k in (1,2))
    o+=f'<path d="M{X-w/2+5:.1f} {Y-hw-rh:.1f} H{X+w/2-5:.1f}" stroke="#2a1d1c" stroke-width="2.4" stroke-linecap="round"/>'
    if chim:
        cxp=X+w*.22*(1 if not mirror else -1)
        o+=f'<rect x="{cxp-4:.1f}" y="{Y-hw-rh*.95:.1f}" width="8" height="{rh*.55:.1f}" fill="#8a7a6a" stroke="#2a1d1c" stroke-width="1.2"/><circle cx="{cxp+2:.1f}" cy="{Y-hw-rh*1.2:.1f}" r="4" fill="#d9d4cc" opacity=".45"/><circle cx="{cxp+6:.1f}" cy="{Y-hw-rh*1.5:.1f}" r="5.5" fill="#d9d4cc" opacity=".3"/><circle cx="{cxp+12:.1f}" cy="{Y-hw-rh*1.85:.1f}" r="7" fill="#d9d4cc" opacity=".18"/>'
    if sign: o+=f'<path d="M{X+w/2:.1f} {Y-hw*.8:.1f} h10" stroke="#2a1d1c" stroke-width="2"/><rect x="{X+w/2+4:.1f}" y="{Y-hw*.8:.1f}" width="14" height="11" rx="2" fill="{sign}" stroke="#2a1d1c" stroke-width="1.2"/>'
    o=f'<circle cx="{X:.1f}" cy="{Y-hw*.5:.1f}" r="{w*.9:.1f}" fill="url(#eg)"/>'+o
    return o
def ruin(X,Y,w,sel=False):
    hw=w*.45
    o=f'<ellipse cx="{X+8:.1f}" cy="{Y+2:.1f}" rx="{w*.6:.1f}" ry="{w*.13:.1f}" fill="#000" opacity=".28"/>'
    o+=f'<path d="M{X-w/2:.1f} {Y:.1f} V{Y-hw:.1f} L{X-w*.3:.1f} {Y-hw*.7:.1f} L{X-w*.18:.1f} {Y-hw*1.1:.1f} L{X-w*.02:.1f} {Y-hw*.55:.1f} L{X+w*.1:.1f} {Y-hw*.62:.1f} L{X+w*.22:.1f} {Y-hw*.3:.1f} L{X+w/2:.1f} {Y-hw*.45:.1f} V{Y:.1f}Z" fill="#a39e95" stroke="#2a2622" stroke-width="1.5"/>'
    o+=''.join(f'<path d="M{X-w/2:.1f} {Y-hw*k:.1f} H{X+w/2:.1f}" stroke="#2a2622" stroke-opacity=".25"/>' for k in (.25,.5,.75))
    o+=f'<path d="M{X-w*.1:.1f} {Y:.1f} v-12 a5 5 0 0 1 10 0 v12z" fill="#2a2622"/><path d="M{X-w*.45:.1f} {Y-hw*.2:.1f} L{X+w*.3:.1f} {Y-hw*1.25:.1f}" stroke="#6b4a2e" stroke-width="4" stroke-linecap="round"/><path d="M{X+w*.15:.1f} {Y-hw*.5:.1f} L{X+w*.55:.1f} {Y+2:.1f}" stroke="#6b4a2e" stroke-width="3.5" stroke-linecap="round"/>'
    o+=f'<circle cx="{X-w*.35:.1f}" cy="{Y-hw*.85:.1f}" r="6" fill="#41763a"/><circle cx="{X+w*.38:.1f}" cy="{Y-hw*.4:.1f}" r="5" fill="#55893e"/><circle cx="{X-w*.5:.1f}" cy="{Y-2:.1f}" r="7" fill="#41763a"/>'
    if sel: o=f'<ellipse cx="{X:.1f}" cy="{Y-4:.1f}" rx="{w*.8:.1f}" ry="{w*.32:.1f}" fill="none" stroke="#ffe08a" stroke-width="3" stroke-dasharray="9 6"/>'+o
    return o
def tower(X,Y):
    o=f'<ellipse cx="{X+16}" cy="{Y+2}" rx="60" ry="16" fill="#000" opacity=".3"/><circle cx="{X}" cy="{Y-230}" r="150" fill="url(#warm)"/>'
    o+=f'<path d="M{X-34} {Y} V{Y-200} H{X+34} V{Y}Z" fill="#c2b8a6" stroke="#2a1d1c" stroke-width="2.2"/><ellipse cx="{X}" cy="{Y}" rx="34" ry="9" fill="#a89e8c" stroke="#2a1d1c" stroke-width="2"/>'
    o+=f'<path d="M{X+8} {Y} V{Y-200} H{X+34} V{Y}Z" fill="#000" opacity=".14"/>'+''.join(f'<path d="M{X-34} {Y-k} H{X+34}" stroke="#2a1d1c" stroke-opacity=".18"/>' for k in range(20,200,22))
    o+=f'<path d="M{X-8} {Y} v-28 a8 8 0 0 1 16 0 v28z" fill="#5a3a22" stroke="#2a1d1c" stroke-width="1.5"/><rect x="{X-6}" y="{Y-110}" width="12" height="18" rx="6" fill="#ffd27a" stroke="#2a1d1c" stroke-width="1.5"/><rect x="{X-6}" y="{Y-160}" width="12" height="18" rx="6" fill="#ffd27a" stroke="#2a1d1c" stroke-width="1.5"/>'
    o+=f'<ellipse cx="{X}" cy="{Y-200}" rx="48" ry="12" fill="#a39886" stroke="#2a1d1c" stroke-width="2"/><path d="M{X-48} {Y-200} V{Y-224} H{X+48} V{Y-200}" fill="#b9ae9a" stroke="#2a1d1c" stroke-width="2"/>'+''.join(f'<rect x="{X-48+k*14}" y="{Y-232}" width="8" height="10" fill="#b9ae9a" stroke="#2a1d1c" stroke-width="1.4"/>' for k in range(7))
    o+=f'<rect x="{X-36}" y="{Y-222}" width="72" height="12" fill="#ffd27a"/>'+''.join(f'<g><circle cx="{X+dx}" cy="{Y-236}" r="5" fill="#e8c7a8" stroke="#2a1d1c"/><path d="M{X+dx-5} {Y-231} h10 v8 h-10z" fill="#3f6fb0" stroke="#2a1d1c"/><path d="M{X+dx+5} {Y-244} q7 8 0 16" stroke="#7a4a26" stroke-width="1.6" fill="none"/></g>' for dx in (-28,-8,12,30))
    o+=f'<path d="M{X-54} {Y-238} L{X} {Y-318} L{X+54} {Y-238}Z" fill="#c4553b" stroke="#2a1d1c" stroke-width="2.2"/><path d="M{X} {Y-318} L{X+54} {Y-238} L{X+14} {Y-238}Z" fill="#000" opacity=".16"/><path d="M{X} {Y-318} v-24" stroke="#2a1d1c" stroke-width="2"/><path d="M{X} {Y-342} l22 6 l-22 7z" fill="#d9a23a" stroke="#2a1d1c" stroke-width="1.4"/>'
    return o
def villager(X,Y,c,hair='#5a3a22',carry=None,face=1):
    o=f'<ellipse cx="{X+2:.1f}" cy="{Y+1:.1f}" rx="9" ry="3" fill="#000" opacity=".3"/><path d="M{X-7:.1f} {Y:.1f} q-1 -15 7 -16 q8 1 7 16z" fill="{c}" stroke="#2a1d1c" stroke-width="1.3"/><circle cx="{X:.1f}" cy="{Y-21:.1f}" r="7" fill="#e8c7a8" stroke="#2a1d1c" stroke-width="1.3"/><path d="M{X-7:.1f} {Y-22:.1f} q7 -10 14 0 q-7 -4 -14 0z" fill="{hair}"/><circle cx="{X-2.4*face:.1f}" cy="{Y-20:.1f}" r="1.1" fill="#2a1d1c"/><circle cx="{X+2.4*face:.1f}" cy="{Y-20:.1f}" r="1.1" fill="#2a1d1c"/>'
    if carry=='lantern': o+=f'<circle cx="{X+11:.1f}" cy="{Y-8:.1f}" r="16" fill="url(#eg)"/><rect x="{X+8:.1f}" y="{Y-12:.1f}" width="6" height="8" rx="2" fill="#ffd27a" stroke="#2a1d1c"/>'
    if carry=='basket': o+=f'<path d="M{X-14:.1f} {Y-10:.1f} h10 l-2 7 h-6z" fill="#a8642a" stroke="#2a1d1c"/><circle cx="{X-11:.1f}" cy="{Y-11:.1f}" r="2" fill="#c43d36"/>'
    if carry=='axe': o+=f'<path d="M{X+8:.1f} {Y-4:.1f} L{X+14:.1f} {Y-22:.1f}" stroke="#6b4a2e" stroke-width="2.4"/><path d="M{X+12:.1f} {Y-24:.1f} l6 2 l-3 5z" fill="#9aa0a6" stroke="#2a1d1c"/>'
    return o
def hearth(cx,cy,rx,ry):
    r=random.Random(5); g=cy+60
    o=[f'<clipPath id="hl"><ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"/></clipPath><g clip-path="url(#hl)"><rect x="{cx-rx}" y="{cy-ry}" width="{2*rx}" height="{2*ry}" fill="#355a3a"/>',ground(cx,g)]
    items=[]
    def add(x,z,svg_fn): X,Y=P(cx,g,x,z); items.append((Y,svg_fn(X,Y)))
    # forest ring outside palisade
    for i in range(420):
        x=r.uniform(-5.2,5.2); z=r.uniform(-7.2,7.2); d=math.hypot(x,z)
        if d<3.55: continue
        if min(dseg(x,z,(0,3),(-.4,7)),dseg(x,z,(0,-3),(.2,-7.5)),dseg(x,z,(-3,.2),(-5.5,.8)),dseg(x,z,(3.8,-.1),(5.5,.4)))<.45: continue
        if min(dseg(x,z,STREAM[k],STREAM[k+1]) for k in range(len(STREAM)-1))<.35: continue
        if r.random()<.18*min(1,(d-3.5)) and d<4.4: continue
        h=r.uniform(60,104)
        if r.random()<.7: add(x,z,lambda X,Y,h=h,c=r.random():spruce(X,Y,h,['#24503a','#1e4430','#2f6440'][int(c*3)]))
        else: add(x,z,lambda X,Y,h=h,c=r.random():oak(X,Y,h*.85,['#41763a','#55893e','#3a6a34'][int(c*3)]))
    # mushrooms and rocks near the edge
    for i in range(26):
        a=r.uniform(0,math.tau); d=r.uniform(3.45,4.2); x,z=math.cos(a)*d,math.sin(a)*d
        if r.random()<.5: add(x,z,lambda X,Y,c=r.random():(f'<circle cx="{X:.0f}" cy="{Y-6:.0f}" r="16" fill="url(#vg)"/>' if c<.4 else '')+f'<path d="M{X-1.5:.0f} {Y:.0f} v-7 h3 v7z" fill="#efe3cf"/><path d="M{X-7:.0f} {Y-6:.0f} q7 -10 14 0z" fill="{"#7b55c9" if c<.4 else "#c43d36"}" stroke="#2a0f14" stroke-width="1"/>')
        else: add(x,z,lambda X,Y,s=r.uniform(7,13):f'<ellipse cx="{X:.0f}" cy="{Y-s*.4:.0f}" rx="{s:.0f}" ry="{s*.7:.0f}" fill="#8a8580" stroke="#2a2622" stroke-width="1.2"/><ellipse cx="{X-s*.3:.0f}" cy="{Y-s*.6:.0f}" rx="{s*.35:.0f}" ry="{s*.2:.0f}" fill="#b9b4ad"/><circle cx="{X+s*.4:.0f}" cy="{Y-s*.7:.0f}" r="{s*.3:.0f}" fill="#41763a"/>')
    # palisade
    n=86
    for k in range(n):
        a=k/n*math.tau; x,z=math.cos(a)*3.2,math.sin(a)*3.2
        if abs(a-math.pi/2)<.12: continue
        add(x,z,lambda X,Y,t=k%3:f'<path d="M{X-4:.1f} {Y:.1f} V{Y-30-t*3:.1f} L{X:.1f} {Y-38-t*3:.1f} L{X+4:.1f} {Y-30-t*3:.1f} V{Y:.1f}Z" fill="{["#8a6a46","#7a5a3a","#94744e"][t]}" stroke="#2c1d10" stroke-width="1.1"/>')
    # gate with lanterns
    add(0,3.25,lambda X,Y:f'<path d="M{X-30} {Y} V{Y-52} M{X+30} {Y} V{Y-52}" stroke="#5a3e22" stroke-width="8"/><path d="M{X-36} {Y-50} H{X+36}" stroke="#5a3e22" stroke-width="7"/><circle cx="{X-30}" cy="{Y-40}" r="22" fill="url(#eg)"/><circle cx="{X+30}" cy="{Y-40}" r="22" fill="url(#eg)"/><rect x="{X-34}" y="{Y-46}" width="8" height="10" rx="2" fill="#ffd27a" stroke="#2a1d1c"/><rect x="{X+26}" y="{Y-46}" width="8" height="10" rx="2" fill="#ffd27a" stroke="#2a1d1c"/>')
    # bridge over the stream on the east road
    add(3.75,0.0,lambda X,Y:f'<path d="M{X-30} {Y-2} q30 -18 60 0 v8 q-30 -16 -60 0z" fill="#8a6a46" stroke="#2c1d10" stroke-width="1.5"/>'+''.join(f'<path d="M{X-26+k*10} {Y-6-abs(k-2.5)*-1.5} v-12" stroke="#5a3e22" stroke-width="2"/>' for k in range(6)))
    # buildings, placed on the land
    B=[(1.15,1.55,108,'#c4553b','Town Hall',dict(sign='#d9a23a')),(-1.45,1.35,90,'#2f8f8a','Tavern',dict(sign='#c4553b',mirror=True)),
       (-2.15,-1.85,84,'#7b4a9a','Library',None),(-0.65,-2.45,70,'#3f6fb0','Temple',None),(1.75,-1.25,82,'#d9a23a','Lumber Camp',dict()),
       (1.95,0.25,78,None,'Blacksmith','sel'),(-2.25,0.35,74,None,'Workshop',None),(0.95,-0.85,62,'#2f8f8a','Storehouse',dict(chim=False)),(-0.9,2.35,80,'#d9a23a','Farmstead',dict(mirror=True))]
    for x,z,w,c,n,opt in B:
        if c is None or opt is None: add(x,z,lambda X,Y,w=w,sel=(opt=='sel'):ruin(X,Y,w,sel))
        else: add(x,z,lambda X,Y,w=w,c=c,opt=opt:house(X,Y,w,c,**opt))
    # fields and fences by the farm, market stall, well
    add(-1.9,2.35,lambda X,Y:''.join(f'<path d="M{X-40} {Y-22+k*9} h60" stroke="#7a5a3a" stroke-width="5"/><path d="M{X-38} {Y-24+k*9} h56" stroke="#9fd16b" stroke-width="3" stroke-dasharray="4 4"/>' for k in range(3)))
    add(0.55,0.55,lambda X,Y:f'<path d="M{X-16} {Y} v-18 M{X+16} {Y} v-18" stroke="#5a3e22" stroke-width="2.5"/><path d="M{X-20} {Y-18} h40 l-4 -8 h-32z" fill="#e05a3e" stroke="#2a1d1c" stroke-width="1.3"/><path d="M{X-12} {Y-26} v8 M{X} {Y-26} v8 M{X+12} {Y-26} v8" stroke="#f6ead2" stroke-width="3"/><rect x="{X-14}" y="{Y-10}" width="28" height="8" fill="#8a6a46" stroke="#2a1d1c"/><circle cx="{X-6}" cy="{Y-12}" r="3" fill="#c43d36"/><circle cx="{X+4}" cy="{Y-12}" r="3" fill="#f2c14e"/>')
    add(-0.6,0.7,lambda X,Y:f'<ellipse cx="{X}" cy="{Y-6}" rx="13" ry="5" fill="#8a8580" stroke="#2a2622" stroke-width="1.3"/><path d="M{X-13} {Y-6} v-6 a13 5 0 0 0 26 0 v6" fill="#a39e95" stroke="#2a2622" stroke-width="1.3"/><ellipse cx="{X}" cy="{Y-12}" rx="9" ry="3" fill="#2e4a8a"/><path d="M{X-12} {Y-12} V{Y-30} H{X+12} V{Y-12}" stroke="#5a3e22" stroke-width="2.5" fill="none"/><path d="M{X-15} {Y-30} L{X} {Y-38} L{X+15} {Y-30}Z" fill="#7a4a26" stroke="#2a1d1c"/>')
    add(2.2,-1.85,lambda X,Y:''.join(f'<ellipse cx="{X-14+k*9}" cy="{Y-6-(k%2)*7}" rx="5" ry="5" fill="#a8642a" stroke="#3a2614"/>' for k in range(4)))
    # villagers, a cat, chickens
    for x,z,c,carry,face in [(.4,1.1,'#c4553b','lantern',1),(-.5,-.5,'#7b4a9a',None,-1),(1.3,-.2,'#3f6fb0','axe',1),(-1.2,.6,'#2f8f8a','basket',-1),(.2,2.6,'#d9a23a',None,1),(-1.5,-1.0,'#e98fb5',None,1)]:
        add(x,z,lambda X,Y,c=c,carry=carry,face=face:villager(X,Y,c,carry=carry,face=face))
    add(1.5,2.15,lambda X,Y:f'<path d="M{X-8} {Y} q-2 -10 6 -10 l2 -4 l2 4 l2 -4 l2 4 q4 4 0 10z" fill="#2a2622"/><path d="M{X-8} {Y-2} q-8 -2 -6 -10" stroke="#2a2622" stroke-width="2.5" fill="none"/><circle cx="{X+2}" cy="{Y-8}" r=".9" fill="#ffd27a"/><circle cx="{X+5}" cy="{Y-8}" r=".9" fill="#ffd27a"/>')
    for x,z in [(-1.6,2.9),(-1.3,3.0),(-1.95,2.75)]:
        add(x,z,lambda X,Y:f'<ellipse cx="{X}" cy="{Y-5}" rx="6" ry="5" fill="#f4ecd8" stroke="#2a1d1c"/><circle cx="{X+5}" cy="{Y-10}" r="3" fill="#f4ecd8" stroke="#2a1d1c"/><path d="M{X+7} {Y-10} l3 1 l-3 1z" fill="#e0a93a"/><path d="M{X+4} {Y-13} l1 -2 l1 2z" fill="#c43d36"/>')
    # the tower in the middle
    add(0,0,lambda X,Y:tower(X,Y))
    items.sort(key=lambda t:t[0])
    o+= [t[1] for t in items]
    o+= [f'<circle cx="{cx+r.uniform(-rx,rx):.0f}" cy="{cy+r.uniform(-ry,ry):.0f}" r="10" fill="url(#gl)"/>' for _ in range(22)]
    o.append(f'<rect x="{cx-rx}" y="{cy-ry}" width="{2*rx}" height="{2*ry}" fill="#1c1440" opacity=".14"/></g>')
    return ''.join(o)
