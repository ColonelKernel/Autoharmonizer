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
   824.0,
   390.0
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
     "text": "Markov Chord Sequencer (Spice) \u2014 compact performer panel (Presentation): SELECT / TRANSPORT / HARMONY / PHRASE / VOICING / OUTPUT."
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
     "text": "node.script markov_osc.js",
     "outlettype": [
      ""
     ],
     "filename": "markov_osc.js"
    }
   },
   {
    "box": {
     "id": "obj-route",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 15,
     "patching_rect": [
      250,
      245,
      330,
      22
     ],
     "text": "route status output error chord notes stop playoff rhythmname phraselenbars phrasemodename voicedistname keyname seedname modelname",
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
      556,
      254,
      176,
      20
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
      52,
      254,
      170,
      20
     ]
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
     "presentation": 1,
     "presentation_rect": [
      280,
      254,
      220,
      20
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
     "presentation": 1,
     "presentation_rect": [
      406,
      44,
      22,
      22
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
     "presentation": 1,
     "presentation_rect": [
      446,
      46,
      44,
      20
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
     "presentation": 1,
     "presentation_rect": [
      500,
      46,
      20,
      20
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
      566,
      110,
      46,
      50
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
     "presentation": 1,
     "presentation_rect": [
      624,
      134,
      108,
      16
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
     "presentation": 1,
     "presentation_rect": [
      548,
      46,
      44,
      20
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
     "presentation": 1,
     "presentation_rect": [
      618,
      186,
      44,
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
     "presentation": 1,
     "presentation_rect": [
      666,
      186,
      44,
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
     "presentation": 1,
     "presentation_rect": [
      714,
      186,
      44,
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
     "text": "MARKOV SEQUENCER  \u00b7  SPICE",
     "presentation": 1,
     "presentation_rect": [
      10,
      6,
      440,
      18
     ],
     "fontsize": 15
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
     "presentation": 1,
     "presentation_rect": [
      404,
      68,
      34,
      12
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
     "presentation": 1,
     "presentation_rect": [
      446,
      68,
      34,
      12
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
     "presentation": 1,
     "presentation_rect": [
      546,
      68,
      52,
      12
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
     "text": "sync",
     "presentation": 1,
     "presentation_rect": [
      494,
      68,
      40,
      12
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
     "presentation": 1,
     "presentation_rect": [
      10,
      256,
      40,
      14
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
     "presentation": 1,
     "presentation_rect": [
      236,
      256,
      40,
      14
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
     "presentation": 1,
     "presentation_rect": [
      512,
      256,
      44,
      14
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-hdr-select",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      1180,
      700,
      160,
      16
     ],
     "text": "SELECT   \u00b7   seed / key / model",
     "presentation": 1,
     "presentation_rect": [
      10,
      26,
      250,
      14
     ],
     "fontsize": 12
    }
   },
   {
    "box": {
     "id": "obj-spice-hdr-transport",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      1180,
      700,
      160,
      16
     ],
     "text": "TRANSPORT",
     "presentation": 1,
     "presentation_rect": [
      400,
      26,
      150,
      14
     ],
     "fontsize": 12
    }
   },
   {
    "box": {
     "id": "obj-spice-hdr",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      1180,
      700,
      160,
      16
     ],
     "text": "HARMONY",
     "presentation": 1,
     "presentation_rect": [
      400,
      92,
      200,
      14
     ],
     "fontsize": 12
    }
   },
   {
    "box": {
     "id": "obj-spice-perfhdr",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      1180,
      700,
      160,
      16
     ],
     "text": "PHRASE   \u00b7   8\u201332 bars",
     "presentation": 1,
     "presentation_rect": [
      10,
      120,
      250,
      14
     ],
     "fontsize": 12
    }
   },
   {
    "box": {
     "id": "obj-spice-hdr-voicing",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      1180,
      700,
      160,
      16
     ],
     "text": "VOICING",
     "presentation": 1,
     "presentation_rect": [
      400,
      168,
      200,
      14
     ],
     "fontsize": 12
    }
   },
   {
    "box": {
     "id": "obj-spice-hdr-disp",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      1180,
      700,
      160,
      16
     ],
     "text": "OUTPUT",
     "presentation": 1,
     "presentation_rect": [
      10,
      232,
      120,
      14
     ],
     "fontsize": 12
    }
   },
   {
    "box": {
     "id": "obj-spice-lbl-keymin",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      1180,
      700,
      160,
      16
     ],
     "text": "min",
     "presentation": 1,
     "presentation_rect": [
      188,
      54,
      28,
      12
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-lbl-bars",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      1180,
      700,
      160,
      16
     ],
     "text": "bars",
     "presentation": 1,
     "presentation_rect": [
      64,
      190,
      40,
      12
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-lbl-mode",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      1180,
      700,
      160,
      16
     ],
     "text": "mode",
     "presentation": 1,
     "presentation_rect": [
      116,
      164,
      34,
      12
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-lbl-rname",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      1180,
      700,
      160,
      16
     ],
     "text": "rhythm",
     "presentation": 1,
     "presentation_rect": [
      624,
      118,
      44,
      12
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-lbl-vdist",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      1180,
      700,
      160,
      16
     ],
     "text": "voice",
     "presentation": 1,
     "presentation_rect": [
      512,
      194,
      44,
      12
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-lbl-triad",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      1180,
      700,
      160,
      16
     ],
     "text": "force maj / min / 7th",
     "presentation": 1,
     "presentation_rect": [
      612,
      238,
      148,
      12
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-keylbl",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      1180,
      700,
      160,
      16
     ],
     "text": "key",
     "presentation": 0,
     "presentation_rect": [
      0,
      0,
      160,
      16
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-note",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      1180,
      700,
      160,
      16
     ],
     "text": "help",
     "presentation": 0,
     "presentation_rect": [
      0,
      0,
      160,
      16
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-perfnote",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      1180,
      700,
      160,
      16
     ],
     "text": "help",
     "presentation": 0,
     "presentation_rect": [
      0,
      0,
      160,
      16
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-lbl-key",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      1180,
      700,
      160,
      16
     ],
     "text": "key",
     "presentation": 0,
     "presentation_rect": [
      0,
      0,
      160,
      16
     ]
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
      470,
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
      16,
      42,
      46,
      50
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
      470,
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
      10,
      94,
      96,
      16
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
      520,
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
      122,
      42,
      46,
      50
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
      520,
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
     "maxclass": "toggle",
     "numinlets": 1,
     "numoutlets": 1,
     "outlettype": [
      "int"
     ],
     "parameter_enable": 0,
     "patching_rect": [
      1180,
      560,
      24,
      24
     ],
     "presentation": 1,
     "presentation_rect": [
      168,
      52,
      18,
      18
     ]
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
      590,
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
      118,
      94,
      98,
      16
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
     "id": "obj-spice-dial-model",
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
      640,
      44,
      48
     ],
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "Model",
       "parameter_shortname": "Model",
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
     "varname": "Model",
     "presentation": 1,
     "presentation_rect": [
      230,
      42,
      46,
      50
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-pre-modelsel",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      640,
      120,
      22
     ],
     "text": "prepend modelsel",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-disp-model",
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
     "text": "markov",
     "presentation": 1,
     "presentation_rect": [
      224,
      94,
      96,
      16
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-preset-model",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      1060,
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
     "id": "obj-spice-audition",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      1180,
      700,
      60,
      20
     ],
     "text": "audition",
     "presentation": 1,
     "presentation_rect": [
      326,
      58,
      60,
      18
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-dial-color",
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
      750,
      44,
      48
     ],
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "Color",
       "parameter_shortname": "Color",
       "parameter_type": 0,
       "parameter_mmin": 0,
       "parameter_mmax": 1,
       "parameter_unitstyle": 1,
       "parameter_modmode": 3,
       "parameter_initial_enable": 1,
       "parameter_initial": [
        0.5
       ]
      }
     },
     "varname": "Color",
     "presentation": 1,
     "presentation_rect": [
      406,
      110,
      46,
      50
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-pre-color",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      750,
      110,
      22
     ],
     "text": "prepend color",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-dial-adventure",
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
      780,
      44,
      48
     ],
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "Adventure",
       "parameter_shortname": "Adventure",
       "parameter_type": 0,
       "parameter_mmin": 0,
       "parameter_mmax": 1,
       "parameter_unitstyle": 1,
       "parameter_modmode": 3,
       "parameter_initial_enable": 1,
       "parameter_initial": [
        0.35
       ]
      }
     },
     "varname": "Adventure",
     "presentation": 1,
     "presentation_rect": [
      458,
      110,
      46,
      50
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-pre-adventure",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      780,
      130,
      22
     ],
     "text": "prepend adventure",
     "outlettype": [
      ""
     ]
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
      810,
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
      510,
      110,
      46,
      50
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
      810,
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
      830,
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
      830,
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
     "id": "obj-spice-dial-phraselen",
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
      860,
      44,
      48
     ],
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "PhraseLen",
       "parameter_shortname": "PhraseLen",
       "parameter_type": 0,
       "parameter_mmin": 0,
       "parameter_mmax": 1,
       "parameter_unitstyle": 1,
       "parameter_modmode": 3,
       "parameter_initial_enable": 1,
       "parameter_initial": [
        0.34
       ]
      }
     },
     "varname": "PhraseLen",
     "presentation": 1,
     "presentation_rect": [
      16,
      138,
      46,
      50
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-pre-phraselen",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      860,
      130,
      22
     ],
     "text": "prepend phraselen",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-mode-loop",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      1180,
      890,
      46,
      20
     ],
     "text": "loop",
     "presentation": 1,
     "presentation_rect": [
      116,
      140,
      44,
      18
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-mode-regen",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      1180,
      912,
      50,
      20
     ],
     "text": "regen",
     "presentation": 1,
     "presentation_rect": [
      164,
      140,
      46,
      18
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-mode-oneshot",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      1180,
      934,
      58,
      20
     ],
     "text": "oneshot",
     "presentation": 1,
     "presentation_rect": [
      214,
      140,
      56,
      18
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
      956,
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
     "id": "obj-spice-reroll",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      1180,
      978,
      60,
      20
     ],
     "text": "reroll",
     "presentation": 1,
     "presentation_rect": [
      116,
      188,
      50,
      18
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-hold",
     "maxclass": "toggle",
     "numinlets": 1,
     "numoutlets": 1,
     "outlettype": [
      "int"
     ],
     "parameter_enable": 0,
     "patching_rect": [
      1180,
      1000,
      24,
      24
     ],
     "presentation": 1,
     "presentation_rect": [
      174,
      187,
      20,
      20
     ]
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
      1000,
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
     "id": "obj-spice-holdlbl",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      1180,
      700,
      160,
      16
     ],
     "text": "hold",
     "presentation": 1,
     "presentation_rect": [
      198,
      190,
      30,
      12
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-disp-phraselen",
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
     "text": "16",
     "presentation": 1,
     "presentation_rect": [
      16,
      190,
      44,
      16
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-preset-phraselen",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      1090,
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
     "id": "obj-spice-disp-mode",
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
     "text": "loop",
     "presentation": 1,
     "presentation_rect": [
      152,
      162,
      90,
      16
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-preset-mode",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      1120,
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
      1030,
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
      406,
      186,
      46,
      50
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
      1030,
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
     "id": "obj-spice-dial-voicedist",
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
      1060,
      44,
      48
     ],
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "VoiceDist",
       "parameter_shortname": "VoiceDist",
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
     "varname": "VoiceDist",
     "presentation": 1,
     "presentation_rect": [
      458,
      186,
      46,
      50
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-pre-voicedist",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      1060,
      150,
      22
     ],
     "text": "prepend voicedistance",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-disp-voicedist",
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
     "text": "unison",
     "presentation": 1,
     "presentation_rect": [
      512,
      210,
      92,
      16
     ]
    }
   },
   {
    "box": {
     "id": "obj-spice-preset-vdist",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      1240,
      1150,
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
      "obj-spice-pre-modelsel",
      0
     ],
     "source": [
      "obj-spice-dial-model",
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
      "obj-spice-pre-modelsel",
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
      "obj-spice-audition",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-pre-color",
      0
     ],
     "source": [
      "obj-spice-dial-color",
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
      "obj-spice-pre-color",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-pre-adventure",
      0
     ],
     "source": [
      "obj-spice-dial-adventure",
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
      "obj-spice-pre-adventure",
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
      "obj-spice-pre-phraselen",
      0
     ],
     "source": [
      "obj-spice-dial-phraselen",
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
      "obj-spice-pre-phraselen",
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
      "obj-spice-mode-loop",
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
      "obj-spice-mode-regen",
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
      "obj-spice-mode-oneshot",
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
      "obj-node",
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
      "obj-spice-pre-voicedist",
      0
     ],
     "source": [
      "obj-spice-dial-voicedist",
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
      "obj-spice-pre-voicedist",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-preset-phraselen",
      0
     ],
     "source": [
      "obj-route",
      8
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-disp-phraselen",
      0
     ],
     "source": [
      "obj-spice-preset-phraselen",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-preset-mode",
      0
     ],
     "source": [
      "obj-route",
      9
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-disp-mode",
      0
     ],
     "source": [
      "obj-spice-preset-mode",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-preset-vdist",
      0
     ],
     "source": [
      "obj-route",
      10
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-disp-voicedist",
      0
     ],
     "source": [
      "obj-spice-preset-vdist",
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
      "obj-spice-preset-model",
      0
     ],
     "source": [
      "obj-route",
      13
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-spice-disp-model",
      0
     ],
     "source": [
      "obj-spice-preset-model",
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
      "obj-spice-mode-loop",
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
   764.0,
   310.0
  ]
 }
}