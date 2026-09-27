# Vortex Core

**A concept-stage research project exploring passive, gravity-driven microplastic separation for
high-rise water systems.**

Supported by [FifeCIC](https://fifecic.scot/) — a Community Interest Company registered in Scotland.

**Site:** https://fifecic.github.io/VortexCore/

---

## Status: concept and feasibility stage

Nothing has been built, tested or certified.

| | |
|---|---|
| Engineering concept | Described and internally consistent |
| Calculated physics | Partial — not independently checked |
| Prototype or test rig | **Does not exist** |
| Simulation output | **Does not exist** |
| Independent test data | **Does not exist** |
| Patent application | **None filed** |
| Certification | **None held** |
| Pilot site or partner | **None** |
| Commercial entity | **None** |

This is stated up front because the alternative — publishing an idea that reads like a product —
misleads the exact people whose help the project needs.

## The concept in one paragraph

Every tall building pumps water to a roof tank and then discards the resulting pressure through a
pressure-reducing valve. Vortex Core proposes spending that pressure instead: a tangential inlet
converts head pressure into rotational velocity, forcing the water into a tight vortex where
density does the sorting. Heavier-than-water plastics (PET, PVC) are thrown outward and collected;
lighter-than-water polymers (PE, PP) migrate into the low-pressure core and are skimmed from it. The
small reject stream is evaporated using the building's own waste heat, leaving dry plastic for
recycling rather than a liquid discharge.

The open question is not whether centrifugal separation works — it is whether it works on the
particle sizes that matter, at the pressures a real building provides.

## The hard part, stated plainly

The force required to separate a particle rises with the square of its inverse size. At 50 µm,
separating polyethylene needs around 147 G. At 5 µm, the same relationship gives roughly 14,679 G.
The design point is 2,500–3,000 G. That comfortably covers larger particles and smaller dense ones,
but not the smallest buoyant plastics.

There is a second risk of equal weight: a chamber tuned to eject heavy PET can concentrate light
polypropylene into the stream it declares clean. Any design must demonstrate that it does not
simply move the problem from one polymer to another.

See [feasibility.html](feasibility.html) for the full list of open questions and the intended route
to answering them.

## Repository layout

```
index.html            Overview - the problem, the idea, and the honest status
technology.html       The concept - pressure budget, three-stage separation, the physics
feasibility.html      What exists and what does not; the five open questions
interest.html         How to get involved, and what this is not
docs/
  SIMULATION-BRIEF.md Specification for the Phase 0 modelling study
assets/
  css/site.css        Single shared stylesheet
  img/                Diagrams and FifeCIC branding
scripts/
  check-site.mjs      Validates every page and diagram before publication
  generate-device-diagram.mjs   Builds the chamber cross-section
  generate-gchart.mjs           Builds the G-force requirement chart
```

Plain static HTML. No build step, no framework, no dependencies to install. Serve the directory and
it works. **The published pages load no JavaScript at all** - there is no script tag on any page.

Diagrams are hand-authored or generated SVG, committed as files. They scale to any device, print
cleanly, and together weigh less than 25&nbsp;KB. Superseded diagram versions are kept rather than
overwritten, and each carries a version stamp inside the artwork so a screenshot or printout can be
identified.

`scripts/check-site.mjs` runs on every push (see `.github/workflows/validate-site.yml`). It checks
that local references resolve, that SVG comments contain no illegal `--`, that every drawn and
animated coordinate sits inside its viewBox, and that every page has a title, description, Open
Graph tags and image alt text.

## The rules this project publishes under

1. **No unmeasured performance figures.** No removal efficiency, energy saving or payback figure
   appears as a finding until it has been measured and independently checked. Design targets stay
   labelled as targets.
2. **No legal status without a document.** No claim of a patent application, granted patent or
   registered trademark unless the filing exists and can be referenced. Current status: none filed.
3. **Negative results get published too.** If modelling shows the concept does not work at the sizes
   that matter, that finding is published in the same place as the concept.

## Contributing

The most valuable contribution available today is a technical opinion — particularly on particle
transport in high-shear rotational flow, or on hydrocyclone cut points and wear.

- [Register an interest](https://github.com/FifeCIC/VortexCore/issues/new?template=register-interest.yml)
- [Read existing questions](https://github.com/FifeCIC/VortexCore/issues)
- Or email **queries@fifecic.scot**

No investment is being sought, no equity is available, and there is no commercial entity in
relation to Vortex Core. This is a research enquiry, not an offering.

## Rights

Concept and design rights reserved. The intellectual-property position is being explored; nothing
has been filed. See [LICENSE](LICENSE).
