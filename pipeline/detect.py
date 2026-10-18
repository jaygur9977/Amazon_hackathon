#!/usr/bin/env python3
"""Detection pass for the Ring video-AI hackathon project.

Adds the visual AI layer on top of the frame extraction step:
- person detection (pretrained OpenCV HOG person detector, no training)
- movement detection (frame differencing) with motion region boxes
- per-frame bounding boxes in normalized coordinates for app overlays
- one annotated peak-activity frame per clip

Usage:
  python detect.py --frames-dir <dir with one folder per clip> \
                   --events <events.json> --out <output dir>

Frames are expected as <frames-dir>/<clip-file-stem>/frame-001.jpg ...
sampled at 1 frame per 2 seconds (same as process_clips.py).
Output: detections.json, annotated/<stem>.jpg per clip, contact-sheet.jpg
"""
import argparse, json, os, sys
import cv2
import numpy as np

def norm_box(x, y, w, h, W, H):
    return [round(x / W, 4), round(y / H, 4), round(w / W, 4), round(h / H, 4)]

def motion_boxes(diff, W, H):
    mask = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)[1]
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    mask = cv2.dilate(mask, np.ones((5, 5), np.uint8), iterations=2)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    boxes = []
    for c in contours:
        area = cv2.contourArea(c)
        if area < 0.003 * W * H:  # ignore specks under 0.3% of frame
            continue
        x, y, w, h = cv2.boundingRect(c)
        boxes.append((x, y, w, h, area))
    boxes.sort(key=lambda b: -b[4])
    return [norm_box(x, y, w, h, W, H) for x, y, w, h, _ in boxes[:5]], float(np.mean(diff > 25))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--frames-dir", required=True)
    ap.add_argument("--events", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    os.makedirs(os.path.join(args.out, "annotated"), exist_ok=True)

    events = {os.path.splitext(e["file_name"])[0]: e for e in json.load(open(args.events))}
    hog = cv2.HOGDescriptor()
    hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())

    results = []
    for stem in sorted(events):
        fdir = os.path.join(args.frames_dir, stem)
        if not os.path.isdir(fdir):
            print(f"skip {stem}: no frames dir", file=sys.stderr); continue
        files = sorted(f for f in os.listdir(fdir) if f.startswith("frame-") and f.endswith(".jpg"))
        frames_out, prev_gray, peak = [], None, None
        for i, fn in enumerate(files):
            img = cv2.imread(os.path.join(fdir, fn))
            if img is None: continue
            h0, w0 = img.shape[:2]
            scale = 640 / w0
            img_s = cv2.resize(img, (640, int(h0 * scale)))
            H, W = img_s.shape[:2]
            gray = cv2.cvtColor(img_s, cv2.COLOR_BGR2GRAY)
            gray = cv2.GaussianBlur(gray, (5, 5), 0)
            # person detection (pretrained HOG)
            rects, weights = hog.detectMultiScale(img_s, winStride=(8, 8), padding=(8, 8), scale=1.05)
            pboxes = [norm_box(int(x), int(y), int(w), int(h), W, H)
                      for (x, y, w, h), wt in zip(rects, weights) if wt > 0.4]
            # movement vs previous frame
            if prev_gray is not None and prev_gray.shape == gray.shape:
                mboxes, mscore = motion_boxes(cv2.absdiff(gray, prev_gray), W, H)
            else:
                mboxes, mscore = [], 0.0
            prev_gray = gray
            rec = {"frame": fn, "t_seconds": i * 2, "person_boxes": pboxes,
                   "motion_boxes": mboxes, "motion_score": round(mscore, 4)}
            frames_out.append(rec)
            score = (1.0 if pboxes else 0.0) + mscore
            if peak is None or score > peak[0]:
                peak = (score, i, img_s, rec)
        # annotate peak frame
        annotated_name = None
        if peak is not None:
            _, _, img_s, rec = peak
            ann = img_s.copy(); H, W = ann.shape[:2]
            for (x, y, w, h) in rec["motion_boxes"]:
                p1, p2 = (int(x * W), int(y * H)), (int((x + w) * W), int((y + h) * H))
                cv2.rectangle(ann, p1, p2, (0, 165, 255), 2)
                cv2.putText(ann, "movement", (p1[0], max(14, p1[1] - 5)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 165, 255), 2)
            for (x, y, w, h) in rec["person_boxes"]:
                p1, p2 = (int(x * W), int(y * H)), (int((x + w) * W), int((y + h) * H))
                cv2.rectangle(ann, p1, p2, (0, 255, 0), 2)
                cv2.putText(ann, "person", (p1[0], max(14, p1[1] - 5)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
            annotated_name = f"annotated/{stem}.jpg"
            cv2.imwrite(os.path.join(args.out, annotated_name), ann)
        ev = events[stem]
        results.append({
            "clip_id": ev["clip_id"], "file_name": ev["file_name"], "bucket": ev["bucket"],
            "event": ev["event"], "risk": ev["risk"],
            "frames": frames_out,
            "peak_frame": frames_out[peak[1]]["frame"] if peak else None,
            "peak_time_seconds": frames_out[peak[1]]["t_seconds"] if peak else None,
            "annotated_image": annotated_name,
            "stats": {"frames": len(frames_out),
                      "frames_with_person": sum(1 for f in frames_out if f["person_boxes"]),
                      "max_motion_score": max((f["motion_score"] for f in frames_out), default=0)},
        })
        r = results[-1]
        print(f"{r['clip_id']} {stem}: {r['stats']['frames']} frames, person in "
              f"{r['stats']['frames_with_person']}, peak {r['peak_frame']}")
    json.dump(results, open(os.path.join(args.out, "detections.json"), "w"), indent=2)
    print(f"wrote {len(results)} clips to {args.out}/detections.json")

if __name__ == "__main__":
    main()
