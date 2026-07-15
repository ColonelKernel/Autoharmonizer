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
		"rect": [
			78.0,
			95.0,
			1400.0,
			796.0
		],
		"openinpresentation": 1,
		"boxes": [
			{
				"box": {
					"id": "obj-title",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						30.0,
						20.0,
						620.0,
						20.0
					],
					"text": "Markov Chord Sequencer — performable rhythm + colour dials over the Markov chain"
				}
			},
			{
				"box": {
					"id": "obj-hint",
					"linecount": 2,
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						30.0,
						42.0,
						620.0,
						33.0
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
						30.0,
						80.0,
						151.0,
						20.0
					],
					"text": "chord input (Enter or send)"
				}
			},
			{
				"box": {
					"id": "obj-input",
					"maxclass": "textedit",
					"numinlets": 1,
					"numoutlets": 4,
					"outlettype": [
						"",
						"int",
						"",
						""
					],
					"parameter_enable": 0,
					"patching_rect": [
						170.0,
						105.0,
						120.0,
						22.0
					],
					"presentation": 1,
					"presentation_rect": [
						56.0,
						42.0,
						120.0,
						21.0
					],
					"text": "G:7"
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
						"int"
					],
					"parameter_enable": 0,
					"patching_rect": [
						170.0,
						105.0,
						60.0,
						22.0
					],
					"presentation": 1,
					"presentation_rect": [
						182.0,
						42.0,
						48.0,
						21.0
					],
					"text": "send"
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
						"int"
					],
					"parameter_enable": 0,
					"patching_rect": [
						250.0,
						105.0,
						60.0,
						22.0
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
						"int"
					],
					"parameter_enable": 0,
					"patching_rect": [
						330.0,
						105.0,
						60.0,
						22.0
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
						"int"
					],
					"parameter_enable": 0,
					"patching_rect": [
						410.0,
						105.0,
						90.0,
						22.0
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
					"outlettype": [
						"bang"
					],
					"patching_rect": [
						250.0,
						55.0,
						60.0,
						22.0
					],
					"text": "loadbang"
				}
			},
			{
				"box": {
					"id": "obj-init-delay",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						"bang"
					],
					"patching_rect": [
						250.0,
						80.0,
						61.0,
						22.0
					],
					"text": "delay 300"
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
						150.0,
						140.0,
						70.0,
						22.0
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
					"outlettype": [
						"bang"
					],
					"patching_rect": [
						150.0,
						170.0,
						61.0,
						22.0
					],
					"text": "delay 200"
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
						150.0,
						170.0,
						40.0,
						22.0
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
						250.0,
						140.0,
						35.0,
						22.0
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
						330.0,
						140.0,
						45.0,
						22.0
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
						410.0,
						140.0,
						110.0,
						22.0
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
					"outlettype": [
						""
					],
					"patching_rect": [
						30.0,
						170.0,
						90.0,
						22.0
					],
					"text": "prepend send"
				}
			},
			{
				"box": {
					"id": "obj-node",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 2,
					"outlettype": [
						"",
						""
					],
					"patching_rect": [
						410.0,
						205.0,
						190.0,
						22.0
					],
					"saved_object_attributes": {
						"autostart": 0,
						"defer": 0,
						"node_bin_path": "",
						"npm_bin_path": "",
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
					"numinlets": 9,
					"numoutlets": 9,
					"outlettype": [
						"",
						"",
						"",
						"",
						"",
						"",
						"",
						"",
						""
					],
					"patching_rect": [
						250.0,
						245.0,
						337.0,
						22.0
					],
					"text": "route status output error chord notes stop playoff rhythmname"
				}
			},
			{
				"box": {
					"id": "obj-status-label",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						250.0,
						285.0,
						80.0,
						20.0
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
						520.0,
						308.0,
						140.0,
						22.0
					],
					"presentation": 1,
					"presentation_rect": [
						346.0,
						180.0,
						150.0,
						22.0
					],
					"text": "set $1"
				}
			},
			{
				"box": {
					"id": "obj-print-status",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						520.0,
						308.0,
						70.0,
						22.0
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
						250.0,
						340.0,
						80.0,
						20.0
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
						250.0,
						363.0,
						150.0,
						22.0
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
						250.0,
						363.0,
						70.0,
						22.0
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
						289.75,
						393.0,
						60.0,
						22.0
					],
					"saved_object_attributes": {
						"attr_comment": "",
						"c": ""
					},
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
						250.0,
						423.0,
						80.0,
						20.0
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
						250.0,
						446.0,
						240.0,
						22.0
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
						250.0,
						476.0,
						61.0,
						22.0
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
						520.0,
						285.0,
						60.0,
						22.0
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
						600.0,
						285.0,
						120.0,
						20.0
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
					"outlettype": [
						""
					],
					"patching_rect": [
						600.0,
						308.0,
						80.0,
						22.0
					],
					"text": "prepend set"
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
						600.0,
						308.0,
						200.0,
						22.0
					],
					"presentation": 1,
					"presentation_rect": [
						60.0,
						180.0,
						220.0,
						22.0
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
						600.0,
						340.0,
						120.0,
						20.0
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
					"outlettype": [
						""
					],
					"patching_rect": [
						600.0,
						363.0,
						80.0,
						22.0
					],
					"text": "prepend set"
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
						600.0,
						363.0,
						200.0,
						22.0
					],
					"presentation": 1,
					"presentation_rect": [
						60.0,
						208.0,
						220.0,
						22.0
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
						600.0,
						400.0,
						461.0,
						20.0
					],
					"text": "MIDI: notes → flush-old → iter → makenote → flush → pack → midiformat → midiout"
				}
			},
			{
				"box": {
					"id": "obj-notes-trig",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 2,
					"outlettype": [
						"",
						"bang"
					],
					"patching_rect": [
						600.0,
						425.0,
						60.0,
						22.0
					],
					"text": "t l b"
				}
			},
			{
				"box": {
					"id": "obj-iter",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						600.0,
						458.0,
						50.0,
						22.0
					],
					"text": "iter"
				}
			},
			{
				"box": {
					"id": "obj-makenote",
					"maxclass": "newobj",
					"numinlets": 3,
					"numoutlets": 2,
					"outlettype": [
						"float",
						"float"
					],
					"patching_rect": [
						600.0,
						491.0,
						120.0,
						22.0
					],
					"text": "makenote 90 1000"
				}
			},
			{
				"box": {
					"id": "obj-flush",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 2,
					"outlettype": [
						"int",
						"int"
					],
					"patching_rect": [
						600.0,
						524.0,
						50.0,
						22.0
					],
					"text": "flush"
				}
			},
			{
				"box": {
					"id": "obj-pack",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						600.0,
						557.0,
						70.0,
						22.0
					],
					"text": "pack 0 0"
				}
			},
			{
				"box": {
					"id": "obj-midiformat",
					"maxclass": "newobj",
					"numinlets": 7,
					"numoutlets": 2,
					"outlettype": [
						"int",
						""
					],
					"patching_rect": [
						600.0,
						590.0,
						80.0,
						22.0
					],
					"text": "midiformat"
				}
			},
			{
				"box": {
					"id": "obj-midiout",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						600.0,
						623.0,
						60.0,
						22.0
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
						760.0,
						458.0,
						90.0,
						20.0
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
						"",
						"bang"
					],
					"parameter_enable": 0,
					"patching_rect": [
						650.5,
						478.0,
						50.0,
						22.0
					]
				}
			},
			{
				"box": {
					"id": "obj-load-vel",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						820.0,
						478.0,
						90.0,
						22.0
					],
					"text": "loadmess 90"
				}
			},
			{
				"box": {
					"id": "obj-dur-label",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						760.0,
						508.0,
						90.0,
						20.0
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
						"",
						"bang"
					],
					"parameter_enable": 0,
					"patching_rect": [
						701.0,
						528.0,
						50.0,
						22.0
					]
				}
			},
			{
				"box": {
					"id": "obj-load-dur",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						820.0,
						528.0,
						90.0,
						22.0
					],
					"text": "loadmess 1000"
				}
			},
			{
				"box": {
					"id": "obj-reg-label",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						760.0,
						560.0,
						120.0,
						20.0
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
						"",
						"bang"
					],
					"parameter_enable": 0,
					"patching_rect": [
						900.0,
						580.0,
						50.0,
						22.0
					]
				}
			},
			{
				"box": {
					"id": "obj-load-reg",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						900.0,
						580.0,
						90.0,
						22.0
					],
					"text": "loadmess 60"
				}
			},
			{
				"box": {
					"id": "obj-prepend-register",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						820,
						580,
						96,
						22
					],
					"text": "prepend register"
				}
			},
			{
				"box": {
					"id": "obj-vl-label",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						760.0,
						612.0,
						200.0,
						20.0
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
						760.0,
						632.0,
						24.0,
						24.0
					]
				}
			},
			{
				"box": {
					"id": "obj-prepend-vl",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						790.0,
						634.0,
						130.0,
						22.0
					],
					"text": "prepend voiceleading"
				}
			},
			{
				"box": {
					"id": "obj-triad-label",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						760.0,
						662.0,
						237.0,
						20.0
					],
					"text": "triads only — maj/min (default ON in Node)"
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
						760.0,
						682.0,
						24.0,
						24.0
					]
				}
			},
			{
				"box": {
					"id": "obj-prepend-triad",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						790.0,
						684.0,
						120.0,
						22.0
					],
					"text": "prepend triadsonly"
				}
			},
			{
				"box": {
					"id": "obj-test-label",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						30.0,
						300.0,
						400.0,
						20.0
					],
					"text": "TEST PARSER — parse+voice+play directly (bypasses Markov / Python)"
				}
			},
			{
				"box": {
					"id": "obj-test-input",
					"maxclass": "textedit",
					"numinlets": 1,
					"numoutlets": 4,
					"outlettype": [
						"",
						"int",
						"",
						""
					],
					"parameter_enable": 0,
					"patching_rect": [
						170.0,
						325.0,
						120.0,
						22.0
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
						"int"
					],
					"parameter_enable": 0,
					"patching_rect": [
						170.0,
						325.0,
						50.0,
						22.0
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
					"outlettype": [
						""
					],
					"patching_rect": [
						30.0,
						360.0,
						150.0,
						22.0
					],
					"text": "prepend testparse"
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
						30.0,
						395.0,
						130.0,
						22.0
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
						170.0,
						395.0,
						120.0,
						22.0
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
						300.0,
						395.0,
						120.0,
						22.0
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
						30.0,
						428.0,
						200.0,
						20.0
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
						30.0,
						450.0,
						60.0,
						22.0
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
						1280.0,
						70.0,
						26.0,
						26.0
					],
					"presentation": 1,
					"presentation_rect": [
						56.0,
						76.0,
						26.0,
						26.0
					]
				}
			},
			{
				"box": {
					"id": "obj-seq-prepend-play",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						1020.0,
						70.0,
						90.0,
						22.0
					],
					"text": "prepend play"
				}
			},
			{
				"box": {
					"id": "obj-seq-metro",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						"bang"
					],
					"patching_rect": [
						1240.0,
						110.0,
						70.0,
						22.0
					],
					"text": "metro 500"
				}
			},
			{
				"box": {
					"id": "obj-seq-metro-sync",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						"bang"
					],
					"patching_rect": [
						1280.0,
						110.0,
						70.0,
						22.0
					],
					"text": "metro 4n"
				}
			},
			{
				"box": {
					"id": "obj-seq-switch",
					"maxclass": "newobj",
					"numinlets": 3,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						1150.0,
						150.0,
						70.0,
						22.0
					],
					"text": "switch 2"
				}
			},
			{
				"box": {
					"id": "obj-seq-prepend-beat",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						980.0,
						185.0,
						90.0,
						22.0
					],
					"text": "prepend beat"
				}
			},
			{
				"box": {
					"id": "obj-seq-bpm",
					"maxclass": "number",
					"numinlets": 1,
					"numoutlets": 2,
					"outlettype": [
						"",
						"bang"
					],
					"parameter_enable": 0,
					"patching_rect": [
						1240.0,
						110.0,
						50.0,
						22.0
					],
					"presentation": 1,
					"presentation_rect": [
						110.0,
						86.0,
						46.0,
						22.0
					]
				}
			},
			{
				"box": {
					"id": "obj-seq-msper",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						"float"
					],
					"patching_rect": [
						1240.0,
						145.0,
						80.0,
						22.0
					],
					"text": "!/ 60000."
				}
			},
			{
				"box": {
					"id": "obj-seq-load-bpm",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						1240.0,
						110.0,
						90.0,
						22.0
					],
					"text": "loadmess 120"
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
						1200.0,
						185.0,
						24.0,
						24.0
					],
					"presentation": 1,
					"presentation_rect": [
						230.0,
						86.0,
						22.0,
						22.0
					]
				}
			},
			{
				"box": {
					"id": "obj-seq-sync-plus1",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						"int"
					],
					"patching_rect": [
						1150.0,
						220.0,
						40.0,
						22.0
					],
					"text": "+ 1"
				}
			},
			{
				"box": {
					"id": "obj-seq-load-sync",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						1200.0,
						185.0,
						90.0,
						22.0
					],
					"text": "loadmess 0"
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
						980.0,
						250.0,
						44.0,
						48.0
					],
					"presentation": 1,
					"presentation_rect": [
						40.0,
						118.0,
						46.0,
						48.0
					],
					"saved_attribute_attributes": {
						"valueof": {
							"parameter_initial": [
								0.3333
							],
							"parameter_initial_enable": 1,
							"parameter_longname": "Rhythm",
							"parameter_mmax": 1.0,
							"parameter_modmode": 3,
							"parameter_shortname": "Rhythm",
							"parameter_type": 0,
							"parameter_unitstyle": 1
						}
					},
					"varname": "Rhythm"
				}
			},
			{
				"box": {
					"id": "obj-seq-prepend-rhythm",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						1040,
						250,
						110,
						22
					],
					"text": "prepend rhythm"
				}
			},
			{
				"box": {
					"id": "obj-seq-prepend-rname",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						1040.0,
						285.0,
						90.0,
						22.0
					],
					"text": "prepend set"
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
						1040.0,
						320.0,
						140.0,
						22.0
					],
					"presentation": 1,
					"presentation_rect": [
						92.0,
						134.0,
						118.0,
						22.0
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
						"",
						"bang"
					],
					"parameter_enable": 0,
					"patching_rect": [
						1150.0,
						360.0,
						50.0,
						22.0
					],
					"presentation": 1,
					"presentation_rect": [
						170.0,
						86.0,
						46.0,
						22.0
					]
				}
			},
			{
				"box": {
					"id": "obj-seq-prepend-len",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						1040.0,
						360.0,
						100.0,
						22.0
					],
					"text": "prepend length"
				}
			},
			{
				"box": {
					"id": "obj-seq-load-len",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						1150.0,
						360.0,
						90.0,
						22.0
					],
					"text": "loadmess 4"
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
						980.0,
						410.0,
						44.0,
						48.0
					],
					"presentation": 1,
					"presentation_rect": [
						220.0,
						118.0,
						46.0,
						48.0
					],
					"saved_attribute_attributes": {
						"valueof": {
							"parameter_longname": "Major",
							"parameter_mmax": 1.0,
							"parameter_modmode": 3,
							"parameter_shortname": "Major",
							"parameter_type": 0,
							"parameter_unitstyle": 1
						}
					},
					"varname": "Major"
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
						1030.0,
						410.0,
						44.0,
						48.0
					],
					"presentation": 1,
					"presentation_rect": [
						272.0,
						118.0,
						46.0,
						48.0
					],
					"saved_attribute_attributes": {
						"valueof": {
							"parameter_longname": "Minor",
							"parameter_mmax": 1.0,
							"parameter_modmode": 3,
							"parameter_shortname": "Minor",
							"parameter_type": 0,
							"parameter_unitstyle": 1
						}
					},
					"varname": "Minor"
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
						1080.0,
						410.0,
						44.0,
						48.0
					],
					"presentation": 1,
					"presentation_rect": [
						324.0,
						118.0,
						46.0,
						48.0
					],
					"saved_attribute_attributes": {
						"valueof": {
							"parameter_longname": "Seventh",
							"parameter_mmax": 1.0,
							"parameter_modmode": 3,
							"parameter_shortname": "7th",
							"parameter_type": 0,
							"parameter_unitstyle": 1
						}
					},
					"varname": "Seventh"
				}
			},
			{
				"box": {
					"id": "obj-seq-prepend-colmaj",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						980,
						470,
						140,
						22
					],
					"text": "prepend colormajor"
				}
			},
			{
				"box": {
					"id": "obj-seq-prepend-colmin",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						980,
						500,
						140,
						22
					],
					"text": "prepend colorminor"
				}
			},
			{
				"box": {
					"id": "obj-seq-prepend-col7th",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						980,
						530,
						140,
						22
					],
					"text": "prepend color7th"
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
						1240.0,
						70.0,
						30.0,
						22.0
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
						1280.0,
						70.0,
						50.0,
						22.0
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
						14.0,
						8.0,
						380.0,
						20.0
					],
					"presentation": 1,
					"presentation_rect": [
						14.0,
						8.0,
						360.0,
						20.0
					],
					"text": "MARKOV CHORD SEQUENCER"
				}
			},
			{
				"box": {
					"id": "obj-pres-seedlabel",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						14.0,
						44.0,
						40.0,
						20.0
					],
					"presentation": 1,
					"presentation_rect": [
						14.0,
						44.0,
						40.0,
						20.0
					],
					"text": "seed"
				}
			},
			{
				"box": {
					"id": "obj-pres-playlabel",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						14.0,
						80.0,
						40.0,
						20.0
					],
					"presentation": 1,
					"presentation_rect": [
						14.0,
						80.0,
						40.0,
						20.0
					],
					"text": "play"
				}
			},
			{
				"box": {
					"id": "obj-pres-bpmlabel",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						110.0,
						68.0,
						44.0,
						20.0
					],
					"presentation": 1,
					"presentation_rect": [
						110.0,
						68.0,
						44.0,
						20.0
					],
					"text": "BPM"
				}
			},
			{
				"box": {
					"id": "obj-pres-barslabel",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						170.0,
						68.0,
						44.0,
						20.0
					],
					"presentation": 1,
					"presentation_rect": [
						170.0,
						68.0,
						44.0,
						20.0
					],
					"text": "bars"
				}
			},
			{
				"box": {
					"id": "obj-pres-synclabel",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						230.0,
						68.0,
						96.0,
						20.0
					],
					"presentation": 1,
					"presentation_rect": [
						230.0,
						68.0,
						96.0,
						20.0
					],
					"text": "sync transport"
				}
			},
			{
				"box": {
					"id": "obj-pres-rhythmhdr",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						40.0,
						104.0,
						90.0,
						20.0
					],
					"presentation": 1,
					"presentation_rect": [
						40.0,
						104.0,
						90.0,
						20.0
					],
					"text": "rhythm ->"
				}
			},
			{
				"box": {
					"id": "obj-pres-colorhdr",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						220.0,
						104.0,
						90.0,
						20.0
					],
					"presentation": 1,
					"presentation_rect": [
						220.0,
						104.0,
						90.0,
						20.0
					],
					"text": "colour"
				}
			},
			{
				"box": {
					"id": "obj-pres-chordlabel",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						14.0,
						182.0,
						44.0,
						20.0
					],
					"presentation": 1,
					"presentation_rect": [
						14.0,
						182.0,
						44.0,
						20.0
					],
					"text": "chord"
				}
			},
			{
				"box": {
					"id": "obj-pres-noteslabel",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						14.0,
						210.0,
						44.0,
						20.0
					],
					"presentation": 1,
					"presentation_rect": [
						14.0,
						210.0,
						44.0,
						20.0
					],
					"text": "notes"
				}
			},
			{
				"box": {
					"id": "obj-pres-statuslabel",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						292.0,
						182.0,
						50.0,
						20.0
					],
					"presentation": 1,
					"presentation_rect": [
						292.0,
						182.0,
						50.0,
						20.0
					],
					"text": "status"
				}
			},
			{
				"box": {
					"id": "obj-a-adc",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 2,
					"outlettype": [
						"signal",
						"signal"
					],
					"patching_rect": [
						40,
						528,
						45,
						22
					],
					"text": "adc~"
				}
			},
			{
				"box": {
					"id": "obj-a-peak",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						"float"
					],
					"patching_rect": [
						40,
						566,
						95,
						22
					],
					"text": "peakamp~ 50"
				}
			},
			{
				"box": {
					"id": "obj-a-loud",
					"maxclass": "newobj",
					"numinlets": 5,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						40,
						599,
						120,
						22
					],
					"text": "zmap 0. 0.3 0. 1."
				}
			},
			{
				"box": {
					"id": "obj-a-zerox",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 2,
					"outlettype": [
						"signal",
						"signal"
					],
					"patching_rect": [
						180,
						566,
						55,
						22
					],
					"text": "zerox~"
				}
			},
			{
				"box": {
					"id": "obj-a-bsnap",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						"float"
					],
					"patching_rect": [
						180,
						599,
						95,
						22
					],
					"text": "snapshot~ 50"
				}
			},
			{
				"box": {
					"id": "obj-a-bri",
					"maxclass": "newobj",
					"numinlets": 5,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						180,
						632,
						120,
						22
					],
					"text": "zmap 0. 24. 0. 1."
				}
			},
			{
				"box": {
					"id": "obj-a-tbb",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 2,
					"outlettype": [
						"bang",
						"bang"
					],
					"patching_rect": [
						470,
						632,
						55,
						22
					],
					"text": "t b b"
				}
			},
			{
				"box": {
					"id": "obj-a-timer",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 2,
					"outlettype": [
						"float",
						""
					],
					"patching_rect": [
						470,
						665,
						55,
						22
					],
					"text": "timer"
				}
			},
			{
				"box": {
					"id": "obj-a-dens",
					"maxclass": "newobj",
					"numinlets": 5,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						470,
						698,
						120,
						22
					],
					"text": "zmap 100 800 1. 0."
				}
			},
			{
				"box": {
					"id": "obj-map-tog",
					"maxclass": "toggle",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						"int"
					],
					"parameter_enable": 0,
					"patching_rect": [
						470,
						772,
						24,
						24.0
					],
					"presentation": 1,
					"presentation_rect": [
						24.0,
						262.0,
						22.0,
						22.0
					]
				}
			},
			{
				"box": {
					"id": "obj-a-inv",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						"float"
					],
					"patching_rect": [
						380,
						805,
						50,
						22.0
					],
					"text": "!- 1."
				}
			},
			{
				"box": {
					"id": "obj-g-colmaj",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						40,
						838,
						50,
						22.0
					],
					"text": "gate"
				}
			},
			{
				"box": {
					"id": "obj-g-colmin",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						98,
						838,
						50,
						22.0
					],
					"text": "gate"
				}
			},
			{
				"box": {
					"id": "obj-a-reg-sc",
					"maxclass": "newobj",
					"numinlets": 6,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						40,
						805,
						120,
						22.0
					],
					"text": "scale 0. 1. 48 72"
				}
			},
			{
				"box": {
					"id": "obj-g-reg",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						156,
						838,
						50,
						22.0
					],
					"text": "gate"
				}
			},
			{
				"box": {
					"id": "obj-a-reg-qlim",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						40,
						871,
						70,
						22.0
					],
					"text": "qlim 200"
				}
			},
			{
				"box": {
					"id": "obj-g-rhy",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						272,
						838,
						50,
						22.0
					],
					"text": "gate"
				}
			},
			{
				"box": {
					"id": "obj-a-rhy-qlim",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						120,
						871,
						70,
						22.0
					],
					"text": "qlim 250"
				}
			},
			{
				"box": {
					"id": "obj-a-vel-sc",
					"maxclass": "newobj",
					"numinlets": 6,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						170,
						805,
						120,
						22.0
					],
					"text": "scale 0. 1. 40 120"
				}
			},
			{
				"box": {
					"id": "obj-a-vel-clip",
					"maxclass": "newobj",
					"numinlets": 3,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						300,
						805,
						70,
						22.0
					],
					"text": "clip 1 127"
				}
			},
			{
				"box": {
					"id": "obj-g-vel",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						214,
						838,
						50,
						22.0
					],
					"text": "gate"
				}
			},
			{
				"box": {
					"id": "obj-a-seed-lim",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						200,
						871,
						90,
						22.0
					],
					"text": "speedlim 150"
				}
			},
			{
				"box": {
					"id": "obj-g-seed",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						330,
						838,
						50,
						22.0
					],
					"text": "gate"
				}
			},
			{
				"box": {
					"id": "obj-a-prepend-notein",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						300,
						871,
						120,
						22.0
					],
					"text": "prepend notein"
				}
			},
			{
				"box": {
					"id": "obj-rx-label",
					"linecount": 2,
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						640,
						748,
						560,
						18
					],
					"text": "LIVE BRIDGE: receive audio features from the Analyzer device on the global ---bus"
				}
			},
			{
				"box": {
					"id": "obj-rx-loud",
					"maxclass": "newobj",
					"numinlets": 0,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						640,
						772,
						120,
						22.0
					],
					"text": "receive ---loud"
				}
			},
			{
				"box": {
					"id": "obj-rx-bright",
					"maxclass": "newobj",
					"numinlets": 0,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						770,
						772,
						130,
						22.0
					],
					"text": "receive ---bright"
				}
			},
			{
				"box": {
					"id": "obj-rx-dens",
					"maxclass": "newobj",
					"numinlets": 0,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						640,
						805,
						120,
						22.0
					],
					"text": "receive ---dens"
				}
			},
			{
				"box": {
					"id": "obj-rx-pitch",
					"maxclass": "newobj",
					"numinlets": 0,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						770,
						805,
						120,
						22.0
					],
					"text": "receive ---pitch"
				}
			},
			{
				"box": {
					"id": "obj-src-tog",
					"maxclass": "toggle",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						"int"
					],
					"parameter_enable": 0,
					"patching_rect": [
						510,
						772,
						24,
						24.0
					],
					"presentation": 1,
					"presentation_rect": [
						24.0,
						290.0,
						22.0,
						22.0
					]
				}
			},
			{
				"box": {
					"id": "obj-src-inv",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						"int"
					],
					"patching_rect": [
						150,
						772,
						50,
						22.0
					],
					"text": "== 0"
				}
			},
			{
				"box": {
					"id": "obj-g-loud-adc",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						210,
						772,
						50,
						22.0
					],
					"text": "gate"
				}
			},
			{
				"box": {
					"id": "obj-g-loud-bus",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						265,
						772,
						50,
						22.0
					],
					"text": "gate"
				}
			},
			{
				"box": {
					"id": "obj-g-bri-adc",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						320,
						772,
						50,
						22.0
					],
					"text": "gate"
				}
			},
			{
				"box": {
					"id": "obj-g-bri-bus",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						375,
						772,
						50,
						22.0
					],
					"text": "gate"
				}
			},
			{
				"box": {
					"fontface": 1,
					"id": "obj-ui-hdr",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						1350.0,
						200.0,
						240.0,
						20.0
					],
					"presentation": 1,
					"presentation_rect": [
						20.0,
						242.0,
						240.0,
						20.0
					],
					"text": "AUDIO REACTIVITY"
				}
			},
			{
				"box": {
					"id": "obj-ui-react-lbl",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						1350.0,
						224.0,
						180.0,
						20.0
					],
					"presentation": 1,
					"presentation_rect": [
						50.0,
						264.0,
						180.0,
						20.0
					],
					"text": "audio → params (on)"
				}
			},
			{
				"box": {
					"id": "obj-ui-src-lbl",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						1350.0,
						248.0,
						240.0,
						20.0
					],
					"presentation": 1,
					"presentation_rect": [
						50.0,
						292.0,
						240.0,
						20.0
					],
					"text": "source:  off = adc~   on = ---bus"
				}
			},
			{
				"box": {
					"id": "obj-ui-loud-lbl",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						1350.0,
						272.0,
						80.0,
						20.0
					],
					"presentation": 1,
					"presentation_rect": [
						22.0,
						322.0,
						80.0,
						20.0
					],
					"text": "LOUD"
				}
			},
			{
				"box": {
					"id": "obj-ui-bri-lbl",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						1350.0,
						296.0,
						80.0,
						20.0
					],
					"presentation": 1,
					"presentation_rect": [
						152.0,
						322.0,
						80.0,
						20.0
					],
					"text": "BRIGHT"
				}
			},
			{
				"box": {
					"id": "obj-ui-dens-lbl",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						1350.0,
						320.0,
						80.0,
						20.0
					],
					"presentation": 1,
					"presentation_rect": [
						282.0,
						322.0,
						80.0,
						20.0
					],
					"text": "DENSITY"
				}
			},
			{
				"box": {
					"id": "obj-ui-pitch-lbl",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						1350.0,
						344.0,
						80.0,
						20.0
					],
					"presentation": 1,
					"presentation_rect": [
						408.0,
						322.0,
						80.0,
						20.0
					],
					"text": "PITCH"
				}
			},
			{
				"box": {
					"id": "obj-ui-loud-sl",
					"maxclass": "slider",
					"numinlets": 1,
					"numoutlets": 1,
					"orientation": 1,
					"outlettype": [
						""
					],
					"parameter_enable": 0,
					"patching_rect": [
						1500.0,
						380.0,
						128.0,
						16.0
					],
					"presentation": 1,
					"presentation_rect": [
						22.0,
						338.0,
						120.0,
						16.0
					]
				}
			},
			{
				"box": {
					"id": "obj-ui-bri-sl",
					"maxclass": "slider",
					"numinlets": 1,
					"numoutlets": 1,
					"orientation": 1,
					"outlettype": [
						""
					],
					"parameter_enable": 0,
					"patching_rect": [
						1500.0,
						400.0,
						128.0,
						16.0
					],
					"presentation": 1,
					"presentation_rect": [
						152.0,
						338.0,
						120.0,
						16.0
					]
				}
			},
			{
				"box": {
					"id": "obj-ui-dens-sl",
					"maxclass": "slider",
					"numinlets": 1,
					"numoutlets": 1,
					"orientation": 1,
					"outlettype": [
						""
					],
					"parameter_enable": 0,
					"patching_rect": [
						1500.0,
						420.0,
						128.0,
						16.0
					],
					"presentation": 1,
					"presentation_rect": [
						282.0,
						338.0,
						120.0,
						16.0
					]
				}
			},
			{
				"box": {
					"id": "obj-ui-pitch-sl",
					"maxclass": "slider",
					"numinlets": 1,
					"numoutlets": 1,
					"orientation": 1,
					"outlettype": [
						""
					],
					"parameter_enable": 0,
					"patching_rect": [
						470.0,
						440.0,
						128.0,
						16.0
					],
					"presentation": 1,
					"presentation_rect": [
						408.0,
						338.0,
						96.0,
						16.0
					]
				}
			},
			{
				"box": {
					"id": "obj-ui-loud-mul",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						"int"
					],
					"patching_rect": [
						700,
						838,
						50,
						22.0
					],
					"text": "* 127"
				}
			},
			{
				"box": {
					"id": "obj-ui-bri-mul",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						"int"
					],
					"patching_rect": [
						755,
						838,
						50,
						22.0
					],
					"text": "* 127"
				}
			},
			{
				"box": {
					"id": "obj-ui-dens-mul",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						"int"
					],
					"patching_rect": [
						810,
						838,
						50,
						22.0
					],
					"text": "* 127"
				}
			},
			{
				"box": {
					"id": "obj-a-fzero",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 3,
					"outlettype": [
						"float",
						"float",
						""
					],
					"patching_rect": [
						330,
						566,
						55,
						22
					],
					"text": "fzero~"
				}
			},
			{
				"box": {
					"id": "obj-a-fsnap",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						"float"
					],
					"patching_rect": [
						330,
						599,
						95,
						22
					],
					"text": "snapshot~ 50"
				}
			},
			{
				"box": {
					"id": "obj-a-ftom",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						330,
						632,
						55,
						22
					],
					"text": "ftom"
				}
			},
			{
				"box": {
					"id": "obj-a-othr",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						"signal"
					],
					"patching_rect": [
						470,
						566,
						65,
						22
					],
					"text": ">~ 0.04"
				}
			},
			{
				"box": {
					"id": "obj-a-edge",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 2,
					"outlettype": [
						"bang",
						"bang"
					],
					"patching_rect": [
						470,
						599,
						55,
						22
					],
					"text": "edge~"
				}
			},
			{
				"box": {
					"id": "obj-a-phold",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						"float"
					],
					"patching_rect": [
						330,
						665,
						45,
						22
					],
					"text": "f"
				}
			},
			{
				"box": {
					"id": "obj-a-hdr",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						40,
						505,
						620,
						18
					],
					"text": "LISTENING — audio analysis:  adc~ -> LOUD (peakamp) / BRIGHT (zerox) / PITCH (fzero@onset) / DENSITY (inter-onset)"
				}
			},
			{
				"box": {
					"id": "obj-map-hdr",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						40,
						748,
						560,
						18
					],
					"text": "MAPPING (reactive): AUDIO-drive gates + source select (adc~ / ---bus). Open gate -> feature drives the param."
				}
			},
			{
				"box": {
					"id": "obj-map-srclbl",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						40,
						775,
						100,
						18
					],
					"text": "source select ->"
				}
			},
			{
				"box": {
					"id": "obj-map-meterlbl",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						640,
						838,
						60,
						18
					],
					"text": "meters ->"
				}
			}
		],
		"lines": [
			{
				"patchline": {
					"destination": [
						"obj-a-fzero",
						0
					],
					"order": 2,
					"source": [
						"obj-a-adc",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-a-othr",
						0
					],
					"order": 3,
					"source": [
						"obj-a-adc",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-a-peak",
						0
					],
					"order": 1,
					"source": [
						"obj-a-adc",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-a-zerox",
						0
					],
					"order": 0,
					"source": [
						"obj-a-adc",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-g-bri-adc",
						1
					],
					"source": [
						"obj-a-bri",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-g-rhy",
						1
					],
					"order": 0,
					"source": [
						"obj-a-dens",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-a-phold",
						0
					],
					"order": 0,
					"source": [
						"obj-a-edge",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-a-tbb",
						0
					],
					"order": 1,
					"source": [
						"obj-a-edge",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-a-ftom",
						0
					],
					"source": [
						"obj-a-fsnap",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-a-phold",
						1
					],
					"source": [
						"obj-a-ftom",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-a-fsnap",
						0
					],
					"source": [
						"obj-a-fzero",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-g-colmin",
						1
					],
					"source": [
						"obj-a-inv",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-g-loud-adc",
						1
					],
					"source": [
						"obj-a-loud",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-a-edge",
						0
					],
					"source": [
						"obj-a-othr",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-a-seed-lim",
						0
					],
					"order": 1,
					"source": [
						"obj-a-phold",
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
						"obj-a-prepend-notein",
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
						"obj-a-reg-qlim",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-g-reg",
						1
					],
					"source": [
						"obj-a-reg-sc",
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
						"obj-a-rhy-qlim",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-g-seed",
						1
					],
					"source": [
						"obj-a-seed-lim",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-a-timer",
						1
					],
					"source": [
						"obj-a-tbb",
						1
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-a-timer",
						0
					],
					"source": [
						"obj-a-tbb",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-g-vel",
						1
					],
					"source": [
						"obj-a-vel-clip",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-a-vel-clip",
						0
					],
					"source": [
						"obj-a-vel-sc",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-a-bsnap",
						0
					],
					"source": [
						"obj-a-zerox",
						0
					]
				}
			},
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
						"obj-a-inv",
						0
					],
					"order": 1,
					"source": [
						"obj-g-bri-adc",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-g-colmaj",
						1
					],
					"order": 2,
					"source": [
						"obj-g-bri-adc",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-a-inv",
						0
					],
					"order": 1,
					"source": [
						"obj-g-bri-bus",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-g-colmaj",
						1
					],
					"order": 2,
					"source": [
						"obj-g-bri-bus",
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
						"obj-g-colmaj",
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
						"obj-g-colmin",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-a-reg-sc",
						0
					],
					"order": 2,
					"source": [
						"obj-g-loud-adc",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-a-vel-sc",
						0
					],
					"order": 0,
					"source": [
						"obj-g-loud-adc",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-a-reg-sc",
						0
					],
					"order": 2,
					"source": [
						"obj-g-loud-bus",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-a-vel-sc",
						0
					],
					"order": 0,
					"source": [
						"obj-g-loud-bus",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-a-reg-qlim",
						0
					],
					"source": [
						"obj-g-reg",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-a-rhy-qlim",
						0
					],
					"source": [
						"obj-g-rhy",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-a-prepend-notein",
						0
					],
					"source": [
						"obj-g-seed",
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
						"obj-g-vel",
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
						"obj-init-delay",
						0
					],
					"order": 1,
					"source": [
						"obj-loadbang",
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
					"order": 0,
					"source": [
						"obj-loadbang",
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
						"obj-g-colmaj",
						0
					],
					"order": 5,
					"source": [
						"obj-map-tog",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-g-colmin",
						0
					],
					"order": 0,
					"source": [
						"obj-map-tog",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-g-reg",
						0
					],
					"order": 3,
					"source": [
						"obj-map-tog",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-g-rhy",
						0
					],
					"order": 4,
					"source": [
						"obj-map-tog",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-g-seed",
						0
					],
					"order": 1,
					"source": [
						"obj-map-tog",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-g-vel",
						0
					],
					"order": 2,
					"source": [
						"obj-map-tog",
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
						"obj-node",
						0
					],
					"order": 0,
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
					"order": 1,
					"source": [
						"obj-msg-start",
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
						"obj-prepend-triad",
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
						"obj-notes-trig",
						0
					],
					"order": 0,
					"source": [
						"obj-route",
						4
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-outlet",
						0
					],
					"order": 0,
					"source": [
						"obj-route",
						1
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-output",
						0
					],
					"order": 1,
					"source": [
						"obj-route",
						1
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
						"obj-prepend-notes",
						0
					],
					"order": 1,
					"source": [
						"obj-route",
						4
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-seq-playoff-metro",
						0
					],
					"order": 1,
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
					"order": 0,
					"source": [
						"obj-route",
						6
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
						"obj-g-bri-bus",
						1
					],
					"source": [
						"obj-rx-bright",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-g-rhy",
						1
					],
					"order": 0,
					"source": [
						"obj-rx-dens",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-g-loud-bus",
						1
					],
					"source": [
						"obj-rx-loud",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-a-seed-lim",
						0
					],
					"order": 1,
					"source": [
						"obj-rx-pitch",
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
						"obj-seq-metro",
						0
					],
					"order": 1,
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
					"order": 0,
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
					"order": 2,
					"source": [
						"obj-seq-play",
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
					"order": 1,
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
					"order": 0,
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
						"obj-g-bri-adc",
						0
					],
					"order": 0,
					"source": [
						"obj-src-inv",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-g-loud-adc",
						0
					],
					"order": 1,
					"source": [
						"obj-src-inv",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-g-bri-bus",
						0
					],
					"order": 0,
					"source": [
						"obj-src-tog",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-g-loud-bus",
						0
					],
					"order": 1,
					"source": [
						"obj-src-tog",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-src-inv",
						0
					],
					"order": 2,
					"source": [
						"obj-src-tog",
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
						"obj-test-nc",
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
						"obj-ui-bri-sl",
						0
					],
					"source": [
						"obj-ui-bri-mul",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-ui-dens-sl",
						0
					],
					"source": [
						"obj-ui-dens-mul",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-ui-loud-sl",
						0
					],
					"source": [
						"obj-ui-loud-mul",
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
					"source": [
						"obj-a-peak",
						0
					],
					"destination": [
						"obj-a-loud",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-a-bsnap",
						0
					],
					"destination": [
						"obj-a-bri",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-a-timer",
						0
					],
					"destination": [
						"obj-a-dens",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-g-loud-adc",
						0
					],
					"destination": [
						"obj-ui-loud-mul",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-g-loud-bus",
						0
					],
					"destination": [
						"obj-ui-loud-mul",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-g-bri-adc",
						0
					],
					"destination": [
						"obj-ui-bri-mul",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-g-bri-bus",
						0
					],
					"destination": [
						"obj-ui-bri-mul",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-a-dens",
						0
					],
					"destination": [
						"obj-ui-dens-mul",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-rx-dens",
						0
					],
					"destination": [
						"obj-ui-dens-mul",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-a-phold",
						0
					],
					"destination": [
						"obj-ui-pitch-sl",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-rx-pitch",
						0
					],
					"destination": [
						"obj-ui-pitch-sl",
						0
					]
				}
			}
		],
		"parameters": {
			"obj-seq-dial-7th": [
				"Seventh",
				"7th",
				0
			],
			"obj-seq-dial-maj": [
				"Major",
				"Major",
				0
			],
			"obj-seq-dial-min": [
				"Minor",
				"Minor",
				0
			],
			"obj-seq-dial-rhythm": [
				"Rhythm",
				"Rhythm",
				0
			],
			"parameterbanks": {
				"0": {
					"index": 0,
					"name": "",
					"parameters": [
						"-",
						"-",
						"-",
						"-",
						"-",
						"-",
						"-",
						"-"
					],
					"buttons": [
						"-",
						"-",
						"-",
						"-",
						"-",
						"-",
						"-",
						"-"
					]
				}
			},
			"inherited_shortname": 1
		},
		"autosave": 0
	}
}