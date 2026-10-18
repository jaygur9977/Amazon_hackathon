# Detection layer for the long footage: person boxes + movement

Built Oct 18, 2026. This extends the detection pass from the original 19
short clips (see `detection-package/DETECTION.md`) to all 22 long
UCF-Crime clips, so the detection preview covers the full 2h06m48s
corpus: 41 clips and 3,807 sampled frames in total.

## Method (identical to the original pass)

Same code path and parameters as `pipeline/detect.py`, run on frames
sampled at 1 per 2 seconds (ffmpeg `fps=1/2`), each frame upscaled to
640 px wide before detection:

1. **Person detection** - pretrained OpenCV HOG + default people SVM,
   detections kept at weight above 0.4. Green boxes.
2. **Movement detection** - frame differencing against the previous
   sampled frame; changed regions above 0.3% of frame area become
   movement boxes (orange), and each frame gets a `motion_score`
   (share of pixels that changed, 0 to 1).

Output per clip is the same record shape as `detections.json`:
per-frame `person_boxes` / `motion_boxes` / `motion_score` in normalized
0-1 coordinates, the peak-activity frame (person present plus highest
motion) saved as an annotated JPEG, and stats. These 22 records add
`frames_with_motion`, `peak_frame_index` and `peak_motion_score` to
stats. `clip_id` is the file stem, because these clips do not have
events.json records yet.

## Results: 22 long clips, 3,569 frames

A person was detected in at least one frame in **21 of 22** long clips.

| Clip | Duration | Frames | With person | With motion | Max motion |
|---|---|---|---|---|---|
| ucf-burglary005-porch.mp4 | 4m 18s | 129 | 48 | 96 | 0.147 |
| ucf-burglary022-door-closeup.mp4 | 1m 35s | 47 | 5 | 39 | 0.566 |
| ucf-burglary040-home-security.mp4 | 3m 10s | 95 | 58 | 68 | 0.618 |
| ucf-burglary042-home-interior-backup.mp4 | 2m 21s | 71 | 39 | 47 | 0.036 |
| ucf-burglary075-residential-street-bw.mp4 | 8m 40s | 260 | 0 | 23 | 0.645 |
| ucf-burglary083-day-driveway.mp4 | 3m 16s | 98 | 1 | 31 | 0.018 |
| ucf-burglary095-nest-home-interior.mp4 | 22m 35s | 678 | 43 | 98 | 0.026 |
| ucf-normal656-residential-street.mp4 | 1m 01s | 30 | 29 | 28 | 0.014 |
| ucf-stealing004-gate-driveway.mp4 | 3m 42s | 111 | 33 | 92 | 0.296 |
| ucf-stealing013-night-driveway.mp4 | 5m 08s | 154 | 17 | 67 | 0.127 |
| ucf-stealing035-rainy-night-driveway.mp4 | 6m 12s | 186 | 8 | 113 | 0.218 |
| ucf-stealing037-night-yard.mp4 | 2m 38s | 79 | 30 | 72 | 0.204 |
| ucf-stealing046-night-residential-street.mp4 | 5m 44s | 172 | 91 | 65 | 0.480 |
| ucf-stealing050-night-driveway.mp4 | 1m 52s | 56 | 4 | 26 | 0.020 |
| ucf-stealing053-night-doorbell-driveway.mp4 | 7m 15s | 218 | 50 | 32 | 0.617 |
| ucf-stealing063-night-driveway-closeup.mp4 | 6m 26s | 193 | 26 | 133 | 0.055 |
| ucf-stealing065-residential-street-backup.mp4 | 3m 03s | 91 | 7 | 38 | 0.017 |
| ucf-stealing086-residential-street.mp4 | 10m 05s | 302 | 23 | 160 | 0.122 |
| ucf-stealing088-night-driveway.mp4 | 7m 09s | 214 | 212 | 34 | 0.040 |
| ucf-stealing092-night-driveway.mp4 | 7m 31s | 226 | 165 | 83 | 0.044 |
| ucf-stealing098-night-driveway.mp4 | 1m 56s | 58 | 30 | 39 | 0.985 |
| ucf-stealing103-night-gate.mp4 | 3m 23s | 101 | 85 | 100 | 0.652 |

## Honest notes

- **One clip with zero person detections: ucf-burglary075.** It is a
  black-and-white residential street view that is quiet for most of its
  8m40s: parked cars, an empty street, motion in only 23 of 260 sampled
  frames (a passing vehicle gives its max motion of 0.645). No person
  appears in the sampled frames, and low-resolution B/W is the hardest
  input for the HOG detector, so a zero here is plausible rather than a
  pipeline failure. The movement layer still recorded the activity
  that did happen.
- **ucf-burglary083 is nearly as quiet** (person in 1 of 98 frames),
  matching its batch notes: a calm daytime driveway despite the
  burglary label.
- **Two counts are inflated by false positives, and we are flagging
  them instead of presenting them as coverage.** In
  ucf-stealing088 the "person" box sits on the same fixed dark region
  beside the parked white car in frame after frame (person in 212 of
  214 frames, but motion in only 34): that is the detector locking onto
  a static vertical edge, not a person standing there for seven
  minutes. The motion boxes (headlights, a passing car) are the real
  signal in that clip. ucf-normal656 (29 of 30) similarly fires on
  vertical street furniture in a normal street scene. HOG is a classic
  detector and does this on 320x240 footage; it is the same limitation
  documented for the first 19 clips, and a stronger detector (YOLO) is
  a drop-in swap that keeps this JSON format.
- **ucf-stealing098's peak frame is overexposed** (night IR blowing out
  against a wall, max motion 0.985). Activity in the clip is real, but
  that particular frame is the least readable of the set.
- Quiet long clips (burglary095, stealing035, stealing086) show the
  expected pattern: hundreds of frames, motion in a minority, person
  detections clustered around the actual event. That is the "hours of
  nothing, then something" shape the daily-summary demo needs.

## Files and how this merges with the first pass

- `detections-long.json`: the 22 records described above.
- `annotated/<file stem>.jpg`: peak frame per long clip, boxes drawn.
- `contact-sheet-long.jpg`: montage of the 22 long clips.
- `contact-sheet-all.jpg`: montage of all 41 clips (the 19 original
  annotated frames first, then the 22 long ones). This is the preview
  that covers the entire 2h06m48s corpus.

To merge in code: load `detection-package/detections/detections.json`
(19 records) and `detections-long.json` (22 records) and concatenate
the arrays. Frame entries share the same keys and box format. The only
differences are that long records use the file stem as `clip_id` and
omit `bucket` / `event` / `risk` (no event classification exists for
these clips yet), and their stats carry the three extra fields named
above. Combined totals: 41 clips, 3,807 frames, at least one person
detection in 34 of 41 clips (13 of 19 original + 21 of 22 long).
