# Marketing media (drop-in, no rebuild required)

Place files here and refresh the site. Missing files fall back to SVG UI mocks on the homepage.

## Hero video (homepage)

| File | Purpose |
|------|---------|
| `hero-demo.mp4` | Primary hero loop (15–25s, muted, follow-up workflow) |
| `hero-demo.webm` | Optional smaller/faster WebM variant |

Record: mark lead **Contacted** → reminder appears → follow up. Use OBS, Screen Studio, or Xbox Game Bar.

Poster fallback: existing `src/assets/hero.png` / `hero_light.png` until video is added.

## Feature screenshots (homepage #features)

Export WebP at ~1200×800 from dark and light theme:

- `feature-pipeline-dark.webp` / `feature-pipeline-light.webp` — CRM with Hot/Warm/Cold
- `feature-reminders-dark.webp` / `feature-reminders-light.webp` — reminders after Contacted
- `feature-templates-dark.webp` / `feature-templates-light.webp` — template with placeholders
- `feature-revenue-dark.webp` / `feature-revenue-light.webp` — invoice / revenue

## How it works (homepage)

- `step-add-lead-dark.webp` / `step-add-lead-light.webp`
- `step-contacted-dark.webp` / `step-contacted-light.webp`
- `step-follow-up-dark.webp` / `step-follow-up-light.webp`

## Upgrade page (optional)

- `paywall-bg.webp` — blurred CRM screenshot for upgrade overlay background
