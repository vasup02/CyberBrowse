// Clock widget implementation – updates every second
export function renderClock(container: HTMLElement, variant: 'default' | 'editorial' = 'default'): void {
  container.classList.toggle('clock-editorial', variant === 'editorial');
  const timeElement = document.createElement('time');
  timeElement.className = 'clock-time';
  const dateElement = document.createElement('span');
  dateElement.className = 'clock-date';
  if (variant === 'editorial') {
    const dial = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    dial.setAttribute('viewBox', '0 0 100 100');
    dial.setAttribute('aria-hidden', 'true');
    dial.classList.add('clock-dial');
    const face = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    face.setAttribute('cx', '50'); face.setAttribute('cy', '50'); face.setAttribute('r', '44');
    face.classList.add('clock-dial-face');
    dial.appendChild(face);
    for (let index = 0; index < 12; index += 1) {
      const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      tick.setAttribute('x1', '50'); tick.setAttribute('x2', '50'); tick.setAttribute('y1', '10'); tick.setAttribute('y2', index % 3 === 0 ? '18' : '15');
      tick.setAttribute('transform', `rotate(${index * 30} 50 50)`);
      tick.classList.add('clock-dial-tick');
      dial.appendChild(tick);
    }
    const hourHand = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    hourHand.setAttribute('x1', '50'); hourHand.setAttribute('y1', '51'); hourHand.setAttribute('x2', '50'); hourHand.setAttribute('y2', '30');
    hourHand.classList.add('clock-dial-hour');
    const minuteHand = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    minuteHand.setAttribute('x1', '50'); minuteHand.setAttribute('y1', '52'); minuteHand.setAttribute('x2', '50'); minuteHand.setAttribute('y2', '20');
    minuteHand.classList.add('clock-dial-minute');
    const pin = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    pin.setAttribute('cx', '50'); pin.setAttribute('cy', '50'); pin.setAttribute('r', '3'); pin.classList.add('clock-dial-pin');
    dial.append(hourHand, minuteHand, pin);
    const label = document.createElement('span');
    label.className = 'clock-editorial-label';
    label.textContent = 'LOCAL TIME';
    const datePanel = document.createElement('span');
    datePanel.className = 'clock-editorial-date';
    const weekday = document.createElement('strong');
    weekday.className = 'clock-editorial-weekday';
    datePanel.append(weekday, dateElement);
    const details = document.createElement('div');
    details.className = 'clock-editorial-details';
    details.append(label, timeElement, datePanel);
    container.replaceChildren(dial, details);
  } else {
    container.replaceChildren(timeElement, dateElement);
  }

  function update() {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const date = now.toLocaleDateString([], variant === 'editorial' ? { month: 'short', day: 'numeric' } : { weekday: 'short', month: 'short', day: 'numeric' });
    timeElement.dateTime = now.toISOString();
    timeElement.textContent = time;
    dateElement.textContent = date;
    const weekday = container.querySelector<HTMLElement>('.clock-editorial-weekday');
    if (weekday) weekday.textContent = now.toLocaleDateString([], { weekday: 'long' });
    const hourHand = container.querySelector<SVGElement>('.clock-dial-hour');
    const minuteHand = container.querySelector<SVGElement>('.clock-dial-minute');
    if (hourHand) hourHand.setAttribute('transform', `rotate(${((now.getHours() % 12) + now.getMinutes() / 60) * 30} 50 50)`);
    if (minuteHand) minuteHand.setAttribute('transform', `rotate(${now.getMinutes() * 6} 50 50)`);
  }
  update();
  setInterval(update, 1000);
}

