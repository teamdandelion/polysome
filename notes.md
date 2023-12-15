# Notes

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
