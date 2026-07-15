#!/usr/bin/env python3
"""Generate chord_markov_performer.maxpat — a single-height performer panel
following Ableton's Max for Live Production Guidelines:

  * fits Live's FIXED device-chain height (169 px) — no scrolling/clipping
  * every performable control is a live.* object (MIDI-mappable, automatable,
    saved with the Live Set), with Short/Long names, initial values, and
    Info View annotations
  * live.text buttons use Output Mode "Mouse Up"; rects are whole pixels
  * width kept minimal; fat trimmed (Color/Adventure fold into the Spice
    macro; Maj/Min/7th, VoiceDist, audition and header chrome removed)
  * an explicit 8-slot parameter bank: Model Bars Mode Seed Key Spice Rhythm
    Voicing (box order is rearranged so build_amxd.js banks exactly these)

Layout (584 x 169):
  TRANSPORT Play/Reroll/Hold/Sync/BPM | MODEL tab + session/capture/status
  PHRASE Bars + Mode tabs | DIALS Seed Key Spice Rhythm Voicing (+min)
  BOTTOM chord readout (full width)

Non-destructive: reads chord_markov_sequencer.maxpat and writes a NEW file.
Re-run to regenerate (idempotent: obj-spice-* stripped first). Then:
    node build_amxd.js chord_markov_performer.maxpat "Chord Markov Performer.amxd"
"""

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / "chord_markov_sequencer.maxpat"
OUT = HERE / "chord_markov_performer.maxpat"

NODE = "obj-node"
ROUTE = "obj-route"
PRE = "obj-spice-"

# Live's device chain has a FIXED height (M4L Production Guidelines p18: the
# reference device opens at 169 px). Width is minimized per the same page.
PANEL_W, PANEL_H = 584, 169
# The 8 parameters surfaced on the device's macro bank, in slot order.
BANK0 = ["Model", "Bars", "Mode", "Seed", "Key", "Spice", "Rhythm", "Voicing"]
_OFF_X = 1180  # off-canvas home for boxes whose patching position is irrelevant


# --- box factories (patching_rect is a placeholder; LAYOUT sets presentation) ---
def dial(box_id, longname, initial, patch_y, annotation=""):
    box = {
        "id": box_id, "maxclass": "live.dial", "numinlets": 1, "numoutlets": 2,
        "outlettype": ["", "float"], "parameter_enable": 1,
        "patching_rect": [_OFF_X, patch_y, 44, 48],
        "saved_attribute_attributes": {"valueof": {
            "parameter_longname": longname, "parameter_shortname": longname,
            "parameter_type": 0, "parameter_mmin": 0, "parameter_mmax": 1,
            "parameter_unitstyle": 1, "parameter_modmode": 3,
            "parameter_initial_enable": 1, "parameter_initial": [initial],
        }},
        "varname": longname, "presentation": 1, "presentation_rect": [0, 0, 46, 50],
    }
    if annotation:  # Live Info View text (guidelines p15)
        box["annotation"] = annotation
        box["annotation_name"] = longname
    return {"box": box}


def live_text(box_id, longname, text, texton, patch_y, *, initial=0, annotation=""):
    """live.text 2-state toggle — mappable/automatable, outputs int 0/1 on outlet
    0 (verified against Live's own devices, which have NO `mode` attribute and a
    2-value enum). `text`/`texton` are the off/on labels."""
    box = {
        "id": box_id, "maxclass": "live.text", "numinlets": 1, "numoutlets": 2,
        "outlettype": ["", ""], "parameter_enable": 1,
        "text": text, "texton": texton,
        "patching_rect": [_OFF_X, patch_y, 58, 20],
        "saved_attribute_attributes": {"valueof": {
            "parameter_longname": longname, "parameter_shortname": longname,
            "parameter_type": 2, "parameter_enum": ["off", "on"],
            "parameter_mmax": 1, "parameter_unitstyle": 0,
            "parameter_initial_enable": 1, "parameter_initial": [initial],
        }},
        "varname": longname, "presentation": 1, "presentation_rect": [0, 0, 58, 20],
    }
    if annotation:
        box["annotation"] = annotation
        box["annotation_name"] = longname
    return {"box": box}


def live_button(box_id, longname, patch_y, *, annotation=""):
    """live.button — momentary, bangs on click (outlettype [''], 1 outlet), the
    right object for an action like Reroll (matches Live's own devices)."""
    box = {
        "id": box_id, "maxclass": "live.button", "numinlets": 1, "numoutlets": 1,
        "outlettype": [""], "parameter_enable": 1,
        "patching_rect": [_OFF_X, patch_y, 20, 20],
        "saved_attribute_attributes": {"valueof": {
            "parameter_longname": longname, "parameter_shortname": longname,
            "parameter_type": 2, "parameter_enum": ["off", "on"], "parameter_mmax": 1,
        }},
        "varname": longname, "presentation": 1, "presentation_rect": [0, 0, 58, 20],
    }
    if annotation:
        box["annotation"] = annotation
        box["annotation_name"] = longname
    return {"box": box}


def live_tab(box_id, longname, items, initial, patch_y, *, lines_pres=1, annotation=""):
    """live.tab enum selector — one click per option, the most performable way
    to pick from a short list (vs scrolling a 0..1 dial)."""
    box = {
        "id": box_id, "maxclass": "live.tab", "numinlets": 1, "numoutlets": 3,
        "outlettype": ["", "", "float"], "parameter_enable": 1,
        "num_lines_patching": 1, "num_lines_presentation": lines_pres,
        "patching_rect": [_OFF_X, patch_y, 100, 20],
        "saved_attribute_attributes": {"valueof": {
            "parameter_longname": longname, "parameter_shortname": longname,
            "parameter_type": 2, "parameter_enum": list(items),
            "parameter_mmax": len(items) - 1,
            "parameter_initial_enable": 1, "parameter_initial": [initial],
        }},
        "varname": longname, "presentation": 1, "presentation_rect": [0, 0, 100, 20],
    }
    if annotation:
        box["annotation"] = annotation
        box["annotation_name"] = longname
    return {"box": box}


def live_numbox(box_id, longname, mmin, mmax, initial, patch_y, annotation=""):
    box = {
        "id": box_id, "maxclass": "live.numbox", "numinlets": 1, "numoutlets": 2,
        "outlettype": ["", "float"], "parameter_enable": 1,
        "patching_rect": [_OFF_X, patch_y, 40, 17],
        "saved_attribute_attributes": {"valueof": {
            "parameter_longname": longname, "parameter_shortname": longname,
            "parameter_type": 1, "parameter_mmin": mmin, "parameter_mmax": mmax,
            "parameter_initial_enable": 1, "parameter_initial": [initial],
        }},
        "varname": longname, "presentation": 1, "presentation_rect": [0, 0, 40, 17],
    }
    if annotation:
        box["annotation"] = annotation
        box["annotation_name"] = longname
    return {"box": box}


def newobj(box_id, text, patch_y, w=120):
    return {"box": {
        "id": box_id, "maxclass": "newobj", "numinlets": 1, "numoutlets": 1,
        "patching_rect": [_OFF_X + 60, patch_y, w, 22], "text": text, "outlettype": [""],
    }}


def comment(box_id, text, fontsize=None):
    box = {
        "id": box_id, "maxclass": "comment", "numinlets": 1, "numoutlets": 0,
        "patching_rect": [_OFF_X, 700, 160, 16], "text": text,
        "presentation": 1, "presentation_rect": [0, 0, 160, 16],
    }
    if fontsize:
        box["fontsize"] = fontsize
    return {"box": box}


def message(box_id, text, patch_y, w=70):
    return {"box": {
        "id": box_id, "maxclass": "message", "numinlets": 2, "numoutlets": 1,
        "outlettype": [""], "patching_rect": [_OFF_X, patch_y, w, 20], "text": text,
        "presentation": 1, "presentation_rect": [0, 0, w, 20],
    }}


def display(box_id, text=""):
    return {"box": {
        "id": box_id, "maxclass": "message", "numinlets": 2, "numoutlets": 1,
        "outlettype": [""], "patching_rect": [_OFF_X, 700, 90, 20], "text": text,
        "presentation": 1, "presentation_rect": [0, 0, 90, 20],
    }}


def toggle(box_id, patch_y):
    return {"box": {
        "id": box_id, "maxclass": "toggle", "numinlets": 1, "numoutlets": 1,
        "outlettype": ["int"], "parameter_enable": 0,
        "patching_rect": [_OFF_X, patch_y, 24, 24],
        "presentation": 1, "presentation_rect": [0, 0, 22, 22],
    }}


def obj_io(box_id, text, patch_y, numinlets, numoutlets, w=90):
    return {"box": {
        "id": box_id, "maxclass": "newobj", "numinlets": numinlets,
        "numoutlets": numoutlets, "outlettype": [""] * numoutlets,
        "patching_rect": [_OFF_X, patch_y, w, 22], "text": text,
    }}


def loadbang(box_id, patch_y):
    return {"box": {
        "id": box_id, "maxclass": "newobj", "numinlets": 1, "numoutlets": 1,
        "outlettype": ["bang"], "patching_rect": [_OFF_X, patch_y, 60, 22], "text": "loadbang",
    }}


def line(src_id, dst_id, src_outlet=0, dst_inlet=0):
    return {"patchline": {"destination": [dst_id, dst_inlet], "source": [src_id, src_outlet]}}


# --- master presentation layout: id -> [x, y, w, h] --------------------------
# Whole pixels only (guidelines p19). 584 x 169 = Live's fixed device height.
LAYOUT = {
    # TRANSPORT column — live.* controls (mappable), stacked
    PRE + "play": [6, 8, 58, 20],
    PRE + "reroll": [6, 32, 58, 18],
    PRE + "hold": [6, 54, 58, 18],
    PRE + "sync": [6, 76, 58, 18],
    PRE + "triplet": [6, 98, 58, 18],
    PRE + "bpm": [6, 122, 38, 17],
    PRE + "lbl-bpm": [46, 124, 16, 14],

    # MODEL column — tab selector + live state readouts
    PRE + "tab-model": [72, 8, 88, 62],
    PRE + "disp-sessionstat": [72, 76, 88, 16],
    PRE + "disp-capstate": [72, 96, 88, 16],
    "obj-status": [72, 116, 88, 16],

    # PHRASE column — one-click tabs + the Cadence (harmonic gravity) dial
    PRE + "tab-bars": [168, 8, 126, 20],
    PRE + "tab-mode": [168, 34, 126, 20],
    PRE + "dial-cadence": [168, 60, 46, 48],

    # DIALS — Seed Key Spice Rhythm Voicing (live.dial shows its own name)
    PRE + "dial-seed": [302, 8, 46, 48],
    PRE + "dial-key": [356, 8, 46, 48],
    PRE + "dial-spice": [410, 8, 46, 48],
    "obj-seq-dial-rhythm": [464, 8, 46, 48],
    PRE + "dial-voicing": [518, 8, 46, 48],
    PRE + "disp-seed": [298, 60, 54, 14],
    PRE + "disp-key": [352, 60, 54, 14],
    PRE + "keymin": [356, 78, 40, 16],

    # BACKEND row — health light + readout + relink (free block x406-584).
    # The readout is 118 px; every supervisor text is kept <= ~18 chars.
    PRE + "pylight": [408, 60, 10, 10],
    PRE + "disp-backend": [422, 57, 118, 16],
    PRE + "pyrestart": [544, 57, 16, 16],
    PRE + "lbl-relink": [536, 76, 36, 12],

    # BOTTOM — the chord being played, full width
    "obj-chord-disp": [6, 142, 572, 24],
}

# Replaced by list dials / removed to compact the panel.
# Off-panel: base boxes replaced by live.* equivalents, dev-only displays, and
# chrome trimmed for simplicity (CDM/Kneppers: "be willing to remove elements").
HIDE = [
    # base controls replaced by mappable live.* versions
    "obj-seq-play", "obj-seq-sync", "obj-seq-bpm", "obj-seq-len",
    # trimmed fat: force-color dials, rhythm-name display, notes list, title/labels
    "obj-seq-dial-maj", "obj-seq-dial-min", "obj-seq-dial-7th",
    "obj-seq-rname-disp", "obj-notes-disp", "obj-pres-title",
    "obj-pres-playlabel", "obj-pres-bpmlabel", "obj-pres-barslabel",
    "obj-pres-synclabel", "obj-pres-chordlabel", "obj-pres-noteslabel",
    "obj-pres-statuslabel",
    # legacy typed-input path (kept wired, hidden)
    "obj-input", "obj-btn-send", "obj-pres-seedlabel",
    PRE + "key",
    "obj-pres-colorhdr", "obj-pres-rhythmhdr",
    # internal triplet clock-switch messages (patching only)
    PRE + "metro-straight", PRE + "metro-trip", PRE + "div-straight", PRE + "div-trip",
    # internal backend-light color messages (patching only)
    PRE + "bg-up", PRE + "bg-starting", PRE + "bg-down",
]

TEXT = {}


def main():
    doc = json.loads(SRC.read_text(encoding="utf-8"))
    P = doc["patcher"]

    # Idempotency: drop previously-added spice boxes/lines.
    P["boxes"] = [b for b in P["boxes"] if not b["box"].get("id", "").startswith(PRE)]
    P["lines"] = [
        l for l in P["lines"]
        if not (l["patchline"]["source"][0].startswith(PRE)
                or l["patchline"]["destination"][0].startswith(PRE))
    ]

    boxes = [
        # TRANSPORT — live.* controls: mappable + automatable, factory-verified
        # configs (2-state live.text toggles output int 0/1; live.button bangs).
        live_text(PRE + "play", "Play", "Play", "Stop", 470,
                  annotation="Start/stop the phrase player (runs without Live's transport unless Sync is on)."),
        live_button(PRE + "reroll", "Reroll", 500,
                    annotation="Discard the captured phrase and walk a fresh one from the seed. Also resets the neural (rnn/lstm) session memory."),
        newobj(PRE + "pre-reroll", "prepend reroll", 530, 100),
        live_text(PRE + "hold", "Hold", "Hold", "Hold", 560,
                  annotation="Vamp: freeze on the current chord without advancing the walk."),
        newobj(PRE + "pre-hold", "prepend hold", 560, 90),
        live_text(PRE + "sync", "Sync", "Free", "Sync", 590,
                  annotation="Lock the clock to Live's transport (off = free-running at BPM)."),
        live_text(PRE + "triplet", "Triplet", "straight", "triplet", 640,
                  annotation="Triplet feel: the phrase clock subdivides in quarter-note triplets (6 slots per bar) instead of straight quarters."),
        newobj(PRE + "pre-triplet", "prepend triplet", 640, 100),
        obj_io(PRE + "sel-triplet", "sel 0 1", 640, 1, 3, 60),
        # switch both clocks to the triplet grid: sync metro 4n<->4nt (right inlet),
        # free metro divisor 60000<->40000 then re-fire BPM (t b b keeps that order).
        obj_io(PRE + "t-straight", "t b b", 640, 1, 2, 40),
        obj_io(PRE + "t-trip", "t b b", 640, 1, 2, 40),
        message(PRE + "metro-straight", "4n", 640, 40),
        message(PRE + "metro-trip", "4nt", 640, 40),
        message(PRE + "div-straight", "60000.", 640, 60),
        message(PRE + "div-trip", "40000.", 640, 60),
        live_numbox(PRE + "bpm", "BPM", 40, 240, 120, 620,
                    annotation="Tempo of the free-running clock when Sync is off."),
        comment(PRE + "lbl-bpm", "bpm"),

        # MODEL — one-click tab (replaces the 0..1 scroll dial)
        live_tab(PRE + "tab-model", "Model", ["markov", "rnn", "lstm", "phrase"], 3, 650, lines_pres=4,
                 annotation="Generative engine. markov = corpus-blend chain; rnn/lstm = JazzNet neural nets with session memory; "
                            "phrase = whole-phrase generator: it composes the entire N-bar progression at once, with its own "
                            "learned harmonic rhythm and a cadence, instead of picking one chord at a time."),
        newobj(PRE + "pre-modelidx", "prepend modelidx", 650, 120),
        display(PRE + "disp-sessionstat", "stateless 0"),
        newobj(PRE + "preset-sessionstat", "prepend set", 940, 90),
        display(PRE + "disp-capstate", "idle"),
        newobj(PRE + "preset-capstate", "prepend set", 970, 90),

        # PHRASE — one-click tabs (replace the PhraseLen dial + mode messages)
        live_tab(PRE + "tab-bars", "Bars", ["2", "4", "8", "16"], 2, 700,
                 annotation="Phrase length in bars — how much the model improvises before the loop repeats. "
                            "2/4 audition in seconds for jamming; 8/16 cover song sections."),
        newobj(PRE + "pre-lenidx", "prepend lenidx", 700, 110),
        live_tab(PRE + "tab-mode", "Mode", ["loop", "regen", "oneshot"], 0, 730,
                 annotation="loop = capture once and repeat it; regen = a fresh phrase every cycle; oneshot = play once and stop."),
        newobj(PRE + "pre-phrasemode", "prepend phrasemode", 730, 140),
        # Cadence = the backend's harmonic-gravity control: pull toward the
        # tonic/dominant so phrase endings resolve. 0 keeps today's behavior.
        dial(PRE + "dial-cadence", "Cadence", 1.0, 745,
             annotation="Harmonic gravity: pull toward the home key. Low = free wandering, endings left unresolved; "
                        "high = the progression stays in key and finishes on an authentic V-I cadence. "
                        "Defaults high so phrases sound finished."),
        # -> the `cadence` handler, which applies it to WHICHEVER engine is
        # active: tonal gravity + cadence probability for the phrase generator,
        # or Python's per-step /control/gravity for the legacy chord walk.
        newobj(PRE + "pre-cadence", "prepend cadence", 745, 110),

        # DIALS — Seed / Key / Spice / Voicing (Rhythm is the base patch's dial)
        dial(PRE + "dial-seed", "Seed", 0.0, 760,
             annotation="Starting chord for the walk, picked from a 16-chord list."),
        newobj(PRE + "pre-seedsel", "prepend seedsel", 760, 120),
        display(PRE + "disp-seed", "C:maj"),
        newobj(PRE + "preset-seed", "prepend set", 1000, 90),
        dial(PRE + "dial-key", "Key", 0.0, 790,
             annotation="Song key root; the corpus blend transposes to and from it. 'min' toggles minor."),
        newobj(PRE + "pre-keysel", "prepend keysel", 790, 120),
        live_text(PRE + "keymin", "KeyMin", "maj", "min", 820,
                  annotation="Minor key mode (off = major)."),
        newobj(PRE + "pre-keymin", "prepend keymin", 820, 110),
        display(PRE + "disp-key", "C:maj"),
        newobj(PRE + "preset-key", "prepend set", 1030, 90),
        dial(PRE + "dial-spice", "Spice", 0.0, 850,
             annotation="Macro: morphs corpus colour (folk-pop-classical-jazz) and sampling adventurousness together; also drives rnn/lstm temperature."),
        newobj(PRE + "pre-spice", "prepend spice", 850, 110),
        dial(PRE + "dial-voicing", "Voicing", 0.0, 880,
             annotation="Voicing ladder: root triads, voice-led inversions, 7ths, open/drop-2 extensions."),
        newobj(PRE + "pre-voicing", "prepend voicing", 880, 110),

        # keep the old key textedit (hidden) so the typed-key path still exists
        {"box": {"id": PRE + "key", "maxclass": "textedit", "numinlets": 1, "numoutlets": 1,
                 "outlettype": ["text"], "parameter_enable": 0,
                 "patching_rect": [_OFF_X, 910, 120, 22], "text": "C:maj",
                 "presentation": 1, "presentation_rect": [0, 0, 80, 21]}},
        newobj(PRE + "pre-key", "prepend key", 910, 90),

        # BACKEND — self-launching Python supervisor readouts (markov_osc.js
        # spawns/watches the service; see backend_supervisor.js). Light colors
        # use the factory-proven panel + `bgfillcolor R G B A` idiom (floats
        # 0..1; the JSON `bgcolor` key only stores the neutral initial color).
        {"box": {"id": PRE + "pylight", "maxclass": "panel", "mode": 0, "shape": 1,
                 "numinlets": 1, "numoutlets": 0,
                 "bgcolor": [0.5, 0.5, 0.5, 1.0],
                 "patching_rect": [_OFF_X, 1050, 18, 18],
                 "presentation": 1, "presentation_rect": [0, 0, 10, 10]}},
        obj_io(PRE + "sel-backend", "sel up starting down", 1050, 1, 4, 130),
        message(PRE + "bg-up", "bgfillcolor 0.13 0.75 0.30 1.", 1080, 160),
        message(PRE + "bg-starting", "bgfillcolor 1. 0.65 0. 1.", 1080, 140),
        message(PRE + "bg-down", "bgfillcolor 0.85 0.16 0.16 1.", 1080, 160),
        display(PRE + "disp-backend", "starting..."),
        newobj(PRE + "preset-backend", "prepend set", 1110, 90),
        live_button(PRE + "pyrestart", "Relink", 1140,
                    annotation="Restart the Python chord engine (or launch it if it is down). "
                               "The light shows engine health: green = answering, amber = starting, red = down."),
        newobj(PRE + "pre-pyrestart", "prepend backendrestart", 1140, 140),
        comment(PRE + "lbl-relink", "relink", fontsize=9),

        # MPK MIDI routing
        obj_io(PRE + "midiin", "midiin", 1200, 1, 1, 60),
        obj_io(PRE + "midiparse", "midiparse", 1230, 1, 6, 90),
        newobj(PRE + "pre-notein", "prepend notein", 1260, 110),
        newobj(PRE + "pre-cc", "prepend cc", 1290, 90),
        newobj(PRE + "pre-pgm", "prepend pgm", 1320, 90),
        loadbang(PRE + "loadbang", 1350),
    ]
    P["boxes"].extend(boxes)

    P["lines"].extend([
        # TRANSPORT — live.* controls drive the same base engine objects the
        # plain play/sync/bpm boxes fed (those are hidden, wiring preserved).
        line(PRE + "play", "obj-seq-metro"),
        line(PRE + "play", "obj-seq-metro-sync"),
        line(PRE + "play", "obj-seq-prepend-play"),
        line("obj-seq-playoff-toggle", PRE + "play"),   # phrase end resets Play
        line(PRE + "sync", "obj-seq-sync-plus1"),
        line(PRE + "bpm", "obj-seq-msper"),
        line(PRE + "reroll", PRE + "pre-reroll"), line(PRE + "pre-reroll", NODE),  # live.button bangs
        line(PRE + "hold", PRE + "pre-hold"), line(PRE + "pre-hold", NODE),
        # TRIPLET — tell node the grid, and switch both clocks to 6 ticks/bar
        line(PRE + "triplet", PRE + "pre-triplet"), line(PRE + "pre-triplet", NODE),
        line(PRE + "triplet", PRE + "sel-triplet"),
        line(PRE + "sel-triplet", PRE + "metro-straight", 0), line(PRE + "sel-triplet", PRE + "t-straight", 0),
        line(PRE + "sel-triplet", PRE + "metro-trip", 1), line(PRE + "sel-triplet", PRE + "t-trip", 1),
        line(PRE + "metro-straight", "obj-seq-metro-sync", 0, 1),  # 4n -> sync metro interval
        line(PRE + "metro-trip", "obj-seq-metro-sync", 0, 1),      # 4nt -> sync metro interval
        line(PRE + "t-straight", PRE + "div-straight", 1), line(PRE + "t-straight", PRE + "bpm", 0),
        line(PRE + "t-trip", PRE + "div-trip", 1), line(PRE + "t-trip", PRE + "bpm", 0),
        line(PRE + "div-straight", "obj-seq-msper", 0, 1),  # set free-metro ms divisor
        line(PRE + "div-trip", "obj-seq-msper", 0, 1),
        # MODEL / PHRASE tabs (send item index)
        line(PRE + "tab-model", PRE + "pre-modelidx"), line(PRE + "pre-modelidx", NODE),
        line(PRE + "tab-bars", PRE + "pre-lenidx"), line(PRE + "pre-lenidx", NODE),
        line(PRE + "tab-mode", PRE + "pre-phrasemode"), line(PRE + "pre-phrasemode", NODE),
        line(PRE + "dial-cadence", PRE + "pre-cadence"), line(PRE + "pre-cadence", NODE),
        # DIALS
        line(PRE + "dial-seed", PRE + "pre-seedsel"), line(PRE + "pre-seedsel", NODE),
        line(PRE + "dial-key", PRE + "pre-keysel"), line(PRE + "pre-keysel", NODE),
        line(PRE + "keymin", PRE + "pre-keymin"), line(PRE + "pre-keymin", NODE),
        line(PRE + "dial-spice", PRE + "pre-spice"), line(PRE + "pre-spice", NODE),
        line(PRE + "dial-voicing", PRE + "pre-voicing"), line(PRE + "pre-voicing", NODE),
        line(PRE + "key", PRE + "pre-key"), line(PRE + "pre-key", NODE),  # hidden typed-key path
        # readouts: route outlets -> prepend set -> display
        line(ROUTE, PRE + "preset-key", 11), line(PRE + "preset-key", PRE + "disp-key"),
        line(ROUTE, PRE + "preset-seed", 12), line(PRE + "preset-seed", PRE + "disp-seed"),
        line(ROUTE, PRE + "preset-capstate", 15), line(PRE + "preset-capstate", PRE + "disp-capstate"),
        line(ROUTE, PRE + "preset-sessionstat", 16), line(PRE + "preset-sessionstat", PRE + "disp-sessionstat"),
        # BACKEND light + readout + relink (route outlets 18/19; see index table)
        line(ROUTE, PRE + "sel-backend", 18),
        line(PRE + "sel-backend", PRE + "bg-up", 0),
        line(PRE + "sel-backend", PRE + "bg-starting", 1),
        line(PRE + "sel-backend", PRE + "bg-down", 2),
        line(PRE + "bg-up", PRE + "pylight"),
        line(PRE + "bg-starting", PRE + "pylight"),
        line(PRE + "bg-down", PRE + "pylight"),
        line(ROUTE, PRE + "preset-backend", 19), line(PRE + "preset-backend", PRE + "disp-backend"),
        line(PRE + "pyrestart", PRE + "pre-pyrestart"), line(PRE + "pre-pyrestart", NODE),
        # MIDI
        line(PRE + "midiin", PRE + "midiparse"),
        line(PRE + "midiparse", PRE + "pre-notein", 0), line(PRE + "pre-notein", NODE),
        line(PRE + "midiparse", PRE + "pre-cc", 2), line(PRE + "pre-cc", NODE),
        line(PRE + "midiparse", PRE + "pre-pgm", 3), line(PRE + "pre-pgm", NODE),
        # Load-time state sync: bang every restored live.* control so the Node
        # engine matches what the panel shows (initial values / saved Set state).
        line(PRE + "loadbang", PRE + "tab-model"),
        line(PRE + "loadbang", PRE + "tab-bars"),
        line(PRE + "loadbang", PRE + "tab-mode"),
        line(PRE + "loadbang", PRE + "dial-seed"),
        line(PRE + "loadbang", PRE + "dial-key"),
        line(PRE + "loadbang", PRE + "dial-spice"),
        line(PRE + "loadbang", PRE + "dial-voicing"),
        line(PRE + "loadbang", PRE + "dial-cadence"),
        line(PRE + "loadbang", "obj-seq-dial-rhythm"),
        line(PRE + "loadbang", PRE + "bpm"),
        line(PRE + "loadbang", PRE + "sync"),
        line(PRE + "loadbang", PRE + "triplet"),
    ])

    # Extend route (text + numoutlets + outlettype MUST stay in sync).
    # Outlet index table: 0 status, 1 output, 2 error, 3 chord, 4 notes,
    # 5 stop, 6 playoff, 7 rhythmname, 8 phraselenbars, 9 phrasemodename,
    # 10 voicedistname, 11 keyname, 12 seedname, 13 modelname,
    # 14 sessionmodename, 15 capstate, 16 sessionstat, 17 modelstat,
    # 18 backendstate, 19 backendtext, 20 unmatched pass-through.
    for b in P["boxes"]:
        if b["box"].get("id") == ROUTE:
            b["box"]["text"] = ("route status output error chord notes stop playoff rhythmname "
                                "phraselenbars phrasemodename voicedistname keyname seedname modelname "
                                "sessionmodename capstate sessionstat modelstat backendstate backendtext")
            b["box"]["numoutlets"] = 21
            b["box"]["outlettype"] = [""] * 21

    # Apply layout + hide + text.
    by_id = {b["box"].get("id"): b["box"] for b in P["boxes"]}
    for box_id, rect in LAYOUT.items():
        if box_id in by_id:
            by_id[box_id]["presentation"] = 1
            by_id[box_id]["presentation_rect"] = list(rect)
    for box_id in HIDE:
        if box_id in by_id:
            by_id[box_id]["presentation"] = 0
    for box_id, text in TEXT.items():
        if box_id in by_id:
            by_id[box_id]["text"] = text
    if "obj-title" in by_id:
        by_id["obj-title"]["text"] = ("Chord Markov Performer — single-height (169 px) M4L panel: "
                                      "transport / model / phrase tabs / dials / chord readout.")
    # The chord readout is the panel's one big display.
    if "obj-chord-disp" in by_id:
        by_id["obj-chord-disp"]["fontsize"] = 14
    # Info View text for the base patch's Rhythm dial (guidelines p15).
    if "obj-seq-dial-rhythm" in by_id:
        by_id["obj-seq-dial-rhythm"]["annotation_name"] = "Rhythm"
        by_id["obj-seq-dial-rhythm"]["annotation"] = (
            "Harmonic-rhythm density: sparse (one chord per two bars) to dense "
            "(a chord every beat). Changes land on the next bar.")

    # Deliberate 8-slot macro bank: build_amxd.js banks the first 8 parameters
    # in box order, so put BANK0 first (stable sort keeps the rest unchanged).
    def _longname(entry):
        return (entry["box"].get("saved_attribute_attributes", {})
                .get("valueof", {}).get("parameter_longname"))
    P["boxes"].sort(key=lambda b: BANK0.index(_longname(b)) if _longname(b) in BANK0 else len(BANK0))

    # Window size.
    P["openinpresentation"] = 1
    P["openrect"] = [0.0, 0.0, float(PANEL_W), float(PANEL_H)]
    P["rect"] = [80.0, 80.0, float(PANEL_W + 60), float(PANEL_H + 80)]

    # Validation: bounds + control-overlap.
    off = [(b["box"]["id"], b["box"]["presentation_rect"]) for b in P["boxes"]
           if b["box"].get("presentation") == 1
           and (b["box"]["presentation_rect"][0] < 0 or b["box"]["presentation_rect"][1] < 0
                or b["box"]["presentation_rect"][0] + b["box"]["presentation_rect"][2] > PANEL_W
                or b["box"]["presentation_rect"][1] + b["box"]["presentation_rect"][3] > PANEL_H)]
    inter = {"live.dial", "live.text", "live.tab", "live.numbox", "live.toggle",
             "toggle", "textbutton", "number", "textedit", "message"}
    ctrls = [(b["box"]["id"], b["box"]["presentation_rect"]) for b in P["boxes"]
             if b["box"].get("presentation") == 1 and b["box"].get("maxclass") in inter]

    def area(a, bb):
        ax, ay, aw, ah = a
        bx, by, bw, bh = bb
        return max(0, min(ax + aw, bx + bw) - max(ax, bx)) * max(0, min(ay + ah, by + bh) - max(ay, by))
    overlaps = [(ctrls[i][0], ctrls[j][0]) for i in range(len(ctrls)) for j in range(i + 1, len(ctrls))
                if area(ctrls[i][1], ctrls[j][1]) > 6]
    if off:
        for pid, r in off:
            print(f"  OFF-PANEL {pid} {r}")
    if overlaps:
        for a, b in overlaps:
            print(f"  OVERLAP {a} <> {b}")
    if off or overlaps:
        sys.exit(f"ERROR: {len(off)} off-panel, {len(overlaps)} overlapping in {PANEL_W}x{PANEL_H}")

    n_params = sum(1 for b in P["boxes"] if b["box"].get("parameter_enable") == 1)
    n_pres = sum(1 for b in P["boxes"] if b["box"].get("presentation") == 1)
    OUT.write_text(json.dumps(doc, indent=1), encoding="utf-8")
    print(f"wrote {OUT.name}: {len(P['boxes'])} boxes, {len(P['lines'])} lines, "
          f"{n_params} params, {n_pres} on-panel, window {PANEL_W}x{PANEL_H}")


if __name__ == "__main__":
    main()
