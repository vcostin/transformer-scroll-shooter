# Creative Direction Hub

Purpose: central place for story, art, level ideas, audio direction, and engagement design. Keep it lightweight, practical, and tied to what the engine can do now.

How we use this folder
- Brainstorm first in docs here, then promote the best ideas to issues/tasks.
- Keep proposals small, testable, and shippable in 1–3 days.
- Prefer reusable patterns over one-off assets.

Index
- Backstory options: ./BACKSTORY.md
- Art direction & palettes: ./ART_DIRECTION.md
- Level design & parallax: ./LEVELS_AND_PARALLAX.md
- Engagement/retention design: ./ENGAGEMENT_DESIGN.md
- Audio direction: ./AUDIO_DIRECTION.md
- Asset list & priorities: ./ASSET_LIST.md
- Content pipeline & naming: ./PIPELINE.md
- Roadmap: ./ROADMAP.md
- Templates: ./templates/
 - Lore (by level): ./lore/LEVEL1.md
 - Parallax spec (Level 1): ./specs/LEVEL1_PARALLAX.json
 - Palette: ./palettes/NEON_RUINS.json

Working style
- Make a small pitch (1–2 paragraphs + 3 bullets), get feedback, then build a tiny prototype.
- Use placeholders early (shapes, flat colors) and swap art later.
- Document decisions in the relevant file and link the commit/PR.

Acceptance criteria (for ideas that move to production)
- Clear player goal and feedback (see ENGAGEMENT_DESIGN)
- Asset list is scoped and feasible this sprint (see ASSET_LIST)
- Performance-aware (parallax layers, particle budgets)
