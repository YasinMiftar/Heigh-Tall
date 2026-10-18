(() => {
  const triggers = document.querySelectorAll('.image-preview-trigger');
  let trigger = null;
  const preview = document.querySelector('#image-preview');
  const closeButton = document.querySelector('.preview-close');
  const previewImage = document.querySelector('.preview-image');
  const background = [document.querySelector('header'), document.querySelector('main')];
  const hover = window.matchMedia('(hover: hover) and (pointer: fine)');
  let pinned = false, closeDelay = null, openFrame = null, savedOverflow = '';
  let previewHistory = false;
  let suppressHover = false;

  function openPreview(source, interactive = false) {
    clearTimeout(closeDelay);
    if (openFrame !== null) cancelAnimationFrame(openFrame);
    const wasPinned = pinned;
    if (trigger && trigger !== source) trigger.setAttribute('aria-expanded', 'false');
    trigger = source;
    const sourceImage = trigger.querySelector('img');
    previewImage.src = sourceImage.src;
    previewImage.alt = sourceImage.alt;
    preview.setAttribute('aria-label', trigger.getAttribute('aria-label'));
    pinned = pinned || interactive;
    preview.hidden = false;
    preview.classList.toggle('interactive', pinned);
    trigger.setAttribute('aria-expanded', 'true');
    if (pinned && !wasPinned) {
      if (window.history?.pushState) {
        window.history.pushState({ ...window.history.state, heighTallPreview: true }, '', '#exercise-preview');
        previewHistory = true;
      }
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      preview.setAttribute('aria-modal', 'true');
      background.forEach(element => { element.inert = true; });
      closeButton.focus({ preventScroll: true });
    }
    // One layout pass establishes the starting scale before entering.
    preview.getBoundingClientRect();
    openFrame = requestAnimationFrame(() => {
      preview.classList.add('visible');
      openFrame = null;
    });
  }
  function closePreview(fromHistory = false) {
    suppressHover = true;
    if (openFrame !== null) cancelAnimationFrame(openFrame);
    openFrame = null;
    clearTimeout(closeDelay);
    preview.classList.remove('visible');
    trigger?.setAttribute('aria-expanded', 'false');
    if (pinned) {
      background.forEach(element => { element.inert = false; });
      document.body.style.overflow = savedOverflow;
      trigger.focus({ preventScroll: true });
    }
    pinned = false;
    if (previewHistory && fromHistory !== true) {
      previewHistory = false;
      window.history.back();
    }
    preview.classList.remove('interactive');
    preview.removeAttribute('aria-modal');
    closeDelay = setTimeout(() => { preview.hidden = true; }, 320);
  }
  triggers.forEach(source => {
  source.addEventListener('pointerenter', event => {
    if (!suppressHover && hover.matches && event.pointerType === 'mouse') openPreview(source);
  });
  source.addEventListener('pointerleave', () => {
    if (!pinned && trigger === source) closePreview();
    suppressHover = false;
  });
  source.addEventListener('click', () => openPreview(source, true));
  });
  closeButton.addEventListener('click', closePreview);
  preview.addEventListener('click', event => { if (event.target === preview) closePreview(); });
  document.addEventListener('keydown', event => {
    if (preview.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); closePreview(); }
    if (pinned && event.key === 'Tab') { event.preventDefault(); closeButton.focus(); }
  });
  window.addEventListener('blur', () => { if (!pinned) closePreview(); });
  window.addEventListener('popstate', event => {
    if (previewHistory && !event.state?.heighTallPreview) {
      previewHistory = false;
      closePreview(true);
    }
  });
  window.addEventListener('hashchange', () => {
    if (previewHistory && window.location.hash !== '#exercise-preview') {
      previewHistory = false;
      closePreview(true);
    }
  });
})();
