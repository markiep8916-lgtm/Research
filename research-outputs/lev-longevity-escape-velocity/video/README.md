# Explainer video: longevity escape velocity

A 5 min 56 s animated explainer (1920 x 1080, 30 frames a second) that walks through the arithmetic and the evidence in [`../LEV_research_report.md`](../LEV_research_report.md): what LEV means, how fast death rates would have to fall, how that compares with history, why medicine has delivered steps and not a rate, what the mouse results would be worth if they carried over, what could resist, the "when" question, the race for one person, and how far to trust any of it. The charts are drawn frame by frame from the report's model and output tables. Captions are burned in.

**Status: preliminary and AI-produced, the same as the report.** A badge on every frame says so. No human has checked the video, the report, or any number on screen. The mortality curves and tables use two placeholder model inputs (the death rate at age 80 and the extrinsic floor), so they are illustrative arithmetic, not forecasts. The video adds no findings that are not in the report; where the report hedges, the captions carry the hedge. Nothing in it is medical, financial or legal advice.

## Files

| File | What it is |
|---|---|
| `LEV_explainer_captions_only.mp4` | Picture and burned-in captions, no sound. Watch this one if you want the text of record. |
| `LEV_explainer_synthetic_voice.mp4` | The same picture with a narration track made by a stock text-to-speech voice (SVOX Pico, `pico2wave`). The voice is synthetic and robotic. Nobody has listened to the track to judge it. `check_audio.py` confirms only that the track is as long as the picture, does not clip, carries sound throughout each narration line, and is silent between lines. |
| `LEV_explainer.srt` | The captions as a separate SubRip file, on the same clock. |
| `script.json` | The words: one caption and one speech string per line, grouped by scene. The speech string spells numbers out for the voice; the caption is the text of record. |
| `export_data.py` | Reads the committed outputs in `../phase3_analysis/outputs/` and calls the committed model to write `anim/data.js`. |
| `build_timeline.py` | Synthesises each line, measures it, lays out the scene timing (`anim/timeline.js`), the narration track and the SRT. |
| `anim/` | The renderer: an HTML canvas whose `window.__draw(t)` paints any frame from the clock alone, so a frame never depends on the previous one. Fonts are Source Serif 4 and Source Sans 3 (SIL Open Font License 1.1). |
| `render.mjs` | Drives headless Chromium over the DevTools protocol and saves the frames as PNG. |
| `make_video.sh` | The whole build, from data to MP4. |
| `contact.py` | QA helper: renders a few frames of one scene and tiles them into a contact sheet. |
| `check_audio.py` | QA helper: checks the narrated MP4's track against the timeline (length, clipping, sound inside each line's window). |

## Scenes

Times are from the start of the narrated version.

| Time | Scene | What it shows | Numbers come from |
|---|---|---|---|
| 0:00 | Title | The definition of LEV; lifelines that end, one that keeps going | Report section 2 |
| 0:16 | 1. The idea | Remaining life expectancy of a 70-year-old at the historical pace and at escape velocity | Model life tables (`lev_model.e_period`), `params.json` |
| 0:49 | 2. Age-years | Death rate against age on a log scale; a 3-year shift is 23% lower; 1 age-year a year is 8.3% a year | Model hazard curve; T1 |
| 1:27 | 3. The pace gap | Observed 1-2% a year against the required pace under three definitions | T1, T1c, T2 |
| 2:01 | 4. Steps, not a rate | Human effects as one-off age-years; the stepwise cadence against the annual test | T3, T3c |
| 2:47 | 5. The lab results | Mouse gains converted to human age-years as an upper bound | T3 |
| 3:18 | 6. What resists | Years a no-shrink escape lasts if part of the risk never improves | T4 |
| 3:50 | 7. When? | The four outcomes; what an onset around 2035 demands of the pace | T6b and the ramp series behind it |
| 4:38 | 8. One person | Chance of being alive when escape starts, by age today | Model race table; ranges from T5b |
| 5:15 | 9. How sure are we? | Status, limits, what would change the conclusions; end card | Report sections 1 and 7 |

Read from the model and the CSV outputs by `export_data.py`: every curve, bar, grid cell, ramp and percentage drawn. Typed in from the report text: the observed declines (1-2% a year; 1.0-1.8% for US ages 65 and over in 2018-19; the 1.5% actuarial assumption), the mouse median-lifespan gains (+12%, +19%, +26%, +34%) and the hazard ratio 0.65 for dasatinib plus quercetin, the trial labels on the step bars, and the 2.6% team-set bound on the pace under stagnation. Those typed figures carry the report's daggers where it marks them (the figure was present in a search query).

## Rebuild

Needs Python 3 with numpy and Pillow (for `contact.py` only), Node 22 or newer, a Chromium binary (`CHROME=/path/to/chrome`), ffmpeg with libx264 and AAC (`FFMPEG=/path/to/ffmpeg`), and `pico2wave` (Debian package `libttspico-utils`) for the voice.

```
cd research-outputs/lev-longevity-escape-velocity/video
./make_video.sh            # about 7 minutes on 4 cores; writes frames/ (about 5 GB) and both MP4s
```

The script runs `export_data.py`, `build_timeline.py`, a four-way parallel `render.mjs`, and the two encodes. Set `SKIP_RENDER=1` to re-encode from existing frames. Frames, the synthesised lines and the narration track are build products and are not committed (`.gitignore`).

A clean rebuild from these committed sources (4 cores, 6.5 minutes) reproduced `anim/data.js`, `anim/timeline.js`, the SRT and both MP4s byte for byte, and every frame identically. Other versions of Chromium, ffmpeg or the voice package may give slightly different pixels or audio.

## Known limits

- The picture, not the voice, was reviewed. Sampled frames of every scene were checked on contact sheets for overlap and clipping, then frames from the finished MP4 were checked again at full size; the words were checked against the report. The audio was never heard.
- The animation shows the report's model, so it inherits the report's limits: placeholder mortality inputs, a Gompertz-Makeham hazard with a single slope, period life tables, full access to any treatment, no forecast of any date.
- One defect in the model was found while building the video: the smoothed stepwise trajectory in table T3c had a spurious step at t = 0. It is fixed and tested, the correction is logged in the deviations log of [`../phase1_scoping/03_analysis_plan.md`](../phase1_scoping/03_analysis_plan.md) (2026-09-30), and the report now gives 22% of years passing after smoothing for steps of 20 age-years every 20 years (5% without smoothing). The video uses the corrected values.
- Fonts: Source Serif 4 and Source Sans 3 are copyright Adobe and used under the SIL Open Font License 1.1 (https://openfontlicense.org). The `.woff2` files are unmodified subsets from Google Fonts.
