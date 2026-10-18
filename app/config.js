// Data source settings. Change these to point the timeline at a different
// JSON file or clip location; nothing in the UI needs to change.

export const EVENTS_URL = 'events/events.json';

const CLIPS_ROOT = 'clips/amazon_hackathon_clips';

// Resolve a record to its video clip by file_name. Clips are stored as
// <bucket>/<bucket>/<file_name> inside CLIPS_ROOT.
export function clipUrl(record) {
  const parts = [record.bucket, record.bucket, record.file_name].map(encodeURIComponent);
  return [CLIPS_ROOT, ...parts].join('/');
}
