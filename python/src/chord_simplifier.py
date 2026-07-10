"""Port of JazzNet ChordSimplifier for mapping openbook labels into neural vocab."""

from __future__ import annotations

import re


class ChordSimplifier:
    JAZZ5_MIREX_KINDS = [":maj", ":min", ":maj7", ":min7", ":7", ":hdim7", ":dim7"]

    def __init__(self) -> None:
        self.playstyle_symbols = ["^", "*", ";", "+"]

    def _get_root(self, chord: str) -> str:
        if not chord:
            return ""
        if len(chord) >= 2 and chord[1] in {"-", "#"}:
            return chord[:2]
        return chord[0]

    def _is_chord(self, chord: str) -> bool:
        playstyle_symbols = ["-", "#", "^"]
        if "r" in chord[:2]:
            return False
        chord = re.sub(r"C-", "B", chord)
        if len(chord) <= 2 and re.match(
            r"^[A-G](" + "|".join(map(re.escape, playstyle_symbols)) + ")?$",
            chord,
        ):
            return False
        return True

    def _chop_chord(self, chord: str) -> str:
        for symbol in self.playstyle_symbols:
            chord = chord.replace(symbol, "")
        return chord

    def extract_chord_quality(self, chord: str) -> str | None:
        quality_list = [
            ("maj7", self.JAZZ5_MIREX_KINDS[2]),
            ("min7", self.JAZZ5_MIREX_KINDS[3]),
            ("h", self.JAZZ5_MIREX_KINDS[5]),
            ("o", self.JAZZ5_MIREX_KINDS[6]),
            ("7", self.JAZZ5_MIREX_KINDS[4]),
            ("maj", self.JAZZ5_MIREX_KINDS[0]),
            ("min", self.JAZZ5_MIREX_KINDS[1]),
        ]
        for quality, chord_type in quality_list:
            if quality in chord:
                return chord_type
        return None

    def simplify_chord(self, chord: str | None = None) -> str:
        if chord is None or not self._is_chord(chord):
            return "Invalid/No Chord"
        root_note = self._get_root(chord)
        chord = self._chop_chord(chord)
        if not self._is_chord(chord):
            return "Invalid/No Chord"

        chord_type = self.extract_chord_quality(chord)
        if chord_type is not None:
            return root_note + chord_type

        basic_chords = r"[A-G]#?-?\d{1,2}"
        extended_chords = r"[A-G]#?(add|sus|aug|dim|\d{0,2}(#5|b5|#9|b9))"
        slash_chords = r"[A-G](#|-)?(/[A-G](#|-)?)?"

        if (
            re.search(basic_chords, chord)
            or re.search(extended_chords, chord)
            or re.search(slash_chords, chord)
        ):
            return root_note + self.JAZZ5_MIREX_KINDS[0]

        return root_note + self.JAZZ5_MIREX_KINDS[0]
