# Detailed card portraits, drawn at 520x360.
import random, math
O='#1e130c'   # outline
def svg(body,defs=''):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 360"><defs>{defs}<radialGradient id="glow"><stop offset="0" stop-color="#ffd58a" stop-opacity=".85"/><stop offset=".45" stop-color="#ffb35a" stop-opacity=".25"/><stop offset="1" stop-color="#ffb35a" stop-opacity="0"/></radialGradient><radialGradient id="vig" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient></defs>{body}<rect width="520" height="360" fill="url(#vig)"/></svg>'
def stars(n,seed,ymax=150):
    r=random.Random(seed); return ''.join(f'<circle cx="{r.uniform(0,520):.0f}" cy="{r.uniform(0,ymax):.0f}" r="{r.uniform(.8,2):.1f}" fill="#fff6d8" opacity="{r.uniform(.4,.9):.2f}"/>' for _ in range(n))
def pines(y,col,seed,h=(60,120),step=34):
    r=random.Random(seed); o=''; x=-20
    while x<540:
        hh=r.uniform(*h); w=hh*.34
        o+=f'<path d="M{x-w:.0f} {y:.0f} L{x:.0f} {y-hh:.0f} L{x+w:.0f} {y:.0f}Z" fill="{col}"/>'; x+=r.uniform(step*.6,step*1.2)
    return o+f'<rect x="0" y="{y}" width="520" height="{360-y}" fill="{col}"/>'
def hand(x,y,rot,skin,shade,s=1,fist=True):
    # a small hand: palm plus three visible finger lines
    return f'''<g transform="translate({x} {y}) rotate({rot}) scale({s})"><path d="M-11 -8 q-2 -8 7 -10 l10 -1 q7 0 8 6 l1 10 q0 9 -9 10 l-9 0 q-8 -1 -8 -9z" fill="{skin}" stroke="{O}" stroke-width="2.4"/>
<path d="M-5 -4 q6 -2 12 0 M-5 2 q6 -2 12 0 M-4 8 q5 -2 10 0" stroke="{shade}" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M-11 -6 q-6 2 -5 9 q2 4 6 2" fill="{skin}" stroke="{O}" stroke-width="2.2"/></g>'''
# ------------------------------------------------------------------ Wren, archer
def wren():
    sk,sk2='#e9c3a0','#c9946e'
    b=f'<rect width="520" height="360" fill="#1c2244"/><rect width="520" height="200" fill="#2a3466"/>'+stars(40,1)
    b+=f'<circle cx="420" cy="70" r="34" fill="#f3e6bd"/><circle cx="420" cy="70" r="70" fill="#f3e6bd" opacity=".12"/>'
    b+=pines(250,'#22305a',2,(80,150),30)+pines(290,'#18233f',3,(70,130),26)
    b+='<path d="M0 320 Q160 290 300 306 T520 296 V360 H0Z" fill="#203a2c"/>'
    # cloak back and quiver
    b+=f'<path d="M150 360 Q140 230 200 175 Q260 140 320 175 Q380 230 372 360Z" fill="#244a36" stroke="{O}" stroke-width="3"/>'
    b+=f'<g transform="rotate(-18 300 170)"><rect x="296" y="96" width="34" height="120" rx="8" fill="#7a4a26" stroke="{O}" stroke-width="3"/><path d="M296 120 h34 M296 190 h34" stroke="#4a2c16" stroke-width="3"/>'+''.join(f'<path d="M{304+k*8} 96 v-26" stroke="#d9c39a" stroke-width="2.4"/><path d="M{300+k*8} 70 l4 -14 l4 14 z" fill="{["#c4553b","#e9e1cf","#c4553b"][k]}" stroke="{O}" stroke-width="1.5"/>' for k in range(3))+'</g>'
    # torso: tunic, belt, strap
    b+=f'<path d="M196 360 L204 238 Q260 214 318 238 L326 360Z" fill="#3f6b48" stroke="{O}" stroke-width="3"/>'
    b+=f'<path d="M206 300 H316" stroke="#5a3a1e" stroke-width="12"/><rect x="250" y="292" width="20" height="16" rx="3" fill="#d9a23a" stroke="{O}" stroke-width="2.4"/>'
    b+=f'<path d="M214 236 L312 330" stroke="#6b4022" stroke-width="10" stroke-linecap="round"/><path d="M214 236 L312 330" stroke="#8a5a32" stroke-width="3" stroke-dasharray="6 8"/>'
    # moth-wing charm
    b+=f'<path d="M260 262 v14" stroke="#d9c39a" stroke-width="2"/><path d="M260 284 q-16 -16 -20 -2 q0 10 20 4 q20 6 20 -4 q-4 -14 -20 2z" fill="#d9a7e8" stroke="{O}" stroke-width="2"/><circle cx="250" cy="282" r="3" fill="#7a3ea0"/><circle cx="270" cy="282" r="3" fill="#7a3ea0"/>'
    # left arm holding the bow at the grip
    b+=f'<path d="M206 246 Q168 262 152 230" stroke="#2f5a40" stroke-width="30" fill="none" stroke-linecap="round"/><path d="M206 246 Q168 262 152 230" stroke="{O}" stroke-width="34" fill="none" stroke-linecap="round" opacity=".0"/>'
    b+=f'<path d="M136 24 Q78 190 140 344" stroke="#6b3e1e" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M136 24 Q78 190 140 344" stroke="#a8743e" stroke-width="3" fill="none"/><path d="M136 24 L140 344" stroke="#e9e1cf" stroke-width="1.6"/>'
    b+=hand(148,222,-10,sk,sk2,1.1)
    # right arm drawing an arrow to the cheek
    b+=f'<path d="M314 244 Q350 220 300 196" stroke="#2f5a40" stroke-width="28" fill="none" stroke-linecap="round"/>'
    b+=f'<path d="M100 188 L296 188" stroke="#d9c39a" stroke-width="3"/><path d="M100 188 l14 -7 v14z" fill="#9aa0a6" stroke="{O}" stroke-width="1.6"/><path d="M286 188 l12 -8 M286 188 l12 8" stroke="#c4553b" stroke-width="4"/>'
    b+=hand(296,190,170,sk,sk2,1.0)
    # neck, head, hood
    b+=f'<path d="M244 216 v-22 h32 v22z" fill="{sk2}" stroke="{O}" stroke-width="2.5"/>'
    b+=f'<path d="M206 170 Q200 84 262 76 Q324 84 318 170 Q300 214 262 216 Q224 214 206 170Z" fill="#2f5a40" stroke="{O}" stroke-width="3"/>'
    b+=f'<ellipse cx="262" cy="152" rx="40" ry="46" fill="{sk}" stroke="{O}" stroke-width="2.8"/>'
    b+=f'<path d="M222 140 Q232 100 262 104 Q296 100 304 140 Q290 118 262 120 Q238 118 222 140Z" fill="#6b3e1e" stroke="{O}" stroke-width="2"/><path d="M226 150 q-6 18 2 36 M298 150 q6 18 -2 36" stroke="#6b3e1e" stroke-width="5" fill="none" stroke-linecap="round"/>'
    b+=f'<path d="M214 148 Q212 98 262 92 Q312 98 310 148 Q300 112 262 108 Q224 112 214 148Z" fill="#3c7a52" stroke="{O}" stroke-width="2.5"/>'
    b+=f'<path d="M240 146 q8 -6 16 0 M270 146 q8 -6 16 0" stroke="{O}" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="248" cy="156" rx="5" ry="6" fill="{O}"/><ellipse cx="278" cy="156" rx="5" ry="6" fill="{O}"/><circle cx="250" cy="154" r="1.8" fill="#fff"/><circle cx="280" cy="154" r="1.8" fill="#fff"/>'
    b+=f'<path d="M262 160 q-4 12 2 14" stroke="{sk2}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M252 184 q10 6 20 0" stroke="{O}" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
    b+=''.join(f'<circle cx="{x}" cy="{y}" r="1.4" fill="#b0704a"/>' for x,y in [(238,168),(244,172),(240,175),(282,168),(288,172),(286,165)])
    b+=f'<ellipse cx="236" cy="176" rx="8" ry="5" fill="#e98f8f" opacity=".35"/><ellipse cx="290" cy="176" rx="8" ry="5" fill="#e98f8f" opacity=".35"/>'
    return svg(b)
# ------------------------------------------------------------------ Bram, smith
def bram():
    sk,sk2='#d4a07a','#a8714e'
    b='<rect width="520" height="360" fill="#2a1712"/><radialGradient id="forge" cx=".2" cy=".75" r=".8"><stop offset="0" stop-color="#ff9a3c" stop-opacity=".85"/><stop offset=".4" stop-color="#c4553b" stop-opacity=".35"/><stop offset="1" stop-color="#2a1712" stop-opacity="0"/></radialGradient><rect width="520" height="360" fill="url(#forge)"/>'
    b+=''.join(f'<rect x="{x}" y="{y}" width="58" height="26" fill="none" stroke="#4a2a1e" stroke-width="2"/>' for y in range(0,200,26) for x in range((y//26)%2*-29,520,58))
    b+=f'<path d="M20 360 V270 Q80 250 140 270 V360Z" fill="#3a2a22" stroke="{O}" stroke-width="3"/><ellipse cx="80" cy="282" rx="44" ry="14" fill="#ff8a3a" opacity=".8"/>'
    r=random.Random(3); b+=''.join(f'<circle cx="{r.uniform(60,200):.0f}" cy="{r.uniform(150,280):.0f}" r="{r.uniform(1.5,3.2):.1f}" fill="#ffd27a"/>' for _ in range(22))
    # big body: shirt and apron
    b+=f'<path d="M140 360 Q140 240 200 214 Q260 196 320 214 Q384 240 384 360Z" fill="#7a5a44" stroke="{O}" stroke-width="3"/>'
    b+=f'<path d="M200 360 L208 236 Q262 226 316 236 L324 360Z" fill="#5a3a22" stroke="{O}" stroke-width="3"/><path d="M208 236 L228 214 M316 236 L296 214" stroke="#3a2414" stroke-width="7"/>'
    b+=f'<rect x="236" y="290" width="52" height="34" rx="4" fill="#4a2e1a" stroke="{O}" stroke-width="2.4"/><path d="M244 290 v-10 M254 290 v-14" stroke="#9aa0a6" stroke-width="4"/>'
    b+=''.join(f'<circle cx="{x}" cy="{y}" r="{s}" fill="#2a1712" opacity=".5"/>' for x,y,s in [(232,260,5),(298,270,4),(262,250,3)])
    # left arm: hammer over shoulder
    b+=f'<path d="M160 250 Q130 210 176 176" stroke="{sk}" stroke-width="38" fill="none" stroke-linecap="round"/><path d="M160 250 Q130 210 176 176" stroke="{O}" stroke-width="2.6" fill="none" opacity=".0"/>'
    b+=f'<path d="M148 236 q-8 -20 6 -34" stroke="{sk2}" stroke-width="3" fill="none"/><path d="M150 252 h22" stroke="#7a5a44" stroke-width="14" stroke-linecap="round"/>'
    b+=f'<path d="M178 176 L232 74" stroke="#6b4022" stroke-width="10" stroke-linecap="round"/><g transform="rotate(-28 236 66)"><rect x="206" y="48" width="62" height="34" rx="4" fill="#77808a" stroke="{O}" stroke-width="3"/><rect x="206" y="48" width="62" height="10" rx="3" fill="#a8b0b8"/></g>'
    b+=hand(178,182,-60,sk,sk2,1.25)
    # right arm: tongs holding a glowing bar
    b+=f'<path d="M366 250 Q400 280 350 300" stroke="{sk}" stroke-width="38" fill="none" stroke-linecap="round"/><path d="M378 262 q8 14 -6 26" stroke="{sk2}" stroke-width="3" fill="none"/><path d="M372 246 h18" stroke="#7a5a44" stroke-width="14" stroke-linecap="round"/>'
    b+=f'<path d="M340 300 L428 236 M346 306 L432 246" stroke="#3a3a40" stroke-width="5" stroke-linecap="round"/><circle cx="440" cy="236" r="40" fill="url(#glow)"/><rect x="424" y="226" width="40" height="12" rx="3" fill="#ffb45a" stroke="#7a2a12" stroke-width="2" transform="rotate(-36 444 232)"/>'
    b+=f'<path d="M322 300 q-6 -18 14 -22 l26 -4 q14 0 16 12 l2 14 q-2 14 -18 14 l-20 0 q-18 -2 -20 -14z" fill="#5a3a22" stroke="{O}" stroke-width="2.6"/>'
    # head: bald, big braided beard
    b+=f'<path d="M232 220 v-24 h56 v24z" fill="{sk2}" stroke="{O}" stroke-width="2.5"/>'
    b+=f'<ellipse cx="260" cy="140" rx="54" ry="58" fill="{sk}" stroke="{O}" stroke-width="3"/><ellipse cx="206" cy="146" rx="10" ry="16" fill="{sk}" stroke="{O}" stroke-width="2.6"/><ellipse cx="314" cy="146" rx="10" ry="16" fill="{sk}" stroke="{O}" stroke-width="2.6"/>'
    b+=f'<path d="M226 104 q34 -20 70 0" stroke="#e9c3a0" stroke-width="6" fill="none" stroke-linecap="round" opacity=".5"/>'
    b+=f'<path d="M222 132 q14 -12 30 -4 M268 128 q16 -8 30 4" stroke="#6b3a20" stroke-width="9" fill="none" stroke-linecap="round"/>'
    b+=f'<ellipse cx="242" cy="142" rx="4.5" ry="5" fill="{O}"/><ellipse cx="280" cy="142" rx="4.5" ry="5" fill="{O}"/><circle cx="243" cy="140" r="1.5" fill="#fff"/><circle cx="281" cy="140" r="1.5" fill="#fff"/>'
    b+=f'<path d="M260 144 q-10 22 0 26 q10 -2 6 -8" fill="{sk2}" stroke="{O}" stroke-width="2.2"/>'
    b+=f'<path d="M216 160 Q216 190 236 202 L248 250 Q260 266 272 250 L284 202 Q304 190 304 160 Q294 176 280 172 Q260 166 240 172 Q226 176 216 160Z" fill="#8a4a24" stroke="{O}" stroke-width="2.8"/>'
    b+=f'<path d="M238 180 q22 8 44 0" stroke="#5a2e14" stroke-width="3" fill="none"/><path d="M252 210 q8 4 16 0 M252 228 q8 4 16 0" stroke="#5a2e14" stroke-width="3" fill="none"/><rect x="250" y="236" width="20" height="8" rx="2" fill="#d9a23a" stroke="{O}" stroke-width="1.6"/>'
    b+=f'<path d="M244 172 q16 -10 32 0" stroke="#5a2e14" stroke-width="7" fill="none" stroke-linecap="round"/>'
    b+=f'<path d="M286 122 l10 4" stroke="#2a1712" stroke-width="4" opacity=".4"/><circle cx="232" cy="118" r="6" fill="#2a1712" opacity=".25"/>'
    return svg(b)
# ------------------------------------------------------------------ Ivy, herbalist
def ivy():
    sk,sk2='#b98560','#8e5e3e'
    b='<rect width="520" height="360" fill="#13262b"/><rect width="520" height="180" fill="#1d3a40"/>'+stars(30,7,140)
    b+=pines(250,'#1a3a36',8,(70,140),36)+'<path d="M0 300 Q140 270 280 290 T520 280 V360 H0Z" fill="#1f4a32"/>'
    for x,y,c in [(60,300,'#7b55c9'),(110,316,'#2fb3a0'),(430,296,'#7b55c9'),(470,320,'#2fb3a0')]:
        b+=f'<circle cx="{x}" cy="{y-14}" r="34" fill="{c}" opacity=".22"/><path d="M{x-3} {y} v-14 h6 v14z" fill="#efe3cf"/><path d="M{x-14} {y-12} q14 -20 28 0z" fill="{c}" stroke="{O}" stroke-width="2"/>'
    # body: cloak and dress
    b+=f'<path d="M160 360 Q156 250 210 214 Q262 196 314 214 Q368 250 364 360Z" fill="#5a3478" stroke="{O}" stroke-width="3"/>'
    b+=f'<path d="M214 360 L222 238 Q262 226 302 238 L310 360Z" fill="#c9a66b" stroke="{O}" stroke-width="2.8"/><path d="M222 262 H302" stroke="#7a4a26" stroke-width="8"/>'
    b+=f'<path d="M216 230 L338 330" stroke="#6b4022" stroke-width="8"/><path d="M318 300 h58 v46 q-30 10 -58 0z" fill="#8a5a32" stroke="{O}" stroke-width="2.8"/><path d="M318 312 h58" stroke="#5a3a1e" stroke-width="3"/>'+''.join(f'<path d="M{330+k*10} 300 q{-6+k*3} -18 {2+k*2} -28" stroke="#55893e" stroke-width="3" fill="none"/><ellipse cx="{332+k*10+k*2}" cy="{276-k*2}" rx="6" ry="3" fill="#6a9a48" transform="rotate({-40+k*20} {332+k*10} {276})"/>' for k in range(4))
    # braid
    b+=f'<path d="M222 170 Q200 220 214 270" stroke="#3a2416" stroke-width="16" fill="none" stroke-linecap="round"/>'+''.join(f'<path d="M{206+k*1.5} {196+k*16} q8 6 16 0" stroke="#5a3a24" stroke-width="3" fill="none"/>' for k in range(5))+f'<circle cx="214" cy="274" r="6" fill="#e98fb5" stroke="{O}" stroke-width="1.6"/>'
    # arms holding up a glowing jar with both hands
    b+=f'<circle cx="262" cy="248" r="90" fill="url(#glow)"/>'
    b+=f'<path d="M214 236 Q196 270 236 270" stroke="#5a3478" stroke-width="26" fill="none" stroke-linecap="round"/><path d="M312 236 Q330 270 290 270" stroke="#5a3478" stroke-width="26" fill="none" stroke-linecap="round"/>'
    b+=f'<rect x="236" y="214" width="52" height="62" rx="12" fill="#cfefff" fill-opacity=".35" stroke="{O}" stroke-width="2.6"/><rect x="232" y="206" width="60" height="12" rx="3" fill="#8a5a32" stroke="{O}" stroke-width="2.4"/>'
    r=random.Random(5); b+=''.join(f'<circle cx="{r.uniform(244,282):.0f}" cy="{r.uniform(226,268):.0f}" r="{r.uniform(2,3.5):.1f}" fill="#fff4a0"/>' for _ in range(9))
    b+=hand(240,262,20,sk,sk2,1.0)+hand(286,262,160,sk,sk2,1.0)
    # head with lit face, big hat
    b+=f'<path d="M248 214 v-20 h28 v20z" fill="{sk2}" stroke="{O}" stroke-width="2.4"/>'
    b+=f'<ellipse cx="262" cy="156" rx="40" ry="44" fill="{sk}" stroke="{O}" stroke-width="2.8"/><path d="M222 150 Q232 116 262 118 Q296 116 302 150 Q292 134 262 134 Q234 134 222 150Z" fill="#3a2416"/>'
    b+=f'<path d="M244 150 q6 -4 12 0 M270 150 q6 -4 12 0" stroke="{O}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M243 160 q6 6 12 0 M269 160 q6 6 12 0" stroke="{O}" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
    b+=f'<circle cx="249" cy="160" r="12" fill="none" stroke="#c9a45a" stroke-width="2.4"/><circle cx="275" cy="160" r="12" fill="none" stroke="#c9a45a" stroke-width="2.4"/><path d="M261 160 h2" stroke="#c9a45a" stroke-width="2.4"/>'
    b+=f'<path d="M262 166 q-3 8 2 10" stroke="{sk2}" stroke-width="2.2" fill="none"/><path d="M252 184 q10 8 20 0" fill="#7a2a2a" stroke="{O}" stroke-width="2.2"/><ellipse cx="238" cy="176" rx="7" ry="4" fill="#e98f8f" opacity=".35"/><ellipse cx="286" cy="176" rx="7" ry="4" fill="#e98f8f" opacity=".35"/>'
    b+=f'<ellipse cx="262" cy="126" rx="96" ry="22" fill="#3a2a4a" stroke="{O}" stroke-width="3"/><path d="M216 126 Q222 52 262 44 Q302 52 308 126Z" fill="#4a3460" stroke="{O}" stroke-width="3"/><path d="M216 116 Q262 128 308 116" stroke="#c4553b" stroke-width="9" fill="none"/>'
    b+=f'<path d="M296 112 q30 -40 60 -44 q-20 18 -40 50" fill="#e9e1cf" stroke="{O}" stroke-width="2"/>'
    for x,y,c in [(232,108,'#c43d36'),(248,104,'#f2c14e'),(286,98,'#7b55c9')]:
        b+=f'<path d="M{x-2} {y} v-10 h4 v10z" fill="#efe3cf"/><path d="M{x-9} {y-8} q9 -14 18 0z" fill="{c}" stroke="{O}" stroke-width="1.8"/>'
    return svg(b)
# ------------------------------------------------------------------ Lantern goblin
def goblin():
    g,g2,g3='#6aa86a','#4a7e4e','#8ccf86'
    b='<rect width="520" height="360" fill="#1a1230"/><path d="M0 0 H520 V140 Q420 90 300 130 Q170 170 0 110Z" fill="#2a1f44"/>'
    b+='<path d="M0 360 V250 Q60 220 120 240 Q200 200 280 236 Q380 210 440 240 Q490 226 520 236 V360Z" fill="#2a2030"/>'+''.join(f'<path d="M{x} 240 l10 -40 l10 40z" fill="#3a2f46"/>' for x in (30,150,390,470))
    b+=f'<circle cx="424" cy="222" r="130" fill="url(#glow)"/>'
    # body in a patched, hooded vest
    b+=f'<path d="M170 360 Q170 262 218 236 Q262 222 304 236 Q350 262 350 360Z" fill="#6b4a2e" stroke="{O}" stroke-width="3"/>'
    b+=f'<path d="M226 360 L232 250 Q262 242 290 250 L296 360Z" fill="{g2}" stroke="{O}" stroke-width="2.6"/><rect x="190" y="290" width="30" height="26" fill="#8a6a46" stroke="{O}" stroke-width="2" transform="rotate(-8 205 303)"/><path d="M194 296 l22 -2 M196 306 l22 -2" stroke="{O}" stroke-width="1.4" stroke-dasharray="3 3"/>'
    b+=f'<path d="M190 320 H330" stroke="#3a2414" stroke-width="10"/><rect x="290" y="312" width="22" height="22" rx="4" fill="#8a5a32" stroke="{O}" stroke-width="2"/>'
    # dagger hand
    b+=f'<path d="M186 262 Q150 290 172 320" stroke="{g}" stroke-width="24" fill="none" stroke-linecap="round"/><path d="M172 322 L130 352" stroke="#9aa0a6" stroke-width="8" stroke-linecap="round"/><path d="M168 316 l14 14" stroke="#5a3a1e" stroke-width="6"/>'
    b+=f'<path d="M160 312 q-6 -10 6 -14 l12 -2 q10 0 10 10 q0 10 -12 12 l-8 0z" fill="{g}" stroke="{O}" stroke-width="2.4"/><path d="M166 304 l-6 -6 M174 302 l-4 -8" stroke="{O}" stroke-width="2.4" stroke-linecap="round"/>'
    # lantern arm raised
    b+='<g transform="translate(56 64)">'
    b+=f'<path d="M262 184 Q318 204 360 190" stroke="{g}" stroke-width="24" fill="none" stroke-linecap="round"/><path d="M356 196 q-8 -16 6 -22 q14 -4 18 8 q2 12 -10 16z" fill="{g}" stroke="{O}" stroke-width="2.4"/><path d="M364 176 l-2 -10 M372 176 l2 -10 M378 182 l8 -6" stroke="{O}" stroke-width="2.4" stroke-linecap="round"/>'
    b+=f'<path d="M368 166 V140" stroke="#3a3a40" stroke-width="3"/><path d="M352 140 h32 l-4 -10 h-24z" fill="#3a3a40" stroke="{O}" stroke-width="2"/><rect x="354" y="140" width="28" height="36" rx="5" fill="#ffd27a" stroke="{O}" stroke-width="2.6"/><path d="M368 140 v36 M354 158 h28" stroke="#7a4a1a" stroke-width="1.8"/><path d="M352 176 h32 l-4 8 h-24z" fill="#3a3a40" stroke="{O}" stroke-width="2"/></g>'
    # head: huge notched ears, grin
    b+=f'<path d="M206 150 L120 108 Q128 140 164 160 L130 168 Q170 182 210 176Z" fill="{g}" stroke="{O}" stroke-width="3"/><path d="M138 120 l10 8 -6 4z" fill="#1a1230"/>'
    b+=f'<path d="M316 150 L400 104 Q392 138 356 160 L392 166 Q352 182 312 176Z" fill="{g}" stroke="{O}" stroke-width="3"/><path d="M380 116 l-10 8 6 4z" fill="#1a1230"/><path d="M150 132 Q180 150 200 156 M370 130 Q342 148 322 156" stroke="{g2}" stroke-width="4" fill="none"/>'
    b+=f'<path d="M206 196 Q194 120 262 104 Q330 120 318 196 Q300 236 262 236 Q224 236 206 196Z" fill="{g}" stroke="{O}" stroke-width="3"/>'
    b+=f'<path d="M222 120 Q262 92 302 120 Q290 140 262 136 Q234 140 222 120Z" fill="#5a3a22" stroke="{O}" stroke-width="2.4"/>'
    b+=f'<ellipse cx="238" cy="162" rx="15" ry="13" fill="#fff2a8" stroke="{O}" stroke-width="2.4"/><ellipse cx="288" cy="162" rx="15" ry="13" fill="#fff2a8" stroke="{O}" stroke-width="2.4"/><circle cx="242" cy="164" r="6" fill="{O}"/><circle cx="292" cy="164" r="6" fill="{O}"/><circle cx="244" cy="161" r="2" fill="#fff"/><circle cx="294" cy="161" r="2" fill="#fff"/>'
    b+=f'<path d="M222 146 l24 6 M304 146 l-24 6" stroke="{O}" stroke-width="5" stroke-linecap="round"/>'
    b+=f'<path d="M262 168 q-10 20 -2 26 q8 6 14 -2 q2 -10 -12 -24z" fill="{g2}" stroke="{O}" stroke-width="2.4"/><circle cx="270" cy="182" r="2.4" fill="{g3}"/>'
    b+=f'<path d="M226 204 Q262 230 300 202 Q290 222 262 224 Q236 224 226 204Z" fill="#2a1414" stroke="{O}" stroke-width="2.6"/><path d="M236 208 l4 8 4 -7 M256 212 l3 8 4 -8 M276 210 l4 7 3 -8 M290 206 l2 6 3 -7" fill="#fff2d0" stroke="{O}" stroke-width="1.2"/>'
    b+=''.join(f'<circle cx="{x}" cy="{y}" r="{s}" fill="{g2}"/>' for x,y,s in [(222,184,3),(306,186,2.5),(300,130,2)])
    return svg(b)
# ------------------------------------------------------------------ Shadow wolf
def wolf():
    f1,f2,f3,f4='#3e4a7a','#2a3260','#7684bc','#1c2246'
    b='<rect width="520" height="360" fill="#121634"/>'+stars(50,11,180)+'<circle cx="110" cy="76" r="40" fill="#e9ecf6"/><circle cx="110" cy="76" r="86" fill="#e9ecf6" opacity=".1"/>'
    b+=pines(262,'#1a2048',12,(80,150),30)+'<path d="M0 300 Q200 276 360 292 T520 286 V360 H0Z" fill="#cfd5e6"/><path d="M0 316 Q200 296 360 310 T520 304 V360 H0Z" fill="#aab2cc"/>'
    # far legs
    b+=f'<path d="M330 250 L340 300 Q342 314 356 318 L336 320 Q324 300 316 262Z" fill="{f4}" stroke="{O}" stroke-width="2.6"/><path d="M226 250 L214 298 Q212 314 226 318 L204 320 Q196 300 204 262Z" fill="{f4}" stroke="{O}" stroke-width="2.6"/>'
    # tail
    b+=f'<path d="M160 206 Q100 186 60 236 Q76 230 84 240 Q96 228 104 238 Q118 226 126 236 Q146 224 164 228Z" fill="{f2}" stroke="{O}" stroke-width="3" stroke-linejoin="round"/><path d="M146 210 Q110 204 82 226" stroke="{f3}" stroke-width="3" fill="none" stroke-linecap="round"/>'
    # body
    body=("M154 204 Q230 176 320 186 Q340 170 358 152 L366 116 L380 146 L392 122 L398 152 Q410 156 420 162 Q446 168 462 178 Q466 186 458 190 L438 192 Q426 200 410 200 "
          "Q396 210 384 214 L376 222 L368 218 L366 232 L356 228 L352 246 Q350 270 356 296 Q358 312 374 318 L350 322 Q338 304 334 270 Q312 262 280 262 L262 264 "
          "Q250 270 246 296 Q244 312 258 318 L234 322 Q222 304 224 276 Q200 270 178 258 Q150 240 154 204Z")
    b+=f'<path d="{body}" fill="{f2}" stroke="{O}" stroke-width="3" stroke-linejoin="round"/>'
    b+=f'<path d="M168 214 Q240 190 318 196" stroke="{f3}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/><path d="M330 192 Q350 176 362 160" stroke="{f3}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>'
    r=random.Random(4)
    for k in range(30):
        x=r.uniform(176,340); y=r.uniform(206,256)
        b+=f'<path d="M{x:.0f} {y:.0f} q{r.uniform(6,10):.0f} {r.uniform(2,5):.0f} {r.uniform(14,20):.0f} {r.uniform(5,9):.0f}" stroke="{r.choice([f1,f1,f3])}" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
    b+=f'<path d="M370 120 L374 140 M390 126 L392 146" stroke="#8a96cc" stroke-width="2"/>'
    b+=f'<path d="M380 168 Q400 160 420 166" stroke="{f1}" stroke-width="10" fill="none" stroke-linecap="round"/>'
    b+=f'<circle cx="408" cy="170" r="20" fill="#ffd36b" opacity=".22"/><path d="M398 170 q10 -8 20 -2 q-10 8 -20 2z" fill="#ffe27a" stroke="{O}" stroke-width="2"/><circle cx="410" cy="169" r="2.6" fill="{O}"/>'
    b+=f'<ellipse cx="458" cy="180" rx="7" ry="5" fill="{O}"/><path d="M438 192 l3 7 3 -6 M448 191 l2 6 3 -6" fill="#f3efe0" stroke="{O}" stroke-width="1"/>'
    b+=f'<path d="M344 226 l6 8 l-2 -10 l8 6 l-4 -10" stroke="{f3}" stroke-width="2" fill="none"/>'
    b+=''.join(f'<path d="M{x} {y} q-30 -6 -54 6 q-20 10 -40 0" stroke="#8a7ae0" stroke-width="{w}" fill="none" stroke-linecap="round" opacity=".45"/>' for x,y,w in [(176,236,5),(180,258,4),(200,282,3)])
    return svg(b)
for n,f in [('wren',wren),('bram',bram),('ivy',ivy),('goblin',goblin),('wolf',wolf)]:
    open(f'art2/{n}.svg','w').write(f())
