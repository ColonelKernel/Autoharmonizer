{
    "patcher": {
        "fileversion": 1,
        "appversion": {
            "major": 9,
            "minor": 1,
            "revision": 4,
            "architecture": "x64",
            "modernui": 1
        },
        "classnamespace": "box",
        "rect": [ 137.0, 95.0, 1341.0, 796.0 ],
        "boxes": [
            {
                "box": {
                    "id": "obj-7",
                    "maxclass": "live.dial",
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "", "float" ],
                    "parameter_enable": 1,
                    "patching_rect": [ 911.0, 334.0, 41.0, 48.0 ],
                    "saved_attribute_attributes": {
                        "valueof": {
                            "parameter_longname": "live.dial",
                            "parameter_modmode": 3,
                            "parameter_shortname": "live.dial",
                            "parameter_type": 0,
                            "parameter_unitstyle": 0
                        }
                    },
                    "varname": "live.dial"
                }
            },
            {
                "box": {
                    "id": "obj-title",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 30.0, 20.0, 620.0, 20.0 ],
                    "text": "Markov Chord Device v1 — Node for Max OSC bridge → major/minor-triad sonification"
                }
            },
            {
                "box": {
                    "id": "obj-hint",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 30.0, 42.0, 620.0, 20.0 ],
                    "text": "First time only: click npm install, then ping. Start the Python service first. Chords are voiced as major/minor triads."
                }
            },
            {
                "box": {
                    "id": "obj-input-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 30.0, 80.0, 151.0, 20.0 ],
                    "text": "chord input (Enter or send)"
                }
            },
            {
                "box": {
                    "id": "obj-input",
                    "maxclass": "textedit",
                    "numinlets": 1,
                    "numoutlets": 4,
                    "outlettype": [ "", "int", "", "" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 30.0, 105.0, 120.0, 22.0 ],
                    "text": "G:7"
                }
            },
            {
                "box": {
                    "id": "obj-btn-send",
                    "maxclass": "textbutton",
                    "numinlets": 1,
                    "numoutlets": 3,
                    "outlettype": [ "", "", "int" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 170.0, 105.0, 60.0, 22.0 ],
                    "text": "send"
                }
            },
            {
                "box": {
                    "id": "obj-btn-ping",
                    "maxclass": "textbutton",
                    "numinlets": 1,
                    "numoutlets": 3,
                    "outlettype": [ "", "", "int" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 250.0, 105.0, 60.0, 22.0 ],
                    "text": "ping"
                }
            },
            {
                "box": {
                    "id": "obj-btn-reload",
                    "maxclass": "textbutton",
                    "numinlets": 1,
                    "numoutlets": 3,
                    "outlettype": [ "", "", "int" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 330.0, 105.0, 60.0, 22.0 ],
                    "text": "reload"
                }
            },
            {
                "box": {
                    "id": "obj-btn-npm",
                    "maxclass": "textbutton",
                    "numinlets": 1,
                    "numoutlets": 3,
                    "outlettype": [ "", "", "int" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 410.0, 105.0, 90.0, 22.0 ],
                    "text": "npm install"
                }
            },
            {
                "box": {
                    "id": "obj-loadbang",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "bang" ],
                    "patching_rect": [ 250.0, 55.0, 60.0, 22.0 ],
                    "text": "loadbang"
                }
            },
            {
                "box": {
                    "id": "obj-init-delay",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "bang" ],
                    "patching_rect": [ 250.0, 80.0, 61.0, 22.0 ],
                    "text": "delay 300"
                }
            },
            {
                "box": {
                    "id": "obj-msg-start",
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 150.0, 140.0, 70.0, 22.0 ],
                    "text": "script start"
                }
            },
            {
                "box": {
                    "id": "obj-ping-delay",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "bang" ],
                    "patching_rect": [ 200.0, 170.0, 61.0, 22.0 ],
                    "text": "delay 200"
                }
            },
            {
                "box": {
                    "id": "obj-msg-init",
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 150.0, 170.0, 40.0, 22.0 ],
                    "text": "init"
                }
            },
            {
                "box": {
                    "id": "obj-msg-ping",
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 250.0, 140.0, 35.0, 22.0 ],
                    "text": "ping"
                }
            },
            {
                "box": {
                    "id": "obj-msg-reload",
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 330.0, 140.0, 45.0, 22.0 ],
                    "text": "reload"
                }
            },
            {
                "box": {
                    "id": "obj-msg-npm",
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 410.0, 140.0, 110.0, 22.0 ],
                    "text": "script npm install"
                }
            },
            {
                "box": {
                    "id": "obj-prepend-send",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 30.0, 170.0, 90.0, 22.0 ],
                    "text": "prepend send"
                }
            },
            {
                "box": {
                    "id": "obj-node",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "", "" ],
                    "patching_rect": [ 250.0, 205.0, 190.0, 22.0 ],
                    "saved_object_attributes": {
                        "autostart": 0,
                        "defer": 0,
                        "watch": 0
                    },
                    "text": "node.script markov_osc.js",
                    "textfile": {
                        "filename": "markov_osc.js",
                        "flags": 0,
                        "embed": 0,
                        "autowatch": 1
                    }
                }
            },
            {
                "box": {
                    "id": "obj-route",
                    "maxclass": "newobj",
                    "numinlets": 7,
                    "numoutlets": 7,
                    "outlettype": [ "", "", "", "", "", "", "" ],
                    "patching_rect": [ 250.0, 245.0, 330.0, 22.0 ],
                    "text": "route status output error chord notes stop"
                }
            },
            {
                "box": {
                    "id": "obj-status-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 250.0, 285.0, 80.0, 20.0 ],
                    "text": "status"
                }
            },
            {
                "box": {
                    "id": "obj-status",
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 250.0, 308.0, 140.0, 22.0 ],
                    "text": "set $1"
                }
            },
            {
                "box": {
                    "id": "obj-print-status",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 400.0, 308.0, 70.0, 22.0 ],
                    "text": "print status"
                }
            },
            {
                "box": {
                    "id": "obj-output-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 250.0, 340.0, 80.0, 20.0 ],
                    "text": "output"
                }
            },
            {
                "box": {
                    "id": "obj-output",
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 250.0, 363.0, 150.0, 22.0 ],
                    "text": "set $1"
                }
            },
            {
                "box": {
                    "id": "obj-print-output",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 410.0, 363.0, 70.0, 22.0 ],
                    "text": "print output"
                }
            },
            {
                "box": {
                    "id": "obj-outlet",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 250.0, 393.0, 60.0, 22.0 ],
                    "text": "out s"
                }
            },
            {
                "box": {
                    "id": "obj-error-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 250.0, 423.0, 80.0, 20.0 ],
                    "text": "error"
                }
            },
            {
                "box": {
                    "id": "obj-error",
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 250.0, 446.0, 240.0, 22.0 ],
                    "text": "set $1"
                }
            },
            {
                "box": {
                    "id": "obj-print-error",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 250.0, 476.0, 61.0, 22.0 ],
                    "text": "print error"
                }
            },
            {
                "box": {
                    "id": "obj-status-wait",
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 520.0, 285.0, 60.0, 22.0 ],
                    "text": "waiting"
                }
            },
            {
                "box": {
                    "id": "obj-chord-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 600.0, 285.0, 120.0, 20.0 ],
                    "text": "predicted chord:"
                }
            },
            {
                "box": {
                    "id": "obj-prepend-chord",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 600.0, 308.0, 80.0, 22.0 ],
                    "text": "prepend set"
                }
            },
            {
                "box": {
                    "id": "obj-chord-disp",
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 690.0, 308.0, 200.0, 22.0 ],
                    "text": "Cmaj7"
                }
            },
            {
                "box": {
                    "id": "obj-notes-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 600.0, 340.0, 120.0, 20.0 ],
                    "text": "MIDI notes:"
                }
            },
            {
                "box": {
                    "id": "obj-prepend-notes",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 600.0, 363.0, 80.0, 22.0 ],
                    "text": "prepend set"
                }
            },
            {
                "box": {
                    "id": "obj-notes-disp",
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 690.0, 363.0, 200.0, 22.0 ],
                    "text": "48 52 55"
                }
            },
            {
                "box": {
                    "id": "obj-midi-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 600.0, 400.0, 461.0, 20.0 ],
                    "text": "MIDI: notes → flush-old → iter → makenote → flush → pack → midiformat → midiout"
                }
            },
            {
                "box": {
                    "id": "obj-notes-trig",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "", "bang" ],
                    "patching_rect": [ 600.0, 425.0, 60.0, 22.0 ],
                    "text": "t l b"
                }
            },
            {
                "box": {
                    "id": "obj-iter",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 600.0, 458.0, 50.0, 22.0 ],
                    "text": "iter"
                }
            },
            {
                "box": {
                    "id": "obj-makenote",
                    "maxclass": "newobj",
                    "numinlets": 3,
                    "numoutlets": 2,
                    "outlettype": [ "float", "float" ],
                    "patching_rect": [ 600.0, 491.0, 120.0, 22.0 ],
                    "text": "makenote 90 1000"
                }
            },
            {
                "box": {
                    "id": "obj-flush",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 2,
                    "outlettype": [ "int", "int" ],
                    "patching_rect": [ 600.0, 524.0, 50.0, 22.0 ],
                    "text": "flush"
                }
            },
            {
                "box": {
                    "id": "obj-pack",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 600.0, 557.0, 70.0, 22.0 ],
                    "text": "pack 0 0"
                }
            },
            {
                "box": {
                    "id": "obj-midiformat",
                    "maxclass": "newobj",
                    "numinlets": 7,
                    "numoutlets": 2,
                    "outlettype": [ "int", "" ],
                    "patching_rect": [ 600.0, 590.0, 80.0, 22.0 ],
                    "text": "midiformat"
                }
            },
            {
                "box": {
                    "id": "obj-midiout",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 600.0, 623.0, 60.0, 22.0 ],
                    "text": "midiout"
                }
            },
            {
                "box": {
                    "id": "obj-vel-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 760.0, 458.0, 90.0, 20.0 ],
                    "text": "velocity"
                }
            },
            {
                "box": {
                    "id": "obj-vel",
                    "maxclass": "number",
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "", "bang" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 760.0, 478.0, 50.0, 22.0 ]
                }
            },
            {
                "box": {
                    "id": "obj-load-vel",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 820.0, 478.0, 90.0, 22.0 ],
                    "text": "loadmess 90"
                }
            },
            {
                "box": {
                    "id": "obj-dur-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 760.0, 508.0, 90.0, 20.0 ],
                    "text": "duration ms"
                }
            },
            {
                "box": {
                    "id": "obj-dur",
                    "maxclass": "number",
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "", "bang" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 760.0, 528.0, 50.0, 22.0 ]
                }
            },
            {
                "box": {
                    "id": "obj-load-dur",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 820.0, 528.0, 90.0, 22.0 ],
                    "text": "loadmess 1000"
                }
            },
            {
                "box": {
                    "id": "obj-reg-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 760.0, 560.0, 120.0, 20.0 ],
                    "text": "register center"
                }
            },
            {
                "box": {
                    "id": "obj-reg",
                    "maxclass": "number",
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "", "bang" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 760.0, 580.0, 50.0, 22.0 ]
                }
            },
            {
                "box": {
                    "id": "obj-load-reg",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 900.0, 580.0, 90.0, 22.0 ],
                    "text": "loadmess 60"
                }
            },
            {
                "box": {
                    "id": "obj-prepend-register",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 820.0, 580.0, 96.0, 22.0 ],
                    "text": "prepend register"
                }
            },
            {
                "box": {
                    "id": "obj-vl-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 760.0, 612.0, 200.0, 20.0 ],
                    "text": "voice leading (default ON in Node)"
                }
            },
            {
                "box": {
                    "id": "obj-vl",
                    "maxclass": "toggle",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "int" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 760.0, 632.0, 24.0, 24.0 ]
                }
            },
            {
                "box": {
                    "id": "obj-prepend-vl",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 790.0, 634.0, 130.0, 22.0 ],
                    "text": "prepend voiceleading"
                }
            },
            {
                "box": {
                    "id": "obj-triad-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 760.0, 662.0, 237.0, 20.0 ],
                    "text": "triads only — maj/min (default ON in Node)"
                }
            },
            {
                "box": {
                    "id": "obj-triad",
                    "maxclass": "toggle",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "int" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 760.0, 682.0, 24.0, 24.0 ]
                }
            },
            {
                "box": {
                    "id": "obj-prepend-triad",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 790.0, 684.0, 120.0, 22.0 ],
                    "text": "prepend triadsonly"
                }
            },
            {
                "box": {
                    "id": "obj-test-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 30.0, 300.0, 400.0, 20.0 ],
                    "text": "TEST PARSER — parse+voice+play directly (bypasses Markov / Python)"
                }
            },
            {
                "box": {
                    "id": "obj-test-input",
                    "maxclass": "textedit",
                    "numinlets": 1,
                    "numoutlets": 4,
                    "outlettype": [ "", "int", "", "" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 30.0, 325.0, 120.0, 22.0 ],
                    "text": "Cmaj7"
                }
            },
            {
                "box": {
                    "id": "obj-test-btn",
                    "maxclass": "textbutton",
                    "numinlets": 1,
                    "numoutlets": 3,
                    "outlettype": [ "", "", "int" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 170.0, 325.0, 50.0, 22.0 ],
                    "text": "test"
                }
            },
            {
                "box": {
                    "id": "obj-prepend-testparse",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 30.0, 360.0, 150.0, 22.0 ],
                    "text": "prepend testparse"
                }
            },
            {
                "box": {
                    "id": "obj-test-cmaj7",
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 30.0, 395.0, 130.0, 22.0 ],
                    "text": "testparse Cmaj7"
                }
            },
            {
                "box": {
                    "id": "obj-test-dm7",
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 170.0, 395.0, 120.0, 22.0 ],
                    "text": "testparse Dm7"
                }
            },
            {
                "box": {
                    "id": "obj-test-nc",
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 300.0, 395.0, 120.0, 22.0 ],
                    "text": "testparse N.C."
                }
            },
            {
                "box": {
                    "id": "obj-panic-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 30.0, 428.0, 200.0, 20.0 ],
                    "text": "panic (all notes off)"
                }
            },
            {
                "box": {
                    "id": "obj-panic",
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 30.0, 450.0, 60.0, 22.0 ],
                    "text": "panic"
                }
            }
        ],
        "lines": [
            {
                "patchline": {
                    "destination": [ "obj-vel", 0 ],
                    "source": [ "obj-7", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-msg-npm", 0 ],
                    "source": [ "obj-btn-npm", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-msg-ping", 0 ],
                    "source": [ "obj-btn-ping", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-msg-reload", 0 ],
                    "source": [ "obj-btn-reload", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-input", 0 ],
                    "source": [ "obj-btn-send", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-makenote", 2 ],
                    "source": [ "obj-dur", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-print-error", 0 ],
                    "source": [ "obj-error", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-pack", 1 ],
                    "source": [ "obj-flush", 1 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-pack", 0 ],
                    "source": [ "obj-flush", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-msg-start", 0 ],
                    "source": [ "obj-init-delay", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-prepend-send", 0 ],
                    "source": [ "obj-input", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-makenote", 0 ],
                    "source": [ "obj-iter", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-dur", 0 ],
                    "source": [ "obj-load-dur", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-reg", 0 ],
                    "source": [ "obj-load-reg", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-vel", 0 ],
                    "source": [ "obj-load-vel", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-init-delay", 0 ],
                    "order": 1,
                    "source": [ "obj-loadbang", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-status-wait", 0 ],
                    "order": 0,
                    "source": [ "obj-loadbang", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-flush", 1 ],
                    "source": [ "obj-makenote", 1 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-flush", 0 ],
                    "source": [ "obj-makenote", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-midiout", 0 ],
                    "source": [ "obj-midiformat", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-node", 0 ],
                    "source": [ "obj-msg-init", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-node", 0 ],
                    "source": [ "obj-msg-npm", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-node", 0 ],
                    "source": [ "obj-msg-ping", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-node", 0 ],
                    "source": [ "obj-msg-reload", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-node", 0 ],
                    "order": 0,
                    "source": [ "obj-msg-start", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-ping-delay", 0 ],
                    "order": 1,
                    "source": [ "obj-msg-start", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-route", 0 ],
                    "source": [ "obj-node", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-flush", 0 ],
                    "source": [ "obj-notes-trig", 1 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-iter", 0 ],
                    "source": [ "obj-notes-trig", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-print-output", 0 ],
                    "source": [ "obj-output", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-midiformat", 0 ],
                    "source": [ "obj-pack", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-node", 0 ],
                    "source": [ "obj-panic", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-msg-init", 0 ],
                    "source": [ "obj-ping-delay", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-chord-disp", 0 ],
                    "source": [ "obj-prepend-chord", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-notes-disp", 0 ],
                    "source": [ "obj-prepend-notes", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-node", 0 ],
                    "source": [ "obj-prepend-register", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-node", 0 ],
                    "source": [ "obj-prepend-send", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-node", 0 ],
                    "source": [ "obj-prepend-testparse", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-node", 0 ],
                    "source": [ "obj-prepend-triad", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-node", 0 ],
                    "source": [ "obj-prepend-vl", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-prepend-register", 0 ],
                    "source": [ "obj-reg", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-error", 0 ],
                    "source": [ "obj-route", 2 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-flush", 0 ],
                    "source": [ "obj-route", 5 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-notes-trig", 0 ],
                    "order": 0,
                    "source": [ "obj-route", 4 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-outlet", 0 ],
                    "order": 0,
                    "source": [ "obj-route", 1 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-output", 0 ],
                    "order": 1,
                    "source": [ "obj-route", 1 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-prepend-chord", 0 ],
                    "source": [ "obj-route", 3 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-prepend-notes", 0 ],
                    "order": 1,
                    "source": [ "obj-route", 4 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-status", 0 ],
                    "source": [ "obj-route", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-print-status", 0 ],
                    "source": [ "obj-status", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-status", 0 ],
                    "source": [ "obj-status-wait", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-test-input", 0 ],
                    "source": [ "obj-test-btn", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-node", 0 ],
                    "source": [ "obj-test-cmaj7", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-node", 0 ],
                    "source": [ "obj-test-dm7", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-prepend-testparse", 0 ],
                    "source": [ "obj-test-input", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-node", 0 ],
                    "source": [ "obj-test-nc", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-prepend-triad", 0 ],
                    "source": [ "obj-triad", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-makenote", 1 ],
                    "source": [ "obj-vel", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-prepend-vl", 0 ],
                    "source": [ "obj-vl", 0 ]
                }
            }
        ],
        "parameters": {
            "obj-7": [ "live.dial", "live.dial", 0 ],
            "parameterbanks": {
                "0": {
                    "index": 0,
                    "name": "",
                    "parameters": [ "-", "-", "-", "-", "-", "-", "-", "-" ],
                    "buttons": [ "-", "-", "-", "-", "-", "-", "-", "-" ]
                }
            },
            "inherited_shortname": 1
        },
        "autosave": 0
    }
}