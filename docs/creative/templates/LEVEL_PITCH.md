# Level 1 Pitch: City Above Clouds

One-liner
- Neon ruins above the cloudline; learn dodge, first powerup, readable chaos.

Core mechanic
- Onboarding: basic movement/shooting with generous windows; introduce a risk/reward pickup that charges if held briefly for a stronger effect.

Parallax layers (5)
- Far: Soft cloud gradient with faint stars; very slow drift (speed ~0.10).
- Mid 1: Ruined stratos-towers silhouettes; lateral drift (speed ~0.35).
- Mid 2: Drifting billboards and cable spans; occasional parallax oscillation (speed ~0.50).
- Near: Overpass debris and antennae; fast scroll (speed ~0.75).
- FX: Foreground sparks/dust on damage/bursts; sparse for readability (speed ~1.00).

Enemies (2–3 behaviors)
- Drone (Flanker): low HP, zig-zag approach, no aim; teaches target prioritization.
- Turret (Platform): stationary on moving platform; slow telegraphed aimed shots; teaches timing and safe lanes.
- Optional: Seeder (Low density): drops slow homing seeds that can be shot; introduces hazard clean-up.

Boss (2 phases) — Relay Warden
- Phase 1: Ring-beam sweeps (telegraph arcs) + fan bullets; safe gaps rotate; occasional drone adds.
- Phase 2: Core splits into two nodes; alternating sweep patterns with wider gaps; brief vulnerability windows between cycles.

Micro-challenges (2)
- "Hold the Line": Take no damage for 20 seconds.
- "Clean Sweep": Destroy 5 drones while combo ≥ 2x.

Asset list
- 5 tileable parallax layers (PNG/SVG), per-layer speeds as above.
- Drone + Turret sprites (clear silhouettes) and bullet sprites (basic + charged).
- Boss silhouette with 2 simple anim states; ring-beam telegraph sprite.
- FX: explosion sheet (8–12 frames), muzzle flash, hit particles, trail.
- UI: minimal combo meter, micro-challenge prompt badges.
- Audio: 1 loopable track + boss layer; SFX: shoot, hit, explode, pickup, UI.
