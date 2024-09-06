# Notes

## 9.5.24

## Post Notes

- I migrated the default codepath to MoteSimulator. It's around 30% faster just by itself, but it also opens up space to prioritize other performance optimizations (notably both flow field class and the rendering logic). It is much more self contained with fewer dependencies. Also, a single Float32 array stores all the render-necessary data (position, nCollisions, createdAtStep) and so with multiple copies of that array, we can implement temporal tracking.

## Pre Notes

- Taking stock of where things are at - I like the motion blur effect as a direction to go in, however I want to make it a little more "dynamic" with respect to properties of the mote itself. I am imagining something like having a longer motion blur for "cooler" motes (the red ones out on the edges) and having less motion blur (maybe just one frame) for "hotter" motes in the center.
  - Also I think it would be cool if there is sort of "time-centric shading" where the mote in the middle of the blur (the "present") is most saturated, and the future and past motes are kind of shadowy, but symmetrical in future & past (i.e. there is a "future-image" as well as an "after-image"). Kind of atium-style from Mistborn. I just find this more interesting
- This is also an interesting implementation challenge. Especially since I want the projection to be "denser" near the "present", which implies more high-resolution timing data, however I also want to be efficient in terms of memory usage...
- I think the motion / time blur effect can add in that fine grained detail that makes the piece really visually rich rather than a bit sparse, if I can do it in a really crisp performant way.
  - So, my inclination right now is to pivot towards having a performant and hardened implementation of the polysome movement vibe.
  - I.e. I let go of the idea of "Alpha" dynamic like I was talking about last December, where there is some sort of "transformation threshold" where a new dynamic or entity is present (the "fission" to balance out "fusion"), but instead just dial in on the current mechanics
  - But: re-implement in a principled way where it is storing the data longitudinally in time. So rather than having Mote X Locations, it is Mote X Location X Timestamp
  - (Rather than having a "frame tracker" for each mote, have a single "World Tracker" that has multiple snapshots, each with the full mote positioning data, basically)
  - Then the "World Tracker" decides how to render the simulation state as it evolves?
- Key question: Can I re-implement the mote colllision and movement logic, in a way that is at least 2-3x more performant?
  - Lion: I have a feeling that if this were re-written from start with the clear goal of modeling _this_ specific system, we could get it in a state where it's a lot easier to model it and be intentional about performance. Right now it's a sort of "general purpose life-y dynamic-y simulator" but we could dial it in very specifically for this particular computation. And optimize it Factorio-style :)
  - Lion: And I would be willing to help you out with this ;)
  - Indie: Working on this together sounds fun ^^
  - i: I'm thinking maybe we revert the frame-tracker bit, so we have a simpler baseline to re-implement, and we re-implement with an eye towards tracking the cross-temporal model.
  - l: sg, let's do it.

## 8.17.24

- I added "afterimage effects" (sort of a motion blur) via a "frame tracker" class which tracks where each mote was at multiple points in time-space and renders them all. cf commit 4e2a8924c3518ba94ee49ba7a9d770875108726e
- It's not very performant however it is a nice visual effect

## 7.24.24

- I tried adding "Grain" with my last commit (now on grain-experiment branch), however I don't think it was that fruitful.
- Inspired by Pulse (https://credits.meowwolf.com/omega-mart/factory/pulse/) at Meow Wolf, I want to try adding "depth" by tracking positions for each Mote across frames, so we can render "trails" behind the motes or such.

## 6.7.24

- Feeling a little stymied around whether I want to add a new class of entity (e.g. "grains" or "specks"). Specks would be confusing due to the collision with Spec lol.
- Decided to dial in on rendering for existing concept, before adding more complexity
  - Decided to drop the fibonacci mote concept, I think it's a little noisy/ugly
  - However the circle render is too clean / perfect / generic
  - Decided to try adopting the "messy circle" from QQL
  - Messy circle tends to draw a churn of many overlapping circles that are constantly slightly shifting, it was a bit ugly
  - Decided I want to try having each mote correspond to a smaller (3-7?) set of circles / ellipses that are slowly shifting and rotating, maybe with the radius variance of the ellipses collapsing as the nCollisions pushes up (like they are getting "compressed")
  - Left in the messy circle code for reference, however I will need to add more properties to the Mote class so they can have a bit of random render state that shifts over time but isn't regenerated from scratch each render.

## 1.12.24

- I want to make a simple landing page for Polysome
- Index: Display "Polysome.art" in title, "by Indigo Mané" in smaller text
- Small pre-configured / pre-seeded Polysome animation in the background
- Link to Currents (/currents) -- the current build of "Currents"

## 12.29.23

- Initial perf instrumentation is working!
  - About 150-155ms per step, with 10k motes
  - I'd like to get 10k motes down to like, 20ms per step

## 12.28.23

- I got a "polysome v1" working, which Alchemi suggested calling "currents".
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
