import math, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
OUT=sys.argv[1]
FD='/usr/share/fonts/opentype/inter/'
def F(w,s): return ImageFont.truetype(FD+f'InterDisplay-{w}.otf',s)
BG=(11,13,31)
def lerp(a,b,t): return tuple(int(a[i]+(b[i]-a[i])*t) for i in range(3))
STOPS=[(139,140,248),(255,122,89),(95,224,207),(184,185,255),(139,140,248)]
def holo(w,h,ph):
    # horizontal-diagonal moving gradient
    g=Image.new('RGB',(256,1))
    for x in range(256):
        t=((x/256)+ph)%1*4; i=int(t); g.putpixel((x,0),lerp(STOPS[i],STOPS[i+1],t-i))
    g=g.resize((w*2,h*3)); g=g.rotate(-18,expand=False)
    return g.crop((w//2,h,w//2+w,2*h))
def blobs(w,h,ph):
    im=Image.new('RGB',(w//8,h//8),BG); d=ImageDraw.Draw(im)
    for (cx,cy,r,col,sp) in [(.15,.2,.35,(67,56,202),1),(.85,.3,.3,(255,122,89),-1),(.55,.95,.35,(25,181,165),1),(.4,.1,.22,(124,92,255),-1)]:
        x=(cx+.06*math.sin(2*math.pi*(ph*sp)))*w/8; y=(cy+.05*math.cos(2*math.pi*ph))*h/8; R=r*w/8
        d.ellipse((x-R,y-R,x+R,y+R),fill=col)
    im=im.filter(ImageFilter.GaussianBlur(w/40)); im=Image.blend(Image.new('RGB',im.size,BG),im,.55)
    return im.resize((w,h),Image.BICUBIC)
def text_mask(w,h,lines,font,x,y,lh):
    m=Image.new('L',(w,h),0); d=ImageDraw.Draw(m)
    for i,l in enumerate(lines): d.text((x,y+i*lh),l,font=font,fill=255)
    return m
def hero(lang):
    W,H=1200,620; N=24
    kick={'es':'NIVEL 01  ·  NEWSLETTER PLAIGROUND  ·  NOV 2026','en':'LEVEL 01  ·  PLAIGROUND NEWSLETTER  ·  NOV 2026'}[lang]
    lines={'es':['Tu marca ya','no se busca.','Se pregunta.'],'en':['Your brand isn’t','searched anymore.','It’s asked.']}[lang]
    fb=F('Black',104); fk=F('Bold',26)
    m=text_mask(W,H,lines,fb,70,150,118)
    frames=[]; BLOB=blobs(W,H,0); PAL=None
    import random; random.seed(3); nz=Image.effect_noise((W,H),18).convert('RGB'); BLOB=ImageChops.add(Image.blend(BLOB,nz,.06),Image.new('RGB',(W,H),(0,0,0)))
    for f in range(N):
        ph=f/N
        bg=BLOB.copy()
        # grid lines
        d=ImageDraw.Draw(bg)
        for gx in range(0,W,60): d.line((gx,0,gx,H),fill=(22,25,52))
        for gy in range(0,H,60): d.line((0,gy,W,gy),fill=(22,25,52))
        bg=Image.blend(BLOB,bg,.35)
        hol=holo(W,H,ph*.5)
        # sweep highlight
        sw=Image.new('L',(W,H),0); sd=ImageDraw.Draw(sw); sx=-400+(W+800)*((f%N)/N)
        sd.polygon([(sx,0),(sx+140,0),(sx+20,H),(sx-120,H)],fill=255); sw=sw.filter(ImageFilter.GaussianBlur(30))
        txt=Image.composite(Image.new('RGB',(W,H),(255,255,255)),hol,ImageChops.multiply(sw,Image.new('L',(W,H),200)))
        # first two lines white-ish, last holo
        white=Image.new('RGB',(W,H),(244,245,251))
        mtop=text_mask(W,H,lines[:2],fb,70,150,118); mlast=text_mask(W,H,['','',lines[2]],fb,70,150,118)
        wt=Image.composite(Image.new('RGB',(W,H),(255,255,255)),white,ImageChops.multiply(sw,Image.new('L',(W,H),120)))
        bg.paste(wt,(0,0),mtop); 
        glow=mlast.filter(ImageFilter.GaussianBlur(14)); bg=Image.composite(Image.blend(bg,hol,.5),bg,glow)
        bg.paste(txt,(0,0),mlast)
        d=ImageDraw.Draw(bg)
        d.rounded_rectangle((70,70,70+d.textlength(kick,font=fk)+40,118),radius=24,outline=(184,185,255),width=2,fill=(20,22,46))
        d.text((90,79),kick,font=fk,fill=(220,222,255))
        # blinking cursor after last line
        if (f//4)%2==0:
            lw=d.textlength(lines[2],font=fb); d.rectangle((70+lw+14,150+236+22,70+lw+24,150+236+112),fill=(95,224,207))
        if PAL is None: PAL=bg.quantize(colors=200,method=Image.Quantize.MEDIANCUT)
        frames.append(bg.quantize(palette=PAL,dither=Image.Dither.NONE))
    frames[0].save(f'{OUT}/hero-{lang}.gif',save_all=True,append_images=frames[1:],duration=90,loop=0,optimize=True)
def bars(lang):
    W,H=1200,940
    data=[('Minecraft',780,8.5),('Pokémon',432,130.7),('One Piece',213,5.6),('Harry Potter',137,35.1),('Star Wars',100,46.7),('Super Mario',90,17.2),('Avatar',86,7.3),('Marvel',53,44.1)]
    t1={'es':'Lo que se busca vs. lo que se factura','en':'What people search vs. what it earns'}[lang]
    t2={'es':'Interés en Google (Star Wars = 100) · ingresos totales de la franquicia','en':'Google interest (Star Wars = 100) · total franchise revenue'}[lang]
    rev=lambda v: (f'{v:.1f}'.replace('.',',')+' mil M$') if lang=='es' else f'${v:.1f} bn'
    ft=F('Black',44); fs=F('Medium',24); fl=F('Bold',28); fv=F('Black',30); fr=F('Medium',22)
    N=26; HOLD=30; frames=[]
    X0=290; XW=600; top=190; rowh=78; MX=800
    for f in range(N+HOLD):
        t=min(1,f/N); e=1-(1-t)**3
        im=Image.new('RGB',(W,H),BG); d=ImageDraw.Draw(im)
        d.text((60,56),t1,font=ft,fill=(244,245,251)); d.text((60,118),t2,font=fs,fill=(163,168,204))
        for k in range(0,801,200):
            x=X0+XW*k/MX; d.line((x,top-14,x,top+rowh*len(data)),fill=(30,34,66),width=2)
        for i,(n,v,r) in enumerate(data):
            y=top+i*rowh
            col=(255,122,89) if n=='Minecraft' else (95,224,207) if n=='Marvel' else (124,108,248)
            d.text((60,y+14),n,font=fl,fill=(236,238,255))
            w=max(6,XW*v/MX*e); d.rounded_rectangle((X0,y+10,X0+w,y+52),radius=10,fill=col)
            d.text((X0+w+14,y+12),str(int(round(v*e))),font=fv,fill=(255,255,255))
            vw=d.textlength(str(int(round(v*e))),font=fv)
            if e>.9: d.text((X0+w+30+vw,y+19),rev(r),font=fr,fill=(163,168,204))
        if f>N+4:
            note={'es':'Minecraft: 7,8× el interés de Star Wars con 5× menos ingresos','en':'Minecraft: 7.8× Star Wars’ interest on 5× less revenue'}[lang]
            d.rounded_rectangle((60,H-86,60+d.textlength(note,font=F('Bold',26))+40,H-34),radius=26,fill=(255,122,89))
            d.text((80,H-78),note,font=F('Bold',26),fill=(20,22,46))
        frames.append(im.convert('P',palette=Image.ADAPTIVE,colors=64))
    frames=[frames[-1]]+frames; durs=[1800]+[45]*N+[120]*(HOLD-1)+[2600]
    frames[0].save(f'{OUT}/bars-{lang}.gif',save_all=True,append_images=frames[1:],duration=durs,loop=0,optimize=True)
for l in ['es','en']: hero(l); bars(l)
