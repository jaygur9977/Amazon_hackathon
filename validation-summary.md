# Phase 5 validation: model output vs ground truth

Method: frames were extracted from every clip (1 frame every 2 seconds,
Phase 3). A pretrained vision model then described each clip from its
frames only, without seeing the clip log (Phase 4). Its event records were
compared field by field against the ground-truth records in
events/events.json, which come from the human-verified clip log.

## Results (19 clips)

- Event type agreement: 18 of 19 (94.7%)
- Risk rating agreement: 19 of 19 (100%)
- Unusual flag agreement: 19 of 19 (100%)

## The one miss

pickup-03 (ground truth: package_collected_by_resident, model:
package_delivered). The clip is a tight close-up at the door: hands pass
boxes to the resident and she carries them inside, with the courier mostly
out of frame. It is the companion angle of the delivery-03 scene, so both
labels are defensible from the frames alone. The fix is instructional, not
more data: the model prompt should say that when the person receiving is
the resident and no courier is visible, prefer
package_collected_by_resident.

## What this proves

A pretrained vision model, with zero training on our data, reads short
doorbell-style clips and produces event records accurate enough to power
search, alerts, and the daily summary. The labeled clip set works as the
evaluation set, exactly as planned.
