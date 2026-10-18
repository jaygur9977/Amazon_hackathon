# Validation: event records for the 22 long clips (L-01 to L-22)

## Method

- Frames already extracted at 1 frame per 2 seconds for every long clip
  (from the detection pass working set) were reused.
- For each clip a labeled frame strip was built: 24 frames spread evenly
  across the clip plus a 12-frame zoom strip on the highest-motion window
  (frame-differencing peak). Each strip was viewed and the clip classified
  from what the frames actually show: who is present, what they touch,
  whether anything is taken, and whether the scene stays quiet.
- Where the wide strip was ambiguous, extra zoom passes at native
  resolution were used before deciding (L-09 stealing050, L-14
  burglary095, L-16 stealing046, L-17 stealing053).
- Only after classifying were the records compared with the human
  frame-check notes in each batch's SOURCES.md, and an agreement mark
  (agree, partial, disagree) recorded per clip in clip-log-long.csv.
- Timestamps are a synthetic demo-day chain starting 2026-10-18T06:00:00,
  each clip starting when the previous one ends, using real ffprobe
  durations. They are not the clips' real capture times.

## Results

- 22 new records in events-long.json; events-all.json holds the repo's
  19 original records plus these 22, for 41 records total.
- Event codes: unusual_activity 21, person_lingering 1.
- Flagged records (unusual = true, risk = high): 17.
- Quiet baseline records (unusual = false, risk = low): 5
  (L-06, L-07, L-13, L-20, L-21).
- Agreement with the human frame-check notes: agree 20, partial 2,
  disagree 0.
- Combined footage covered by event data is now about 2 h 07 min
  (7,609 s including the original 19 clips).

## The two partial agreements

- L-10 (stealing098): the human note centers on people moving around the
  parked motorcycles. The model pass found one person moving between the
  parked car and pickup for about a minute, and the camera view whites
  out at the end, which the human note does not mention. Same scene and
  same person activity; the specifics differ.
- L-16 (stealing046): the human note calls the clip quiet-leaning and
  describes one car arriving mid-clip. The denser model pass shows the
  parked white hatchback's door opening, its headlights coming on, and
  the car being driven away, which reads as the dataset's stealing event
  rather than an arrival. Same vehicle movement, different reading.

## Honest limits

- One summary record per long clip, not per-event segmentation. Several
  clips pair a long quiet lead-in with a single short event (L-03 sits
  still for over three minutes before the motorcycle is taken), and the
  single record describes the dominant content of the whole clip.
- The event enum has no burglary or vehicle-theft code. Forced entries
  (L-04, L-05, L-12, L-14), car break-ins (L-09, L-18, L-19, L-22) and
  vehicle thefts (L-02, L-03, L-08, L-11, L-16) are therefore recorded as
  unusual_activity with risk high and unusual true; the description
  carries the specifics.
- The enum also has no "no event" code. The five quiet clips are normal
  baseline footage: L-06 and L-13 are quiet despite Burglary dataset
  labels, L-20 and L-21 are quiet despite Stealing dataset labels, and
  L-07 is a genuine UCF normal video. They are coded unusual_activity
  only because that is the closest available code, and they carry
  unusual = false and risk = low so the app will not alert on them.
- Sampling is one frame every 2 seconds. An action shorter than the gap
  between sampled frames could be missed; zoom passes on motion peaks
  were used to reduce that risk, and total motion was checked per clip.
- L-11 (stealing103) is a compilation in its source form: after the
  night gate scene it cuts to unrelated indoor office footage with a
  channel watermark. The record describes the gate scene, which is the
  residential content the clip was kept for.
- L-01 is the one person_lingering call: the person never gets in and
  takes nothing on camera, but spends minutes at the front door trying
  it, leaves, and returns with a second person.
