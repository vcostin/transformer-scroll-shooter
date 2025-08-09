# Level Design & Parallax

Engine facts (align with current code)
- Parallax supports multiple layers; each layer scrolls at its own speed (near faster, far slower).
- Levels can be sequences of waves and environmental sections.

Layer recipe
- Sky/Far: slow gradient clouds or stars (5–15% base speed).
- Mid: silhouettes of ruins or stratos towers (25–50%).
- Near: moving cables/bridges/flora (60–85%).
- FX: occasional foreground particles (90–110%, sparingly for readability).

Level arcs (MVP set)
1) City Above Clouds (Onboarding)
- Mechanics: basic dodge/shoot, first powerup.
- Parallax: neon ruins, drifting billboards.

2) The Relay Ring (Rhythm)
- Mechanics: rotating hazards, timed gates.
- Parallax: orbital ring segments sliding parallax.

3) Bloomfront (Pressure)
- Mechanics: creeping growth obstacles; pruning weakpoints.
- Parallax: organic tendrils foreground.

4) Archive Fault (Set-piece)
- Mechanics: phase-shift zones; enemies flicker in/out.
- Parallax: split background with parallax polarity shifts.

Boss arenas
- Short approach, boss intro, readable arena with minimal parallax clutter.

Production checklist per level
- 4–6 parallax PNG/SVG layers (tileable width), speeds, and spawn script.
- 2–3 unique enemy behaviors + 1 remix.
- 1 boss with 2 phases.
- 2 environmental hazards.
