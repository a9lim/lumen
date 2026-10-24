# Assemble the Lumen second-pass proposal page.  usage: python3 build.py OUT.html
import base64, os, re, sys
D = os.path.dirname(os.path.abspath(__file__))
rd = lambda p: open(os.path.join(D, p)).read()
head = rd('head.html').replace('<title>Worldline Second Pass</title>', '<title>Lumen Second Pass</title>').replace('<title>a9l.im Sim Overhaul</title>', '<title>Lumen Second Pass</title>')
head = head.replace('</style>', rd('extra.css') + '\n</style>')
js = '\n'.join(rd(f) for f in ['core.js', 'kit.js', 'mapkit.js', 'mapdraw.js', 'memkit.js', 'sk-locator.js', 'sk-plate.js'] + [f for f in sorted(os.listdir(D)) if f.startswith('sk-') and f not in ('sk-locator.js', 'sk-plate.js')])
page = head + '<main class="wrap">\n' + rd('body.html') + '</main>\n<script>\n(() => {\n\'use strict\';\n' + js + rd('main.js') + '})();\n</script>\n'
page = page.replace('{{SEAL}}', rd('seal.svg').strip())
def thumb(m):
    p = os.path.join(D, 'thumbs', m.group(1) + '.jpg')
    return 'data:image/jpeg;base64,' + base64.b64encode(open(p, 'rb').read()).decode()
page = re.sub(r'\{\{THUMB:([a-z0-9-]+)\}\}', thumb, page)
open(sys.argv[1], 'w').write(page)
print(sys.argv[1], len(page))
