# Design references

These are the first designs for Glasswood. They were chosen from six rounds of 2D exploration and are the target look for the SVG version.

| File | What it shows |
| --- | --- |
| `scenes/wilds.svg` | Wilds: the globe from above in its horizon ring, with the whole world inside |
| `scenes/watch.svg` | Watch: the reading glass over the globe; the path web, burrows and a long detour forced by four barricades |
| `scenes/watch-night.svg` | Watch at night: goblins and wolves walking the detour, arrows from the tower |
| `scenes/hearth.svg` | Hearth: the tilted loupe over Emberfold, with the raised terrace, stairs and every building |
| `cards/*.svg` | Card portraits: Wren (archer), Bram (smith), Ivy (herbalist), the Lantern Goblin and the Shadow Wolf |
| `cards/paper.svg` | The paper grain used on notes and cards |
| `*.jpg` | Quick previews of the above |

The scenes contain only the desk and the world. The notes, view card and trading cards were laid out as HTML on top of them in the design canvas, and are described in the plan (sections 2, 8 and 13).

## Regenerating

The scenes are drawn by the Python scripts in `tools/design` (standard library only). Run them from that folder:

```
python3 make6.py   # wilds and hearth
python3 make5.py   # watch and watch at night
python3 portraits.py
```

`make5.py` and `make6.py` write into `tools/design/desk/` and `portraits.py` into `tools/design/art2/` (create both folders first). The drawing functions are the reference for the JavaScript SVG renderer.
