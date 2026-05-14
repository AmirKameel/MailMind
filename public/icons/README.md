# PWA icons

Replace these placeholders before deploy:

- `icon-192.png` — 192×192 (any-purpose)
- `icon-512.png` — 512×512 (any-purpose)
- `maskable-512.png` — 512×512 (maskable; safe zone in inner 80%)

Quick generation:
```bash
# from a single source SVG/PNG, using sharp-cli or similar
npx sharp resize 192 192 -i logo.png -o icon-192.png
npx sharp resize 512 512 -i logo.png -o icon-512.png
# maskable: pad to 80% safe-zone
```

Or use https://maskable.app/ for the maskable version.

The `app/manifest.ts` route advertises these paths.
