# Pipeline handover: how the data side works and what the app reads

Everything on the data side (Vee's side) is complete. This file explains
what exists, how it was produced, and what the app should consume.

## Files in this package

- `clip-log.csv` - the ground-truth log for all 19 clips (human verified).
- `events/events.json` - ground-truth event records, one per clip. This is
  the file the app should read for the demo.
- `events/model-events.json` - the records the pretrained vision model
  produced from frames alone (Phase 4 output), same shape.
- `validation-summary.md` - Phase 5 comparison of the two files above.
- `thumbnails/` - one frame-strip image per clip. These double as preview
  images for the clip list in the app UI.

The clips themselves live in the shared Drive folder "Amazon Hackathon
Clips", in the five bucket folders, with names matching `file_name` in the
records.

## The pipeline (Phases 3 to 5, all automated in the real app)

1. Phase 3, frames: each clip is opened by code and sampled at 1 frame
   every 2 seconds. A 30 second clip becomes about 15 still images.
2. Phase 4, model: the frames plus one fixed instruction go to a
   pretrained vision model. The instruction asks for: event type, objects
   visible, risk (low or high), unusual (true or false), and one plain
   sentence of description, returned in the event record shape.
3. Phase 5, check: model records are compared against the clip log. Fixes
   are made to the instruction wording, never by hand-editing outputs.

No model was trained or fine-tuned. The labeled set is the evaluation set.

## Event record shape (what the app reads)

- `clip_id`, `file_name`, `bucket`, `timestamp`
- `event`: one of package_delivered, package_left_at_door, visitor_at_door,
  package_collected_by_resident, package_taken_by_stranger,
  person_lingering, unusual_activity
- `objects`: list, for example ["person", "package"]
- `risk`: "low" or "high"
- `unusual`: true or false
- `description`: one searchable sentence

## How the app features map to the data

- Clip list: one row per record, thumbnail from `thumbnails/`, description
  as the caption, event as the tag.
- Search: match the query words against `description`, `event`, and
  `objects`. "Show me all the clips of when I ordered packages" should
  return the package_delivered records.
- Alerts screen: every record with unusual = true or risk = high.
- Daily summary: counts per event for the day, with first and last
  timestamps, for example "4 deliveries, first at 10:14 AM, 3 visitors,
  9 flagged events".

## Honest notes for the writeup

- The theft bucket is property theft at a residence (real CCTV of car
  break-ins and parts theft at homes, plus one staged stock clip), because
  genuine porch package-theft footage does not exist in public datasets.
  Each log row states exactly what its clip shows.
- suspicious-05 is an interior home camera clip, flagged as such in the log.
- The set is a proof-of-concept evaluation set (19 clips). Scaling means
  adding clips, which needs no retraining.
