"use strict";

/**
 * vocab.js — JazzNet chord vocabulary loader.
 *
 * Port of the JazzNetVocab dataclass from python/src/engines/jazznet_vocab.py,
 * but reading the already-materialized data/jazznet/vocab.json (whose
 * idx_to_chord array is pre-sorted with pad=0, <BOS>=1, <EOS>=2) rather than
 * rebuilding the vocab from raw sequences — the ordering is fixed at build time
 * so the neural logits line up with these indices.
 *
 * chordToIdx is a Map (not a plain object) because its VALUES are indices and,
 * more importantly, iteration/lookups must not be perturbed by JS's integer-key
 * reordering — the surrounding engine code standardizes on Map for anything
 * index-related.
 */

const fs = require("fs");

/**
 * loadVocab(jsonPath) -> vocab object.
 * Fields: vocabSize, padIdx, bosIdx, eosIdx, idxToChord (string[]),
 *         chordToIdx (Map<string,number>).
 * Methods: isSpecial(i), chordIndex(sym)->number|null, indexChord(i)->string|null.
 */
function loadVocab(jsonPath) {
  const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const idxToChord = raw.idx_to_chord.slice();

  // Build the reverse map from the authoritative array so both directions agree.
  const chordToIdx = new Map();
  for (let i = 0; i < idxToChord.length; i++) {
    chordToIdx.set(idxToChord[i], i);
  }

  const padIdx = raw.pad_idx;
  const bosIdx = raw.bos_idx;
  const eosIdx = raw.eos_idx;

  return {
    vocabSize: raw.vocab_size,
    padIdx,
    bosIdx,
    eosIdx,
    idxToChord,
    chordToIdx,
    isSpecial(i) {
      return i === padIdx || i === bosIdx || i === eosIdx;
    },
    chordIndex(sym) {
      const idx = chordToIdx.get(sym);
      return idx === undefined ? null : idx;
    },
    indexChord(i) {
      return i >= 0 && i < idxToChord.length ? idxToChord[i] : null;
    },
  };
}

module.exports = { loadVocab };
