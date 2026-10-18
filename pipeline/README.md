# Automatic pipeline script

`process_clips.py` is the automatic version of the pipeline described in
../PIPELINE.md. Drop in a folder of clips and it does everything:

- Phase 3: extracts frames from each clip (ffmpeg, 1 frame every 2 seconds)
- Phase 4: sends the frames to a pretrained vision model (Claude API) and
  gets back one event record per clip, in the exact events.json shape
- Phase 5: with --validate, compares those records against a ground-truth
  events.json and prints the agreement scores

Setup (one time):

    pip install anthropic
    export ANTHROPIC_API_KEY=...your key...

Run it:

    # extract frames only, no key needed
    python3 process_clips.py /path/to/clips --frames-only

    # full automatic run
    python3 process_clips.py /path/to/clips

    # full run plus the accuracy check against our hand-checked records
    python3 process_clips.py /path/to/clips --validate ../events/events.json

Output: events-pipeline.json, ready for the app to read exactly like
events/events.json.

In the finished app, this same script (or its logic inside the app backend)
runs by itself every time a new clip arrives. In this project it was also
run ahead of time over the 19 demo clips, which is where
events/model-events.json and ../validation-summary.md came from.
