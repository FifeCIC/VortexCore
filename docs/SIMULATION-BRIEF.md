# Phase 0 simulation brief

**Status:** draft for review. Nothing in this document has been executed.
**Version:** 1.0, 27 September 2026
**Related:** [issue #1](https://github.com/FifeCIC/VortexCore/issues/1) — is a hydrocyclone the right
device for buoyant microplastics?

---

## 1. Purpose

This is the specification for the first piece of real work on Vortex Core. It exists so that a
modelling study can be commissioned, quoted, run and judged without anyone having to agree
afterwards on what the answer means.

The study decides whether the concept is worth building. It is deliberately designed to be able to
say no.

## 2. The question

> **At the pressures a tall building actually provides, will a hydrocyclone capture buoyant
> microplastics — or only dense ones?**

Everything else is secondary. The dense fraction is the easy half and is well proven. The concept's
value depends entirely on the buoyant half, and that is where hydrocyclones are weakest.

## 3. Why this cannot be settled by argument

Three specific doubts, each of which the model must address rather than assume away.

| # | Doubt | Why it bites |
|---|---|---|
| 1 | The driving force is small | Radial migration velocity scales with the density difference. Polyethylene in water is roughly 0.05 g/cm³ against roughly 0.4 g/cm³ for PET — about eight times slower. |
| 2 | The core is probably air, not water | A hydrocyclone at atmospheric back-pressure forms an air core along its axis. A buoyant particle migrating inward may reach a free surface rather than a water stream that can carry it out of the overflow. "Skimmed by the vortex finder" may be simply wrong. |
| 3 | It is a race | The inward drift has to reach the core before the water carrying the particle exits at the apex. Nothing in the concept currently establishes that it can. |

## 4. Method

**Recommended:** transient multiphase CFD with Lagrangian particle tracking.

The model has to be multiphase. A single-phase solve cannot represent the air core, and the air core
is doubt 2 — the one most likely to settle the question.

| Element | Recommendation | Note |
|---|---|---|
| Solver | Eulerian multiphase, air and water | OpenFOAM with `multiphaseEulerFoam` is the low-cost route; commercial solvers are acceptable if the method is stated |
| Turbulence | Reynolds stress model or LES | Standard k-epsilon is known to handle the strong swirl poorly and will flatter any result |
| Particles | Lagrangian, one-way or two-way coupled | Two-way coupling matters if concentration is high; state which was used |
| Drag law | Corrected for finite particle Reynolds number | **Stokes' law is not valid here.** At 2,500–3,000 G the particle Reynolds number is not small, so a Schiller-Naumann or similar correction is required. A Stokes-only model would produce a misleadingly clean answer. |
| Geometry | Parametric, not fixed | See below |

### Geometry is not specified, and that is the first problem

The concept has **no defined dimensions**. The published diagram is schematic. There is no cone
angle, no inlet diameter, no vortex finder length, no cylinder diameter — only a target of
2,500–3,000 G at roughly 80 PSI inlet.

So the study is a **parameter sweep, not a single simulation**. That is more work than it sounds,
and it is better known now than discovered later. The sweep should cover at least:

- cone angle (the main driver of the trade between G and pressure loss)
- vortex finder diameter and insertion depth (the main driver of what the overflow captures)
- inlet area ratio
- apex diameter, which sets the underflow split

## 5. Inputs

| Input | Value | Status |
|---|---|---|
| Feed pressure | ~80 PSI (5.5 bar) | Design target. Assumed, not measured. |
| Design acceleration | 2,500–3,000 G | Design target |
| Inlet velocity | 2–5 m/s | Design intent |
| Underflow split | 5–10% of flow | Estimate |
| Water density | 1,000 kg/m³ | Known |
| PET / PVC density | 1,400 kg/m³ | Published range midpoint (1.3–1.5) |
| Polypropylene density | 905 kg/m³ | Published (0.90–0.91) |
| Polyethylene density | 950 kg/m³ | Published (0.93–0.97) |
| Particle sizes | 5, 20, 50 µm | Chosen to bracket the range of interest |
| Particle shape | Assume spherical | **Stated limitation.** Real microplastics are fragments and fibres. |
| Temperature | 15 °C | Assumed |

Every row marked *assumed* or *estimate* is an input the model **inherits**, not one it can
validate. If a result depends on an assumed value, the report must say so.

## 6. Outputs

The report must contain all of the following. Anything missing is an incomplete study, not a
partial one.

1. **Radial migration velocity** for each polymer at each particle size, at the design acceleration.
2. **Capture efficiency, per polymer, per size** — reported on a single chart with all six series
   separate. Never averaged, never combined into an "overall removal rate".
3. **The fate of a particle that reaches the core.** Does the vortex finder capture it, or does the
   air core return it to the outer flow? This is doubt 2 and it is the single most important output.
4. **The diameter at which each polymer crosses 2,500 G**, so the analytical chart on the website
   can be checked against a numerical result.
5. **Pressure loss** at the design flow, in PSI, as a function of cone angle.
6. **Sensitivity**: which single input changes the answer most, and by how much.
7. **The convergent result**: does refining the mesh change the answer? If not converged, say so.

## 7. Pass and fail criteria

**These are proposed, and should be agreed before the study starts.** They are written down now
precisely so that a negative result cannot be reframed afterwards as something else.

| Criterion | Threshold | Consequence |
|---|---|---|
| Net transfer of *any* polymer into the product stream | positive at any size | **Kill.** The device concentrates a contaminant it claims to remove. |
| Buoyant capture efficiency at 20 µm | below 50% | **Kill in current form.** A device that removes only the dense fraction is a worse product than a conventional filter. |
| Capture efficiency at 50 µm, any polymer | below 80% | **Kill.** Even the easy case is not working. |
| Pressure loss at design flow | above 15 PSI | **Redesign.** The pressure budget is the whole premise. |
| Required acceleration for 5 µm polyethylene | above ~15,000 G as calculated | Expected. Not a kill on its own — it defines the honest limit of the device. |

## 8. What this study cannot tell you

Stated up front so no later reader mistakes a model for a measurement.

- **Not a validation.** A model confirms or contradicts the analytical reasoning. It is not
  evidence that a physical device works.
- **Not a cost model.** Nothing here bears on capital cost, which is still unevidenced.
- **Not fouling or wear.** Real building water scales, fouls and erodes. A clean simulation will
  look better than reality.
- **Not the evaporation loop.** Separately specified, and separately uncertain.
- **Not the premise.** Whether a building would actually accept a device in its plant room is a
  commercial question, not a fluid-dynamics one.

## 9. Deliverable format

A short written report plus the case files, containing:

- the method and solver, with versions, in enough detail to be repeated
- the mesh and a convergence study
- the seven outputs in section 6, as data
- an explicit list of assumptions inherited from section 5
- a plain-language answer to the question in section 2, in one paragraph, at the top

The one-paragraph answer goes at the top because that is the only part most readers will act on.

## 10. An alternative worth costing

If the answer is that buoyant capture is not achievable in a hydrocyclone at these pressures, the
concept does not necessarily die. It changes. Directions worth a lower-cost look:

- a dedicated skimming or flotation stage for the light fraction, downstream of the cyclone
- a two-device arrangement with different geometry for each density class
- accepting the device as a **heavy-fraction separator only**, and describing it that way — which
  is the least exciting outcome but the most defensible one

A short scoping note on these, even without simulation, would be a useful companion deliverable.

---

## Status of the underlying concept

For a reader arriving at this document cold:

| | |
|---|---|
| Physical device | **None built** |
| Dimensions specified | **None** |
| Simulation run | **None** |
| Independent validation | **None** |
| Patent application | **None filed** |

This brief is a plan. It is published so that anyone who can help can see exactly what is needed.
