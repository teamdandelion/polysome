# Notes

## 12.29.23

- Initial perf instrumentation is working!
  - About 150-155ms per step, with 10k motes
  - I'd like to get 10k motes down to like, 20ms per step

## 12.28.23

- I got a "polysome v1" working, which Alchi suggested calling "currents".
  - There are just motes, spawning and collecting and streaming together
  - Added some QOL features like zooming in a little, and always using the full window for rendering
  - It feels pretty perf bound atm
  - Haven't done any color tweaking or tuning as yet
  - However, it does a really nice job producing diffusion-esque organic feeling patterns
  - While implementing zoom, I temporarily had a bug that rendered each circle much smaller than the mote's real boundary.
  - This wound up revealing really nice diffusion-esque organic feeling patterns and wave forms
    - I strongly suspect there's a much more efficient way to produce these patterns.
- I see two paths forward I could take:
  - The local fork, where I zoom in on refining and honing this particular vision / possibility before adding any more complexity
  - The alpha fork, where I move forward towards some really interesting ideas, that would kick this forward past being a diffusion pattern system
    - Idea: when enough motes collide, they form an "alpha", which is distinguished from motes by:
      - absorbing any motes which enter their radius
      - have a hard boundary with other alphas
    - This basically implements a density / energy phase change 🦁
    - i: Yeah I want to have a feeling of singularity/consciousness crystalizing out of the void
- However there are a lot of boons on the local path:
  - It's a good time to dial in the colors. I haven't done that yet.
  - I want to run a few palettes, not just this first one.
  - I really want to drive perf on this one.
  - I've hit only a few of the lowest hanging fruits on perf (e.g. not using sqrts unnecessarily).
  - However, if we focus in on the specificity of simulating motes in the flow field, we can really optimize the structures around this...
    - No mote class, no dynamic structure creation, just a mote-length array with all of the mote coordinates
    - We take for granted that the mote radius is always constant
    - Intelligent sector updating for motes...
      - No need to regenerate sector map each step, keep a map and update it when motes cross sector boundaries
    - We can really think about the math for computing and updating the force vector incident on each mote in an efficient fashion
- So, thinking this thru, it feels really clear that this is a good branch to follow
  - lion: I'm nerdily excited to build all this very thought thru infra for solving a specific computational problem efficiently

## 12.19.23

Some TODOs:

- [x] Refactor a RenderContext class with p5 and coordinate conversions
- [x] Figure out collision forces, and how to propagate them across simulation steps
- [ ] Flow field rendering visualizations

## 12.15.23

- Idea: focus on the nutrients first.
- Get the nutrient generation and flows to feel like a rich substrate (visually and mechanically) before moving forward.
- Thinking of putting a flow field underneath the trajectories :)

- Idea: Simulation field is a square with side length `1000`. Both coordinates are in [0, 1000]. Area = 1M
- We inscribe a circle inside that, which will contain any viewport and also be the surface for uniformly adding stuff to simulation (e.g. adding nutrients).
  Circle has diameter 1000, area = ~785k
- Viewport is the largest fittable rectangle inside that circle.
  When square: 500k
  Will be lower when rectangular, but probably stay in the 30-50% viewport:simulation range, which seems pretty good.
