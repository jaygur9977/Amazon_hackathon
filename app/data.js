// Data layer: loads and normalizes event records. No DOM code here.

import { EVENTS_URL, clipUrl } from './config.js';

const REQUIRED_FIELDS = ['file_name', 'timestamp', 'description'];

export async function loadEvents(url = EVENTS_URL) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load ${url} (HTTP ${response.status})`);
  }
  const records = await response.json();
  if (!Array.isArray(records)) {
    throw new Error(`${url} should contain an array of event records`);
  }
  return normalizeEvents(records);
}

// Validates records, attaches parsed time and clip URL, and sorts by time.
export function normalizeEvents(records) {
  const events = [];
  for (const record of records) {
    const missing = REQUIRED_FIELDS.filter((field) => !record?.[field]);
    const time = new Date(record?.timestamp);
    if (missing.length || Number.isNaN(time.getTime())) {
      console.warn('Skipping invalid event record', record, { missing });
      continue;
    }
    events.push({ ...record, time, clipUrl: clipUrl(record) });
  }
  return events.sort(
    (a, b) => a.time - b.time || String(a.clip_id).localeCompare(String(b.clip_id))
  );
}
