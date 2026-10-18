# Detection layer: person boxes + movement

Built Oct 17, 2026. This is the visual AI layer Michelle asked for: boxes
around people and movement, so the app can show detection happening instead
of only listing events.

## What it does

`pipeline/detect.py` runs after the frame extraction step of
`process_clips.py` (same frames: 1 per 2 seconds). For every frame it runs:

1. **Person detection** - a pretrained person detector (OpenCV HOG +
   default people SVM). No training, no fine-tuning, same approach as the
   event classifier: pretrained model used as-is.
2. **Movement detection** - frame differencing against the previous frame.
   Regions that changed become movement boxes, and each frame gets a
   `motion_score` (share of pixels that changed, 0 to 1).

It writes one annotated image per clip (the peak-activity frame, with green
"person" boxes and orange "movement" boxes) plus `detections.json` with the
per-frame data the app can draw live.

## Run it

```bash
pip install "opencv-python-headless==4.10.0.84" numpy
python pipeline/detect.py --frames-dir <frames root> \
    --events events/events.json --out detections
```

`--frames-dir` holds one folder per clip named by file stem
(`delivery-01/frame-001.jpg`, ...), exactly what the pipeline already makes.

## detections.json format

One record per clip, keyed like events.json (`clip_id`, `file_name`,
`bucket`, `event`, `risk`), plus:

- `frames`: one entry per sampled frame:
  - `frame`: image file name, `t_seconds`: offset in the clip
  - `person_boxes`: `[[x, y, w, h], ...]` normalized 0-1 (multiply by the
    displayed image width/height to draw)
  - `motion_boxes`: same format, for movement regions
  - `motion_score`: 0-1, good for a movement meter or timeline heat bar
- `peak_frame` / `peak_time_seconds`: the frame with a person plus the most
  movement; `annotated_image` is that frame with boxes already drawn
- `stats`: frame count, frames with a person, max motion score

App display: when showing a clip frame, draw `person_boxes` in green and
`motion_boxes` in orange over the image, and use `motion_score` for a
"movement" indicator under the timeline.

## Results on the current 19 clips

238 frames processed. A person was detected in 13 of 19 clips, including
the hero suspicious clip (S-01) and the theft clips (T-01, T-02, T-04).
Movement boxes cover every clip, including the ones the person detector
missed.

## Honest limits

- HOG is a classic detector: it misses some poses (person partly hidden by
  a gate in the visitor clips, crouching in S-02) and can occasionally fire
  on box-shaped objects (a cardboard box in D-04). The movement layer is
  the backup signal, which is why both are in the output.
- Swapping in a stronger detector later (for example YOLO) is a drop-in
  change: only `detect.py` changes, the JSON format stays the same.
