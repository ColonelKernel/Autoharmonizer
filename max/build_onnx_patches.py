#!/usr/bin/env python3
"""Generate the two Python-free ONNX device patches.

  chord_markov_performer_onnx.maxpat      -> "Chord Markov Performer (ONNX).amxd"
  chord_markov_sequencer_spice_onnx.maxpat -> "Chord Markov Sequencer (ONNX).amxd"

Both are NEW files. The Python-backed devices are never read for anything but
their content and never written; `--check` re-asserts their SHA-256s.

Base patch: chord_markov_performer.maxpat, because it is the only patch already
wired to the modern 21-outlet `route` (the on-disk Spice patch stops at 15 and
predates the session/capture/backend readouts). The Spice device is therefore
REGENERATED from the modern base and re-skinned, rather than cloned from a stale
file — that is what "the Spice layout" now means:

  Performer (584x169) — the compact strip: tabs, one Spice macro, five dials.
  Spice     (960x169) — the wide strip: Color and Adventure split out of the
                        macro, VoiceDist restored, Audition restored, and every
                        readout the route can produce (model / rhythm / bars /
                        mode / voice distance).

Height stays at Live's fixed 169 px for BOTH. The old Spice patch was 310 px
tall, which Live's device chain clips; width is the only free dimension, so the
extra controls go sideways. Regenerating "modern" means inheriting that fix.

Only two keys retarget a device at the new bridge: obj-node's `text` and
`filename`. build_amxd.js does not embed the JS.

Run:
    python3 build_onnx_patches.py            # write both .maxpat
    python3 build_onnx_patches.py --check    # verify the originals are untouched
then:
    node build_amxd.js chord_markov_performer_onnx.maxpat       "Chord Markov Performer (ONNX).amxd"
    node build_amxd.js chord_markov_sequencer_spice_onnx.maxpat "Chord Markov Sequencer (ONNX).amxd"
"""

import hashlib
import json
import sys
from pathlib import Path

import build_spice_patch as bsp  # box factories only; importing runs no build

HERE = Path(__file__).resolve().parent
BASE = HERE / "chord_markov_performer.maxpat"
OUT_PERF = HERE / "chord_markov_performer_onnx.maxpat"
OUT_SPICE = HERE / "chord_markov_sequencer_spice_onnx.maxpat"

NODE = "obj-node"
ROUTE = "obj-route"
PRE = "obj-spice-"   # ids inherited from the performer generator
ONX = "obj-onnx-"    # ids added here
SCRIPT = "onnx_markov_osc.js"

# `route` outlet index table (see build_spice_patch.py). The ONNX devices reuse
# 18/19 for the LOCAL engine's load state instead of a Python process's health.
OUT_RHYTHMNAME = 7
OUT_PHRASELENBARS = 8
OUT_PHRASEMODENAME = 9
OUT_VOICEDISTNAME = 10
OUT_MODELSTAT = 17

# The Python-backed device ships unchanged. If any of these move, the ONNX work
# has broken its central promise and the build must stop.
BASELINE = {
    "markov_osc.js": "9d5589f23b0c79b24ee31ec0b2072af58bdb5cf668d18e58823679c8ea85710b",
    "chord_markov_sequencer.maxpat": "37a36f5485690c7f4245500a566a82e0ddcfff8e26cdb1abd812c7ee6e4c5fb3",
    "chord_markov_sequencer_spice.maxpat": "220ac17b58800fc3ff66f4c86537033a4bf240ae21eb63a2d4e1c6a6dc2376df",
    "chord_markov_performer.maxpat": "e8110f8d8cb1fc996111c009b97b5f69a1cffcb1d1820fd0bfad424198bca2d8",
    "Chord Markov Sequencer (Spice).amxd": "f02b0ed8ac01b55a594b278192e16f394ac724d5f5cabc26f582fbe7e8774e2a",
    "Chord Markov Performer.amxd": "9826d7de1d510865f3144b8bc6e9c6be5c54278dc534596cb5bb982265b0e07b",
}

PANEL_PERF = (584, 169)
PANEL_SPICE = (960, 169)


def check_baselines() -> int:
    bad = []
    for name, want in BASELINE.items():
        p = HERE / name
        if not p.is_file():
            bad.append(f"{name}: MISSING")
            continue
        got = hashlib.sha256(p.read_bytes()).hexdigest()
        if got != want:
            bad.append(f"{name}:\n    expected {want}\n    actual   {got}")
    for line in bad:
        print(f"  CHANGED {line}")
    if bad:
        print(f"ERROR: {len(bad)} original file(s) modified — the ONNX build must not touch them")
        return 1
    print(f"originals unchanged ({len(BASELINE)} files verified)")
    return 0


def by_id(P):
    return {b["box"].get("id"): b["box"] for b in P["boxes"]}


def drop_line(P, src, dst):
    """Remove one patchline by (source, destination) ids."""
    before = len(P["lines"])
    P["lines"] = [
        l for l in P["lines"]
        if not (l["patchline"]["source"][0] == src and l["patchline"]["destination"][0] == dst)
    ]
    return before - len(P["lines"])


def retarget(P, title):
    """Point the device at onnx_markov_osc.js and relabel the engine panel.

    The Relink button keeps its id and its `backendrestart` wiring — with no
    Python to supervise, that message now rebuilds the in-process engine — but a
    performer reading the panel must not be told there is a process to relink to.
    """
    ids = by_id(P)

    node = ids[NODE]
    node["text"] = f"node.script {SCRIPT}"
    node["filename"] = SCRIPT

    ids[PRE + "disp-backend"]["text"] = "loading models"

    btn = ids[PRE + "pyrestart"]
    btn["varname"] = "Reload"
    vo = btn["saved_attribute_attributes"]["valueof"]
    vo["parameter_longname"] = "Reload"
    vo["parameter_shortname"] = "Reload"
    btn["annotation_name"] = "Reload"
    btn["annotation"] = (
        "Rebuild the in-process chord engine (re-reads the models and the corpora). "
        "The light shows engine health: green = ready, amber = loading, red = failed. "
        "This device needs no Python."
    )
    ids[PRE + "lbl-relink"]["text"] = "reload"

    if "obj-title" in ids:
        ids["obj-title"]["text"] = title


def apply_layout(P, layout, hide=()):
    ids = by_id(P)
    for box_id, rect in layout.items():
        if box_id in ids:
            ids[box_id]["presentation"] = 1
            ids[box_id]["presentation_rect"] = list(rect)
    for box_id in hide:
        if box_id in ids:
            ids[box_id]["presentation"] = 0


def validate_wiring(P, label):
    """Structural checks Max fails silently on.

    A patchline naming a box that does not exist, or an outlet index past the
    object's outlet count, does not raise anywhere — the device simply loads
    with that connection missing. Duplicate live.* longnames make Live drop a
    parameter. Catch all three at build time.
    """
    boxes = by_id(P)
    errs = []
    for l in P["lines"]:
        pl = l["patchline"]
        src, src_out = pl["source"]
        dst, dst_in = pl["destination"]
        if src not in boxes:
            errs.append(f"patchline from unknown box {src!r}")
            continue
        if dst not in boxes:
            errs.append(f"patchline to unknown box {dst!r}")
            continue
        n_out = boxes[src].get("numoutlets", 1)
        n_in = boxes[dst].get("numinlets", 1)
        if src_out >= n_out:
            errs.append(f"{src} outlet {src_out} >= numoutlets {n_out}")
        if dst_in >= n_in:
            errs.append(f"{dst} inlet {dst_in} >= numinlets {n_in}")

    longnames = [
        b["box"]["saved_attribute_attributes"]["valueof"]["parameter_longname"]
        for b in P["boxes"]
        if b["box"].get("parameter_enable") == 1
        and b["box"].get("saved_attribute_attributes", {}).get("valueof", {}).get("parameter_longname")
    ]
    seen = set()
    for n in longnames:
        if n in seen:
            errs.append(f"duplicate live parameter longname {n!r}")
        seen.add(n)

    # build_amxd.js banks the first 8 parameters in BOX ORDER; a reorder would
    # silently rearrange the device's macro strip.
    if longnames[:8] != bsp.BANK0:
        errs.append(f"macro bank drifted: {longnames[:8]} != {bsp.BANK0}")

    for e in errs:
        print(f"  WIRING {e}")
    if errs:
        sys.exit(f"ERROR [{label}]: {len(errs)} wiring problem(s)")


def validate(P, panel_w, panel_h, label):
    """Bounds + control-overlap check, as in build_spice_patch.main()."""
    off = [
        (b["box"]["id"], b["box"]["presentation_rect"])
        for b in P["boxes"]
        if b["box"].get("presentation") == 1
        and (b["box"]["presentation_rect"][0] < 0 or b["box"]["presentation_rect"][1] < 0
             or b["box"]["presentation_rect"][0] + b["box"]["presentation_rect"][2] > panel_w
             or b["box"]["presentation_rect"][1] + b["box"]["presentation_rect"][3] > panel_h)
    ]
    inter = {"live.dial", "live.text", "live.tab", "live.numbox", "live.toggle",
             "toggle", "textbutton", "number", "textedit", "message", "live.button"}
    ctrls = [
        (b["box"]["id"], b["box"]["presentation_rect"])
        for b in P["boxes"]
        if b["box"].get("presentation") == 1 and b["box"].get("maxclass") in inter
    ]

    def area(a, bb):
        ax, ay, aw, ah = a
        bx, by, bw, bh = bb
        return max(0, min(ax + aw, bx + bw) - max(ax, bx)) * max(0, min(ay + ah, by + bh) - max(ay, by))

    overlaps = [
        (ctrls[i][0], ctrls[j][0])
        for i in range(len(ctrls)) for j in range(i + 1, len(ctrls))
        if area(ctrls[i][1], ctrls[j][1]) > 6
    ]
    for pid, r in off:
        print(f"  OFF-PANEL {pid} {r}")
    for a, b in overlaps:
        print(f"  OVERLAP {a} <> {b}")
    if off or overlaps:
        sys.exit(f"ERROR [{label}]: {len(off)} off-panel, {len(overlaps)} overlapping in {panel_w}x{panel_h}")


def write(doc, out, panel, label):
    P = doc["patcher"]
    P["openinpresentation"] = 1
    P["openrect"] = [0.0, 0.0, float(panel[0]), float(panel[1])]
    P["rect"] = [80.0, 80.0, float(panel[0] + 60), float(panel[1] + 80)]
    validate_wiring(P, label)
    validate(P, panel[0], panel[1], label)
    out.write_text(json.dumps(doc, indent=1), encoding="utf-8")
    n_params = sum(1 for b in P["boxes"] if b["box"].get("parameter_enable") == 1)
    n_pres = sum(1 for b in P["boxes"] if b["box"].get("presentation") == 1)
    print(f"wrote {out.name}: {len(P['boxes'])} boxes, {len(P['lines'])} lines, "
          f"{n_params} params, {n_pres} on-panel, window {panel[0]}x{panel[1]}")


# --------------------------------------------------------------------------
# Device 1 — the compact performer strip, pointed at the local engine.
# --------------------------------------------------------------------------
def build_performer():
    doc = json.loads(BASE.read_text(encoding="utf-8"))
    P = doc["patcher"]
    retarget(P, "Chord Markov Performer (ONNX) — Python-free: the RNN/LSTM run in-process "
                "through ONNX, the Markov blend and phrase generator in JS.")
    write(doc, OUT_PERF, PANEL_PERF, "performer")


# --------------------------------------------------------------------------
# Device 2 — the wide Spice strip: every dial and every readout.
# --------------------------------------------------------------------------
SPICE_LAYOUT = {
    # TRANSPORT
    PRE + "play": [6, 8, 58, 20],
    PRE + "reroll": [6, 32, 58, 18],
    PRE + "hold": [6, 54, 58, 18],
    PRE + "sync": [6, 76, 58, 18],
    PRE + "triplet": [6, 98, 58, 18],
    PRE + "bpm": [6, 122, 38, 17],
    PRE + "lbl-bpm": [46, 124, 16, 14],

    # MODEL — tab + the three live state readouts the route can produce
    PRE + "tab-model": [72, 8, 88, 62],
    ONX + "disp-modelstat": [72, 76, 88, 16],
    PRE + "disp-sessionstat": [72, 96, 88, 16],
    PRE + "disp-capstate": [72, 116, 88, 16],

    # PHRASE — tabs, their readouts, and Audition
    PRE + "tab-bars": [168, 8, 126, 20],
    PRE + "tab-mode": [168, 34, 126, 20],
    ONX + "disp-phraselen": [168, 60, 60, 16],
    ONX + "disp-mode": [232, 60, 62, 16],
    ONX + "disp-rhythm": [168, 82, 126, 16],
    ONX + "audition": [168, 104, 58, 18],
    ONX + "lbl-audition": [230, 106, 64, 12],

    # DIALS — Color/Adventure split out of the Spice macro; VoiceDist restored
    ONX + "dial-color": [302, 8, 46, 48],
    ONX + "dial-adventure": [356, 8, 46, 48],
    PRE + "dial-spice": [410, 8, 46, 48],
    PRE + "dial-cadence": [464, 8, 46, 48],
    "obj-seq-dial-rhythm": [518, 8, 46, 48],
    PRE + "dial-voicing": [572, 8, 46, 48],
    ONX + "dial-voicedist": [626, 8, 46, 48],
    PRE + "dial-seed": [680, 8, 46, 48],
    PRE + "dial-key": [734, 8, 46, 48],
    ONX + "disp-voicedist": [618, 60, 56, 14],
    PRE + "disp-seed": [676, 60, 54, 14],
    PRE + "disp-key": [730, 60, 54, 14],
    PRE + "keymin": [734, 78, 40, 16],

    # ENGINE — load state of the in-process models
    ONX + "hdr-engine": [792, 8, 120, 16],
    PRE + "pylight": [794, 32, 10, 10],
    PRE + "disp-backend": [808, 29, 118, 16],
    PRE + "pyrestart": [930, 29, 16, 16],
    PRE + "lbl-relink": [922, 48, 36, 12],

    # BOTTOM — chord readout + status
    "obj-chord-disp": [6, 142, 700, 24],
    "obj-status": [712, 142, 242, 24],
}


def build_spice():
    doc = json.loads(BASE.read_text(encoding="utf-8"))
    P = doc["patcher"]
    retarget(P, "Chord Markov Sequencer (ONNX) — Python-free wide panel: Color/Adventure split "
                "from the Spice macro, VoiceDist and Audition restored, full readouts.")

    Y = 1400  # patching-canvas rows below everything the base generator used
    P["boxes"].extend([
        # --- dials split out of the Spice macro ---------------------------
        bsp.dial(ONX + "dial-color", "Color", 0.5, Y,
                 annotation="Corpus flavour: folk (Nottingham) -> pop (POP909) -> classical (Bach) -> jazz (Open Book). "
                            "Blends the per-corpus Markov chains rather than switching between them."),
        bsp.newobj(ONX + "pre-color", "prepend color", Y, 100),
        bsp.dial(ONX + "dial-adventure", "Adventure", 0.35, Y + 30,
                 annotation="Sampling temperature: low picks the commonest next chord, high surfaces rare, colourful ones. "
                            "Also widens/sharpens the rnn/lstm softmax."),
        bsp.newobj(ONX + "pre-adventure", "prepend adventure", Y + 30, 120),
        bsp.dial(ONX + "dial-voicedist", "VoiceDist", 0.0, Y + 60,
                 annotation="Harmony Singer: stack diatonic voices above the chord at this scale distance."),
        bsp.newobj(ONX + "pre-voicedist", "prepend voicedistance", Y + 60, 140),

        # --- audition ------------------------------------------------------
        bsp.live_button(ONX + "audition", "Audition", Y + 90,
                        annotation="Hear the currently-selected Seed chord without running the model or starting the transport."),
        bsp.newobj(ONX + "pre-audition", "prepend audition", Y + 90, 110),
        bsp.comment(ONX + "lbl-audition", "audition seed", fontsize=9),

        # --- readouts the compact performer had no room for ----------------
        bsp.display(ONX + "disp-modelstat", "markov"),
        bsp.newobj(ONX + "preset-modelstat", "prepend set", Y + 120, 90),
        bsp.display(ONX + "disp-phraselen", "4"),
        bsp.newobj(ONX + "preset-phraselen", "prepend set", Y + 150, 90),
        bsp.display(ONX + "disp-mode", "loop"),
        bsp.newobj(ONX + "preset-mode", "prepend set", Y + 180, 90),
        bsp.display(ONX + "disp-rhythm", "half_half"),
        bsp.newobj(ONX + "preset-rhythm", "prepend set", Y + 210, 90),
        bsp.display(ONX + "disp-voicedist", "unison"),
        bsp.newobj(ONX + "preset-voicedist", "prepend set", Y + 240, 90),

        bsp.comment(ONX + "hdr-engine", "ONNX ENGINE", fontsize=9),
    ])

    P["lines"].extend([
        bsp.line(ONX + "dial-color", ONX + "pre-color"), bsp.line(ONX + "pre-color", NODE),
        bsp.line(ONX + "dial-adventure", ONX + "pre-adventure"), bsp.line(ONX + "pre-adventure", NODE),
        bsp.line(ONX + "dial-voicedist", ONX + "pre-voicedist"), bsp.line(ONX + "pre-voicedist", NODE),
        bsp.line(ONX + "audition", ONX + "pre-audition"), bsp.line(ONX + "pre-audition", NODE),

        bsp.line(ROUTE, ONX + "preset-rhythm", OUT_RHYTHMNAME),
        bsp.line(ONX + "preset-rhythm", ONX + "disp-rhythm"),
        bsp.line(ROUTE, ONX + "preset-phraselen", OUT_PHRASELENBARS),
        bsp.line(ONX + "preset-phraselen", ONX + "disp-phraselen"),
        bsp.line(ROUTE, ONX + "preset-mode", OUT_PHRASEMODENAME),
        bsp.line(ONX + "preset-mode", ONX + "disp-mode"),
        bsp.line(ROUTE, ONX + "preset-voicedist", OUT_VOICEDISTNAME),
        bsp.line(ONX + "preset-voicedist", ONX + "disp-voicedist"),
        bsp.line(ROUTE, ONX + "preset-modelstat", OUT_MODELSTAT),
        bsp.line(ONX + "preset-modelstat", ONX + "disp-modelstat"),

        bsp.line(PRE + "loadbang", ONX + "dial-color"),
        bsp.line(PRE + "loadbang", ONX + "dial-adventure"),
        bsp.line(PRE + "loadbang", ONX + "dial-voicedist"),
    ])

    # Spice is a MACRO over Color and Adventure: banging it at load would stomp
    # the two dials the panel actually shows. Let the fine controls initialize
    # the engine; Spice takes over the moment a performer touches it.
    dropped = drop_line(P, PRE + "loadbang", PRE + "dial-spice")
    if dropped != 1:
        sys.exit(f"ERROR: expected exactly 1 loadbang->dial-spice line, removed {dropped}")

    apply_layout(P, SPICE_LAYOUT)
    write(doc, OUT_SPICE, PANEL_SPICE, "spice")


def main():
    if "--check" in sys.argv:
        sys.exit(check_baselines())
    if not BASE.is_file():
        sys.exit(f"ERROR: base patch missing: {BASE}")
    build_performer()
    build_spice()
    rc = check_baselines()
    if rc:
        sys.exit(rc)
    print("\nnow run:")
    print(f'  node build_amxd.js {OUT_PERF.name} "Chord Markov Performer (ONNX).amxd"')
    print(f'  node build_amxd.js {OUT_SPICE.name} "Chord Markov Sequencer (ONNX).amxd"')


if __name__ == "__main__":
    main()
