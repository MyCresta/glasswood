# Render the game's SVG assets to WebP at 2x (needs Playwright with Chrome, and Pillow).
# Usage: python3 rasterize.py assets/watch-base.svg assets/watch-glass.svg
import sys, os
from playwright.sync_api import sync_playwright
from PIL import Image
CHROME=os.environ.get('CHROME','/usr/bin/google-chrome')
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME,args=['--no-sandbox'])
    pg=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=2)
    for f in sys.argv[1:]:
        pg.goto('file://'+os.path.abspath(f)); pg.wait_for_timeout(800)
        png=f.replace('.svg','.png'); pg.screenshot(path=png,omit_background=True)
        Image.open(png).save(f.replace('.svg','.webp'),quality=82,method=6); os.remove(png)
    b.close()
