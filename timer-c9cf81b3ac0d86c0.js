(() => {
  // Older cached documents may load this compatibility entrypoint after an update.
  // Restore their missing control instead of aborting every exercise timer.
  let autoButton = document.querySelector('.auto-toggle');
  if (!autoButton) {
    const header = document.querySelector('header');
    if (header) {
      autoButton = document.createElement('button');
      autoButton.type = 'button';
      autoButton.className = 'auto-toggle';
      autoButton.setAttribute('aria-pressed', 'false');
      autoButton.setAttribute('title', 'Automatically start the next set or side after 90 seconds of rest.');
      autoButton.innerHTML = '<span class="auto-switch" aria-hidden="true"></span><span>Auto sets</span><span class="auto-state">Off</span>';
      header.append(autoButton);
    }
  }
  let automatic = false;
  const autoListeners = [];
  autoButton?.addEventListener('click', () => {
    automatic = !automatic;
    autoButton.setAttribute('aria-pressed', String(automatic));
    autoButton.querySelector('.auto-state').textContent = automatic ? 'On' : 'Off';
    autoListeners.forEach(listener => listener());
  });
  document.querySelectorAll('.exercise-window').forEach(panel => {
  const setSeconds = Number(panel.dataset.seconds);
  const totalSets = Number(panel.dataset.sets);
  const sides = panel.dataset.sides === 'true';
  const segments = totalSets * (sides ? 2 : 1);
  const duration = setSeconds * 1000;
  const clock = panel.querySelector('.countdown');
  const prefix = panel.querySelector('.timer-prefix') || clock.firstElementChild;
  const digits = [panel.querySelector('.seconds-tens'), panel.querySelector('.seconds-ones')];
  const label = panel.querySelector('.set-label');
  const progress = panel.querySelector('.progress-fill');
  const track = panel.querySelector('.progress-track');
  const status = panel.querySelector('.status');
  const start = panel.querySelector('.start');
  const restDuration = 90000;
  let set = 1, remaining = duration, deadline = 0, frame = null, running = false, resting = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let lastSeconds = null;
  const digitAnimations = [null, null];

  function paint() {
    const seconds = Math.ceil(remaining / 1000);
    if (seconds !== lastSeconds) {
      const nextDigits = String(seconds % 60).padStart(2, '0');
      if (prefix) prefix.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:`;
      clock.setAttribute('aria-label', `${seconds} seconds ${resting ? 'of rest ' : ''}remaining`);
      digits.forEach((digit, index) => {
        if (digit.textContent === nextDigits[index]) return;
        digitAnimations[index]?.cancel();
        digit.textContent = nextDigits[index];
        if (lastSeconds !== null && seconds < lastSeconds && !reducedMotion.matches) {
          digitAnimations[index] = digit.animate?.(
          [
            { opacity: .35, transform: 'translateY(-7px)', filter: 'blur(3px)', offset: 0 },
            { opacity: .8, transform: 'translateY(-2px)', filter: 'blur(1px)', offset: .45 },
            { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)', offset: 1 }
          ],
          { duration: 360, easing: 'cubic-bezier(.2,.7,.3,1)' }
          );
        }
      });
      lastSeconds = seconds;
    }
    label.textContent = resting ? 'REST · AUTO SETS' : `SET ${sides ? Math.ceil(set / 2) : set} / ${totalSets}${sides ? (set % 2 ? ' · LEFT' : ' · RIGHT') : ''}`;
    // Animate continuously, while respecting reduced-motion preferences.
    const phaseDuration = resting ? restDuration : duration;
    const ratio = reducedMotion.matches ? seconds / (phaseDuration / 1000) : remaining / phaseDuration;
    progress.style.transform = `scaleX(${ratio})`;
    track.setAttribute('aria-valuemax', String(phaseDuration / 1000));
    track.setAttribute('aria-label', resting ? 'Rest time remaining' : 'Time remaining in this set');
    track.setAttribute('aria-valuenow', String(seconds));
    const nextLabel = sides && set % 2 ? 'Start right side' : `Start set ${sides ? Math.ceil((set + 1) / 2) : set + 1}`;
    const buttonContent = running ? 'Pause <span aria-hidden="true">Ⅱ</span>' : resting ? 'Resume rest <span aria-hidden="true">▶</span>' : remaining === 0 ? (set < segments ? `${nextLabel} <span aria-hidden="true">▶</span>` : 'Start again <span aria-hidden="true">↻</span>') : 'Start set <span aria-hidden="true">▶</span>';
    if (start.innerHTML !== buttonContent) start.innerHTML = buttonContent;
  }
  function cancel() { if (frame !== null) cancelAnimationFrame(frame); frame = null; running = false; }
  function finishedMessage() {
    if (set === segments) return totalSets === 2 ? 'Both sets complete.' : 'All sets complete.';
    if (sides && set % 2) return `Set ${Math.ceil(set / 2)} · left done. Switch sides when ready.`;
    return `Set ${sides ? Math.ceil(set / 2) : set} done. Rest as needed.`;
  }
  function restMessage() {
    return sides && set % 2 ? 'Rest. Right side starts automatically.' : `Rest. Set ${sides ? Math.ceil((set + 1) / 2) : set + 1} starts automatically.`;
  }
  function beginRest() {
    resting = true;
    remaining = restDuration;
    lastSeconds = null;
    deadline = Date.now() + remaining;
    running = true;
    status.textContent = restMessage();
  }
  function update() {
    remaining = Math.max(0, deadline - Date.now());
    if (remaining === 0) {
      if (resting) {
        resting = false;
        set += 1;
        remaining = duration;
        lastSeconds = null;
        deadline = Date.now() + remaining;
        status.textContent = 'Set in progress.';
      } else if (automatic && set < segments) {
        beginRest();
      } else {
        cancel();
        status.textContent = finishedMessage();
      }
    }
    paint();
    if (running) frame = requestAnimationFrame(update);
  }
  start.addEventListener('click', () => {
    if (running) {
      remaining = Math.max(0, deadline - Date.now());
      cancel();
      status.textContent = resting ? 'Rest paused.' : remaining === 0 ? finishedMessage() : 'Paused.';
      paint();
      return;
    }
    if (remaining === 0 && !resting) { set = set < segments ? set + 1 : 1; remaining = duration; }
    deadline = Date.now() + remaining;
    running = true;
    status.textContent = resting ? restMessage() : 'Set in progress.';
    update();
  });
  panel.querySelector('.reset').addEventListener('click', () => {
    cancel(); resting = false; set = 1; remaining = duration; lastSeconds = null;
    status.textContent = 'Ready when you are.';
    paint();
  });
  autoListeners.push(() => {
    if (!automatic && resting) {
      cancel(); resting = false; remaining = 0; lastSeconds = null;
      status.textContent = finishedMessage();
      paint();
    } else if (automatic && !running && remaining === 0 && set < segments) {
      beginRest(); update();
    }
  });
  document.addEventListener('visibilitychange', () => { if (running) { if (frame !== null) cancelAnimationFrame(frame); update(); } });
  window.addEventListener('pagehide', () => {
    if (running) {
      remaining = Math.max(0, deadline - Date.now());
      cancel();
      status.textContent = resting ? 'Rest paused.' : remaining === 0 ? finishedMessage() : 'Paused.';
      paint();
    }
  });
  paint();
  });
})();
