#!/usr/bin/env python3
"""Audio sanity check for the narrated MP4 (no listening involved): duration, peak, clipping, and whether speech
energy sits inside each narration line's window and the gaps between lines are quiet.
Usage: check_audio.py LEV_explainer_synthetic_voice.mp4   (FFMPEG=/path/to/ffmpeg if ffmpeg is not on PATH)"""
import json
import os
import re
import subprocess
import sys

import numpy as np

V = os.path.dirname(os.path.abspath(__file__))
FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')
mp4 = sys.argv[1]
TL = json.loads(re.search(r'=\s*(\{.*\});', open(V + '/anim/timeline.js').read(), re.S).group(1))
SR = 48000

info = subprocess.run([FFMPEG, '-hide_banner', '-i', mp4], stderr=subprocess.PIPE, text=True).stderr
dur = re.search(r'Duration: (\d+):(\d+):([\d.]+)', info)
dur = int(dur.group(1)) * 3600 + int(dur.group(2)) * 60 + float(dur.group(3))
raw = subprocess.run([FFMPEG, '-v', 'error', '-i', mp4, '-map', '0:a:0', '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'], stdout=subprocess.PIPE).stdout
x = np.frombuffer(raw, dtype='<i2').astype(np.float64) / 32768.0
peak = float(np.max(np.abs(x)))
print('container duration %.2f s, timeline total %.2f s, audio %.2f s' % (dur, TL['total'], len(x) / SR))
print('peak %.1f dBFS, samples at full scale: %d' % (20 * np.log10(peak), int(np.sum(np.abs(x) >= 0.999))))

def rms(a, b):
    seg = x[int(a * SR):int(b * SR)]
    return float(np.sqrt(np.mean(seg ** 2))) if len(seg) else 0.0

bad = 0
speech_levels, gap_levels = [], []
for sc in TL['scenes']:
    wins = [(sc['t0'] + g['t0'], sc['t0'] + g['t1']) for g in sc['seg']]
    for i, (a, b) in enumerate(wins):
        r = rms(a, b)
        speech_levels.append(r)
        if i + 1 < len(wins):
            gr = rms(b + 0.08, wins[i + 1][0] - 0.08)     # the gap between two lines, minus fade margins
            gap_levels.append(gr)
        # energy should be spread across the line: every fifth of the window should carry sound
        fifths = [rms(a + (b - a) * k / 5, a + (b - a) * (k + 1) / 5) for k in range(5)]
        if r < 0.01 or min(fifths) < 0.3 * r:
            bad += 1
            print('  weak or gappy line in %s at %.1f-%.1f s: rms %.4f, fifths %s' % (sc['id'], a, b, r, ['%.3f' % f for f in fifths]))
    # nothing before the first line of the scene (lead-in) and after the last (tail), except a neighbour's tail
    lead = rms(sc['t0'] + 0.05, wins[0][0] - 0.05)
    tail = rms(wins[-1][1] + 0.05, sc['t0'] + sc['dur'] - 0.05)
    if lead > 0.02 or tail > 0.02:
        bad += 1
        print('  sound outside the lines in %s: lead rms %.4f, tail rms %.4f' % (sc['id'], lead, tail))
print('lines: %d, median speech rms %.3f, loudest gap rms %.4f, flagged: %d' % (len(speech_levels), np.median(speech_levels), max(gap_levels), bad))
sys.exit(1 if (bad or peak >= 0.999) else 0)
