(() => {
  const button = document.querySelector('.back-to-top');
  if (!button) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let pending = false;
  function update() {
    const visible = window.scrollY > 320;
    button.classList.toggle('visible', visible);
    button.disabled = !visible;
    pending = false;
  }
  window.addEventListener('scroll', () => {
    if (!pending) {
      pending = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  window.addEventListener('pageshow', update);
  button.addEventListener('click', () => {
    // Keep keyboard navigation at the beginning, too, without interrupting scrolling.
    const title = document.querySelector('h1');
    if (title) {
      title.setAttribute('tabindex', '-1');
      title.focus({ preventScroll: true });
    }
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  });
  update();
})();
