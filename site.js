(() => {
  // Explicit page URLs determine the language, including shared links.
  const url = new URL(location.href);
  const legacyLanguage = url.searchParams.get('lang');
  if (legacyLanguage === 'en' || legacyLanguage === 'ko') {
    url.searchParams.delete('lang');
    url.pathname = url.pathname.replace(/(?:index|ko)\.html$/, '').replace(/\/?$/, '/') + (legacyLanguage === 'ko' ? 'ko.html' : 'index.html');
    location.replace(url.href);
    return;
  }
  const menu = document.querySelector('.menu-toggle'), nav = document.querySelector('#site-nav');
  const closeMenu = () => { nav?.classList.remove('open'); menu?.setAttribute('aria-expanded', 'false'); };
  menu?.addEventListener('click', () => menu.setAttribute('aria-expanded', String(nav.classList.toggle('open'))));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav?.classList.contains('open')) { closeMenu(); menu.focus(); }
  });
  document.addEventListener('click', event => { if (!event.target.closest('header')) closeMenu(); });
  const status = document.querySelector('#site-status');
  document.querySelectorAll('[data-file-download]').forEach(link => link.addEventListener('click', async event => {
    event.preventDefault();
    if (link.getAttribute('aria-busy') === 'true') return;
    const label = link.textContent, korean = document.documentElement.lang === 'ko';
    link.setAttribute('aria-busy', 'true');
    link.textContent = korean ? '다운로드 준비 중…' : 'Preparing download…';
    try {
      const response = await fetch(link.href);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = new Blob([await response.arrayBuffer()], { type: 'application/octet-stream' });
      const objectUrl = URL.createObjectURL(blob);
      const save = document.createElement('a');
      save.href = objectUrl;
      save.download = link.download;
      document.body.append(save);
      save.click();
      save.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch {
      if (status) status.textContent = korean ? '다운로드에 실패했습니다. 다시 시도해 주세요.' : 'Download failed. Please try again.';
    } finally {
      link.removeAttribute('aria-busy');
      link.textContent = label;
    }
  }));
  document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
    const source = document.getElementById(button.dataset.copy);
    if (!source) return;
    const clone = source.cloneNode(true);
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    clone.querySelectorAll('[data-copy-ignore],button').forEach(el => el.remove());
    clone.style.cssText = 'position:fixed;left:-10000px;top:0;width:600px;';
    clone.setAttribute('aria-hidden', 'true');
    document.body.append(clone);
    const value = clone.innerText.trim();
    clone.remove();
    const original = button.textContent;
    button.disabled = true;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else {
        const field = document.createElement('textarea');
        field.value = value;
        field.style.cssText = 'position:fixed;left:-10000px;';
        document.body.append(field);
        field.select();
        const success = document.execCommand('copy');
        field.remove();
        button.focus();
        if (!success) throw new Error('Clipboard unavailable');
      }
      button.textContent = button.dataset.copied;
      if (status) status.textContent = button.dataset.copied;
    } catch {
      if (status) status.textContent = button.dataset.failed;
    } finally {
      setTimeout(() => { button.textContent = original; button.disabled = false; }, 1800);
    }
  }));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const video = document.querySelector('.home-video'), motionControl = document.querySelector('.motion-control');
  if (video && motionControl) {
    const update = () => { motionControl.textContent = video.paused ? motionControl.dataset.play : motionControl.dataset.pause; };
    const play = async () => {
      video.muted = true;
      if (!video.getAttribute('src')) video.src = video.dataset.src;
      motionControl.hidden = false;
      try { await video.play(); video.hidden = false; } catch { video.hidden = true; }
      update();
    };
    video.hidden = true;
    video.addEventListener('error', () => { video.hidden = true; motionControl.hidden = true; });
    video.addEventListener('pause', update);
    video.addEventListener('play', update);
    motionControl.addEventListener('click', () => video.paused ? play() : video.pause());
    reduced.addEventListener('change', () => { if (reduced.matches) { video.pause(); video.hidden = true; } });
    document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); });
    if (!reduced.matches) play();
  }
  document.querySelectorAll('[data-video]').forEach(shell => shell.querySelector('button').addEventListener('click', () => {
    const frame = document.createElement('iframe');
    frame.src = `https://www.youtube-nocookie.com/embed/${shell.dataset.video}?autoplay=1`;
    frame.title = shell.dataset.title;
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    shell.replaceChildren(frame);
    frame.focus();
  }));
  const stopGif = button => {
    button.closest('figure').querySelector('img').src = button.dataset.still;
    button.textContent = button.dataset.play;
    button.setAttribute('aria-pressed', 'false');
  };
  document.querySelectorAll('.gif-toggle').forEach(button => {
    button.addEventListener('click', () => {
      if (button.getAttribute('aria-pressed') === 'true') { stopGif(button); return; }
      button.closest('figure').querySelector('img').src = button.dataset.animated;
      button.textContent = button.dataset.pause;
      button.setAttribute('aria-pressed', 'true');
    });
    reduced.addEventListener('change', () => { if (reduced.matches) stopGif(button); });
  });
  const box = document.querySelector('.lightbox');
  if (box) {
    const image = box.querySelector('img'), download = box.querySelector('a'), close = box.querySelector('button');
    let previous, previousOverflow, inertElements = [];
    const shut = () => {
      if (box.hidden) return;
      box.hidden = true;
      document.body.style.overflow = previousOverflow;
      inertElements.forEach(([el, inert]) => { el.inert = inert; });
      previous?.focus();
    };
    document.querySelectorAll('.zoom').forEach(button => button.addEventListener('click', () => {
      previous = button;
      previousOverflow = document.body.style.overflow;
      image.src = button.dataset.src;
      image.alt = button.dataset.alt;
      download.href = button.dataset.original || button.dataset.src;
      box.hidden = false;
      document.body.style.overflow = 'hidden';
      inertElements = [...document.querySelectorAll('header,footer,.skip-link,#main > :not(.lightbox)')].map(el => [el, el.inert]);
      inertElements.forEach(([el]) => { el.inert = true; });
      close.focus();
    }));
    close.addEventListener('click', shut);
    box.addEventListener('click', event => { if (event.target === box) shut(); });
    document.addEventListener('keydown', event => {
      if (box.hidden) return;
      if (event.key === 'Escape') shut();
      if (event.key === 'Tab') {
        if (event.shiftKey && document.activeElement === close) { event.preventDefault(); download.focus(); }
        else if (!event.shiftKey && document.activeElement === download) { event.preventDefault(); close.focus(); }
      }
    });
  }
})();
