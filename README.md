# Super Markup Man Offline Mirror

This folder contains a local, offline-friendly mirror of **Super Markup Man**.

## What was recovered

- `index.html`
- `styles.css`
- `scripts/graphics.js`
- `scripts/player.js`
- `scripts/block.js`
- `scripts/game.js`
- Image assets referenced by the game:
  - `spritesheet.png`
  - `plank.png`
  - `download.png`
  - `loading.gif`
  - `check.png`
  - `markup-man.png`
  - `keys.png`
  - `tag-samples.png`
  - all tag sprites used by the levels and help screen
  - `sample.png`
  - `tag-text.png`
- Audio assets:
  - `sounds/drop.mp3` / `sounds/drop.wav`
  - `sounds/done.mp3` / `sounds/done.wav`
  - `sounds/next.mp3` / `sounds/next.wav`

## Offline adaptations

- Replaced the external jQuery dependency with a local `vendor/jquery.min.js`.
- Kept the original gameplay logic, level list, controls, and visuals intact.
- Replaced the old `download.php` dependency with a local in-browser file download for the current level layout.
- Added a tiny static Node server so the game can be launched on Windows without PHP or any external services.

## Launch

```powershell
npm start
```

Then open:

```text
http://127.0.0.1:8000/
```

## Notes and limits

- The original site still contains informational links to the author and Steam. They are left as-is, but the game itself no longer needs any network access.
- I preserved the gameplay code as much as possible and did not change the levels or mechanics beyond what was required to make the mirror self-contained.
