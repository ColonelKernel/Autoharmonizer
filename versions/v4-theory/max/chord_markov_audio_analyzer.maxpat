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
        "rect": [ 134.0, 167.0, 820.0, 400.0 ],
        "openinpresentation": 1,
        "boxes": [
            {
                "box": {
                    "id": "obj-title",
                    "linecount": 2,
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 20.0, 15.0, 720.0, 33.0 ],
                    "text": "CHORD MARKOV — AUDIO ANALYZER (M3). Audio Effect: place on an AUDIO track. Passes audio through and sends features on the global ---bus to the Chord Markov MIDI device/sequencer."
                }
            },
            {
                "box": {
                    "id": "obj-plugin",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 2,
                    "outlettype": [ "signal", "signal" ],
                    "patching_rect": [ 40.0, 70.0, 60.0, 22.0 ],
                    "text": "plugin~"
                }
            },
            {
                "box": {
                    "id": "obj-plugout",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 2,
                    "outlettype": [ "signal", "signal" ],
                    "patching_rect": [ 40.0, 103.0, 70.0, 22.0 ],
                    "text": "plugout~"
                }
            },
            {
                "box": {
                    "id": "obj-peak",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "float" ],
                    "patching_rect": [ 40.0, 150.0, 95.0, 22.0 ],
                    "text": "peakamp~ 50"
                }
            },
            {
                "box": {
                    "id": "obj-loud",
                    "maxclass": "newobj",
                    "numinlets": 5,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 40.0, 183.0, 120.0, 22.0 ],
                    "text": "zmap 0. 0.3 0. 1."
                }
            },
            {
                "box": {
                    "id": "obj-send-loud",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 40.0, 216.0, 110.0, 22.0 ],
                    "text": "send ---loud"
                }
            },
            {
                "box": {
                    "id": "obj-zerox",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "signal", "signal" ],
                    "patching_rect": [ 200.0, 150.0, 55.0, 22.0 ],
                    "text": "zerox~"
                }
            },
            {
                "box": {
                    "id": "obj-bsnap",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "float" ],
                    "patching_rect": [ 200.0, 183.0, 95.0, 22.0 ],
                    "text": "snapshot~ 50"
                }
            },
            {
                "box": {
                    "id": "obj-bri",
                    "maxclass": "newobj",
                    "numinlets": 5,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 200.0, 216.0, 120.0, 22.0 ],
                    "text": "zmap 0. 24. 0. 1."
                }
            },
            {
                "box": {
                    "id": "obj-send-bright",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 200.0, 249.0, 120.0, 22.0 ],
                    "text": "send ---bright"
                }
            },
            {
                "box": {
                    "id": "obj-send-pitch",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 380.0, 282.0, 110.0, 22.0 ],
                    "text": "send ---pitch"
                }
            },
            {
                "box": {
                    "id": "obj-tbb",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "bang", "bang" ],
                    "patching_rect": [ 540.0, 216.0, 55.0, 22.0 ],
                    "text": "t b b"
                }
            },
            {
                "box": {
                    "id": "obj-timer",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 2,
                    "outlettype": [ "float", "" ],
                    "patching_rect": [ 540.0, 249.0, 55.0, 22.0 ],
                    "text": "timer"
                }
            },
            {
                "box": {
                    "id": "obj-dens",
                    "maxclass": "newobj",
                    "numinlets": 5,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 540.0, 282.0, 120.0, 22.0 ],
                    "text": "zmap 100 800 1. 0."
                }
            },
            {
                "box": {
                    "id": "obj-send-dens",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 540.0, 315.0, 110.0, 22.0 ],
                    "text": "send ---dens"
                }
            },
            {
                "box": {
                    "fontface": 1,
                    "id": "obj-ui-hdr",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 900.0, 40.0, 300.0, 20.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 18.0, 14.0, 300.0, 20.0 ],
                    "text": "AUDIO ANALYZER — features on ---bus"
                }
            },
            {
                "box": {
                    "id": "obj-ui-loud-lbl",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 900.0, 70.0, 80.0, 20.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 18.0, 44.0, 80.0, 20.0 ],
                    "text": "LOUD"
                }
            },
            {
                "box": {
                    "id": "obj-ui-bri-lbl",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 900.0, 94.0, 80.0, 20.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 18.0, 74.0, 80.0, 20.0 ],
                    "text": "BRIGHT"
                }
            },
            {
                "box": {
                    "id": "obj-ui-dens-lbl",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 900.0, 118.0, 80.0, 20.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 18.0, 104.0, 80.0, 20.0 ],
                    "text": "DENSITY"
                }
            },
            {
                "box": {
                    "id": "obj-ui-pitch-lbl",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 900.0, 142.0, 80.0, 20.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 18.0, 134.0, 80.0, 20.0 ],
                    "text": "PITCH"
                }
            },
            {
                "box": {
                    "id": "obj-ui-hint",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 900.0, 166.0, 300.0, 20.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 18.0, 164.0, 300.0, 20.0 ],
                    "text": "Put on an audio track; passes audio through."
                }
            },
            {
                "box": {
                    "id": "obj-ui-loud-sl",
                    "maxclass": "slider",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "orientation": 1,
                    "outlettype": [ "" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 40.0, 200.0, 128.0, 16.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 100.0, 44.0, 200.0, 16.0 ]
                }
            },
            {
                "box": {
                    "id": "obj-ui-bri-sl",
                    "maxclass": "slider",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "orientation": 1,
                    "outlettype": [ "" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 200.0, 220.0, 128.0, 16.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 100.0, 74.0, 200.0, 16.0 ]
                }
            },
            {
                "box": {
                    "id": "obj-ui-dens-sl",
                    "maxclass": "slider",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "orientation": 1,
                    "outlettype": [ "" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 540.0, 240.0, 128.0, 16.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 100.0, 104.0, 200.0, 16.0 ]
                }
            },
            {
                "box": {
                    "id": "obj-ui-pitch-sl",
                    "maxclass": "slider",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "orientation": 1,
                    "outlettype": [ "" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 380.0, 260.0, 128.0, 16.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 100.0, 134.0, 200.0, 16.0 ]
                }
            },
            {
                "box": {
                    "id": "obj-ui-loud-mul",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "int" ],
                    "patching_rect": [ 40.0, 150.0, 50.0, 22.0 ],
                    "text": "* 127"
                }
            },
            {
                "box": {
                    "id": "obj-ui-bri-mul",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "int" ],
                    "patching_rect": [ 200.0, 183.0, 50.0, 22.0 ],
                    "text": "* 127"
                }
            },
            {
                "box": {
                    "id": "obj-ui-dens-mul",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "int" ],
                    "patching_rect": [ 540.0, 216.0, 50.0, 22.0 ],
                    "text": "* 127"
                }
            },
            {
                "box": {
                    "id": "obj-s-fzero",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 3,
                    "outlettype": [ "float", "float", "" ],
                    "patching_rect": [ 40.0, 150.0, 55.0, 22.0 ],
                    "text": "fzero~"
                }
            },
            {
                "box": {
                    "id": "obj-s-fsnap",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "float" ],
                    "patching_rect": [ 380.0, 183.0, 95.0, 22.0 ],
                    "text": "snapshot~ 50"
                }
            },
            {
                "box": {
                    "id": "obj-s-ftom",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 380.0, 216.0, 55.0, 22.0 ],
                    "text": "ftom"
                }
            },
            {
                "box": {
                    "id": "obj-s-othr",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "signal" ],
                    "patching_rect": [ 40.0, 150.0, 65.0, 22.0 ],
                    "text": ">~ 0.04"
                }
            },
            {
                "box": {
                    "id": "obj-s-edge",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "bang", "bang" ],
                    "patching_rect": [ 540.0, 183.0, 55.0, 22.0 ],
                    "text": "edge~"
                }
            },
            {
                "box": {
                    "id": "obj-s-phold",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "float" ],
                    "patching_rect": [ 380.0, 249.0, 45.0, 22.0 ],
                    "text": "f"
                }
            },
            {
                "box": {
                    "id": "obj-listen-hdr",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 40.0, 132.0, 641.0, 20.0 ],
                    "text": "LISTENING lanes:  LOUD (peakamp) / BRIGHT (zerox) / PITCH (fzero@onset) / DENSITY (inter-onset)  -> send ---bus"
                }
            }
        ],
        "lines": [
            {
                "patchline": {
                    "destination": [ "obj-send-bright", 0 ],
                    "order": 0,
                    "source": [ "obj-bri", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-ui-bri-mul", 0 ],
                    "order": 1,
                    "source": [ "obj-bri", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-bri", 0 ],
                    "source": [ "obj-bsnap", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-send-dens", 0 ],
                    "order": 0,
                    "source": [ "obj-dens", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-ui-dens-mul", 0 ],
                    "order": 1,
                    "source": [ "obj-dens", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-send-loud", 0 ],
                    "order": 0,
                    "source": [ "obj-loud", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-ui-loud-mul", 0 ],
                    "order": 1,
                    "source": [ "obj-loud", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-loud", 0 ],
                    "source": [ "obj-peak", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-peak", 0 ],
                    "order": 3,
                    "source": [ "obj-plugin", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-plugout", 1 ],
                    "source": [ "obj-plugin", 1 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-plugout", 0 ],
                    "order": 4,
                    "source": [ "obj-plugin", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-s-fzero", 0 ],
                    "order": 1,
                    "source": [ "obj-plugin", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-s-othr", 0 ],
                    "order": 2,
                    "source": [ "obj-plugin", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-zerox", 0 ],
                    "order": 0,
                    "source": [ "obj-plugin", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-s-phold", 0 ],
                    "order": 1,
                    "source": [ "obj-s-edge", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-tbb", 0 ],
                    "order": 0,
                    "source": [ "obj-s-edge", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-s-ftom", 0 ],
                    "source": [ "obj-s-fsnap", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-s-phold", 1 ],
                    "source": [ "obj-s-ftom", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-s-fsnap", 0 ],
                    "source": [ "obj-s-fzero", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-s-edge", 0 ],
                    "source": [ "obj-s-othr", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-send-pitch", 0 ],
                    "order": 0,
                    "source": [ "obj-s-phold", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-ui-pitch-sl", 0 ],
                    "order": 1,
                    "source": [ "obj-s-phold", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-timer", 1 ],
                    "source": [ "obj-tbb", 1 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-timer", 0 ],
                    "source": [ "obj-tbb", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-dens", 0 ],
                    "source": [ "obj-timer", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-ui-bri-sl", 0 ],
                    "source": [ "obj-ui-bri-mul", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-ui-dens-sl", 0 ],
                    "source": [ "obj-ui-dens-mul", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-ui-loud-sl", 0 ],
                    "source": [ "obj-ui-loud-mul", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-bsnap", 0 ],
                    "source": [ "obj-zerox", 0 ]
                }
            }
        ],
        "autosave": 0
    }
}