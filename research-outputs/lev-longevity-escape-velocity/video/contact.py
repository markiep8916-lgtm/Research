#!/usr/bin/env python3
"""Render a few frames per scene and tile them into a contact sheet: contact.py <scene_id> [rel_times comma list | frac list]"""
import json, re, subprocess, sys, os
from PIL import Image
V = os.path.dirname(os.path.abspath(__file__))
TL = json.loads(re.search(r'=\s*(\{.*\});', open(V + '/anim/timeline.js').read(), re.S).group(1))
sid = sys.argv[1]
sc = next(s for s in TL['scenes'] if s['id'] == sid)
rel = [float(x) for x in sys.argv[2].split(',')] if len(sys.argv) > 2 else [sc['dur'] * f for f in (0.08, 0.2, 0.35, 0.5, 0.65, 0.8, 0.9, 0.98)]
times = [sc['t0'] + r for r in rel]
out = V + '/sheets/' + sid
os.makedirs(out, exist_ok=True)
for f in os.listdir(out): os.remove(out + '/' + f)
import random
for attempt in range(4):
    port = random.randint(9800, 9990)
    r = subprocess.run(['node', V + '/render.mjs', '--html', V + '/anim/index.html', '--out', out, '--times', ','.join('%.3f' % t for t in times), '--mode', 'canvas', '--port', str(port)], stderr=subprocess.PIPE, text=True)
    if r.returncode == 0: break
    print('render attempt', attempt, 'failed:', r.stderr[-300:])
else:
    raise SystemExit('render failed')
files = sorted(os.listdir(out))
cols = 2
tw, th = 960, 540
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw, rows * th), (30, 30, 30))
for i, f in enumerate(files):
    im = Image.open(out + '/' + f).convert('RGB').resize((tw, th), Image.LANCZOS)
    sheet.paste(im, ((i % cols) * tw, (i // cols) * th))
sheet.save(V + '/sheets/%s_sheet.png' % sid)
print(sid, 'dur %.1f' % sc['dur'], 'times(rel):', ', '.join('%.1f' % r for r in rel))
