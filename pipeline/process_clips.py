#!/usr/bin/env python3
"""
Ring-AI clip pipeline (Phases 3, 4 and 5 in one script).

Phase 3: extract frames from a clip (1 frame every 2 seconds, via ffmpeg).
Phase 4: send the frames to a pretrained vision model (Claude API) with one
         fixed instruction and get back a single event record per clip.
Phase 5: optional. If a ground-truth events.json is passed with --validate,
         compare the model records against it and print the agreement.

No training and no fine-tuning happen here. The model is used as-is.

Usage:
    pip install anthropic
    export ANTHROPIC_API_KEY=your_key_here

    # frames only (Phase 3), no API key needed:
    python3 process_clips.py path/to/clips --frames-only

    # full run (Phases 3 + 4), writes events-pipeline.json
    python3 process_clips.py path/to/clips

    # full run plus validation (Phase 5) against ground truth:
    python3 process_clips.py path/to/clips --validate ../events/events.json

Input can be a flat folder of .mp4 files or a folder with bucket subfolders.
Output records match the events.json shape used by the app.
"""

import argparse, base64, json, os, subprocess, sys, tempfile

MODEL = "claude-sonnet-4-5"
EVENTS = ["package_delivered", "package_left_at_door", "visitor_at_door",
          "package_collected_by_resident", "package_taken_by_stranger",
          "person_lingering", "unusual_activity"]

INSTRUCTION = """You are the event classifier for a doorbell-camera app.
You will see still frames sampled from one short clip, in time order.
Answer with ONLY a JSON object, no other text, in exactly this shape:
{"event": "...", "objects": ["..."], "risk": "low or high",
 "unusual": true or false, "description": "one plain sentence"}
Rules:
- event must be one of: {events}.
- Choose the event that best matches what actually happens across the frames.
- If a resident receives boxes at their own door and no courier is visible
  in the frames, prefer package_collected_by_resident over package_delivered.
- risk is "high" and unusual is true when someone takes something that is
  not theirs, tampers with a car or door, lingers at night, or behaves in a
  way a homeowner would want an alert for.
- description is one simple sentence a homeowner would understand, written
  so it can be found later by searching ordinary words.
"""


def extract_frames(clip_path, out_dir, every_seconds=2, max_frames=10):
    """Phase 3: sample frames from the clip with ffmpeg."""
    os.makedirs(out_dir, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-i", clip_path, "-vf",
                    f"fps=1/{every_seconds}", os.path.join(out_dir, "f-%03d.jpg")],
                   check=True)
    frames = sorted(f for f in os.listdir(out_dir) if f.endswith(".jpg"))
    if len(frames) > max_frames:
        idx = [round(i * (len(frames) - 1) / (max_frames - 1)) for i in range(max_frames)]
        frames = [frames[i] for i in idx]
    return [os.path.join(out_dir, f) for f in frames]


def classify(clip_path, frames):
    """Phase 4: one vision-model call per clip, strict JSON back."""
    import anthropic  # pip install anthropic
    client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from environment
    content = []
    for f in frames:
        with open(f, "rb") as fh:
            content.append({"type": "image", "source": {
                "type": "base64", "media_type": "image/jpeg",
                "data": base64.b64encode(fh.read()).decode()}})
    content.append({"type": "text",
                    "text": INSTRUCTION.replace("{events}", ", ".join(EVENTS))})
    msg = client.messages.create(model=MODEL, max_tokens=400,
                                 messages=[{"role": "user", "content": content}])
    text = msg.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    rec = json.loads(text)
    if rec["event"] not in EVENTS:
        raise ValueError(f"model returned unknown event: {rec['event']}")
    fn = os.path.basename(clip_path)
    stem = os.path.splitext(fn)[0]
    return {"clip_id": stem, "file_name": fn,
            "bucket": os.path.basename(os.path.dirname(clip_path)),
            "timestamp": "", "event": rec["event"],
            "objects": rec.get("objects", []), "risk": rec["risk"],
            "unusual": bool(rec["unusual"]), "description": rec["description"],
            "source": "pipeline-script"}


def validate(records, truth_path):
    """Phase 5: compare model records against ground truth by file_name."""
    truth = {e["file_name"]: e for e in json.load(open(truth_path))}
    n = ev = rk = un = 0
    print("\nPhase 5 validation against", truth_path)
    for r in records:
        g = truth.get(r["file_name"])
        if not g:
            continue
        n += 1
        ev += r["event"] == g["event"]; rk += r["risk"] == g["risk"]
        un += r["unusual"] == g["unusual"]
        if r["event"] != g["event"]:
            print(f"  MISS {r['file_name']}: truth={g['event']} model={r['event']}")
    if n:
        print(f"  clips compared: {n}  event agreement: {ev}/{n}  "
              f"risk: {rk}/{n}  unusual: {un}/{n}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input_dir")
    ap.add_argument("--output", default="events-pipeline.json")
    ap.add_argument("--validate", default=None, help="path to ground-truth events.json")
    ap.add_argument("--frames-only", action="store_true",
                    help="Phase 3 only: extract frames, no model call")
    ap.add_argument("--frames-out", default="frames")
    args = ap.parse_args()

    clips = []
    for root, _, files in os.walk(args.input_dir):
        clips += [os.path.join(root, f) for f in files if f.endswith(".mp4")]
    clips.sort()
    if not clips:
        sys.exit("No .mp4 clips found under " + args.input_dir)

    records = []
    for clip in clips:
        name = os.path.splitext(os.path.basename(clip))[0]
        if args.frames_only:
            frames = extract_frames(clip, os.path.join(args.frames_out, name))
            print(f"{name}: {len(frames)} frames extracted")
            continue
        with tempfile.TemporaryDirectory() as td:
            frames = extract_frames(clip, td)
            rec = classify(clip, frames)
        records.append(rec)
        print(f"{name}: {rec['event']} (risk {rec['risk']}, unusual {rec['unusual']})")

    if not args.frames_only:
        with open(args.output, "w") as fh:
            json.dump(records, fh, indent=2)
        print(f"\nWrote {len(records)} records to {args.output}")
        if args.validate:
            validate(records, args.validate)


if __name__ == "__main__":
    main()
