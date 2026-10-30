# The Self-Growing DEX Frontier

**▶ Live: https://sjgant80-hub.github.io/dex-frontier/**

Frontier AI is built by **pouring**: every record into one giant model in one data centre, trained once, rented out.
This builds it the other way, by **growing**. Each department of a business keeps its own records. A seed of a few
dozen bytes grows a specialist node from one department's records, on that department's machine, and the node must
prove itself on cases it never saw or it is cut. The nodes share answers, never records, and a coupling learns from
outcomes how much each node's word is worth, so the mesh answers as one mind.

The whole idea rests on one claim, and the spec says to prove it before anything scales: **do specialists compose into
more than the sum?** That is organ 2, sealed before it ran and allowed to fail.

## The organs (sealed, measured, judged; failures kept)

<!-- geo:organs -->
| # | Organ | What it had to show | Sealed rules | What happened |
|---|---|---|---|---|
| 1 | **One specialist body** | one department’s node against a 14B and a frontier model | 2 of 3 sealed rules held | the 7-column node 0.801 vs the 14B 0.741 and the frontier 0.844 on 300 customers |
| 2 | **The composition proof** | specialists compose into more than the sum, before anything scales | 3 of 8 sealed rules held | composed 0.822 / 0.791 vs best node 0.813 / 0.810 vs every record pooled 0.846 / 0.827 (telecom / shop) |
| 2b | **The composition fix** | taken only if organ 2 finds composition does not net: nodes grown to complement | 3 of 5 sealed rules held | fixed mesh 0.813 / 0.818 vs best node 0.813 / 0.810 |
| 2c | **The composition fix, third take** | co-grown the way the mesh couples; every silo offers both its nodes | 1 of 4 sealed rules held | mesh 0.822 / 0.809 vs best node 0.813 / 0.810 |
| 2d | **A nonlinear coupling** | trees over the nodes’ scores learn interactions | 1 of 4 sealed rules held | mesh 0.817 / 0.830 vs best node 0.813 / 0.810; shop level with every record pooled (0.827) |
| 2e | **The mesh chooses its coupling** | linear or trees, chosen out of fold on GATE alone: the first of the gate’s three tests | 2 of 3 sealed rules held | linear / trees chosen; mesh 0.822 / 0.830 vs best node 0.813 / 0.810 — beyond the noise in both |
| 2f | **The gate retaken in full** | all three of the gate’s tests at once, on two datasets no attempt had touched | 4 of 7 sealed rules held | mesh 0.786 / 0.896 vs best department 0.778 / 0.822 vs the frontier 0.820 / 0.937 (bank / census) |
| 2g | **The gate taken again** | all three tests on two more fresh datasets, the frontier test on 1,200 cases, growth beyond the noise | 1 of 7 sealed rules held | mesh 0.500 / 0.767 vs best department 0.500 / 0.748 vs the frontier 0.631 / 0.746 (hospital / credit) |
| 2h | **The gate taken again, the join rule fixed** | a department joins when it beats a coin beyond the noise; two more fresh datasets | 4 of 7 sealed rules held | mesh 0.729 / 0.840 vs best department 0.666 / 0.814 vs the frontier 0.738 / 0.823 (coupon / forest) |
| 2i | **The gate taken again, with a relay** | departments grow in turn, each on the scores the stronger ones send it; two more fresh datasets | 6 of 8 sealed rules held | mesh 0.899 / 0.733 vs best department 0.774 / 0.676 vs the same departments alone 0.889 / 0.727 vs the frontier 0.859 / 0.701 (hotel / news) |
| 2j | **The gate taken again, growth beyond the noise** | a department takes a seat only if the mesh with it beats the mesh without it beyond the noise; one more fresh dataset | 7 of 8 sealed rules held | 3 of 5 offered joined; mesh 0.824 vs best department 0.779 vs the same departments alone 0.823 vs the frontier 0.822 (health survey) |
| 2k | **The gate’s pass repeated** | organ 2j’s mechanism taken again, unchanged, on a second fresh dataset | sealed, being measured | — |
| 3 | **Breeding** | a bred child beats both parents on cases neither saw; the population grows a better mesh | built; waits until the gate’s pass is repeated on a second fresh domain | — |
| 4 | **Growing by working** | each node sharpens as its records arrive | built; waits until the gate’s pass is repeated on a second fresh domain | — |
| 5 | **The wisp** | routing that learns from outcomes; a node gone bad is pruned | built; waits until the gate’s pass is repeated on a second fresh domain | — |
| 6 | **Scale** | cut finer, more nodes: the composed answer keeps climbing | built; waits until the gate’s pass is repeated on a second fresh domain | — |
| 7 | **Sovereign spread** | owned by contributors, carried by cards, revocable, scores only | built; waits until the gate’s pass is repeated on a second fresh domain | — |
<!-- /geo:organs -->

## Run it yourself

```
npm test                         # every kernel and tool
node witness-all.mjs             # the mutation gate: break every kernel line by line, the tests must notice
node tools/measure-1.mjs --check # re-derive organ 1's sealed record byte for byte
node tools/measure-2.mjs --check # re-derive organ 2's sealed record byte for byte
node tools/order.mjs --organ 2   # prove from git that the seal came before the measurement
```

Planned by Kar (the estate's resident mind, on its own local model: [docs/kar-plan.md](docs/kar-plan.md)) and Claude,
together, for Simon. Powered by the Konomi architecture, created by Thomas Frumkin.

Draws on the Guided Entropy Principle (GEP) of Gary W. Floyd, Lumiea Systems Research Division — ThunderStruck Service LLC (New Caney, Texas), Open Defensive Prior Art (Creative Commons): “NEXUS — Distributed Synthetic Intelligence: Architecture, Ethics, and the GEP-Native Mind,” 2026; “From GEP Stabilization to Dual-Map Ethical Reasoning: A derivation of positive ethical evidence, negative ethical evidence, and non-legal moral reasoning,” Derivation v0.2; “The Laws of Entropy-Time: Rewriting Thermodynamics with the Guided Entropy Principle,” February 2026.

Data: IBM's Telco Customer Churn sample (Apache-2.0), the UCI Online Shoppers Purchasing Intention dataset (CC BY 4.0) and
the fresh public datasets of organs 2f onward (CC BY 4.0), each credited in [NOTICE](NOTICE).
Supplied by [AI Native Solutions](https://www.ai-nativesolutions.com). MIT, no licence fee.
