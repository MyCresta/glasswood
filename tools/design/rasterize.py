# Render SVG assets to WebP (needs Playwright with Chrome, and Pillow).
# Usage: python3 rasterize.py [--scale 2] file.svg [file.svg ...]
import sys, os, re
from playwright.sync_api import sync_playwright
from PIL import Image
CHROME=os.environ.get('CHROME','/usr/bin/google-chrome')
args=sys.argv[1:]; scale=2
if args and args[0]=='--scale': scale=float(args[1]); args=args[2:]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME,args=['--no-sandbox'])
    for f in args:
        head=open(f).read(400)
        w=int(re.search(r'width="(\d+)"',head).group(1)); h=int(re.search(r'height="(\d+)"',head).group(1))
        pg=b.new_page(viewport={'width':w,'height':h},device_scale_factor=scale)
        pg.goto('file://'+os.path.abspath(f)); pg.wait_for_timeout(1000)
        png=f.replace('.svg','.png'); pg.screenshot(path=png,omit_background=True)
        Image.open(png).save(f.replace('.svg','.webp'),quality=82,method=6); os.remove(png); pg.close()
    b.close()
