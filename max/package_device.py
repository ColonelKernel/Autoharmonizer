#!/usr/bin/env python3
"""package_device.py — build a distributable, macOS-arm64 bundle of the
Python-free ONNX chord devices.

The dev tree is ~270 MB, most of it onnxruntime-node's native binaries for five
platforms and build-only assets. This ships ONLY what Node for Max loads at
runtime on Apple Silicon:

  * the two "(ONNX).amxd" devices,
  * the bridge (onnx_markov_osc.js) + engine/*.js + the reused pure modules
    (chord_parser.js, performance_map.js), tests and fixtures excluded,
  * the runtime data assets: the ONNX graphs, the pure-JS weight fallback,
    vocab, the corpora, and the phrase + n-gram models,
  * onnxruntime-node trimmed to the single darwin/arm64 native binary — the
    other ~184 MB of win32/linux binaries a Mac never loads are dropped.

Excluded: *.test.js, engine/fixtures, the .pt checkpoints, chords.json, parity
fixtures, node-osc (the ONNX device speaks no OSC), and all of Python.

The layout is preserved so node.script resolves the same relative paths it does
in the dev tree (bridge in max/, engine in max/engine, data at ../../data,
onnxruntime-node in max/node_modules).

Output: dist/FinalMaxUPF-ONNX-macos-arm64/  and a .zip beside it.
Run:    python3 package_device.py
"""

import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent          # max/
ROOT = HERE.parent                              # repo root
DIST = ROOT / "dist"
BUNDLE = DIST / "FinalMaxUPF-ONNX-macos-arm64"
KEEP_ARCH = ("darwin", "arm64")                 # the only native binary a Mac (Apple Silicon) needs

# max/ runtime files (everything the bridge + engine load, minus tests/fixtures).
MAX_FILES = [
    "Chord Markov Performer (ONNX).amxd",
    "Chord Markov Sequencer (ONNX).amxd",
    "onnx_markov_osc.js",
    "chord_parser.js",
    "performance_map.js",
    "package.json",
]
# data/ files the engine actually reads at runtime (see local_engine.js paths).
DATA_FILES = [
    "jazznet/onnx/rnn.onnx",
    "jazznet/onnx/lstm.onnx",
    "jazznet/weights_rnn.json",
    "jazznet/weights_lstm.json",
    "jazznet/vocab.json",
    "markov_corpora_t.json",
    "phrase_model_jazznet.json",
    "theory_ngram.json",
]


def _sizeof(path: Path) -> str:
    out = subprocess.run(["du", "-sh", str(path)], capture_output=True, text=True)
    return out.stdout.split("\t")[0] if out.returncode == 0 else "?"


def stage() -> None:
    if DIST.exists():
        shutil.rmtree(DIST)
    (BUNDLE / "max" / "engine").mkdir(parents=True)
    (BUNDLE / "data" / "jazznet" / "onnx").mkdir(parents=True)

    # max/ runtime files
    for name in MAX_FILES:
        src = HERE / name
        if not src.is_file():
            sys.exit(f"ERROR: missing runtime file {src}")
        shutil.copy2(src, BUNDLE / "max" / name)

    # engine modules, tests excluded (fixtures dir is not copied at all)
    for js in sorted((HERE / "engine").glob("*.js")):
        if js.name.endswith(".test.js"):
            continue
        shutil.copy2(js, BUNDLE / "max" / "engine" / js.name)

    # data subset
    for rel in DATA_FILES:
        src = ROOT / "data" / rel
        if not src.is_file():
            sys.exit(f"ERROR: missing runtime data asset {src}")
        dst = BUNDLE / "data" / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)

    # node_modules: copy the WHOLE tree, then trim onnxruntime-node's native
    # binaries. onnxruntime-node pulls in onnxruntime-common (+ a small dep
    # closure) as SIBLINGS; copying the one package alone leaves it unable to
    # require its deps and it silently falls back to the JS pass. The non-ONNX
    # packages total ~2.5 MB, so copying all of node_modules is the safe closure.
    nm_src = HERE / "node_modules"
    ort_src = nm_src / "onnxruntime-node"
    if not ort_src.is_dir():
        sys.exit("ERROR: node_modules/onnxruntime-node not installed; run `npm install` in max/ first")
    nm_dst = BUNDLE / "max" / "node_modules"
    shutil.copytree(nm_src, nm_dst)
    napi = nm_dst / "onnxruntime-node" / "bin" / "napi-v6"
    if napi.is_dir():
        for plat in napi.iterdir():          # darwin / linux / win32
            for arch in list(plat.iterdir()):
                if (plat.name, arch.name) != KEEP_ARCH:
                    shutil.rmtree(arch)
            if not any(plat.iterdir()):
                shutil.rmtree(plat)
        kept = [f"{p.name}/{a.name}" for p in napi.iterdir() for a in p.iterdir()]
        if kept != [f"{KEEP_ARCH[0]}/{KEEP_ARCH[1]}"]:
            sys.exit(f"ERROR: native-binary trim left {kept}, expected only darwin/arm64")


def write_readme() -> None:
    (BUNDLE / "DISTRIBUTION.md").write_text(
        "# Chord Markov (ONNX) — macOS Apple Silicon bundle\n\n"
        "Two Max for Live devices that generate chords entirely inside Max — no Python.\n\n"
        "## Install\n\n"
        "1. Copy this whole folder somewhere permanent (the devices load their JS,\n"
        "   the ONNX runtime, and the models from disk by relative path — a lone\n"
        "   `.amxd` will not work).\n"
        "2. In Ableton Live, drag `max/Chord Markov Performer (ONNX).amxd` (or the\n"
        "   Sequencer) onto a MIDI track, and add an instrument after it.\n"
        "3. The engine light goes amber (`loading models`) then green (`onnx ready`).\n"
        "   Press the device's Play; the Model tab offers markov / rnn / lstm /\n"
        "   phrase / ngram, and the Complexity dial ranges from diatonic triads to\n"
        "   altered/extended harmony.\n\n"
        "## Notes\n\n"
        "- **Apple Silicon only.** The bundled native ONNX runtime is `darwin/arm64`.\n"
        "  On an Intel Mac the device still runs — it falls back to a pure-JS forward\n"
        "  pass and the light reads `js fallback`.\n"
        "- No network, no UDP, no background process. Two devices can run in one Set.\n"
        "- Full docs and source: the project's ONNX_DEVICE.md.\n",
        encoding="utf-8",
    )


def verify() -> None:
    """Prove the bundle is self-contained AND that the trimmed ONNX runtime still
    loads from it — boot the engine from the bundled copy and require kind=onnx.
    (If the dep closure is incomplete the engine silently falls to 'js', so this
    guards against shipping a JS-only bundle by mistake.)"""
    probe = (
        "const {createLocalEngine}=require('./engine/local_engine.js');"
        "createLocalEngine({}).init().then(e=>{"
        "console.log('bundle engine init:', e.ok?'OK':'FAIL', 'kind='+(e.kind||''));"
        "process.exit(e.ok && e.kind==='onnx' ? 0 : 2);"
        "}).catch(e=>{console.error(e);process.exit(1);});"
    )
    r = subprocess.run(["node", "-e", probe], cwd=str(BUNDLE / "max"), capture_output=True, text=True)
    print("  " + (r.stdout or r.stderr).strip())
    if r.returncode == 2:
        sys.exit("ERROR: bundle booted but NOT on the ONNX runtime (dep closure or native trim is wrong)")
    if r.returncode != 0:
        sys.exit("ERROR: bundle failed its self-contained boot check")


def main() -> None:
    stage()
    write_readme()
    verify()
    archive = shutil.make_archive(str(BUNDLE), "zip", root_dir=str(DIST), base_dir=BUNDLE.name)
    print(f"bundle:  {BUNDLE}  ({_sizeof(BUNDLE)})")
    print(f"zip:     {archive}  ({_sizeof(Path(archive))})")
    print(f"(dev tree onnxruntime-node was ~258M; trimmed to darwin/arm64 only)")


if __name__ == "__main__":
    main()
