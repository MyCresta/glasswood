import desk as D, scene5 as S5, hearth3 as H3, make4 as M4
W,H=1440,900
def svg(body): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'+S5.defs()+body+f'<rect width="{W}" height="{H}" filter="url(#tex)"/></svg>'
sc={}
sc['wilds']=svg(D.desk()+S5.globe()+M4.vign())
CX,CY,RX,RY=636,430,400,374
sh,ar=M4.arm(CX,CY,RX,RY)
hb=D.desk()+S5.globe(dim=.5,blur=True)+sh+M4.eloupe(CX,CY,RX,RY)+H3.hearth(CX,CY,RX,RY)+M4.eloupe_front(CX,CY,RX,RY)+ar
sc['hearth']=svg(hb+M4.vign()); sc['cards']=svg(hb+f'<rect width="{W}" height="{H}" fill="#0d0912" opacity=".42"/>'+M4.vign(.7))
for k,v in sc.items(): open(f'desk/r6-{k}.svg','w').write(v)
print({k:len(v)//1024 for k,v in sc.items()})
