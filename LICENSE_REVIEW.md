# Dataset license review

**Status: decision required before any commercial or public redistribution.**

This maps every bundled training-derived asset to the license of the data it
came from, verified from primary sources (fetched `LICENSE` files, Zenodo
records, and repo READMEs — not from memory). It exists so the redistribution
decision is made with the facts in front of you.

> **Not legal advice, and not a grant of rights.** This is a factual provenance
> and risk map. For commercial distribution, confirm each license against its
> current text and consult counsel. Where a source could not be verified it is
> marked so — do not treat "unclear" as "allowed."

## Per-dataset findings (verified)

| Dataset | License | Commercial? | Redistribute derived? | Confidence |
|---|---|---|---|---|
| **JazzNet** data (iRealPro Corpus, [Zenodo 3546040](https://zenodo.org/record/3546040)) | **CC BY 4.0** | ✅ yes | ✅ yes, **with attribution** | high |
| **POP909** ([music-x-lab](https://github.com/music-x-lab/POP909-Dataset)) | **MIT** | ✅ yes | ✅ yes, keep the MIT notice | high |
| **Nottingham** ([jukedeck](https://github.com/jukedeck/nottingham-dataset)) | **GPL‑3.0** (copyleft) | ⚠️ see copyleft | ⚠️ copyleft may attach | medium |
| **Bach** via **music21** corpus | software BSD‑3; **corpus license hedged**; scores themselves public-domain (age) | ⚠️ "may be restrictions" | ✅ likely (PD underlying) | medium |
| **OpenBook** (`markov_openbook.csv`) | **unconfirmed** — no source recorded; best candidate [veltzer/openbook](https://github.com/veltzer/openbook) is **GPL‑3.0** | ❓ unclear | ❓ unclear | **low** |

Notes that change the decision:

- **JazzNet** — the *data* is CC BY 4.0 (attribution, no NonCommercial, no
  ShareAlike). But the `scalzadonna/JazzNet` **repo has no license**, so its
  committed `chords.json` and the two `*.pt` checkpoints are technically
  all‑rights‑reserved. The clean path is to **re‑derive symbolic data and
  retrain weights from the CC BY iRealPro corpus**, not ship scalzadonna's exact
  files.
- **POP909** — contrary to the common "research‑only" assumption, the actual
  `LICENSE` is plain **MIT**. No non‑commercial clause.
- **Nottingham** — GPL‑3.0 is **copyleft**: a proprietary product that
  incorporates GPL material can be required to be released under GPL‑3.0 with
  source. (Underlying tunes: IPR asserted by Mick Peat; only informal
  permission.) This is a genuine blocker for a closed commercial release.
- **Bach/music21** — the toolkit is BSD; the *corpus* license explicitly warns
  "there may be restrictions on commercial use" and defers per‑work. The Bach
  chorales are public domain by age and the encodings carry no rights metadata,
  so derived chord counts are low‑risk — but the corpus license is hedged.
- **OpenBook** — **could not be pinned down**; the repo records no source or
  license for it. The name/content match [veltzer/openbook](https://github.com/veltzer/openbook)
  (GPL‑3.0, "the tunes themselves have their own copyright holders"), but that is
  inference. Treat as unresolved. *(The automated verification of this item ran
  without the usual safety cross‑check — I reviewed its sources by hand; the
  honest conclusion is still "unverified.")*

## Bundled artifact → risk

| Shipped asset | Derived from | Redistribution status |
|---|---|---|
| `data/jazznet/vocab.json`, `phrase_model_jazznet.json`, `theory_ngram.json` | JazzNet chord data (CC BY 4.0) | ✅ OK with attribution — cleanest if re‑derived from the iRealPro corpus rather than scalzadonna's `chords.json` |
| `data/jazznet/onnx/{rnn,lstm}.onnx`, `weights_{rnn,lstm}.json` | JazzNet **checkpoints** (unlicensed repo files) | ⚠️ retrain from the CC BY corpus to be clean |
| `data/markov_corpora_t.json` | blend of Nottingham (**GPL‑3.0**) + POP909 (MIT) + Bach (music21) + OpenBook (**unclear/GPL?**) | ⛔ **the main blocker** — mixes copyleft + unresolved sources |
| `data/markov_openbook.csv` | OpenBook (**unclear/GPL?**) | ⛔ unresolved |

## Bottom line

- **Personal / private / non‑commercial use:** fine for everything as it stands.
- **Commercial or public redistribution of the device as‑is:** blocked by two
  things — (1) `markov_corpora_t.json` (and `markov_openbook.csv`) bundle
  GPL‑3.0 (Nottingham) and unresolved (OpenBook) data; (2) the shipped neural
  weights derive from JazzNet's unlicensed checkpoint files.

## Options (your call)

1. **Clean permissive rebuild (recommended for commercial).** Rebuild
   `markov_corpora_t.json` from only permissive sources — **POP909 (MIT)** and
   **JazzNet/iRealPro (CC BY 4.0)**, plus **Bach** if you accept it as
   public‑domain — and **drop Nottingham and OpenBook**. Retrain the RNN/LSTM
   from the CC BY iRealPro corpus and re‑export ONNX. Ship an attribution notice
   (iRealPro Corpus / Shanahan & Broze under CC BY 4.0; POP909 MIT notice).
2. **Release under GPL‑3.0.** Keep all corpora but license the whole device
   GPL‑3.0 with source. Simple, but forecloses a proprietary release.
3. **Keep it personal / non‑commercial.** No redistribution; no action needed.

Whichever you choose, add attribution for the CC BY (iRealPro) and MIT (POP909)
components, and pin down OpenBook's true source before relying on it.
