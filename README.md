# gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/fathirdwi757-maker/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/fathirdwi757-maker/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Neon Horizon Cover Studio is an offline browser app that turns your photos and a caption into GTA-style multi-panel cover art: four layouts (poster hero + three panels, quad grid, nine-panel cover grid with a title block, full-bleed solo), six per-pixel colour grades (sunset, neon night, vice pastel, golden hour, ink, and chrome noir — a desaturated steel grade with crushed blacks and cool highlights), drag-to-position, zoom and a horizontal flip per panel, Anton title lettering with a Pacifico script subtitle, heat stars, film grain, vignette and a poster frame — exported as a PNG in 1080x1080, 1080x1350, 1920x1080 or 1080x1920, all sizes in one click. It runs entirely from its own files with no network request, so your photos never leave your machine; the four bundled sample photos and the two vendored fonts (Anton and Pacifico, SIL Open Font License) are its own.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080, add your photos, pick a layout and grade, drag each photo into place, edit the caption and export. (`node main.ts` is the entrypoint that hands the app in: it copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.)

---

<sub>Entered on [make.fun](https://make.fun/?ref=7k4mkbbj&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
