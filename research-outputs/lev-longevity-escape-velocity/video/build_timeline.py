#!/usr/bin/env python3
"""Speech synthesis and timeline: reads script.json, synthesises each segment with Pico TTS, measures the audio,
lays the segments out per scene, splits long captions into timed chunks, and writes anim/timeline.js plus a
single narration track (narration_16k.wav) placed on the same clock."""
import hashlib
import json
import os
import re
import subprocess
import sys
import wave

import numpy as np

V = os.path.dirname(os.path.abspath(__file__))
S = json.load(open(V + '/script.json'))
FPS = S['meta']['fps']
LEAD, GAP, TAIL = S['meta']['lead_in'], S['meta']['gap'], S['meta']['tail']
os.makedirs(V + '/tts', exist_ok=True)
SR = 16000


def synth(text):
    h = hashlib.sha1(text.encode()).hexdigest()[:12]
    path = f'{V}/tts/{h}.wav'
    if not os.path.exists(path):
        subprocess.run(['pico2wave', '-l', 'en-US', '-w', path, text], check=True)
    w = wave.open(path)
    assert w.getframerate() == SR and w.getnchannels() == 1 and w.getsampwidth() == 2
    data = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float32) / 32768.0
    return path, data


def trim(data, thresh=0.004, pad=0.06):
    """Cut leading and trailing near-silence so segment timing is tight."""
    idx = np.where(np.abs(data) > thresh)[0]
    if len(idx) == 0:
        return data
    a, b = max(0, idx[0] - int(pad * SR)), min(len(data), idx[-1] + int(pad * SR))
    return data[a:b]


def chunk_caption(text, dur, limit=118):
    """Split a caption into chunks of at most `limit` characters (at sentence ends, then at clause breaks) and give
    each chunk a share of the segment duration in proportion to its length."""
    parts = re.split(r'(?<=[.?!])\s+', text.strip())
    out = []
    for s in parts:
        if len(s) <= limit:
            out.append(s)
            continue
        clauses = re.split(r'(?<=[,;:])\s+', s)
        cur = ''
        for c in clauses:
            if cur and len(cur) + 1 + len(c) > limit:
                out.append(cur)
                cur = c
            else:
                cur = (cur + ' ' + c).strip()
        if cur:
            out.append(cur)
    # merge chunks that are too short with the previous one when possible
    merged = []
    for c in out:
        if merged and len(merged[-1]) + 1 + len(c) <= limit:
            merged[-1] = merged[-1] + ' ' + c
        else:
            merged.append(c)
    total = sum(len(c) for c in merged)
    chunks, t = [], 0.0
    for c in merged:
        d = dur * len(c) / total
        chunks.append({'t0': round(t, 3), 't1': round(t + d, 3), 'text': c})
        t += d
    return chunks


scenes, t_abs = [], 0.0
placements = []  # (absolute start, samples)
for sc in S['scenes']:
    segs, lt = [], LEAD
    for sg in sc['segments']:
        path, data = synth(sg['speech'])
        data = trim(data)
        d = len(data) / SR
        segs.append({'t0': round(lt, 3), 't1': round(lt + d, 3), 'caption': sg['caption'],
                     'chunks': [dict(c, t0=round(lt + c['t0'], 3), t1=round(lt + c['t1'], 3)) for c in chunk_caption(sg['caption'], d)]})
        placements.append((t_abs + lt, data))
        lt += d + GAP
    natural = lt - GAP + TAIL
    dur = max(sc['min_dur'], natural)
    dur = round(dur * FPS) / FPS
    scenes.append({'id': sc['id'], 'tag': sc['tag'], 't0': round(t_abs, 4), 'dur': round(dur, 4), 'seg': segs})
    t_abs += dur

total = round(t_abs * FPS) / FPS
TL = {'fps': FPS, 'total': total, 'scenes': scenes}
open(V + '/anim/timeline.js', 'w').write('window.TL = ' + json.dumps(TL) + ';\n')

# one narration track on the video clock
n = int(np.ceil(total * SR)) + SR
track = np.zeros(n, dtype=np.float32)
for start, data in placements:
    i = int(round(start * SR))
    fade = int(0.015 * SR)
    d = data.copy()
    d[:fade] *= np.linspace(0, 1, fade)
    d[-fade:] *= np.linspace(1, 0, fade)
    track[i:i + len(d)] += d
peak = float(np.max(np.abs(track)))
track = track / peak * 0.85 if peak > 0 else track
with wave.open(V + '/narration_16k.wav', 'wb') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((track * 32767).astype('<i2').tobytes())

words = sum(len(re.findall(r"[\w'-]+", s['speech'])) for sc in S['scenes'] for s in sc['segments'])
speech_secs = sum(len(d) / SR for _, d in placements)
print('scenes:')
for s in scenes:
    print('  %-9s t0=%7.2f dur=%6.2f  narration %s' % (s['id'], s['t0'], s['dur'], ', '.join('%.1f-%.1f' % (g['t0'], g['t1']) for g in s['seg'])))
print('total %.2f s (%d:%04.1f); frames %d; %d words in %.1f s of speech = %.0f wpm' % (
    total, int(total // 60), total % 60, int(round(total * FPS)), words, speech_secs, words / speech_secs * 60))


# caption track (SubRip) on the same clock: one cue per caption chunk
def stamp(x):
    ms = int(round(x * 1000))
    return '%02d:%02d:%02d,%03d' % (ms // 3600000, ms // 60000 % 60, ms // 1000 % 60, ms % 1000)


cues = []
for s in scenes:
    for g in s['seg']:
        for c in g['chunks']:
            cues.append((s['t0'] + c['t0'], s['t0'] + c['t1'], c['text']))
with open(V + '/LEV_explainer.srt', 'w', encoding='utf-8') as f:
    for i, (a, b, txt) in enumerate(cues, 1):
        f.write('%d\n%s --> %s\n%s\n\n' % (i, stamp(a), stamp(b), txt))
print('wrote %d caption cues to LEV_explainer.srt' % len(cues))
