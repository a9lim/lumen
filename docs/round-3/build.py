# Assemble the Lumen round-three proposal page.  usage: python3 build.py OUT.html
# Bundles Lumen's engine (src/engine/) with the parent's esbuild and inlines the screenshots.
import base64, os, re, subprocess, sys
D = os.path.dirname(os.path.abspath(__file__))
rd = lambda p: open(os.path.join(D, p)).read()
root = os.path.abspath(os.path.join(D, '..', '..'))
subprocess.run([os.path.join(root, '..', '..', 'node_modules', '.bin', 'esbuild'), os.path.join(root, 'src', 'engine', 'engine.js'),
                '--bundle', '--format=iife', '--global-name=LumenEngine', '--minify', '--outfile=' + os.path.join(D, 'data', 'engine.js')], check=True)
head = rd('head.html').replace('/*EXTRA*/', rd('extra.css'))
page = head + '<main class="wrap">\n' + rd('body.html') + '</main>\n<script>\n' + rd('data/engine.js') + '\n</script>\n<script>\n(() => {\n\'use strict\';\n' + rd('page.js') + '})();\n</script>\n'
page = page.replace('{{SEAL}}', rd('seal.svg').strip())
def img(m):
    return 'data:image/jpeg;base64,' + base64.b64encode(open(os.path.join(D, 'img', m.group(1) + '.jpg'), 'rb').read()).decode()
page = re.sub(r'\{\{IMG:([A-Za-z0-9-]+)\}\}', img, page)
open(sys.argv[1], 'w').write(page)
print(sys.argv[1], len(page))
