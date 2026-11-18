import math, random
from geo import *
W,H=1440,900
def P(d): return ' '.join(f'{v:.1f}' if isinstance(v,float) else str(v) for v in d)
def creature_defs():
    return '''
<symbol id="gob" viewBox="-14 -26 28 28" overflow="visible">
 <ellipse cx="0" cy="0" rx="9" ry="3" fill="#000" opacity=".35"/>
 <path d="M-6 -1 q-1 -9 6 -10 q7 1 6 10z" fill="#3f8f5a" stroke="#14261c" stroke-width="1.6"/>
 <path d="M-8 -16 l-6 -4 l6 0z M8 -16 l6 -4 l-6 0z" fill="#5fb07a" stroke="#14261c" stroke-width="1.4" stroke-linejoin="round"/>
 <circle cx="0" cy="-15" r="7.5" fill="#5fb07a" stroke="#14261c" stroke-width="1.6"/>
 <circle cx="-2.6" cy="-15.5" r="2" fill="#fff7c2"/><circle cx="2.6" cy="-15.5" r="2" fill="#fff7c2"/>
 <circle cx="-2.4" cy="-15.3" r="1" fill="#1a0f08"/><circle cx="2.8" cy="-15.3" r="1" fill="#1a0f08"/>
 <path d="M7 -8 l5 -3" stroke="#14261c" stroke-width="1.4"/><circle cx="12.5" cy="-10" r="3" fill="#ffc861" stroke="#5a3b10" stroke-width="1"/>
</symbol>
<symbol id="wolf" viewBox="-18 -20 36 22" overflow="visible">
 <ellipse cx="0" cy="0" rx="14" ry="3.5" fill="#000" opacity=".35"/>
 <path d="M-13 -6 q0 -8 10 -8 h7 l4 -5 l2 5 l3 -3 l0 6 q3 2 1 5 l-6 1 l-1 5 h-3 v-4 h-11 v4 h-3 l-1 -4 q-4 0 -3 -2z" fill="#5b6c9a" stroke="#191d33" stroke-width="1.6" stroke-linejoin="round"/>
 <path d="M-13 -9 q-5 -1 -5 -6" stroke="#191d33" stroke-width="2.4" fill="none" stroke-linecap="round"/>
 <circle cx="11" cy="-10" r="1.6" fill="#ffe27a"/></symbol>
<symbol id="beetle" viewBox="-12 -14 24 16" overflow="visible">
 <ellipse cx="0" cy="0" rx="9" ry="2.5" fill="#000" opacity=".35"/>
 <path d="M-8 -3 l-3 2 M-8 -6 l-4 0 M8 -3 l3 2 M8 -6 l4 0" stroke="#10161a" stroke-width="1.4"/>
 <ellipse cx="0" cy="-5" rx="8" ry="6" fill="#2fb3a0" stroke="#0e2a2a" stroke-width="1.5"/>
 <path d="M0 -11 V1" stroke="#0e2a2a" stroke-width="1"/><path d="M-4 -8 q2 -2 4 -2" stroke="#b8fff0" stroke-width="1.3" fill="none" stroke-linecap="round"/>
 <circle cx="0" cy="-12" r="3" fill="#1a3b39" stroke="#0e2a2a"/><circle cx="-1.2" cy="-12.5" r=".9" fill="#ffd36b"/><circle cx="1.2" cy="-12.5" r=".9" fill="#ffd36b"/></symbol>
<symbol id="moth" viewBox="-14 -18 28 20" overflow="visible">
 <ellipse cx="0" cy="0" rx="7" ry="2" fill="#000" opacity=".25"/>
 <path d="M0 -8 q-10 -10 -13 -2 q-1 6 13 4z M0 -8 q10 -10 13 -2 q1 6 -13 4z" fill="#d9a7e8" stroke="#3b1f47" stroke-width="1.3"/>
 <circle cx="-7" cy="-8" r="2" fill="#7a3ea0"/><circle cx="7" cy="-8" r="2" fill="#7a3ea0"/>
 <ellipse cx="0" cy="-7" rx="2" ry="5" fill="#5a3170"/></symbol>'''
def place(sym,X,Y,s,w,h,flip=False):
    tr=f' transform="translate({X:.1f} {Y:.1f}) scale({-s if flip else s:.2f} {s:.2f})"'
    return f'<g{tr}><use href="#{sym}" x="{-w/2}" y="{-h+2}" width="{w}" height="{h}"/></g>'
def wave(T,cr,glowc):
    o=''
    for nm,ts,sym,wh in (('north',[.14,.21,.28,.36,.47],'gob',(28,28)),('west',[.3,.42],'wolf',(36,22)),('west',[.55,.62],'gob',(28,28))):
        pts=[p for p in PATHS if p[0]==nm][0][2]
        for x,z,h in enemies_on(pts,ts):
            X,Y=T(x,z)
            o+=f'<circle cx="{X:.1f}" cy="{Y-6:.1f}" r="16" fill="url(#{glowc})"/>'+place(sym if cr is None else cr.get(sym,sym),X,Y,1.15,*wh,flip=math.sin(h)<0)
    return o
