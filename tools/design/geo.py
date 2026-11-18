import math, random
PATHS=[('north',1.8,[(0,-20.4),(-2.4,-16.4),(1.6,-12.4),(-0.6,-8.8),(0,-5.6)]),
('west',1.8,[(-19.6,7),(-15.2,4.6),(-11.6,6.6),(-8.2,3.2),(-5.2,1.8)]),
('east',1.8,[(19.4,8.5),(15.4,10.6),(11.2,8.2),(8.6,9.4),(5.4,3.8)]),
('kings',1.7,[(-15,-15.5),(-11.2,-11.4),(-7.4,-11.8),(-5.2,-8.8),(-3.6,-5)]),
('bog',1.7,[(15.5,-15),(12.2,-10.6),(8.2,-10.8),(5.6,-6.2),(3.4,-4.8)]),
('south',1.8,[(2,20.6),(-1.4,16.4),(1.2,12.4),(0,8.6),(0,5.8)]),
('link-ne',1.3,[(1.6,-12.4),(4.6,-14.6),(8.2,-10.8)]),
('link-nw',1.3,[(-2.4,-16.4),(-6.8,-14.6),(-11.2,-11.4)]),
('link-sw',1.3,[(-11.6,6.6),(-8.4,11.8),(-4.2,14.4),(-1.4,16.4)]),
('link-se',1.3,[(11.2,8.2),(6.4,13.2),(1.2,12.4)]),
('ring-w',1.2,[(-8.2,3.2),(-9.6,-2.6),(-5.2,-8.8)]),
('ring-e',1.2,[(8.6,9.4),(10.4,2.2),(9.6,-4.2),(8.2,-10.8)])]
SPAWNS=[('Hollow Gate',(0,-20.4),True),('Mossy Cave',(-19.6,7),True),('Ravine Stair',(19.4,8.5),False),("Old King's Road",(-15,-15.5),False),('Bog Mouth',(15.5,-15),False),('Sunken Arch',(2,20.6),False)]
LAKE=(14.6,-1.8,2.9); CLEAR=6.2; WALL=3.0
def dseg(x,z,a,b):
    dx,dz=b[0]-a[0],b[1]-a[1]; t=max(0,min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)))
    return math.hypot(x-a[0]-dx*t,z-a[1]-dz*t)
def dpath(x,z,p): return min(dseg(x,z,p[2][i],p[2][i+1]) for i in range(len(p[2])-1))
def openness(x,z):
    d=math.hypot(x,z)-CLEAR
    for p in PATHS: d=min(d,dpath(x,z,p)-p[1]/2)
    return d
def inlake(x,z,pad=0): return math.hypot(x-LAKE[0],z-LAKE[1])<LAKE[2]+pad
def scatter(seed,x0,x1,z0,z1,step,cond):
    r=random.Random(seed); out=[]
    z=z0
    while z<z1:
        x=x0
        while x<x1:
            px=x+(r.random()-.5)*step*.9; pz=z+(r.random()-.5)*step*.9
            if cond(px,pz): out.append((px,pz,r.random(),r.random()))
            x+=step
        z+=step*.87
    return out
def smooth(pts,T):
    # catmull-rom -> cubic bezier path string, pts transformed by T
    P=[T(*p) for p in pts]
    if len(P)<3: return 'M%.1f %.1f L%.1f %.1f'%(*P[0],*P[1])
    s='M%.1f %.1f'%P[0]
    for i in range(len(P)-1):
        p0=P[i-1] if i>0 else P[i]; p1=P[i]; p2=P[i+1]; p3=P[i+2] if i+2<len(P) else P[i+1]
        c1=(p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6); c2=(p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6)
        s+=' C%.1f %.1f %.1f %.1f %.1f %.1f'%(*c1,*c2,*p2)
    return s
def enemies_on(path_pts, ts):
    # positions at fractions along polyline
    L=[math.dist(path_pts[i],path_pts[i+1]) for i in range(len(path_pts)-1)]; tot=sum(L); out=[]
    for t in ts:
        d=t*tot
        for i,l in enumerate(L):
            if d<=l:
                a,b=path_pts[i],path_pts[i+1]; k=d/l; out.append((a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k, math.atan2(b[0]-a[0],b[1]-a[1]))); break
            d-=l
    return out
BUILD=[(62,5.1,'Town Hall'),(150,5.2,'Farmstead'),(30,5.2,'Lumber Camp'),(240,5.2,'Blacksmith'),(180,5.2,'Workshop'),(118,5.1,'Tavern'),(0,5.2,'Library'),(315,3.2,'Storehouse'),(210,5.2,'Quarry'),(270,5.2,'Mine'),(300,5.2,'Mage Tower'),(330,5.2,'Temple')]
def bpos(deg,r,scale=0.4):
    a=math.radians(deg); return (math.cos(a)*r*scale, math.sin(a)*r*scale)
