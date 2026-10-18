import { loadEvents } from './data.js';
import { renderTimeline } from './timeline.js';

const container = document.getElementById('timeline');
const summary = document.getElementById('summary');

try {
  const events = await loadEvents();
  renderTimeline(container, events);
  summary.textContent = `${events.length} events`;
} catch (error) {
  console.error(error);
  const message = document.createElement('p');
  message.className = 'status status-error';
  message.textContent = location.protocol === 'file:'
    ? 'Open this page through a local web server (python3 -m http.server), not directly from disk.'
    : `Could not load events: ${error.message}`;
  container.replaceChildren(message);
}
