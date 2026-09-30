#!/usr/bin/env bash
# Build the explainer video: data -> timeline and voice -> frames -> two MP4s.
# Needs: python3 + numpy, node 22+, Chromium (CHROME=...), ffmpeg (FFMPEG=...), pico2wave (voice track only).
# SKIP_RENDER=1 re-encodes from existing frames. JOBS sets the number of parallel renderers (default 4).
set -euo pipefail
cd "$(dirname "$0")"
FFMPEG=${FFMPEG:-ffmpeg}
JOBS=${JOBS:-4}
FPS=30

python3 export_data.py          # anim/data.js from the committed model outputs
python3 build_timeline.py       # anim/timeline.js, narration_16k.wav, LEV_explainer.srt
N=$(python3 -c "
import json, math
s = open('anim/timeline.js').read()
print(math.ceil(json.loads(s[s.index('=') + 1:].strip().rstrip(';'))['total'] * $FPS - 1e-6))")
echo "frames: $N"

if [ "${SKIP_RENDER:-0}" != "1" ]; then
  rm -rf frames && mkdir -p frames logs
  Q=$(( (N + JOBS - 1) / JOBS ))
  for i in $(seq 0 $((JOBS - 1))); do
    s=$(( i * Q )); e=$(( (i + 1) * Q )); [ "$e" -gt "$N" ] && e=$N
    [ "$s" -ge "$N" ] && continue
    node render.mjs --html anim/index.html --out frames --start "$s" --end "$e" --fps $FPS --port $(( 9440 + i )) --mode canvas > "logs/render_$i.log" 2>&1 &
  done
  wait
  [ "$(ls frames | wc -l)" -eq "$N" ] || { echo "expected $N frames, found $(ls frames | wc -l); see logs/" >&2; exit 1; }
fi

# H.264, BT.709, 8-bit 4:2:0 for wide player support; -tune animation suits flat colour and thin lines
VIDEO_OPTS=(-framerate $FPS -i frames/%06d.png
  -vf "scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p"
  -c:v libx264 -preset slow -crf 20 -tune animation -profile:v high -level 4.2
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -r $FPS -movflags +faststart)

"$FFMPEG" -y "${VIDEO_OPTS[@]}" -an LEV_explainer_captions_only.mp4

# narration: 16 kHz synthetic voice -> 48 kHz, gentle loudness normalisation, AAC; the picture is copied, not re-encoded
"$FFMPEG" -y -i LEV_explainer_captions_only.mp4 -i narration_16k.wav -map 0:v -map 1:a -c:v copy \
  -af "aresample=48000,loudnorm=I=-18:TP=-2:LRA=9,aresample=48000" -c:a aac -b:a 128k -ac 1 -shortest -movflags +faststart \
  LEV_explainer_synthetic_voice.mp4
