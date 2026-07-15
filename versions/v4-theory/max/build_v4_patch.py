#!/usr/bin/env python3
"""Build the isolated protocol-v4 Performer patch.

The tracked v3 Performer is an immutable input.  This script writes a uniquely
named v4 patch that:

* loads ``markov_osc_v4.js`` (OSC 9100/9101),
* adds an automatable Complexity dial without increasing Live's 169 px height,
* appends ``protocolstat`` and ``voicecount`` without shifting v3 outlets,
* replaces timer-based ``makenote`` playback with held notes that stop on the
  next chord (or an explicit stop),
* restores Live parameters only after Node explicitly reports that its handlers
  are ready, and re-latches velocity immediately before every chord,
* adds a v4 Feel selector and an eighth-note straight clock while preserving
  the hidden legacy Triplet parameter for old automation,
* displays the negotiated protocol and current voice count, and
* exposes Complexity in the first eight Live parameter-bank slots.

Run from ``max/``:

    python3 build_v4_patch.py
    node build_amxd.js chord_markov_performer_v4.maxpat \
        "Chord Markov Performer v4.amxd"

``--check`` performs the full build in memory and confirms the checked-in
generated patch is current.  It never writes any file.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

# Keep generated-version folders clean when the build runs from npm/CI.
sys.dont_write_bytecode = True

import build_spice_patch as bsp


HERE = Path(__file__).resolve().parent
BASE = HERE / "chord_markov_performer.maxpat"
OUT = HERE / "chord_markov_performer_v4.maxpat"
AMXD = HERE / "Chord Markov Performer v4.amxd"

BASE_SHA256 = "e8110f8d8cb1fc996111c009b97b5f69a1cffcb1d1820fd0bfad424198bca2d8"
SCRIPT = "markov_osc_v4.js"
NODE = "obj-node"
ROUTE = "obj-route"
LOADBANG = "obj-spice-loadbang"
MODEL_TAB_ID = "obj-spice-tab-model"
PRE = "obj-v4-"
PANEL_W, PANEL_H = 672, 169
MODEL_ITEMS = ["markov", "rnn", "lstm", "ngram", "phrase"]
FEEL_ITEMS = [
    "Straight",
    "Push",
    "Tresillo",
    "Clave 3-2",
    "Clave 2-3",
    "Upbeats",
    "Triplet",
]

# build_amxd.js uses the first eight parameter-enabled boxes in JSON order.
BANK0 = ["Model", "Bars", "Mode", "Seed", "Key", "Spice", "Complexity", "Rhythm"]

COMPLEXITY_ID = PRE + "dial-complexity"
PREPEND_COMPLEXITY_ID = PRE + "pre-complexity"
PROTOCOL_DISPLAY_ID = PRE + "disp-protocol"
PROTOCOL_SET_ID = PRE + "preset-protocol"
FEEL_ID = PRE + "tab-feel"
PREPEND_FEEL_ID = PRE + "pre-feelidx"
FEEL_TRIPLET_ID = PRE + "eq-feel-triplet"
VOICECOUNT_DISPLAY_ID = PRE + "disp-voicecount"
VOICECOUNT_SET_ID = PRE + "preset-voicecount"
VOICECOUNT_LABEL_ID = PRE + "lbl-voicecount"
BRIDGE_READY_SELECTOR = "bridgeready"
STARTUP_DELAY_ID = PRE + "delay-startup-restore"
VELOCITY_LATCH_ID = PRE + "velocity-latch"

LEGACY_TRIPLET_ID = "obj-spice-triplet"
TRIPLET_SELECTOR_ID = "obj-spice-sel-triplet"

# V4 holds every chord until the next chord/stop.  The v3 ``makenote`` branch
# schedules independent per-note timers, which can race a dense chord list and
# leave only one pitch audible.  These boxes are removed only from the generated
# v4 document; the immutable v3 source retains its duration control and timers.
MIDI_TIMER_BOXES = {
    "obj-makenote",
    "obj-dur",
    "obj-dur-label",
    "obj-load-dur",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def by_id(patcher: dict) -> dict[str, dict]:
    return {entry["box"].get("id"): entry["box"] for entry in patcher["boxes"]}


def parameter_name(entry: dict) -> str | None:
    return (
        entry["box"]
        .get("saved_attribute_attributes", {})
        .get("valueof", {})
        .get("parameter_longname")
    )


def route_selectors(route: dict) -> list[str]:
    text = str(route.get("text", "")).split()
    if not text or text[0] != "route":
        raise ValueError("obj-route is not a route object")
    return text[1:]


def build_doc() -> dict:
    if not BASE.is_file():
        raise FileNotFoundError(f"missing v3 base patch: {BASE}")
    actual = sha256(BASE)
    if actual != BASE_SHA256:
        raise RuntimeError(
            "refusing to build from a changed v3 Performer\n"
            f"  expected {BASE_SHA256}\n"
            f"  actual   {actual}"
        )

    doc = json.loads(BASE.read_text(encoding="utf-8"))
    patcher = doc["patcher"]
    ids = by_id(patcher)

    # Remove only the v4 timer branch.  Keep ``flush`` itself: a bang from the
    # notes trigger (before the new list) or from Node's ``stop`` outlet still
    # sends note-offs for every pitch that is currently held.
    patcher["boxes"] = [
        entry
        for entry in patcher["boxes"]
        if entry["box"].get("id") not in MIDI_TIMER_BOXES
    ]
    patcher["lines"] = [
        entry
        for entry in patcher["lines"]
        if entry["patchline"]["source"][0] not in MIDI_TIMER_BOXES
        and entry["patchline"]["destination"][0] not in MIDI_TIMER_BOXES
        and not (
            entry["patchline"]["source"] == ["obj-notes-trig", 1]
            and entry["patchline"]["destination"] == ["obj-flush", 0]
        )
    ]
    ids = by_id(patcher)

    # Direct held-note MIDI path. Trigger executes right-to-left:
    #   2: flush the prior chord
    #   1: bang a velocity latch, refreshing flush's right inlet
    #   0: iterate the new pitches through flush's left inlet
    # Re-latching on EVERY chord avoids relying on Max file-load ordering while
    # retaining one chord-level lifecycle and no delayed per-note timers.
    notes_trigger = ids["obj-notes-trig"]
    notes_trigger["text"] = "t l b b"
    notes_trigger["numoutlets"] = 3
    notes_trigger["outlettype"] = ["", "bang", "bang"]
    notes_trigger["patching_rect"][2] = 70
    velocity_latch = bsp.obj_io(
        VELOCITY_LATCH_ID, "i 90", 680, numinlets=2, numoutlets=1, w=45
    )
    velocity_latch["box"]["patching_rect"][1] = 478
    patcher["boxes"].append(velocity_latch)
    patcher["lines"].extend(
        [
            bsp.line("obj-notes-trig", "obj-flush", 2),
            bsp.line("obj-notes-trig", VELOCITY_LATCH_ID, 1),
            bsp.line("obj-vel", VELOCITY_LATCH_ID, 0, 1),
            bsp.line(VELOCITY_LATCH_ID, "obj-flush", 0, 1),
            bsp.line("obj-iter", "obj-flush"),
        ]
    )
    ids["obj-midi-label"]["text"] = (
        "MIDI: notes -> flush-old -> re-latch velocity -> iter pitches -> flush "
        "-> pack -> midiformat -> midiout (held until next chord/stop)"
    )
    # Close the visual gap left by makenote/duration in the patching view.
    ids["obj-flush"]["patching_rect"] = [600, 491, 50, 22]
    ids["obj-pack"]["patching_rect"] = [600, 524, 70, 22]
    ids["obj-midiformat"]["patching_rect"] = [600, 557, 80, 22]
    ids["obj-midiout"]["patching_rect"] = [600, 590, 60, 22]

    # Straight rhythm now has eighth-note resolution.  Existing template
    # onsets are converted to the finer grid in markov_osc_v4.js, so their
    # musical positions remain unchanged.  Triplet retains its proven 4nt grid.
    ids["obj-seq-metro"]["text"] = "metro 250"
    ids["obj-seq-metro-sync"]["text"] = "metro 8n"
    ids["obj-seq-msper"]["text"] = "!/ 30000."
    ids["obj-spice-metro-straight"]["text"] = "8n"
    ids["obj-spice-div-straight"]["text"] = "30000."

    # The old binary Triplet parameter stays connected for saved automation but
    # is no longer presented.  Its loadbang would otherwise overwrite a restored
    # v4 Feel value, so startup state is now driven by the Feel tab alone.
    ids[LEGACY_TRIPLET_ID]["presentation"] = 0
    patcher["lines"] = [
        entry
        for entry in patcher["lines"]
        if not (
            entry["patchline"]["source"] == [LOADBANG, 0]
            and entry["patchline"]["destination"] == [LEGACY_TRIPLET_ID, 0]
        )
    ]

    # V4 registry adds the variable-order n-gram model. Keep Phrase last because
    # it is a local sequence-engine mode rather than a /control/model value.
    model_tab = ids[MODEL_TAB_ID]
    model_value = model_tab["saved_attribute_attributes"]["valueof"]
    model_value["parameter_enum"] = list(MODEL_ITEMS)
    model_value["parameter_mmax"] = len(MODEL_ITEMS) - 1
    model_value["parameter_initial"] = [len(MODEL_ITEMS) - 1]  # phrase remains default
    model_tab["num_lines_presentation"] = len(MODEL_ITEMS)
    model_tab["presentation_rect"] = [72, 8, 88, 78]
    model_tab["annotation"] = (
        "Generative engine. markov = corpus blend; rnn/lstm = JazzNet neural "
        "sessions; ngram = transparent variable-order harmonic context; phrase "
        "= whole-phrase generation with learned rhythm and cadence."
    )
    # Five readable 15.6 px tab rows need eight more vertical pixels. Compact
    # the three readouts below them without touching the 169 px device height.
    ids["obj-spice-disp-sessionstat"]["presentation_rect"] = [72, 90, 88, 14]
    ids["obj-spice-disp-capstate"]["presentation_rect"] = [72, 106, 88, 14]

    # Retarget only the new document. The v3 source and its shared bridge stay
    # byte-for-byte unchanged.
    node = ids[NODE]
    node["text"] = f"node.script {SCRIPT}"
    node["filename"] = SCRIPT

    # Append, never insert: route outlets 0..19 are the stable v3 ABI.
    route = ids[ROUTE]
    selectors = route_selectors(route)
    if (
        selectors[-1] != "backendtext"
        or "protocolstat" in selectors
        or "voicecount" in selectors
    ):
        raise RuntimeError(f"unexpected v3 route selectors: {selectors}")
    protocol_outlet = len(selectors)
    selectors.append("protocolstat")
    voicecount_outlet = len(selectors)
    selectors.append("voicecount")
    bridge_ready_outlet = len(selectors)
    selectors.append(BRIDGE_READY_SELECTOR)
    route["text"] = "route " + " ".join(selectors)
    route["numoutlets"] = len(selectors) + 1  # one unmatched outlet
    route["outlettype"] = [""] * route["numoutlets"]
    route["patching_rect"][2] = 440

    # Complexity occupies the deliberately empty lower half of the Phrase
    # column, beside Cadence. Shortname is compact enough for a 46 px live.dial.
    complexity = bsp.dial(
        COMPLEXITY_ID,
        "Complexity",
        0.5,
        1190,
        annotation=(
            "Harmonic vocabulary and planning depth. Low keeps diatonic triads "
            "and direct functional motion; high permits richer extensions, "
            "tonicization, mixture, substitutions and controlled modulation. "
            "Independent of Spice randomness and downstream Voicing."
        ),
    )
    complexity_box = complexity["box"]
    complexity_box["saved_attribute_attributes"]["valueof"]["parameter_shortname"] = "Complex"
    complexity_box["presentation_rect"] = [222, 60, 46, 48]

    pre_complexity = bsp.newobj(
        PREPEND_COMPLEXITY_ID, "prepend complexity", 1190, 130
    )
    protocol_display = bsp.display(PROTOCOL_DISPLAY_ID, "v?")
    protocol_display["box"]["presentation_rect"] = [118, 124, 42, 14]
    protocol_set = bsp.newobj(PROTOCOL_SET_ID, "prepend set", 1220, 90)

    # A discrete selector keeps named grooves one click away.  Seven vertical
    # rows need their own narrow column, so only v4 grows horizontally; Live's
    # fixed 169 px device height remains unchanged.
    feel = bsp.live_tab(
        FEEL_ID,
        "Feel",
        FEEL_ITEMS,
        0,
        1250,
        lines_pres=len(FEEL_ITEMS),
        annotation=(
            "Rhythmic feel. Straight follows the Rhythm density template; Push, "
            "Tresillo, Clave and Upbeats add eighth-note or multi-bar syncopation; "
            "Triplet uses the quarter-note-triplet clock."
        ),
    )
    feel["box"]["presentation_rect"] = [580, 8, 86, 112]
    pre_feel = bsp.newobj(PREPEND_FEEL_ID, "prepend feelidx", 1250, 110)
    feel_triplet = bsp.obj_io(
        FEEL_TRIPLET_ID, "== 6", 1250, numinlets=2, numoutlets=1, w=50
    )

    voicecount_display = bsp.display(VOICECOUNT_DISPLAY_ID, "0")
    voicecount_display["box"]["presentation_rect"] = [6, 98, 24, 18]
    voicecount_display["box"]["annotation_name"] = "Voices"
    voicecount_display["box"]["annotation"] = (
        "Number of distinct MIDI pitches emitted for the current chord."
    )
    voicecount_set = bsp.newobj(VOICECOUNT_SET_ID, "prepend set", 1280, 90)
    voicecount_label = bsp.comment(VOICECOUNT_LABEL_ID, "Voices", fontsize=9)
    voicecount_label["box"]["presentation_rect"] = [32, 100, 32, 14]

    # Node emits `bridgeready` only after every handler has registered. A short
    # defer then bangs the CURRENT Live parameter values back into Node and
    # starts the OSC/backend supervisor. This replaces the inherited immediate
    # loadbang race, whose messages Max dropped while node.script was starting.
    startup_delay = bsp.obj_io(
        STARTUP_DELAY_ID, "delay 50", 1320, numinlets=2, numoutlets=1, w=65
    )

    patcher["boxes"].extend(
        [
            complexity,
            pre_complexity,
            protocol_display,
            protocol_set,
            feel,
            pre_feel,
            feel_triplet,
            voicecount_display,
            voicecount_set,
            voicecount_label,
            startup_delay,
        ]
    )
    patcher["lines"].extend(
        [
            bsp.line(COMPLEXITY_ID, PREPEND_COMPLEXITY_ID),
            bsp.line(PREPEND_COMPLEXITY_ID, NODE),
            bsp.line(STARTUP_DELAY_ID, COMPLEXITY_ID),
            bsp.line(ROUTE, PROTOCOL_SET_ID, protocol_outlet),
            bsp.line(PROTOCOL_SET_ID, PROTOCOL_DISPLAY_ID),
            bsp.line(FEEL_ID, PREPEND_FEEL_ID),
            bsp.line(PREPEND_FEEL_ID, NODE),
            bsp.line(FEEL_ID, FEEL_TRIPLET_ID),
            bsp.line(FEEL_TRIPLET_ID, TRIPLET_SELECTOR_ID),
            bsp.line(STARTUP_DELAY_ID, FEEL_ID),
            bsp.line(ROUTE, VOICECOUNT_SET_ID, voicecount_outlet),
            bsp.line(VOICECOUNT_SET_ID, VOICECOUNT_DISPLAY_ID),
            bsp.line(ROUTE, STARTUP_DELAY_ID, bridge_ready_outlet),
            bsp.line(STARTUP_DELAY_ID, "obj-msg-init"),
        ]
    )

    # Re-source every inherited Spice parameter-initialization bang from the
    # ready-gated delay. The bare loadbang intentionally has no parameter path.
    for entry in patcher["lines"]:
        line = entry["patchline"]
        if line["source"] == [LOADBANG, 0]:
            line["source"] = [STARTUP_DELAY_ID, 0]

    ids = by_id(patcher)
    # Split the former 88 px status cell into status + negotiated protocol.
    ids["obj-status"]["presentation_rect"] = [72, 124, 42, 14]
    ids["obj-chord-disp"]["presentation_rect"] = [6, 142, PANEL_W - 12, 24]
    if "obj-title" in ids:
        ids["obj-title"]["text"] = (
            "Chord Markov Performer v4 — theory-aware Complexity control; "
            "isolated OSC 9100/9101."
        )

    # Deterministic first bank. Stable sorting retains every non-bank parameter's
    # relative order, including the copied v3 automation IDs.
    patcher["boxes"].sort(
        key=lambda entry: (
            BANK0.index(parameter_name(entry))
            if parameter_name(entry) in BANK0
            else len(BANK0)
        )
    )

    patcher["openinpresentation"] = 1
    patcher["openrect"] = [0.0, 0.0, float(PANEL_W), float(PANEL_H)]
    patcher["rect"] = [80.0, 80.0, float(PANEL_W + 60), float(PANEL_H + 80)]

    validate(patcher, protocol_outlet, voicecount_outlet, bridge_ready_outlet)
    return doc


def validate(
    patcher: dict,
    protocol_outlet: int,
    voicecount_outlet: int,
    bridge_ready_outlet: int,
) -> None:
    ids = by_id(patcher)
    errors: list[str] = []

    # Max silently drops malformed patchlines, so validate both endpoint IDs and
    # inlet/outlet ranges before producing an artifact.
    pairs: set[tuple[str, int, str, int]] = set()
    for entry in patcher["lines"]:
        line = entry["patchline"]
        source, source_outlet = line["source"]
        destination, destination_inlet = line["destination"]
        pairs.add((source, source_outlet, destination, destination_inlet))
        if source not in ids:
            errors.append(f"patchline from missing box {source!r}")
            continue
        if destination not in ids:
            errors.append(f"patchline to missing box {destination!r}")
            continue
        if source_outlet >= ids[source].get("numoutlets", 1):
            errors.append(f"{source} outlet {source_outlet} is out of range")
        if destination_inlet >= ids[destination].get("numinlets", 1):
            errors.append(f"{destination} inlet {destination_inlet} is out of range")

    required = {
        (COMPLEXITY_ID, 0, PREPEND_COMPLEXITY_ID, 0),
        (PREPEND_COMPLEXITY_ID, 0, NODE, 0),
        (STARTUP_DELAY_ID, 0, COMPLEXITY_ID, 0),
        (ROUTE, protocol_outlet, PROTOCOL_SET_ID, 0),
        (PROTOCOL_SET_ID, 0, PROTOCOL_DISPLAY_ID, 0),
        # Held-note MIDI path: flush, re-latch velocity, then iterate pitches.
        ("obj-notes-trig", 2, "obj-flush", 0),
        ("obj-notes-trig", 1, VELOCITY_LATCH_ID, 0),
        ("obj-notes-trig", 0, "obj-iter", 0),
        ("obj-iter", 0, "obj-flush", 0),
        ("obj-vel", 0, VELOCITY_LATCH_ID, 1),
        (VELOCITY_LATCH_ID, 0, "obj-flush", 1),
        ("obj-flush", 0, "obj-pack", 0),
        ("obj-flush", 1, "obj-pack", 1),
        # New v4 Feel path and clock selection.
        (FEEL_ID, 0, PREPEND_FEEL_ID, 0),
        (PREPEND_FEEL_ID, 0, NODE, 0),
        (FEEL_ID, 0, FEEL_TRIPLET_ID, 0),
        (FEEL_TRIPLET_ID, 0, TRIPLET_SELECTOR_ID, 0),
        (STARTUP_DELAY_ID, 0, FEEL_ID, 0),
        # Legacy Triplet remains functional for existing automation.
        (LEGACY_TRIPLET_ID, 0, "obj-spice-pre-triplet", 0),
        ("obj-spice-pre-triplet", 0, NODE, 0),
        (LEGACY_TRIPLET_ID, 0, TRIPLET_SELECTOR_ID, 0),
        # Voice-count observability is appended after protocolstat.
        (ROUTE, voicecount_outlet, VOICECOUNT_SET_ID, 0),
        (VOICECOUNT_SET_ID, 0, VOICECOUNT_DISPLAY_ID, 0),
        # Parameter values are replayed only after Node announces readiness.
        (ROUTE, bridge_ready_outlet, STARTUP_DELAY_ID, 0),
        (STARTUP_DELAY_ID, 0, "obj-msg-init", 0),
        (STARTUP_DELAY_ID, 0, MODEL_TAB_ID, 0),
    }
    for connection in sorted(required - pairs):
        errors.append(f"missing required patchline {connection}")

    route = ids.get(ROUTE, {})
    selectors = route_selectors(route)
    if selectors[-3:] != ["protocolstat", "voicecount", BRIDGE_READY_SELECTOR]:
        errors.append("route must append protocolstat, voicecount, then bridgeready")
    if protocol_outlet != 20 or selectors[protocol_outlet] != "protocolstat":
        errors.append("protocolstat moved from its stable v4 outlet 20")
    if voicecount_outlet != protocol_outlet + 1:
        errors.append("voicecount is not immediately after protocolstat")
    if bridge_ready_outlet != voicecount_outlet + 1:
        errors.append("bridgeready is not immediately after voicecount")
    if route.get("numoutlets") != len(selectors) + 1:
        errors.append("route selector/outlet counts differ")
    if len(route.get("outlettype", [])) != route.get("numoutlets"):
        errors.append("route outlettype/outlet counts differ")

    node = ids.get(NODE, {})
    if node.get("text") != f"node.script {SCRIPT}" or node.get("filename") != SCRIPT:
        errors.append("node.script was not fully retargeted to the v4 bridge")

    # The timer path must be absent, not merely disconnected: this prevents a
    # future base-patch change from silently restoring one-note-at-a-time races.
    for box_id in sorted(MIDI_TIMER_BOXES):
        if box_id in ids:
            errors.append(f"timer MIDI box survived in v4: {box_id}")
    if any("makenote" in str(box.get("text", "")).lower() for box in ids.values()):
        errors.append("v4 still contains a makenote object")
    notes_trigger = ids.get("obj-notes-trig", {})
    if notes_trigger.get("text") != "t l b b" or notes_trigger.get("numoutlets") != 3:
        errors.append("notes trigger must flush, re-latch velocity, then output list")
    midi_label = str(ids.get("obj-midi-label", {}).get("text", ""))
    if "held until next chord/stop" not in midi_label:
        errors.append("MIDI label does not document held-note behavior")

    expected_clock_text = {
        "obj-seq-metro": "metro 250",
        "obj-seq-metro-sync": "metro 8n",
        "obj-seq-msper": "!/ 30000.",
        "obj-spice-metro-straight": "8n",
        "obj-spice-div-straight": "30000.",
        "obj-spice-metro-trip": "4nt",
        "obj-spice-div-trip": "40000.",
    }
    for box_id, expected in expected_clock_text.items():
        actual = ids.get(box_id, {}).get("text")
        if actual != expected:
            errors.append(f"clock object {box_id} drifted: {actual!r} != {expected!r}")

    legacy_triplet = ids.get(LEGACY_TRIPLET_ID, {})
    legacy_value = (
        legacy_triplet.get("saved_attribute_attributes", {}).get("valueof", {})
    )
    if legacy_triplet.get("presentation") == 1:
        errors.append("legacy Triplet parameter must be hidden in v4 presentation")
    if legacy_value.get("parameter_longname") != "Triplet":
        errors.append("legacy Triplet automation parameter was not preserved")
    if (STARTUP_DELAY_ID, 0, LEGACY_TRIPLET_ID, 0) in pairs:
        errors.append("legacy Triplet loadbang can overwrite restored Feel state")

    if any(source == LOADBANG for source, _, _, _ in pairs):
        errors.append("immediate Spice loadbang still races node.script startup")

    feel_box = ids.get(FEEL_ID, {})
    feel_value = feel_box.get("saved_attribute_attributes", {}).get("valueof", {})
    if feel_value.get("parameter_enum") != FEEL_ITEMS:
        errors.append(f"Feel tab drifted: {feel_value.get('parameter_enum')} != {FEEL_ITEMS}")
    if feel_value.get("parameter_initial") != [0] or feel_value.get("parameter_mmax") != 6:
        errors.append("Feel tab must default to Straight and expose seven items")
    if feel_box.get("num_lines_presentation") != len(FEEL_ITEMS):
        errors.append("Feel tab must render seven separate rows")

    voice_display = ids.get(VOICECOUNT_DISPLAY_ID, {})
    if voice_display.get("annotation_name") != "Voices":
        errors.append("voice-count display is not labeled Voices")
    if voice_display.get("presentation") != 1:
        errors.append("voice-count display is not visible")

    model_tab = ids.get(MODEL_TAB_ID, {})
    model_value = (
        model_tab.get("saved_attribute_attributes", {}).get("valueof", {})
    )
    if model_value.get("parameter_enum") != MODEL_ITEMS:
        errors.append(f"Model tab drifted: {model_value.get('parameter_enum')} != {MODEL_ITEMS}")
    if model_value.get("parameter_initial") != [4] or model_value.get("parameter_mmax") != 4:
        errors.append("Model tab must preserve Phrase as default index 4")
    if model_tab.get("num_lines_presentation") != 5:
        errors.append("Model tab must render five separate rows")

    live_names = [
        parameter_name(entry)
        for entry in patcher["boxes"]
        if entry["box"].get("parameter_enable") == 1 and parameter_name(entry)
    ]
    if len(live_names) != len(set(live_names)):
        errors.append("duplicate Live parameter longname")
    if live_names[:8] != BANK0:
        errors.append(f"parameter bank drifted: {live_names[:8]} != {BANK0}")
    feel_entry = next(
        (
            entry
            for entry in patcher["boxes"]
            if entry["box"].get("id") == FEEL_ID
        ),
        None,
    )
    if feel_entry is None or parameter_name(feel_entry) != "Feel":
        errors.append("Feel is not a registered Live parameter")

    # Presentation bounds and meaningful control overlap.
    controls: list[tuple[str, list[float]]] = []
    interactive = {
        "live.dial",
        "live.text",
        "live.tab",
        "live.numbox",
        "live.toggle",
        "live.button",
        "live.menu",
        "toggle",
        "textbutton",
        "number",
        "textedit",
        "message",
    }
    for entry in patcher["boxes"]:
        box = entry["box"]
        if box.get("presentation") != 1:
            continue
        rect = box.get("presentation_rect")
        if not isinstance(rect, list) or len(rect) != 4:
            errors.append(f"presented box {box.get('id')} has no valid rectangle")
            continue
        x, y, width, height = rect
        if x < 0 or y < 0 or x + width > PANEL_W or y + height > PANEL_H:
            errors.append(f"off-panel {box.get('id')}: {rect}")
        if box.get("maxclass") in interactive:
            controls.append((box.get("id", "?"), rect))

    def overlap_area(a: list[float], b: list[float]) -> float:
        ax, ay, aw, ah = a
        bx, by, bw, bh = b
        return max(0, min(ax + aw, bx + bw) - max(ax, bx)) * max(
            0, min(ay + ah, by + bh) - max(ay, by)
        )

    for index, (left_id, left_rect) in enumerate(controls):
        for right_id, right_rect in controls[index + 1 :]:
            if overlap_area(left_rect, right_rect) > 6:
                errors.append(f"overlap {left_id} <> {right_id}")

    chord_rect = ids.get("obj-chord-disp", {}).get("presentation_rect")
    if chord_rect != [6, 142, PANEL_W - 12, 24]:
        errors.append(f"chord readout did not widen with v4 panel: {chord_rect}")

    if errors:
        raise RuntimeError("v4 Max patch validation failed:\n  " + "\n  ".join(errors))


def serialized(doc: dict) -> str:
    return json.dumps(doc, indent=1)


def validate_amxd(source_doc: dict) -> None:
    """Round-trip the generated Live container and assert its embedded patch.

    build_amxd.js injects device metadata but otherwise must preserve the v4
    boxes and patchlines exactly. This catches a stale AMXD after a patch rebuild.
    """
    if not AMXD.is_file():
        raise RuntimeError(f"missing generated device: {AMXD.name}")
    data = AMXD.read_bytes()
    if data[:4] != b"ampf" or data[8:12] != b"mmmm":
        raise RuntimeError("v4 AMXD is not a Max for Live MIDI-effect container")
    marker = data.find(b"ptch")
    if marker < 0 or marker + 8 > len(data):
        raise RuntimeError("v4 AMXD has no ptch payload")
    size = int.from_bytes(data[marker + 4 : marker + 8], "little")
    payload = data[marker + 8 : marker + 8 + size]
    if len(payload) != size or not payload.endswith(b"\x00"):
        raise RuntimeError("v4 AMXD payload length/terminator is invalid")
    embedded = json.loads(payload[:-1].decode("utf-8"))
    source = source_doc["patcher"]
    built = embedded["patcher"]
    if built.get("boxes") != source.get("boxes") or built.get("lines") != source.get("lines"):
        raise RuntimeError("v4 AMXD is stale relative to the generated maxpat")
    bank = (
        built.get("parameters", {})
        .get("parameterbanks", {})
        .get("0", {})
        .get("parameters")
    )
    if bank != BANK0:
        raise RuntimeError(f"v4 AMXD bank drifted: {bank} != {BANK0}")
    ids = by_id(built)
    if ids[NODE].get("filename") != SCRIPT:
        raise RuntimeError("v4 AMXD does not reference the unique v4 bridge")


def main() -> None:
    doc = build_doc()
    expected = serialized(doc)

    if "--check" in sys.argv:
        if not OUT.is_file():
            raise SystemExit(f"missing generated patch: {OUT.name}")
        actual = OUT.read_text(encoding="utf-8")
        if actual != expected:
            raise SystemExit(
                f"generated patch is stale: run python3 {Path(__file__).name}"
            )
        validate_amxd(doc)
        print(
            f"{OUT.name} and {AMXD.name} are current; v3 base unchanged; "
            f"bank={','.join(BANK0)}; panel={PANEL_W}x{PANEL_H}"
        )
        return

    OUT.write_text(expected, encoding="utf-8")
    patcher = doc["patcher"]
    print(
        f"wrote {OUT.name}: {len(patcher['boxes'])} boxes, "
        f"{len(patcher['lines'])} lines, panel {PANEL_W}x{PANEL_H}"
    )
    print(
        'now run: node build_amxd.js chord_markov_performer_v4.maxpat '
        '"Chord Markov Performer v4.amxd"'
    )


if __name__ == "__main__":
    main()
