# Verified package: footage, events, detection (Oct 18)

Everything below was checked against the files themselves, not summaries.

## The numbers
- Total footage: 2h 06m 48s across 41 clips (19 original + 22 long), recomputed from the files.
- Event records: 41 (events-all.json). The original 19 are unchanged from the repo; the 22 long clips are L-01 to L-22, bucket "long-footage", with duration_sec on each record.
- Detection records: 41 (detections-all.json), 3,807 frames sampled at 1 per 2 seconds. Person detected in 34 of 41 clips. The clip_id sets in events-all.json and detections-all.json are identical, verified programmatically. Join on clip_id or file_name; both are on every record.
- Long-clip event check against the human frame-check notes: 20 agree, 2 partial, 0 disagree (validation-long.md).

## Questions already answered
1. Is this Ring footage? No. It is real fixed home-camera footage from the UCF-Crime research dataset (cite: Sultani, Chen and Shah, CVPR 2018). Genuine Ring footage is private user video and is not published in any dataset. The product takes Ring clips as its input source in a real deployment; the model works on the frames either way.
2. Where does the footage live? The full set (about 1.4 GB total across batches) goes in the shared Drive, not GitHub. The demo should use the named clips below; the rest is the corpus behind the summary and search.
3. Sources and license: every batch folder has a SOURCES.md with origin, license terms (research use), and per-clip frame-check notes.
4. Why is event coverage one record per long clip? v1 scope. A 22-minute clip gets one summary record built from frames across its full duration plus its motion peak. Per-event segmentation inside long clips is the v2 step, not hidden.
5. Why did the detector miss people in some clips? The person detector is a classic pretrained model at 320x240; it misses some poses and night frames. The movement layer covers every clip, and the misses are listed per clip in DETECTION_LONG.md, including the two static false positives, flagged rather than hidden. A stronger detector swaps in without changing the JSON format.
6. Why do most long clips say unusual_activity? The event enum has no burglary or vehicle-theft code. Forced entries, car break-ins, and vehicle thefts sit under unusual_activity with the specifics in the description text, which is what search reads. Quiet baseline clips carry unusual=false and risk low.
7. Are the timestamps real? The 19 originals carry their handover timestamps. The 22 long clips carry a synthetic demo-day timeline (Oct 18, chained from 06:00 by real durations) so the timeline and daily summary read as one day of footage.

## Demo picks (long clips)
- ucf-burglary005-porch.mp4: front porch, person tries the door (hero).
- ucf-stealing053-night-doorbell-driveway.mp4: textbook doorbell framing at night.
- ucf-burglary095-nest-home-interior.mp4: 22m35s Nest home camera, daily-summary material.
- ucf-stealing004-gate-driveway.mp4 and ucf-stealing092-night-driveway.mp4: gate and night driveway events.
- ucf-burglary083-day-driveway.mp4: the quiet baseline that proves the system stays silent when nothing happens.

## Still open (team items, not data)
- Shadow needs Drive access approved; his email is still needed for the invite.
- Devpost residence eligibility for an India-based teammate is unchecked.
