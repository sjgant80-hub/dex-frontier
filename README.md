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
| 2 | **The composition proof** | specialists compose into more than the sum, before anything scales | sealed, being measured | being asked |
| 2b | **The composition fix** | taken only if organ 2 finds composition does not net: nodes grown to complement | not taken unless needed | — |
| 3 | **Breeding** | a bred child beats both parents on cases neither saw; the population grows a better mesh | built; sealed only after organ 2 is judged | — |
| 4 | **Growing by working** | each node sharpens as its records arrive | built; sealed only after organ 2 is judged | — |
| 5 | **The wisp** | routing that learns from outcomes; a node gone bad is pruned | built; sealed only after organ 2 is judged | — |
| 6 | **Scale** | cut finer, more nodes: the composed answer keeps climbing | built; sealed only after organ 2 is judged | — |
| 7 | **Sovereign spread** | owned by contributors, carried by cards, revocable, scores only | built; sealed only after organ 2 is judged | — |
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
together, for Simon. Powered by the Konomi architecture, created by Thomas Frumkin. Data: IBM's Telco Customer Churn
sample (Apache-2.0) and the UCI Online Shoppers Purchasing Intention dataset (CC BY 4.0). See [NOTICE](NOTICE).
Supplied by [AI Native Solutions](https://www.ai-nativesolutions.com). MIT, no licence fee.
