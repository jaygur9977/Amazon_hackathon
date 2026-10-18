// UI layer: renders normalized events into the page. No data loading here.

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const dateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
});

export function renderTimeline(container, events) {
  container.replaceChildren();
  if (!events.length) {
    container.append(el('p', 'status', 'No events to show.'));
    return;
  }

  let currentDay = null;
  let list = null;
  for (const event of events) {
    const day = event.time.toDateString();
    if (day !== currentDay) {
      currentDay = day;
      list = el('ol', 'events');
      const section = el('section', 'day');
      section.append(el('h2', 'day-heading', dateFormat.format(event.time)), list);
      container.append(section);
    }
    list.append(renderEvent(event));
  }
}

function renderEvent(event) {
  const item = el('li', 'event');
  if (event.risk === 'high' || event.unusual) item.classList.add('flagged');

  const time = el('time', 'event-time', timeFormat.format(event.time));
  time.dateTime = event.timestamp;

  const meta = el('div', 'event-meta');
  meta.append(time);
  if (event.event) meta.append(el('span', 'tag', event.event.replaceAll('_', ' ')));
  if (event.risk === 'high') meta.append(el('span', 'tag tag-risk', 'high risk'));

  const body = el('div', 'event-body');
  body.append(meta, el('p', 'event-description', event.description), renderClip(event));
  item.append(body);
  return item;
}

function renderClip(event) {
  const figure = el('figure', 'clip');
  const video = document.createElement('video');
  video.controls = true;
  video.preload = 'metadata';
  video.playsInline = true;
  video.src = event.clipUrl;
  video.addEventListener('error', () => {
    video.replaceWith(el('p', 'clip-missing', `Clip not found: ${event.file_name}`));
  });
  figure.append(video, el('figcaption', 'clip-name', event.file_name));
  return figure;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
