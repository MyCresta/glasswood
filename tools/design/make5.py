import math
import desk as D, scene5 as S5, hearth2 as H2, make4 as M4
W,H=1440,900
def svg(body): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'+S5.defs()+body+f'<rect width="{W}" height="{H}" filter="url(#tex)"/></svg>'
sc={}
sc['wilds']=svg(D.desk()+S5.globe()+M4.vign())
LX,LY,LR=630,410,350
lens=D.lens_shadow(LX,LY,LR,18)+D.handle(LX,LY,LR,135,240)
wm,(L0,L1)=S5.watch(10.4,LX,LY,LR); wn,_=S5.watch(10.4,LX,LY,LR,night=True,battle=True)
sc['watch']=svg(D.desk()+S5.globe(dim=.35,blur=True)+lens+wm+D.lens(LX,LY,LR,ring=18)+M4.vign())
sc['night']=svg(D.desk()+S5.globe(dim=.55,blur=True)+lens+wn+D.lens(LX,LY,LR,ring=18)+f'<rect width="{W}" height="{H}" fill="#140f3a" opacity=".26"/>'+M4.vign(.72))
CX,CY,RX,RY=636,430,400,374
sh,ar=M4.arm(CX,CY,RX,RY)
hb=D.desk()+S5.globe(dim=.5,blur=True)+sh+M4.eloupe(CX,CY,RX,RY)+H2.hearth(CX,CY,RX,RY)+M4.eloupe_front(CX,CY,RX,RY)+ar
sc['hearth']=svg(hb+M4.vign()); sc['cards']=svg(hb+f'<rect width="{W}" height="{H}" fill="#0d0912" opacity=".42"/>'+M4.vign(.7))
for k,v in sc.items(): open(f'desk/r5-{k}.svg','w').write(v)
print({k:len(v)//1024 for k,v in sc.items()}, round(L0), round(L1))
