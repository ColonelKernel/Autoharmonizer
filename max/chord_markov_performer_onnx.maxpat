{
 "patcher": {
  "fileversion": 1,
  "appversion": {
   "major": 8,
   "minor": 5,
   "revision": 0,
   "architecture": "x64",
   "modernui": 1
  },
  "classnamespace": "box",
  "rect": [
   80.0,
   80.0,
   644.0,
   249.0
  ],
  "bglocked": 0,
  "openinpresentation": 1,
  "default_fontsize": 12,
  "default_fontface": 0,
  "default_fontname": "Arial",
  "gridonopen": 1,
  "gridsize": [
   15,
   15
  ],
  "gridsnaponopen": 1,
  "objectsnaponopen": 1,
  "statusbarvisible": 2,
  "toolbarvisible": 1,
  "lefttoolbarpinned": 0,
  "toptoolbarpinned": 0,
  "righttoolbarpinned": 0,
  "bottomtoolbarpinned": 0,
  "toolbars_unpinned_last_save": 0,
  "tallnewobj": 0,
  "boxanimatetime": 200,
  "enablehscroll": 1,
  "enablevscroll": 1,
  "devicewidth": 0,
  "description": "",
  "digest": "",
  "tags": "",
  "style": "",
  "subpatcher_template": "",
  "assistshowspatchername": 0,
  "boxes": [
   {
    "box": {
     "id": "obj-spice-tab-model",
     "maxclass": "live.tab",
     "numinlets": 1,
     "numoutlets": 3,
     "outlettype": [
      "",
      "",
      "float"
     ],
     "parameter_enable": 1,
     "num_lines_patching": 1,
     "num_lines_presentation": 4,
     "patching_rect": [
      1180,
      650,
      100,
      20
     ],
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "Model",
       "parameter_shortname": "Model",
       "parameter_type": 2,
       "parameter_enum": [
        "markov",
        "rnn",
        "lstm",
        "phrase"
       ],
       "parameter_mmax": 3,
       "parameter_initial_enable": 1,
       "parameter_initial": [
        3
       ]
      }
     },
     "varname": "Model",
     "presentation": 1,
     "presentation_rect": [
      72,
      8,
      88,
      62
     ],
     "annotation": "Generative engine. markov = corpus-blend chain; rnn/lstm = JazzNet neural nets with session memory; phrase = whole-phrase generator: it composes the entire N-bar progression at once, with its own learned harmonic rhythm and a cadence, instead of picking one chord at a time.",
     "annotation_name": "Model"
    }
   },
   {
    "box": {
     "id": "obj-spice-tab-bars",
     "maxclass": "live.tab",
     "numinlets": 1,
     "numoutlets": 3,
     "outlettype": [
      "",
      "",
      "float"
     ],
     "parameter_enable": 1,
     "num_lines_patching": 1,
     "num_lines_presentation": 1,
     "patching_rect": [
      1180,
      700,
      100,
      20
     ],
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "Bars",
       "parameter_shortname": "Bars",
       "parameter_type": 2,
       "parameter_enum": [
        "2",
        "4",
        "8",
        "16"
       ],
       "parameter_mmax": 3,
       "parameter_initial_enable": 1,
       "parameter_initial": [
        2
       ]
      }
     },
     "varname": "Bars",
     "presentation": 1,
     "presentation_rect": [
      168,
      8,
      126,
      20
     ],
     "annotation": "Phrase length in bars \u2014 how much the model improvises before the loop repeats. 2/4 audition in seconds for jamming; 8/16 cover song sections.",
     "annotation_name": "Bars"
    }
   },
   {
    "box": {
     "id": "obj-spice-tab-mode",
     "maxclass": "live.tab",
     "numinlets": 1,
     "numoutlets": 3,
     "outlettype": [
      "",
      "",
      "float"
     ],
     "parameter_enable": 1,
     "num_lines_patching": 1,
     "num_lines_presentation": 1,
     "patching_rect": [
      1180,
      730,
      100,
      20
     ],
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "Mode",
       "parameter_shortname": "Mode",
       "parameter_type": 2,
       "parameter_enum": [
        "loop",
        "regen",
        "oneshot"
       ],
       "parameter_mmax": 2,
       "parameter_initial_enable": 1,
       "parameter_initial": [
        0
       ]
      }
     },
     "varname": "Mode",
     "presentation": 1,
     "presentation_rect": [
      168,
      34,
      126,
      20
     ],
     "annotation": "loop = capture once and repeat it; regen = a fresh phrase every cycle; oneshot = play once and stop.",
     "annotation_name": "Mode"
    }
   },
   {
    "box": {
     "id": "obj-spice-dial-seed",
     "maxclass": "live.dial",
     "numinlets": 1,
     "numoutlets": 2,
     "outlettype": [
      "",
      "float"
     ],
     "parameter_enable": 1,
     "patching_rect": [
      1180,
      760,
      44,
      48
     ],
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "Seed",
       "parameter_shortname": "Seed",
       "parameter_type": 0,
       "parameter_mmin": 0,
       "parameter_mmax": 1,
       "parameter_unitstyle": 1,
       "parameter_modmode": 3,
       "parameter_initial_enable": 1,
       "parameter_initial": [
        0.0
       ]
      }
     },
     "varname": "Seed",
     "presentation": 1,
     "presentation_rect": [
      302,
      8,
      46,
      48
     ],
     "annotation": "Starting chord for the walk, picked from a 16-chord list.",
     "annotation_name": "Seed"
    }
   },
   {
    "box": {
     "id": "obj-spice-dial-key",
     "maxclass": "live.dial",
     "numinlets": 1,
     "numoutlets": 2,
     "outlettype": [
      "",
      "float"
     ],
     "parameter_enable": 1,
     "patching_rect": [
      1180,
      790,
      44,
      48
     ],
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "Key",
       "parameter_shortname": "Key",
       "parameter_type": 0,
       "parameter_mmin": 0,
       "parameter_mmax": 1,
       "parameter_unitstyle": 1,
       "parameter_modmode": 3,
       "parameter_initial_enable": 1,
       "parameter_initial": [
        0.0
       ]
      }
     },
     "varname": "Key",
     "presentation": 1,
     "presentation_rect": [
      356,
      8,
      46,
      48
     ],
     "annotation": "Song key root; the corpus blend transposes to and from it. 'min' toggles minor.",
     "annotation_name": "Key"
    }
   },
   {
    "box": {
     "id": "obj-spice-dial-spice",
     "maxclass": "live.dial",
     "numinlets": 1,
     "numoutlets": 2,
     "outlettype": [
      "",
      "float"
     ],
     "parameter_enable": 1,
     "patching_rect": [
      1180,
      850,
      44,
      48
     ],
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "Spice",
       "parameter_shortname": "Spice",
       "parameter_type": 0,
       "parameter_mmin": 0,
       "parameter_mmax": 1,
       "parameter_unitstyle": 1,
       "parameter_modmode": 3,
       "parameter_initial_enable": 1,
       "parameter_initial": [
        0.0
       ]
      }
     },
     "varname": "Spice",
     "presentation": 1,
     "presentation_rect": [
      410,
      8,
      46,
      48
     ],
     "annotation": "Macro: morphs corpus colour (folk-pop-classical-jazz) and sampling adventurousness together; also drives rnn/lstm temperature.",
     "annotation_name": "Spice"
    }
   },
   {
    "box": {
     "id": "obj-seq-dial-rhythm",
     "maxclass": "live.dial",
     "numinlets": 1,
     "numoutlets": 2,
     "outlettype": [
      "",
      "float"
     ],
     "parameter_enable": 1,
     "patching_rect": [
      980,
      250,
      44,
      48
     ],
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "Rhythm",
       "parameter_shortname": "Rhythm",
       "parameter_type": 0,
       "parameter_mmin": 0,
       "parameter_mmax": 1,
       "parameter_unitstyle": 1,
       "parameter_modmode": 3,
       "parameter_initial_enable": 1,
       "parameter_initial": [
        0.3333
       ]
      }
     },
     "varname": "Rhythm",
     "presentation": 1,
     "presentation_rect": [
      464,
      8,
      46,
      48
     ],
     "annotation_name": "Rhythm",
     "annotation": "Harmonic-rhythm density: sparse (one chord per two bars) to dense (a chord every beat). Changes land on the next bar."
    }
   },
   {
    "box": {
     "id": "obj-spice-dial-voicing",
     "maxclass": "live.dial",
     "numinlets": 1,
     "numoutlets": 2,
     "outlettype": [
      "",
      "float"
     ],
     "parameter_enable": 1,
     "patching_rect": [
      1180,
      880,
      44,
      48
     ],
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "Voicing",
       "parameter_shortname": "Voicing",
       "parameter_type": 0,
       "parameter_mmin": 0,
       "parameter_mmax": 1,
       "parameter_unitstyle": 1,
       "parameter_modmode": 3,
       "parameter_initial_enable": 1,
       "parameter_initial": [
        0.0
       ]
      }
     },
     "varname": "Voicing",
     "presentation": 1,
     "presentation_rect": [
      518,
      8,
      46,
      48
     ],
     "annotation": "Voicing ladder: root triads, voice-led inversions, 7ths, open/drop-2 extensions.",
     "annotation_name": "Voicing"
    }
   },
   {
    "box": {
     "id": "obj-title",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      30,
      20,
      620,
      20
     ],
     "text": "Chord Markov Performer (ONNX) \u2014 Python-free: the RNN/LSTM run in-process through ONNX, the Markov blend and phrase generator in JS."
    }
   },
   {
    "box": {
     "id": "obj-hint",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      30,
      42,
      620,
      20
     ],
     "text": "Seed + Send, press PLAY. RHYTHM dial sweeps sparse->dense harmonic rhythm; colour dials encourage major/minor/7th; 'sync' links the clock to Live's transport. Start Python for the chain to advance."
    }
   },
   {
    "box": {
     "id": "obj-input-label",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      30,
      80,
      120,
      20
     ],
     "text": "chord input (Enter or send)"
    }
   },
   {
    "box": {
     "id": "obj-input",
     "maxclass": "textedit",
     "numinlets": 1,
     "numoutlets": 1,
     "outlettype": [
      "text"
     ],
     "parameter_enable": 0,
     "patching_rect": [
      30,
      105,
      120,
      22
     ],
     "text": "G:7",
     "presentation": 0,
     "presentation_rect": [
      56,
      42,
      120,
      21
     ]
    }
   },
   {
    "box": {
     "id": "obj-btn-send",
     "maxclass": "textbutton",
     "numinlets": 1,
     "numoutlets": 3,
     "outlettype": [
      "",
      "",
      ""
     ],
     "parameter_enable": 0,
     "patching_rect": [
      170,
      105,
      60,
      22
     ],
     "text": "send",
     "presentation": 0,
     "presentation_rect": [
      182,
      42,
      48,
      21
     ]
    }
   },
   {
    "box": {
     "id": "obj-btn-ping",
     "maxclass": "textbutton",
     "numinlets": 1,
     "numoutlets": 3,
     "outlettype": [
      "",
      "",
      ""
     ],
     "parameter_enable": 0,
     "patching_rect": [
      250,
      105,
      60,
      22
     ],
     "text": "ping"
    }
   },
   {
    "box": {
     "id": "obj-btn-reload",
     "maxclass": "textbutton",
     "numinlets": 1,
     "numoutlets": 3,
     "outlettype": [
      "",
      "",
      ""
     ],
     "parameter_enable": 0,
     "patching_rect": [
      330,
      105,
      60,
      22
     ],
     "text": "reload"
    }
   },
   {
    "box": {
     "id": "obj-btn-npm",
     "maxclass": "textbutton",
     "numinlets": 1,
     "numoutlets": 3,
     "outlettype": [
      "",
      "",
      ""
     ],
     "parameter_enable": 0,
     "patching_rect": [
      410,
      105,
      90,
      22
     ],
     "text": "npm install"
    }
   },
   {
    "box": {
     "id": "obj-loadbang",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      250,
      55,
      60,
      22
     ],
     "text": "loadbang",
     "outlettype": [
      "bang"
     ]
    }
   },
   {
    "box": {
     "id": "obj-init-delay",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      250,
      80,
      55,
      22
     ],
     "text": "delay 300",
     "outlettype": [
      "bang"
     ]
    }
   },
   {
    "box": {
     "id": "obj-msg-start",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      150,
      140,
      70,
      22
     ],
     "text": "script start"
    }
   },
   {
    "box": {
     "id": "obj-ping-delay",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      200,
      170,
      55,
      22
     ],
     "text": "delay 200",
     "outlettype": [
      "bang"
     ]
    }
   },
   {
    "box": {
     "id": "obj-msg-init",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      150,
      170,
      40,
      22
     ],
     "text": "init"
    }
   },
   {
    "box": {
     "id": "obj-msg-ping",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      250,
      140,
      35,
      22
     ],
     "text": "ping"
    }
   },
   {
    "box": {
     "id": "obj-msg-reload",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      330,
      140,
      45,
      22
     ],
     "text": "reload"
    }
   },
   {
    "box": {
     "id": "obj-msg-npm",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      410,
      140,
      110,
      22
     ],
     "text": "script npm install"
    }
   },
   {
    "box": {
     "id": "obj-prepend-send",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      30,
      170,
      90,
      22
     ],
     "text": "prepend send",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-node",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      250,
      205,
      190,
      22
     ],
     "text": "node.script onnx_markov_osc.js",
     "outlettype": [
      ""
     ],
     "filename": "onnx_markov_osc.js"
    }
   },
   {
    "box": {
     "id": "obj-route",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 21,
     "patching_rect": [
      250,
      245,
      330,
      22
     ],
     "text": "route status output error chord notes stop playoff rhythmname phraselenbars phrasemodename voicedistname keyname seedname modelname sessionmodename capstate sessionstat modelstat backendstate backendtext",
     "outlettype": [
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-status-label",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      250,
      285,
      80,
      20
     ],
     "text": "status"
    }
   },
   {
    "box": {
     "id": "obj-status",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      250,
      308,
      140,
      22
     ],
     "text": "set $1",
     "presentation": 1,
     "presentation_rect": [
      72,
      116,
      88,
      16
     ]
    }
   },
   {
    "box": {
     "id": "obj-print-status",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      400,
      308,
      70,
      22
     ],
     "text": "print status"
    }
   },
   {
    "box": {
     "id": "obj-output-label",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      250,
      340,
      80,
      20
     ],
     "text": "output"
    }
   },
   {
    "box": {
     "id": "obj-output",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      250,
      363,
      150,
      22
     ],
     "text": "set $1"
    }
   },
   {
    "box": {
     "id": "obj-print-output",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      410,
      363,
      70,
      22
     ],
     "text": "print output"
    }
   },
   {
    "box": {
     "id": "obj-outlet",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      250,
      393,
      60,
      22
     ],
     "text": "out s"
    }
   },
   {
    "box": {
     "id": "obj-error-label",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      250,
      423,
      80,
      20
     ],
     "text": "error"
    }
   },
   {
    "box": {
     "id": "obj-error",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      250,
      446,
      240,
      22
     ],
     "text": "set $1"
    }
   },
   {
    "box": {
     "id": "obj-print-error",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      250,
      476,
      60,
      22
     ],
     "text": "print error"
    }
   },
   {
    "box": {
     "id": "obj-status-wait",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      520,
      285,
      60,
      22
     ],
     "text": "waiting"
    }
   },
   {
    "box": {
     "id": "obj-chord-label",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      600,
      285,
      120,
      20
     ],
     "text": "predicted chord:"
    }
   },
   {
    "box": {
     "id": "obj-prepend-chord",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      600,
      308,
      80,
      22
     ],
     "text": "prepend set",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-chord-disp",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      690,
      308,
      200,
      22
     ],
     "text": "",
     "presentation": 1,
     "presentation_rect": [
      6,
      142,
      572,
      24
     ],
     "fontsize": 14
    }
   },
   {
    "box": {
     "id": "obj-notes-label",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      600,
      340,
      120,
      20
     ],
     "text": "MIDI notes:"
    }
   },
   {
    "box": {
     "id": "obj-prepend-notes",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      600,
      363,
      80,
      22
     ],
     "text": "prepend set",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-notes-disp",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      690,
      363,
      200,
      22
     ],
     "text": "",
     "presentation": 0,
     "presentation_rect": [
      60,
      208,
      220,
      22
     ]
    }
   },
   {
    "box": {
     "id": "obj-midi-label",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      600,
      400,
      380,
      20
     ],
     "text": "MIDI: notes \u2192 flush-old \u2192 iter \u2192 makenote \u2192 flush \u2192 pack \u2192 midiformat \u2192 midiout"
    }
   },
   {
    "box": {
     "id": "obj-notes-trig",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 2,
     "patching_rect": [
      600,
      425,
      60,
      22
     ],
     "text": "t l b",
     "outlettype": [
      "",
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-iter",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      600,
      458,
      50,
      22
     ],
     "text": "iter",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-makenote",
     "maxclass": "newobj",
     "numinlets": 3,
     "numoutlets": 2,
     "patching_rect": [
      600,
      491,
      120,
      22
     ],
     "text": "makenote 90 1000",
     "outlettype": [
      "",
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-flush",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 2,
     "patching_rect": [
      600,
      524,
      50,
      22
     ],
     "text": "flush",
     "outlettype": [
      "",
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-pack",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      600,
      557,
      70,
      22
     ],
     "text": "pack 0 0",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-midiformat",
     "maxclass": "newobj",
     "numinlets": 8,
     "numoutlets": 1,
     "patching_rect": [
      600,
      590,
      80,
      22
     ],
     "text": "midiformat",
     "outlettype": [
      "int"
     ]
    }
   },
   {
    "box": {
     "id": "obj-midiout",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      600,
      623,
      60,
      22
     ],
     "text": "midiout"
    }
   },
   {
    "box": {
     "id": "obj-vel-label",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      760,
      458,
      90,
      20
     ],
     "text": "velocity"
    }
   },
   {
    "box": {
     "id": "obj-vel",
     "maxclass": "number",
     "numinlets": 1,
     "numoutlets": 2,
     "outlettype": [
      "int",
      "bang"
     ],
     "parameter_enable": 0,
     "patching_rect": [
      760,
      478,
      50,
      22
     ]
    }
   },
   {
    "box": {
     "id": "obj-load-vel",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      820,
      478,
      90,
      22
     ],
     "text": "loadmess 90",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-dur-label",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      760,
      508,
      90,
      20
     ],
     "text": "duration ms"
    }
   },
   {
    "box": {
     "id": "obj-dur",
     "maxclass": "number",
     "numinlets": 1,
     "numoutlets": 2,
     "outlettype": [
      "int",
      "bang"
     ],
     "parameter_enable": 0,
     "patching_rect": [
      760,
      528,
      50,
      22
     ]
    }
   },
   {
    "box": {
     "id": "obj-load-dur",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      820,
      528,
      90,
      22
     ],
     "text": "loadmess 1000",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-reg-label",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      760,
      560,
      120,
      20
     ],
     "text": "register center"
    }
   },
   {
    "box": {
     "id": "obj-reg",
     "maxclass": "number",
     "numinlets": 1,
     "numoutlets": 2,
     "outlettype": [
      "int",
      "bang"
     ],
     "parameter_enable": 0,
     "patching_rect": [
      760,
      580,
      50,
      22
     ]
    }
   },
   {
    "box": {
     "id": "obj-load-reg",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      900,
      580,
      90,
      22
     ],
     "text": "loadmess 60",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-prepend-register",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      820,
      580,
      70,
      22
     ],
     "text": "prepend register",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-vl-label",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      760,
      612,
      200,
      20
     ],
     "text": "voice leading (default ON in Node)"
    }
   },
   {
    "box": {
     "id": "obj-vl",
     "maxclass": "toggle",
     "numinlets": 1,
     "numoutlets": 1,
     "outlettype": [
      "int"
     ],
     "parameter_enable": 0,
     "patching_rect": [
      760,
      632,
      24,
      24
     ]
    }
   },
   {
    "box": {
     "id": "obj-prepend-vl",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      790,
      634,
      130,
      22
     ],
     "text": "prepend voiceleading",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-triad-label",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      760,
      662,
      230,
      20
     ],
     "text": "triads only \u2014 maj/min (default ON in Node)"
    }
   },
   {
    "box": {
     "id": "obj-triad",
     "maxclass": "toggle",
     "numinlets": 1,
     "numoutlets": 1,
     "outlettype": [
      "int"
     ],
     "parameter_enable": 0,
     "patching_rect": [
      760,
      682,
      24,
      24
     ]
    }
   },
   {
    "box": {
     "id": "obj-prepend-triad",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      790,
      684,
      120,
      22
     ],
     "text": "prepend triadsonly",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-test-label",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      30,
      300,
      400,
      20
     ],
     "text": "TEST PARSER \u2014 parse+voice+play directly (bypasses Markov / Python)"
    }
   },
   {
    "box": {
     "id": "obj-test-input",
     "maxclass": "textedit",
     "numinlets": 1,
     "numoutlets": 1,
     "outlettype": [
      "text"
     ],
     "parameter_enable": 0,
     "patching_rect": [
      30,
      325,
      120,
      22
     ],
     "text": "Cmaj7"
    }
   },
   {
    "box": {
     "id": "obj-test-btn",
     "maxclass": "textbutton",
     "numinlets": 1,
     "numoutlets": 3,
     "outlettype": [
      "",
      "",
      ""
     ],
     "parameter_enable": 0,
     "patching_rect": [
      170,
      325,
      50,
      22
     ],
     "text": "test"
    }
   },
   {
    "box": {
     "id": "obj-prepend-testparse",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      30,
      360,
      150,
      22
     ],
     "text": "prepend testparse",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-test-cmaj7",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      30,
      395,
      130,
      22
     ],
     "text": "testparse Cmaj7"
    }
   },
   {
    "box": {
     "id": "obj-test-dm7",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      170,
      395,
      120,
      22
     ],
     "text": "testparse Dm7"
    }
   },
   {
    "box": {
     "id": "obj-test-nc",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      300,
      395,
      120,
      22
     ],
     "text": "testparse N.C."
    }
   },
   {
    "box": {
     "id": "obj-panic-label",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      30,
      428,
      200,
      20
     ],
     "text": "panic (all notes off)"
    }
   },
   {
    "box": {
     "id": "obj-panic",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      30,
      450,
      60,
      22
     ],
     "text": "panic"
    }
   },
   {
    "box": {
     "id": "obj-seq-play",
     "maxclass": "toggle",
     "numinlets": 1,
     "numoutlets": 1,
     "outlettype": [
      "int"
     ],
     "parameter_enable": 0,
     "patching_rect": [
      980,
      70,
      26,
      26
     ],
     "presentation": 0,
     "presentation_rect": [
      56,
      76,
      26,
      26
     ]
    }
   },
   {
    "box": {
     "id": "obj-seq-prepend-play",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1020,
      70,
      90,
      22
     ],
     "text": "prepend play",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-seq-metro",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      980,
      110,
      70,
      22
     ],
     "text": "metro 500",
     "outlettype": [
      "bang"
     ]
    }
   },
   {
    "box": {
     "id": "obj-seq-metro-sync",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      1060,
      110,
      70,
      22
     ],
     "text": "metro 4n",
     "outlettype": [
      "bang"
     ]
    }
   },
   {
    "box": {
     "id": "obj-seq-switch",
     "maxclass": "newobj",
     "numinlets": 3,
     "numoutlets": 1,
     "patching_rect": [
      980,
      150,
      70,
      22
     ],
     "text": "switch 2",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-seq-prepend-beat",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      980,
      185,
      90,
      22
     ],
     "text": "prepend beat",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-seq-bpm",
     "maxclass": "number",
     "numinlets": 1,
     "numoutlets": 2,
     "outlettype": [
      "int",
      "bang"
     ],
     "parameter_enable": 0,
     "patching_rect": [
      1150,
      110,
      50,
      22
     ],
     "presentation": 0,
     "presentation_rect": [
      110,
      86,
      46,
      22
     ]
    }
   },
   {
    "box": {
     "id": "obj-seq-msper",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      1150,
      145,
      80,
      22
     ],
     "text": "!/ 60000.",
     "outlettype": [
      "float"
     ]
    }
   },
   {
    "box": {
     "id": "obj-seq-load-bpm",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      110,
      90,
      22
     ],
     "text": "loadmess 120",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-seq-sync",
     "maxclass": "toggle",
     "numinlets": 1,
     "numoutlets": 1,
     "outlettype": [
      "int"
     ],
     "parameter_enable": 0,
     "patching_rect": [
      1150,
      185,
      24,
      24
     ],
     "presentation": 0,
     "presentation_rect": [
      230,
      86,
      22,
      22
     ]
    }
   },
   {
    "box": {
     "id": "obj-seq-sync-plus1",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      1150,
      220,
      40,
      22
     ],
     "text": "+ 1",
     "outlettype": [
      "int"
     ]
    }
   },
   {
    "box": {
     "id": "obj-seq-load-sync",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1200,
      185,
      90,
      22
     ],
     "text": "loadmess 0",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-seq-prepend-rhythm",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1040,
      250,
      110,
      22
     ],
     "text": "prepend rhythm",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-seq-prepend-rname",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1040,
      285,
      90,
      22
     ],
     "text": "prepend set",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-seq-rname-disp",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      1040,
      320,
      140,
      22
     ],
     "text": "",
     "presentation": 0,
     "presentation_rect": [
      92,
      134,
      118,
      20
     ]
    }
   },
   {
    "box": {
     "id": "obj-seq-len",
     "maxclass": "number",
     "numinlets": 1,
     "numoutlets": 2,
     "outlettype": [
      "int",
      "bang"
     ],
     "parameter_enable": 0,
     "patching_rect": [
      980,
      360,
      50,
      22
     ],
     "presentation": 0,
     "presentation_rect": [
      170,
      86,
      46,
      22
     ]
    }
   },
   {
    "box": {
     "id": "obj-seq-prepend-len",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1040,
      360,
      100,
      22
     ],
     "text": "prepend length",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-seq-load-len",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1150,
      360,
      90,
      22
     ],
     "text": "loadmess 4",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-seq-dial-maj",
     "maxclass": "live.dial",
     "numinlets": 1,
     "numoutlets": 2,
     "outlettype": [
      "",
      "float"
     ],
     "parameter_enable": 1,
     "patching_rect": [
      980,
      410,
      44,
      48
     ],
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "Major",
       "parameter_shortname": "Major",
       "parameter_type": 0,
       "parameter_mmin": 0,
       "parameter_mmax": 1,
       "parameter_unitstyle": 1,
       "parameter_modmode": 3
      }
     },
     "varname": "Major",
     "presentation": 0,
     "presentation_rect": [
      220,
      118,
      46,
      50
     ]
    }
   },
   {
    "box": {
     "id": "obj-seq-dial-min",
     "maxclass": "live.dial",
     "numinlets": 1,
     "numoutlets": 2,
     "outlettype": [
      "",
      "float"
     ],
     "parameter_enable": 1,
     "patching_rect": [
      1030,
      410,
      44,
      48
     ],
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "Minor",
       "parameter_shortname": "Minor",
       "parameter_type": 0,
       "parameter_mmin": 0,
       "parameter_mmax": 1,
       "parameter_unitstyle": 1,
       "parameter_modmode": 3
      }
     },
     "varname": "Minor",
     "presentation": 0,
     "presentation_rect": [
      272,
      118,
      46,
      50
     ]
    }
   },
   {
    "box": {
     "id": "obj-seq-dial-7th",
     "maxclass": "live.dial",
     "numinlets": 1,
     "numoutlets": 2,
     "outlettype": [
      "",
      "float"
     ],
     "parameter_enable": 1,
     "patching_rect": [
      1080,
      410,
      44,
      48
     ],
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "Seventh",
       "parameter_shortname": "7th",
       "parameter_type": 0,
       "parameter_mmin": 0,
       "parameter_mmax": 1,
       "parameter_unitstyle": 1,
       "parameter_modmode": 3
      }
     },
     "varname": "Seventh",
     "presentation": 0,
     "presentation_rect": [
      324,
      118,
      46,
      50
     ]
    }
   },
   {
    "box": {
     "id": "obj-seq-prepend-colmaj",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      980,
      470,
      140,
      22
     ],
     "text": "prepend colormajor",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-seq-prepend-colmin",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      980,
      500,
      140,
      22
     ],
     "text": "prepend colorminor",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-seq-prepend-col7th",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      980,
      530,
      140,
      22
     ],
     "text": "prepend color7th",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-seq-playoff-metro",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      1240,
      70,
      30,
      22
     ],
     "text": "0"
    }
   },
   {
    "box": {
     "id": "obj-seq-playoff-toggle",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      1280,
      70,
      50,
      22
     ],
     "text": "set 0"
    }
   },
   {
    "box": {
     "id": "obj-pres-title",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      14,
      8,
      380,
      20
     ],
     "text": "MARKOV CHORD SEQUENCER",
     "presentation": 0,
     "presentation_rect": [
      14,
      8,
      360,
      20
     ]
    }
   },
   {
    "box": {
     "id": "obj-pres-seedlabel",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      14,
      44,
      40,
      18
     ],
     "text": "seed",
     "presentation": 0,
     "presentation_rect": [
      14,
      44,
      40,
      18
     ]
    }
   },
   {
    "box": {
     "id": "obj-pres-playlabel",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      14,
      80,
      40,
      18
     ],
     "text": "play",
     "presentation": 0,
     "presentation_rect": [
      14,
      80,
      40,
      18
     ]
    }
   },
   {
    "box": {
     "id": "obj-pres-bpmlabel",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      110,
      68,
      44,
      16
     ],
     "text": "BPM",
     "presentation": 0,
     "presentation_rect": [
      110,
      68,
      44,
      16
     ]
    }
   },
   {
    "box": {
     "id": "obj-pres-barslabel",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      170,
      68,
      44,
      16
     ],
     "text": "bars",
     "presentation": 0,
     "presentation_rect": [
      170,
      68,
      44,
      16
     ]
    }
   },
   {
    "box": {
     "id": "obj-pres-synclabel",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      230,
      68,
      96,
      16
     ],
     "text": "sync transport",
     "presentation": 0,
     "presentation_rect": [
      230,
      68,
      96,
      16
     ]
    }
   },
   {
    "box": {
     "id": "obj-pres-rhythmhdr",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      40,
      104,
      90,
      14
     ],
     "text": "rhythm ->",
     "presentation": 0,
     "presentation_rect": [
      40,
      104,
      90,
      14
     ]
    }
   },
   {
    "box": {
     "id": "obj-pres-colorhdr",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      220,
      104,
      90,
      14
     ],
     "text": "colour",
     "presentation": 0,
     "presentation_rect": [
      220,
      104,
      90,
      14
     ]
    }
   },
   {
    "box": {
     "id": "obj-pres-chordlabel",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      14,
      182,
      44,
      18
     ],
     "text": "chord",
     "presentation": 0,
     "presentation_rect": [
      14,
      182,
      44,
      18
     ]
    }
   },
   {
    "box": {
     "id": "obj-pres-noteslabel",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      14,
      210,
      44,
      18
     ],
     "text": "notes",
     "presentation": 0,
     "presentation_rect": [
      14,
      210,
      44,
      18
     ]
    }
   },
   {
    "box": {
     "id": "obj-pres-statuslabel",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      292,
      182,
      50,
      18
     ],
     "text": "status",
     "presentation": 0,
     "presentation_rect": [
      292,
      182,
      50,
      18
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-play",
     "maxclass": "live.text",
     "numinlets": 1,
     "numoutlets": 2,
     "outlettype": [
      "",
      ""
     ],
     "parameter_enable": 1,
     "text": "Play",
     "texton": "Stop",
     "patching_rect": [
      1180,
      470,
      58,
      20
     ],
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "Play",
       "parameter_shortname": "Play",
       "parameter_type": 2,
       "parameter_enum": [
        "off",
        "on"
       ],
       "parameter_mmax": 1,
       "parameter_unitstyle": 0,
       "parameter_initial_enable": 1,
       "parameter_initial": [
        0
       ]
      }
     },
     "varname": "Play",
     "presentation": 1,
     "presentation_rect": [
      6,
      8,
      58,
      20
     ],
     "annotation": "Start/stop the phrase player (runs without Live's transport unless Sync is on).",
     "annotation_name": "Play"
    }
   },
   {
    "box": {
     "id": "obj-spice-reroll",
     "maxclass": "live.button",
     "numinlets": 1,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "parameter_enable": 1,
     "patching_rect": [
      1180,
      500,
      20,
      20
     ],
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "Reroll",
       "parameter_shortname": "Reroll",
       "parameter_type": 2,
       "parameter_enum": [
        "off",
        "on"
       ],
       "parameter_mmax": 1
      }
     },
     "varname": "Reroll",
     "presentation": 1,
     "presentation_rect": [
      6,
      32,
      58,
      18
     ],
     "annotation": "Discard the captured phrase and walk a fresh one from the seed. Also resets the neural (rnn/lstm) session memory.",
     "annotation_name": "Reroll"
    }
   },
   {
    "box": {
     "id": "obj-spice-pre-reroll",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      530,
      100,
      22
     ],
     "text": "prepend reroll",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-hold",
     "maxclass": "live.text",
     "numinlets": 1,
     "numoutlets": 2,
     "outlettype": [
      "",
      ""
     ],
     "parameter_enable": 1,
     "text": "Hold",
     "texton": "Hold",
     "patching_rect": [
      1180,
      560,
      58,
      20
     ],
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "Hold",
       "parameter_shortname": "Hold",
       "parameter_type": 2,
       "parameter_enum": [
        "off",
        "on"
       ],
       "parameter_mmax": 1,
       "parameter_unitstyle": 0,
       "parameter_initial_enable": 1,
       "parameter_initial": [
        0
       ]
      }
     },
     "varname": "Hold",
     "presentation": 1,
     "presentation_rect": [
      6,
      54,
      58,
      18
     ],
     "annotation": "Vamp: freeze on the current chord without advancing the walk.",
     "annotation_name": "Hold"
    }
   },
   {
    "box": {
     "id": "obj-spice-pre-hold",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      560,
      90,
      22
     ],
     "text": "prepend hold",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-sync",
     "maxclass": "live.text",
     "numinlets": 1,
     "numoutlets": 2,
     "outlettype": [
      "",
      ""
     ],
     "parameter_enable": 1,
     "text": "Free",
     "texton": "Sync",
     "patching_rect": [
      1180,
      590,
      58,
      20
     ],
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "Sync",
       "parameter_shortname": "Sync",
       "parameter_type": 2,
       "parameter_enum": [
        "off",
        "on"
       ],
       "parameter_mmax": 1,
       "parameter_unitstyle": 0,
       "parameter_initial_enable": 1,
       "parameter_initial": [
        0
       ]
      }
     },
     "varname": "Sync",
     "presentation": 1,
     "presentation_rect": [
      6,
      76,
      58,
      18
     ],
     "annotation": "Lock the clock to Live's transport (off = free-running at BPM).",
     "annotation_name": "Sync"
    }
   },
   {
    "box": {
     "id": "obj-spice-triplet",
     "maxclass": "live.text",
     "numinlets": 1,
     "numoutlets": 2,
     "outlettype": [
      "",
      ""
     ],
     "parameter_enable": 1,
     "text": "straight",
     "texton": "triplet",
     "patching_rect": [
      1180,
      640,
      58,
      20
     ],
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "Triplet",
       "parameter_shortname": "Triplet",
       "parameter_type": 2,
       "parameter_enum": [
        "off",
        "on"
       ],
       "parameter_mmax": 1,
       "parameter_unitstyle": 0,
       "parameter_initial_enable": 1,
       "parameter_initial": [
        0
       ]
      }
     },
     "varname": "Triplet",
     "presentation": 1,
     "presentation_rect": [
      6,
      98,
      58,
      18
     ],
     "annotation": "Triplet feel: the phrase clock subdivides in quarter-note triplets (6 slots per bar) instead of straight quarters.",
     "annotation_name": "Triplet"
    }
   },
   {
    "box": {
     "id": "obj-spice-pre-triplet",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      640,
      100,
      22
     ],
     "text": "prepend triplet",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-sel-triplet",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 3,
     "outlettype": [
      "",
      "",
      ""
     ],
     "patching_rect": [
      1180,
      640,
      60,
      22
     ],
     "text": "sel 0 1"
    }
   },
   {
    "box": {
     "id": "obj-spice-t-straight",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 2,
     "outlettype": [
      "",
      ""
     ],
     "patching_rect": [
      1180,
      640,
      40,
      22
     ],
     "text": "t b b"
    }
   },
   {
    "box": {
     "id": "obj-spice-t-trip",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 2,
     "outlettype": [
      "",
      ""
     ],
     "patching_rect": [
      1180,
      640,
      40,
      22
     ],
     "text": "t b b"
    }
   },
   {
    "box": {
     "id": "obj-spice-metro-straight",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      1180,
      640,
      40,
      20
     ],
     "text": "4n",
     "presentation": 0,
     "presentation_rect": [
      0,
      0,
      40,
      20
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-metro-trip",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      1180,
      640,
      40,
      20
     ],
     "text": "4nt",
     "presentation": 0,
     "presentation_rect": [
      0,
      0,
      40,
      20
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-div-straight",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      1180,
      640,
      60,
      20
     ],
     "text": "60000.",
     "presentation": 0,
     "presentation_rect": [
      0,
      0,
      60,
      20
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-div-trip",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      1180,
      640,
      60,
      20
     ],
     "text": "40000.",
     "presentation": 0,
     "presentation_rect": [
      0,
      0,
      60,
      20
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-bpm",
     "maxclass": "live.numbox",
     "numinlets": 1,
     "numoutlets": 2,
     "outlettype": [
      "",
      "float"
     ],
     "parameter_enable": 1,
     "patching_rect": [
      1180,
      620,
      40,
      17
     ],
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "BPM",
       "parameter_shortname": "BPM",
       "parameter_type": 1,
       "parameter_mmin": 40,
       "parameter_mmax": 240,
       "parameter_initial_enable": 1,
       "parameter_initial": [
        120
       ]
      }
     },
     "varname": "BPM",
     "presentation": 1,
     "presentation_rect": [
      6,
      122,
      38,
      17
     ],
     "annotation": "Tempo of the free-running clock when Sync is off.",
     "annotation_name": "BPM"
    }
   },
   {
    "box": {
     "id": "obj-spice-lbl-bpm",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      1180,
      700,
      160,
      16
     ],
     "text": "bpm",
     "presentation": 1,
     "presentation_rect": [
      46,
      124,
      16,
      14
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-pre-modelidx",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      650,
      120,
      22
     ],
     "text": "prepend modelidx",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-disp-sessionstat",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      1180,
      700,
      90,
      20
     ],
     "text": "stateless 0",
     "presentation": 1,
     "presentation_rect": [
      72,
      76,
      88,
      16
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-preset-sessionstat",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      940,
      90,
      22
     ],
     "text": "prepend set",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-disp-capstate",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      1180,
      700,
      90,
      20
     ],
     "text": "idle",
     "presentation": 1,
     "presentation_rect": [
      72,
      96,
      88,
      16
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-preset-capstate",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      970,
      90,
      22
     ],
     "text": "prepend set",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-pre-lenidx",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      700,
      110,
      22
     ],
     "text": "prepend lenidx",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-pre-phrasemode",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      730,
      140,
      22
     ],
     "text": "prepend phrasemode",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-dial-cadence",
     "maxclass": "live.dial",
     "numinlets": 1,
     "numoutlets": 2,
     "outlettype": [
      "",
      "float"
     ],
     "parameter_enable": 1,
     "patching_rect": [
      1180,
      745,
      44,
      48
     ],
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "Cadence",
       "parameter_shortname": "Cadence",
       "parameter_type": 0,
       "parameter_mmin": 0,
       "parameter_mmax": 1,
       "parameter_unitstyle": 1,
       "parameter_modmode": 3,
       "parameter_initial_enable": 1,
       "parameter_initial": [
        1.0
       ]
      }
     },
     "varname": "Cadence",
     "presentation": 1,
     "presentation_rect": [
      168,
      60,
      46,
      48
     ],
     "annotation": "Harmonic gravity: pull toward the home key. Low = free wandering, endings left unresolved; high = the progression stays in key and finishes on an authentic V-I cadence. Defaults high so phrases sound finished.",
     "annotation_name": "Cadence"
    }
   },
   {
    "box": {
     "id": "obj-spice-pre-cadence",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      745,
      110,
      22
     ],
     "text": "prepend cadence",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-pre-seedsel",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      760,
      120,
      22
     ],
     "text": "prepend seedsel",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-disp-seed",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      1180,
      700,
      90,
      20
     ],
     "text": "C:maj",
     "presentation": 1,
     "presentation_rect": [
      298,
      60,
      54,
      14
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-preset-seed",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      1000,
      90,
      22
     ],
     "text": "prepend set",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-pre-keysel",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      790,
      120,
      22
     ],
     "text": "prepend keysel",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-keymin",
     "maxclass": "live.text",
     "numinlets": 1,
     "numoutlets": 2,
     "outlettype": [
      "",
      ""
     ],
     "parameter_enable": 1,
     "text": "maj",
     "texton": "min",
     "patching_rect": [
      1180,
      820,
      58,
      20
     ],
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "KeyMin",
       "parameter_shortname": "KeyMin",
       "parameter_type": 2,
       "parameter_enum": [
        "off",
        "on"
       ],
       "parameter_mmax": 1,
       "parameter_unitstyle": 0,
       "parameter_initial_enable": 1,
       "parameter_initial": [
        0
       ]
      }
     },
     "varname": "KeyMin",
     "presentation": 1,
     "presentation_rect": [
      356,
      78,
      40,
      16
     ],
     "annotation": "Minor key mode (off = major).",
     "annotation_name": "KeyMin"
    }
   },
   {
    "box": {
     "id": "obj-spice-pre-keymin",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      820,
      110,
      22
     ],
     "text": "prepend keymin",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-disp-key",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      1180,
      700,
      90,
      20
     ],
     "text": "C:maj",
     "presentation": 1,
     "presentation_rect": [
      352,
      60,
      54,
      14
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-preset-key",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      1030,
      90,
      22
     ],
     "text": "prepend set",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-pre-spice",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      850,
      110,
      22
     ],
     "text": "prepend spice",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-pre-voicing",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      880,
      110,
      22
     ],
     "text": "prepend voicing",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-key",
     "maxclass": "textedit",
     "numinlets": 1,
     "numoutlets": 1,
     "outlettype": [
      "text"
     ],
     "parameter_enable": 0,
     "patching_rect": [
      1180,
      910,
      120,
      22
     ],
     "text": "C:maj",
     "presentation": 0,
     "presentation_rect": [
      0,
      0,
      80,
      21
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-pre-key",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      910,
      90,
      22
     ],
     "text": "prepend key",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-pylight",
     "maxclass": "panel",
     "mode": 0,
     "shape": 1,
     "numinlets": 1,
     "numoutlets": 0,
     "bgcolor": [
      0.5,
      0.5,
      0.5,
      1.0
     ],
     "patching_rect": [
      1180,
      1050,
      18,
      18
     ],
     "presentation": 1,
     "presentation_rect": [
      408,
      60,
      10,
      10
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-sel-backend",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 4,
     "outlettype": [
      "",
      "",
      "",
      ""
     ],
     "patching_rect": [
      1180,
      1050,
      130,
      22
     ],
     "text": "sel up starting down"
    }
   },
   {
    "box": {
     "id": "obj-spice-bg-up",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      1180,
      1080,
      160,
      20
     ],
     "text": "bgfillcolor 0.13 0.75 0.30 1.",
     "presentation": 0,
     "presentation_rect": [
      0,
      0,
      160,
      20
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-bg-starting",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      1180,
      1080,
      140,
      20
     ],
     "text": "bgfillcolor 1. 0.65 0. 1.",
     "presentation": 0,
     "presentation_rect": [
      0,
      0,
      140,
      20
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-bg-down",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      1180,
      1080,
      160,
      20
     ],
     "text": "bgfillcolor 0.85 0.16 0.16 1.",
     "presentation": 0,
     "presentation_rect": [
      0,
      0,
      160,
      20
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-disp-backend",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      1180,
      700,
      90,
      20
     ],
     "text": "loading models",
     "presentation": 1,
     "presentation_rect": [
      422,
      57,
      118,
      16
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-preset-backend",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      1110,
      90,
      22
     ],
     "text": "prepend set",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-pyrestart",
     "maxclass": "live.button",
     "numinlets": 1,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "parameter_enable": 1,
     "patching_rect": [
      1180,
      1140,
      20,
      20
     ],
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "Reload",
       "parameter_shortname": "Reload",
       "parameter_type": 2,
       "parameter_enum": [
        "off",
        "on"
       ],
       "parameter_mmax": 1
      }
     },
     "varname": "Reload",
     "presentation": 1,
     "presentation_rect": [
      544,
      57,
      16,
      16
     ],
     "annotation": "Rebuild the in-process chord engine (re-reads the models and the corpora). The light shows engine health: green = ready, amber = loading, red = failed. This device needs no Python.",
     "annotation_name": "Reload"
    }
   },
   {
    "box": {
     "id": "obj-spice-pre-pyrestart",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      1140,
      140,
      22
     ],
     "text": "prepend backendrestart",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-lbl-relink",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      1180,
      700,
      160,
      16
     ],
     "text": "reload",
     "presentation": 1,
     "presentation_rect": [
      536,
      76,
      36,
      12
     ],
     "fontsize": 9
    }
   },
   {
    "box": {
     "id": "obj-spice-midiin",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      1180,
      1200,
      60,
      22
     ],
     "text": "midiin"
    }
   },
   {
    "box": {
     "id": "obj-spice-midiparse",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 6,
     "outlettype": [
      "",
      "",
      "",
      "",
      "",
      ""
     ],
     "patching_rect": [
      1180,
      1230,
      90,
      22
     ],
     "text": "midiparse"
    }
   },
   {
    "box": {
     "id": "obj-spice-pre-notein",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      1260,
      110,
      22
     ],
     "text": "prepend notein",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-pre-cc",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      1290,
      90,
      22
     ],
     "text": "prepend cc",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-pre-pgm",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      1320,
      90,
      22
     ],
     "text": "prepend pgm",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-loadbang",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "outlettype": [
      "bang"
     ],
     "patching_rect": [
      1180,
      1350,
      60,
      22
     ],
     "text": "loadbang"
    }
   }
  ],
  "lines": [
   {
    "patchline": {
     "destination": [
      "obj-msg-npm",
      0
     ],
     "source": [
      "obj-btn-npm",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-msg-npm",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-msg-ping",
      0
     ],
     "source": [
      "obj-btn-ping",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-msg-ping",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-msg-reload",
      0
     ],
     "source": [
      "obj-btn-reload",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-msg-reload",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-input",
      0
     ],
     "source": [
      "obj-btn-send",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-prepend-send",
      0
     ],
     "source": [
      "obj-input",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-prepend-send",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-route",
      0
     ],
     "source": [
      "obj-node",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-status",
      0
     ],
     "source": [
      "obj-route",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-print-status",
      0
     ],
     "source": [
      "obj-status",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-output",
      0
     ],
     "source": [
      "obj-route",
      1
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-outlet",
      0
     ],
     "source": [
      "obj-route",
      1
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-print-output",
      0
     ],
     "source": [
      "obj-output",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-error",
      0
     ],
     "source": [
      "obj-route",
      2
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-print-error",
      0
     ],
     "source": [
      "obj-error",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-init-delay",
      0
     ],
     "source": [
      "obj-loadbang",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-msg-start",
      0
     ],
     "source": [
      "obj-init-delay",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-msg-start",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-ping-delay",
      0
     ],
     "source": [
      "obj-msg-start",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-msg-init",
      0
     ],
     "source": [
      "obj-ping-delay",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-msg-init",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-status-wait",
      0
     ],
     "source": [
      "obj-loadbang",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-status",
      0
     ],
     "source": [
      "obj-status-wait",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-prepend-chord",
      0
     ],
     "source": [
      "obj-route",
      3
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-chord-disp",
      0
     ],
     "source": [
      "obj-prepend-chord",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-prepend-notes",
      0
     ],
     "source": [
      "obj-route",
      4
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-notes-disp",
      0
     ],
     "source": [
      "obj-prepend-notes",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-notes-trig",
      0
     ],
     "source": [
      "obj-route",
      4
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-flush",
      0
     ],
     "source": [
      "obj-route",
      5
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-flush",
      0
     ],
     "source": [
      "obj-notes-trig",
      1
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-iter",
      0
     ],
     "source": [
      "obj-notes-trig",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-makenote",
      0
     ],
     "source": [
      "obj-iter",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-flush",
      0
     ],
     "source": [
      "obj-makenote",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-flush",
      1
     ],
     "source": [
      "obj-makenote",
      1
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-pack",
      0
     ],
     "source": [
      "obj-flush",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-pack",
      1
     ],
     "source": [
      "obj-flush",
      1
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-midiformat",
      0
     ],
     "source": [
      "obj-pack",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-midiout",
      0
     ],
     "source": [
      "obj-midiformat",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-makenote",
      1
     ],
     "source": [
      "obj-vel",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-makenote",
      2
     ],
     "source": [
      "obj-dur",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-vel",
      0
     ],
     "source": [
      "obj-load-vel",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-dur",
      0
     ],
     "source": [
      "obj-load-dur",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-reg",
      0
     ],
     "source": [
      "obj-load-reg",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-prepend-register",
      0
     ],
     "source": [
      "obj-reg",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-prepend-register",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-prepend-vl",
      0
     ],
     "source": [
      "obj-vl",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-prepend-vl",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-prepend-triad",
      0
     ],
     "source": [
      "obj-triad",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-prepend-triad",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-test-input",
      0
     ],
     "source": [
      "obj-test-btn",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-prepend-testparse",
      0
     ],
     "source": [
      "obj-test-input",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-prepend-testparse",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-test-cmaj7",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-test-dm7",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-test-nc",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-panic",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-metro",
      0
     ],
     "source": [
      "obj-seq-play",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-metro-sync",
      0
     ],
     "source": [
      "obj-seq-play",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-prepend-play",
      0
     ],
     "source": [
      "obj-seq-play",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-seq-prepend-play",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-switch",
      1
     ],
     "source": [
      "obj-seq-metro",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-switch",
      2
     ],
     "source": [
      "obj-seq-metro-sync",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-prepend-beat",
      0
     ],
     "source": [
      "obj-seq-switch",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-seq-prepend-beat",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-msper",
      0
     ],
     "source": [
      "obj-seq-bpm",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-metro",
      1
     ],
     "source": [
      "obj-seq-msper",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-bpm",
      0
     ],
     "source": [
      "obj-seq-load-bpm",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-sync-plus1",
      0
     ],
     "source": [
      "obj-seq-sync",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-switch",
      0
     ],
     "source": [
      "obj-seq-sync-plus1",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-sync",
      0
     ],
     "source": [
      "obj-seq-load-sync",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-prepend-rhythm",
      0
     ],
     "source": [
      "obj-seq-dial-rhythm",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-seq-prepend-rhythm",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-prepend-rname",
      0
     ],
     "source": [
      "obj-route",
      7
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-rname-disp",
      0
     ],
     "source": [
      "obj-seq-prepend-rname",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-prepend-len",
      0
     ],
     "source": [
      "obj-seq-len",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-seq-prepend-len",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-len",
      0
     ],
     "source": [
      "obj-seq-load-len",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-prepend-colmaj",
      0
     ],
     "source": [
      "obj-seq-dial-maj",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-seq-prepend-colmaj",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-prepend-colmin",
      0
     ],
     "source": [
      "obj-seq-dial-min",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-seq-prepend-colmin",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-prepend-col7th",
      0
     ],
     "source": [
      "obj-seq-dial-7th",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-seq-prepend-col7th",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-playoff-metro",
      0
     ],
     "source": [
      "obj-route",
      6
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-playoff-toggle",
      0
     ],
     "source": [
      "obj-route",
      6
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-metro",
      0
     ],
     "source": [
      "obj-seq-playoff-metro",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-metro-sync",
      0
     ],
     "source": [
      "obj-seq-playoff-metro",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-play",
      0
     ],
     "source": [
      "obj-seq-playoff-toggle",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-metro",
      0
     ],
     "source": [
      "obj-spice-play",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-metro-sync",
      0
     ],
     "source": [
      "obj-spice-play",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-prepend-play",
      0
     ],
     "source": [
      "obj-spice-play",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-play",
      0
     ],
     "source": [
      "obj-seq-playoff-toggle",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-sync-plus1",
      0
     ],
     "source": [
      "obj-spice-sync",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-msper",
      0
     ],
     "source": [
      "obj-spice-bpm",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-pre-reroll",
      0
     ],
     "source": [
      "obj-spice-reroll",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-spice-pre-reroll",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-pre-hold",
      0
     ],
     "source": [
      "obj-spice-hold",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-spice-pre-hold",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-pre-triplet",
      0
     ],
     "source": [
      "obj-spice-triplet",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-spice-pre-triplet",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-sel-triplet",
      0
     ],
     "source": [
      "obj-spice-triplet",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-metro-straight",
      0
     ],
     "source": [
      "obj-spice-sel-triplet",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-t-straight",
      0
     ],
     "source": [
      "obj-spice-sel-triplet",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-metro-trip",
      0
     ],
     "source": [
      "obj-spice-sel-triplet",
      1
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-t-trip",
      0
     ],
     "source": [
      "obj-spice-sel-triplet",
      1
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-metro-sync",
      1
     ],
     "source": [
      "obj-spice-metro-straight",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-metro-sync",
      1
     ],
     "source": [
      "obj-spice-metro-trip",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-div-straight",
      0
     ],
     "source": [
      "obj-spice-t-straight",
      1
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-bpm",
      0
     ],
     "source": [
      "obj-spice-t-straight",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-div-trip",
      0
     ],
     "source": [
      "obj-spice-t-trip",
      1
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-bpm",
      0
     ],
     "source": [
      "obj-spice-t-trip",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-msper",
      1
     ],
     "source": [
      "obj-spice-div-straight",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-msper",
      1
     ],
     "source": [
      "obj-spice-div-trip",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-pre-modelidx",
      0
     ],
     "source": [
      "obj-spice-tab-model",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-spice-pre-modelidx",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-pre-lenidx",
      0
     ],
     "source": [
      "obj-spice-tab-bars",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-spice-pre-lenidx",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-pre-phrasemode",
      0
     ],
     "source": [
      "obj-spice-tab-mode",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-spice-pre-phrasemode",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-pre-cadence",
      0
     ],
     "source": [
      "obj-spice-dial-cadence",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-spice-pre-cadence",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-pre-seedsel",
      0
     ],
     "source": [
      "obj-spice-dial-seed",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-spice-pre-seedsel",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-pre-keysel",
      0
     ],
     "source": [
      "obj-spice-dial-key",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-spice-pre-keysel",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-pre-keymin",
      0
     ],
     "source": [
      "obj-spice-keymin",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-spice-pre-keymin",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-pre-spice",
      0
     ],
     "source": [
      "obj-spice-dial-spice",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-spice-pre-spice",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-pre-voicing",
      0
     ],
     "source": [
      "obj-spice-dial-voicing",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-spice-pre-voicing",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-pre-key",
      0
     ],
     "source": [
      "obj-spice-key",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-spice-pre-key",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-preset-key",
      0
     ],
     "source": [
      "obj-route",
      11
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-disp-key",
      0
     ],
     "source": [
      "obj-spice-preset-key",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-preset-seed",
      0
     ],
     "source": [
      "obj-route",
      12
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-disp-seed",
      0
     ],
     "source": [
      "obj-spice-preset-seed",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-preset-capstate",
      0
     ],
     "source": [
      "obj-route",
      15
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-disp-capstate",
      0
     ],
     "source": [
      "obj-spice-preset-capstate",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-preset-sessionstat",
      0
     ],
     "source": [
      "obj-route",
      16
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-disp-sessionstat",
      0
     ],
     "source": [
      "obj-spice-preset-sessionstat",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-sel-backend",
      0
     ],
     "source": [
      "obj-route",
      18
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-bg-up",
      0
     ],
     "source": [
      "obj-spice-sel-backend",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-bg-starting",
      0
     ],
     "source": [
      "obj-spice-sel-backend",
      1
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-bg-down",
      0
     ],
     "source": [
      "obj-spice-sel-backend",
      2
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-pylight",
      0
     ],
     "source": [
      "obj-spice-bg-up",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-pylight",
      0
     ],
     "source": [
      "obj-spice-bg-starting",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-pylight",
      0
     ],
     "source": [
      "obj-spice-bg-down",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-preset-backend",
      0
     ],
     "source": [
      "obj-route",
      19
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-disp-backend",
      0
     ],
     "source": [
      "obj-spice-preset-backend",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-pre-pyrestart",
      0
     ],
     "source": [
      "obj-spice-pyrestart",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-spice-pre-pyrestart",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-midiparse",
      0
     ],
     "source": [
      "obj-spice-midiin",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-pre-notein",
      0
     ],
     "source": [
      "obj-spice-midiparse",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-spice-pre-notein",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-pre-cc",
      0
     ],
     "source": [
      "obj-spice-midiparse",
      2
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-spice-pre-cc",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-pre-pgm",
      0
     ],
     "source": [
      "obj-spice-midiparse",
      3
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-node",
      0
     ],
     "source": [
      "obj-spice-pre-pgm",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-tab-model",
      0
     ],
     "source": [
      "obj-spice-loadbang",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-tab-bars",
      0
     ],
     "source": [
      "obj-spice-loadbang",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-tab-mode",
      0
     ],
     "source": [
      "obj-spice-loadbang",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-dial-seed",
      0
     ],
     "source": [
      "obj-spice-loadbang",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-dial-key",
      0
     ],
     "source": [
      "obj-spice-loadbang",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-dial-spice",
      0
     ],
     "source": [
      "obj-spice-loadbang",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-dial-voicing",
      0
     ],
     "source": [
      "obj-spice-loadbang",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-dial-cadence",
      0
     ],
     "source": [
      "obj-spice-loadbang",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-seq-dial-rhythm",
      0
     ],
     "source": [
      "obj-spice-loadbang",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-bpm",
      0
     ],
     "source": [
      "obj-spice-loadbang",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-sync",
      0
     ],
     "source": [
      "obj-spice-loadbang",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-triplet",
      0
     ],
     "source": [
      "obj-spice-loadbang",
      0
     ]
    }
   }
  ],
  "dependency_cache": [],
  "autosave": 0,
  "openrect": [
   0.0,
   0.0,
   584.0,
   169.0
  ]
 }
}