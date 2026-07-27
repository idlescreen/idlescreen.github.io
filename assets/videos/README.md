# Screensaver gallery media

Clips for the homepage saver cards (`idlescreen.github.io`).

The page CSS shows each preview in a **fixed frame**: full card width (≈ **340–480 px**), **210 px** tall, `object-fit: cover`. Source video does **not** need to match that pixel size; browsers scale and crop.

## Format (required for browsers)

| Prefer | Why |
|--------|-----|
| **`.mp4`** — **H.264** (`libx264`), **yuv420p**, **no audio** | Works in Chrome / Firefox / Safari / Edge |
| Optional extra: **`.webm`** (VP9) | Smaller; still keep MP4 for Safari |
| **`.gif`** | OK for tiny loops; heavy at high res |

**Avoid as the only web file:** Studio/render defaults (`.mkv` + **AV1**). Fine for archives; browsers (especially Safari) often won’t play them inline.

### FFmpeg from a Studio export

```bash
# ~/Videos/idlescreen-beams-….mkv  →  web-ready gallery clip
ffmpeg -y -i input.mkv -an \
  -c:v libx264 -pix_fmt yuv420p -preset slow -crf 28 \
  -movflags +faststart \
  beams.mp4
```

Or export from Studio/render at web size in one step (after tools support H.264 web path; until then remux/transcode as above):

```bash
render -e beams --duration 8s -o /tmp/beams-src.mkv --width 1280 --height 720 --fps 30
ffmpeg -y -i /tmp/beams-src.mkv -an -c:v libx264 -pix_fmt yuv420p -crf 28 -movflags +faststart beams.mp4
```

## Size & duration (recommended)

| Spec | Recommendation | Notes |
|------|----------------|--------|
| **Resolution** | **1280×720** (or **854×480**) | Display is only ~340×210 CSS px; 4K is wasted bandwidth |
| **Aspect** | **16:9** | Matches `cover` crop cleanly; other ratios work but crop more |
| **Frame rate** | **24–30 fps** | 60 fps doubles size with little gallery benefit |
| **Duration** | **6–12 s** seamless loop | Long enough to read the motion; keep files small |
| **File size** | **~1–4 MB per saver** (hard ceiling **~8–10 MB**) | 10 savers × 10 MB is already heavy for GitHub Pages |
| **Audio** | **None** (`-an`) | Gallery is silent |

GitHub Pages has no tiny per-file limit, but repo size and first-load time matter. Prefer short, compressed MP4s.

## Filenames (must match)

Place files in this directory:

| File | Saver |
|------|--------|
| `beams.mp4` / `beams.gif` | beams |
| `bursts.mp4` / `bursts.gif` | bursts |
| `chaos.mp4` / `chaos.gif` | chaos |
| `cosmos.mp4` / `cosmos.gif` | cosmos |
| `glyphs.mp4` / `glyphs.gif` | glyphs |
| `gnats.mp4` / `gnats.gif` | gnats |
| `hearth.mp4` / `hearth.gif` | hearth |
| `radar.mp4` / `radar.gif` | radar |
| `ripple.mp4` / `ripple.gif` | ripple |
| `storm.mp4` / `storm.gif` | storm |

## Current gallery clips

Shipped as H.264 Baseline MP4 (OpenH264), **960×540**, **30 fps**, **6 s**, silent, ~1 MB each.

```bash
# regenerate from idle render
export PATH="$RENDER_REPO/target/release:$PATH"
export IDLE_SHOW_CENTERED_LOGO=0
for e in beams cosmos bursts storm chaos hearth ripple radar glyphs gnats; do
  render -e "$e" --duration 6s -o /tmp/$e.mkv --width 960 --height 540 --fps 30
  ffmpeg -y -i /tmp/$e.mkv -an -c:v libopenh264 -b:v 1.2M -pix_fmt yuv420p \
    -movflags +faststart assets/videos/$e.mp4
done
```

Homepage cards load these via `<video autoplay muted loop playsinline>` with canvas fallback until the file is ready.
