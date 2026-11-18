import math, random
import desk as D, scene2 as S, hearth as HH
W,H=1440,900
def svg(body): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'+S.defs()+body+f'<rect width="{W}" height="{H}" filter="url(#tex)"/></svg>'
def vign(a=.6): return f'<radialGradient id="vv" cx=".45" cy=".45" r=".78"><stop offset=".5" stop-color="#07050a" stop-opacity="0"/><stop offset="1" stop-color="#07050a" stop-opacity="{a}"/></radialGradient><rect width="{W}" height="{H}" fill="url(#vv)"/>'
def eloupe(cx,cy,rx,ry,ring=24):
    o=f'<ellipse cx="{cx+26}" cy="{cy+34}" rx="{rx+ring}" ry="{ry+ring}" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="{ring+12}" filter="url(#soft4)"/>'
    return o
def eloupe_front(cx,cy,rx,ry,ring=24):
    o=f'<radialGradient id="le2" cx=".5" cy=".5" r=".5"><stop offset=".82" stop-color="#000" stop-opacity="0"/><stop offset=".97" stop-color="#0a0a1a" stop-opacity=".3"/><stop offset="1" stop-color="#0a0a1a" stop-opacity=".55"/></radialGradient><ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="url(#le2)"/>'
    o+=f'<path d="M{cx-rx*.88:.0f} {cy-ry*.18:.0f} A{rx*.92:.0f} {ry*.92:.0f} 0 0 1 {cx-rx*.25:.0f} {cy-ry*.88:.0f}" fill="none" stroke="#fff" stroke-opacity=".33" stroke-width="7" stroke-linecap="round"/>'
    o+=f'<ellipse cx="{cx+rx*.5:.0f}" cy="{cy-ry*.6:.0f}" rx="{rx*.12:.0f}" ry="{ry*.05:.0f}" fill="#fff" opacity=".2" transform="rotate(35 {cx+rx*.5:.0f} {cy-ry*.6:.0f})"/>'
    # ring with visible thickness (lower edge shows the band)
    o+=f'<ellipse cx="{cx}" cy="{cy+10}" rx="{rx+ring/2}" ry="{ry+ring/2}" fill="none" stroke="#5a3a14" stroke-width="{ring}"/>'
    o+=f'<ellipse cx="{cx}" cy="{cy}" rx="{rx+ring/2}" ry="{ry+ring/2}" fill="none" stroke="url(#brass)" stroke-width="{ring}"/><ellipse cx="{cx}" cy="{cy}" rx="{rx+ring}" ry="{ry+ring}" fill="none" stroke="#3a2410" stroke-width="1.5"/><ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="none" stroke="#3a2410" stroke-width="1.5"/>'
    o+=''.join(f'<circle cx="{cx+math.cos(a)*(rx+ring/2):.1f}" cy="{cy+math.sin(a)*(ry+ring/2):.1f}" r="3.5" fill="#3a2410"/>' for a in [k*math.tau/10+.2 for k in range(10)])
    return o
def arm(cx,cy,rx,ry):
    p0=(cx+math.cos(-.7)*(rx+24),cy+math.sin(-.7)*(ry+24)); pts=[p0,(1130,120),(1240,-40)]
    sh=''.join(f'<path d="M{pts[i][0]+22:.0f} {pts[i][1]+30:.0f} L{pts[i+1][0]+22:.0f} {pts[i+1][1]+30:.0f}" stroke="#000" stroke-opacity=".45" stroke-width="24" stroke-linecap="round" filter="url(#soft4)"/>' for i in range(2))
    a=''.join(f'<path d="M{pts[i][0]:.0f} {pts[i][1]:.0f} L{pts[i+1][0]:.0f} {pts[i+1][1]:.0f}" stroke="#2a1a0c" stroke-width="22" stroke-linecap="round"/><path d="M{pts[i][0]:.0f} {pts[i][1]:.0f} L{pts[i+1][0]:.0f} {pts[i+1][1]:.0f}" stroke="url(#brass)" stroke-width="15" stroke-linecap="round"/>' for i in range(2))
    j=''.join(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="16" fill="url(#brass)" stroke="#3a2410" stroke-width="2"/><circle cx="{x:.0f}" cy="{y:.0f}" r="5" fill="#3a2410"/>' for x,y in pts[:2])
    return sh,a+j
if __name__=='__main__':
    sc={}
    sc['wilds']=svg(D.desk()+S.globe_scene()+vign())
    LX,LY,LR=636,384,316
    lens=D.lens_shadow(LX,LY,LR)+D.handle(LX,LY,LR,132,250)
    sc['watch']=svg(D.desk()+S.globe_scene(dim=.35,blur=True)+lens+S.watch_map(12.6,LX,LY,LR)+D.lens(LX,LY,LR)+vign())
    sc['night']=svg(D.desk()+S.globe_scene(dim=.55,blur=True)+lens+S.watch_map(12.6,LX,LY,LR,night=True,battle=True)+D.lens(LX,LY,LR)+f'<rect width="{W}" height="{H}" fill="#140f3a" opacity=".26"/>'+vign(.72))
    CX,CY,RX,RY=640,420,404,332
    sh,ar=arm(CX,CY,RX,RY)
    hb=D.desk()+S.globe_scene(dim=.5,blur=True)+sh+eloupe(CX,CY,RX,RY)+HH.hearth(CX,CY,RX,RY)+eloupe_front(CX,CY,RX,RY)+ar
    sc['hearth']=svg(hb+vign())
    sc['cards']=svg(hb+f'<rect width="{W}" height="{H}" fill="#0d0912" opacity=".42"/>'+vign(.7))
    for k,v in sc.items(): open(f'desk/r4-{k}.svg','w').write(v)
    print({k:len(v)//1024 for k,v in sc.items()})
