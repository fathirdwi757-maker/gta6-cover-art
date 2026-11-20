# gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/fathirdwi757-maker/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/fathirdwi757-maker/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Neon Horizon Cover Studio** is a free, offline web app that turns your own photos into GTA-style cover art: the multi-panel poster look, a Vice City sunset or neon colour grade, bold condensed lettering with a neon script subtitle, exported as a PNG in the common post sizes. Your photos are read on your own machine and never uploaded — the whole app is static files with no build step and no network request.

## What it does

- **Four layouts** — Classic Strip (a wide hero panel over three), Poster (one full-bleed panel), Duo (two tall halves) and Quad (a two-by-two grid), all framed by the genre's off-white panel borders.
- **Any photo in any panel** — start from the four bundled samples or upload your own (button, or drag and drop onto the cover). Click a panel to select it, drag its photo to reframe, scroll or slide to zoom from 100% to 300%, flip it horizontally, spread one photo across every panel, or clear it.
- **Six colour grades**, each a per-pixel canvas grade baked into the photo before it is cropped: Sunset Strip, Neon Nights, Golden Hour, Vice Pastel, Midnight, and Chrome Noir (hard black-and-white that lets warm and magenta colours survive).
- **Your words** — an editable title in Anton, a script subtitle in Pacifico with a neon glow, and a letter-spaced edition line, all drawn on the canvas over soft shade bands so they read on any photo.
- **One-step export** — a PNG at 1080 × 1080, 1080 × 1350, 1920 × 1080, or the classic 4:3 ladder 1200 × 900, 1600 × 1200 and 2400 × 1800. The preview is the cover at full export resolution, so what you frame is exactly what you post.

## Screenshots

- `screenshots/1-cover.jpg` — a finished Classic Strip cover in Sunset Strip, exported wide.
- `screenshots/2-editor.jpg` — the studio at work: samples, layout and grade pickers, a panel selected for editing.
- `screenshots/3-cover.jpg` — a Quad cover in Vice Pastel, exported as a portrait.
- `screenshots/4-cover.jpg` — a Poster cover in Chrome Noir, exported square.

## Credits

- Lettering: Anton and Pacifico, bundled under `app/fonts/` under the SIL Open Font License 1.1 (the license texts sit beside the font files). No Rockstar Games logo, artwork or font is used anywhere; every title on the covers is invented.
- Sample photos: free stock from Lorem Picsum (Unsplash-sourced, free to use) — a hot rod, two classics at yellow garage doors, a neon street at night and a turquoise surf van. None shows an identifiable person.
- The app itself is MIT-licensed, like the rest of this repository.

## Run it

```sh
node serve.ts
# then open http://localhost:8080 in a desktop browser
```

To hand the entry in the way the grader does:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=7k4mkbbj&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
