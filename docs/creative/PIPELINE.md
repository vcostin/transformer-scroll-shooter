# Content Pipeline & Naming

File structure
- assets/
  - sprites/
  - backgrounds/
  - audio/
  - fonts/

Naming
- backgrounds/<level>/<layer>_<speed>.png (e.g., city/ruins_0.35.png)
- sprites/<entity>/<part>@<scale>x.png (e.g., player/ship@2x.png)
- audio/sfx/<action>_<variant>.wav

Process
1) Sketch → placeholder export → wire in game
2) Playtest for clarity → revise silhouettes/colors
3) Replace with final art → adjust parallax speeds

Versioning
- Use semantic-like tags in filenames for variants (v1, v2) until final.
