(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const html = document.documentElement;

  // Without the animation libraries the page still has to be usable.
  if (!window.gsap || !window.ScrollTrigger) { $('.loader')?.remove(); return; }

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const wide = () => innerWidth > 900;
  gsap.registerPlugin(ScrollTrigger, SplitText);

  /* ---------- catalogue data ---------- */
  // Net weights as printed on the catalogue photographs. Pieces without a printed weight show none.
  const WEIGHTS = { 5: 28, 8: 25, 9: 16, 11: 24.16, 12: 28, 14: 30.9, 17: 35, 18: 20, 23: 29, 25: 12.5, 26: 14.75, 28: 22.53 };
  const ORDER = [23, 3, 14, 1, 21, 8, 22, 9, 19, 12, 20, 5, 7, 17, 24, 11, 2, 26, 15, 13, 28, 6, 18, 4, 27, 25, 10, 16];
  const pad = n => String(n).padStart(2, '0');
  const wt = n => (WEIGHTS[n] ? `${WEIGHTS[n]}` : '');
  const full = n => `img/p${pad(n)}.webp`;

  // A stand-in photograph that fails to load leaves its toned panel, not a broken-image icon.
  document.addEventListener('error', e => { if (e.target.matches?.('.kar img')) e.target.style.visibility = 'hidden'; }, true);

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const goTo = target => {
    if (lenis) lenis.scrollTo(target, { duration: 1.4 });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = $(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    if (lightbox.open) { lightbox.close(); lenis?.start(); } // scrolling is paused while a piece is open
    goTo(target);
  });

  /* ---------- range gallery ---------- */
  const track = $('.range-track');
  ORDER.forEach(n => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'piece';
    b.dataset.open = n;
    b.dataset.loupe = full(n);
    const w = wt(n);
    b.setAttribute('aria-label', w ? `Open this piece, ${w} grams net` : 'Open this piece');
    b.innerHTML = `<span class="piece-img"><img src="img/p${pad(n)}-m.webp" width="720" height="720" alt="" loading="lazy" decoding="async"></span>
      <span class="piece-wt">${w ? `${w}<small>gm net</small>` : ''}</span>`;
    track.appendChild(b);
  });
  const end = document.createElement('div');
  end.className = 'range-end';
  end.innerHTML = `<p>More designs, earrings included, are shared on request.</p><a class="btn magnetic" href="#enquire">Send an enquiry</a>`;
  track.appendChild(end);

  /* ---------- lightbox ---------- */
  const lightbox = $('.lightbox');
  const lbImg = $('.lightbox-img'), lbStage = $('.lightbox-stage');
  const cursorNodes = [$('.cur-ring'), $('.cur-gem')];
  let current = null;
  const openPiece = n => {
    current = n;
    lbImg.src = full(n);
    lbImg.alt = 'Selected piece, enlarged';
    lbStage.dataset.loupe = full(n);
    $('.lightbox-wt').textContent = wt(n) ? `${wt(n)} gm net` : '';
    lightbox.showModal();
    lightbox.append(...cursorNodes); // the dialog sits above the page, so the loupe cursor moves in with it
    lenis?.stop();
    if (!reduce) gsap.fromTo(lbStage, { scale: 0.94, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'power3.out' });
  };
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-open]');
    if (t) openPiece(+t.dataset.open);
  });
  $$('.hero-piece, .anatomy-piece, .guess-visual').forEach(el => {
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPiece(+el.dataset.open); } });
  });
  lightbox.addEventListener('close', () => { document.body.append(...cursorNodes); lenis?.start(); });
  lightbox.addEventListener('click', e => { if (e.target === lightbox) lightbox.close(); });
  $('.lightbox-close').addEventListener('click', () => lightbox.close());
  $('.lightbox-ask').addEventListener('click', () => {
    const need = $('#f-need');
    const line = `Piece ref ${pad(current)}${wt(current) ? ` (${wt(current)} gm)` : ''}`;
    if (!need.value.includes(line)) need.value = need.value ? `${need.value}\n${line}` : line;
  });

  /* ---------- cursor: a loupe that inspects pieces and wraps buttons ---------- */
  if (fine && !reduce) {
    html.classList.add('has-cursor');
    const [ring, gem] = cursorNodes, lens = $('.cur-lens');
    const REST = 40, LENS = 196, ZOOM = 2.3;
    gsap.set([ring, gem], { xPercent: -50, yPercent: -50 });
    gsap.set(gem, { rotation: 45 });
    const pos = { x: innerWidth / 2, y: innerHeight / 2 };
    let stick = null, loupe = null, spin = 45, last = null;
    const rx = gsap.quickTo(ring, 'x', { duration: 0.3, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: 0.3, ease: 'power3' });
    const gx = gsap.quickTo(gem, 'x', { duration: 0.06 }), gy = gsap.quickTo(gem, 'y', { duration: 0.06 });
    const rot = gsap.quickTo(gem, 'rotation', { duration: 0.7, ease: 'power2' });
    const shape = (w, h, r) => gsap.to(ring, { width: w, height: h, borderRadius: r, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });

    // gold filings shed by the cursor when it moves quickly
    const cv = $('.cur-trail'), ctx = cv.getContext('2d');
    let dust = [];
    const fit = () => { const d = Math.min(devicePixelRatio || 1, 2); cv.width = innerWidth * d; cv.height = innerHeight * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    fit(); addEventListener('resize', fit);

    addEventListener('pointermove', e => {
      pos.x = e.clientX; pos.y = e.clientY;
      html.classList.add('cursor-on');
      gx(pos.x); gy(pos.y);
      if (last) {
        const v = Math.hypot(pos.x - last.x, pos.y - last.y);
        spin += v * 0.9; rot(spin);
        if (v > 9 && dust.length < 70 && !loupe) dust.push({ x: pos.x, y: pos.y, vx: (Math.random() - 0.5) * 0.9, vy: Math.random() * 0.9 + 0.2, life: 1, r: 0.5 + Math.random() * 1.4 });
      }
      last = { x: pos.x, y: pos.y };
    }, { passive: true });
    document.addEventListener('pointerleave', () => html.classList.remove('cursor-on'));

    const setState = (s, l) => {
      if (s === stick && l === loupe) return;
      stick = s; loupe = s ? null : l;
      ring.classList.toggle('is-stick', !!stick);
      ring.classList.toggle('is-lens', !!loupe);
      gem.classList.toggle('is-off', !!stick || !!loupe);
      if (stick) {
        const r = stick.getBoundingClientRect(), pill = stick.matches('.btn, .lightbox-close');
        shape(r.width + (pill ? 14 : 22), r.height + (pill ? 14 : 4), pill ? (r.height + 14) / 2 : 10);
      } else if (loupe) {
        lens.style.backgroundImage = `url(${loupe.dataset.loupe})`;
        shape(LENS, LENS, LENS / 2);
      } else shape(REST, REST, REST / 2);
    };
    document.addEventListener('pointerover', e => {
      const s = e.target.closest('.btn, .link, .nav-links a, .nav-brand, .lightbox-close, .direct a');
      const l = e.target.closest('[data-loupe]');
      setState(s, l);
    });
    addEventListener('pointerdown', () => gsap.fromTo(ring, { scale: 0.86 }, { scale: 1, duration: 0.45, ease: 'power3.out' }));

    gsap.ticker.add(() => {
      if (stick) {
        if (!stick.isConnected) { setState(null, null); return; }
        const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        rx(cx + (pos.x - cx) * 0.12); ry(cy + (pos.y - cy) * 0.12);
      } else { rx(pos.x); ry(pos.y); }
      if (loupe) {
        const img = loupe.matches('img') ? loupe : $('img', loupe) || loupe;
        const r = img.getBoundingClientRect();
        const cx = gsap.getProperty(ring, 'x'), cy = gsap.getProperty(ring, 'y');
        lens.style.backgroundSize = `${r.width * ZOOM}px ${r.height * ZOOM}px`;
        lens.style.backgroundPosition = `${-((cx - r.left) * ZOOM - LENS / 2)}px ${-((cy - r.top) * ZOOM - LENS / 2)}px`;
      }
      if (dust.length || cv.dataset.dirty) {
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        cv.dataset.dirty = dust.length ? '1' : '';
        dust = dust.filter(p => (p.life -= 0.028) > 0);
        for (const p of dust) {
          p.x += p.vx; p.y += p.vy;
          ctx.fillStyle = `rgba(220,174,79,${p.life * 0.9})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life + 0.2, 0, 6.28); ctx.fill();
        }
      }
    });

    $$('.magnetic').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.4, ease: 'power3.out' });
      });
      el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1,0.45)' }));
    });
  }

  /* ---------- nav and phone dock ---------- */
  const nav = $('.nav'), dock = $('.dock');
  let atEnquiry = false;
  new IntersectionObserver(([en]) => { atEnquiry = en.isIntersecting; dock.classList.toggle('is-on', !atEnquiry && scrollY > innerHeight * 0.6); }, { threshold: 0.15 }).observe($('#enquire'));
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: self => {
      const y = self.scroll();
      nav.classList.toggle('is-solid', y > 80);
      nav.classList.toggle('is-hidden', self.direction === 1 && y > 400);
      dock.classList.toggle('is-on', !atEnquiry && y > innerHeight * 0.6);
    }
  });

  /* ---------- anatomy: notes, markers and leader lines ---------- */
  const stage = $('.anatomy-stage'), lines = $('.anatomy-lines');
  let lineProgress = reduce ? 1 : 0;
  const paintLines = () => {
    $$('path', lines).forEach((p, i, all) => {
      const t = gsap.utils.clamp(0, 1, lineProgress * (all.length + 1) * 0.6 - i * 0.45);
      p.style.strokeDashoffset = p.dataset.len * (1 - t);
    });
  };
  const drawLines = () => {
    lines.innerHTML = '';
    if (!wide()) return;
    const sr = stage.getBoundingClientRect();
    lines.setAttribute('viewBox', `0 0 ${sr.width} ${sr.height}`);
    $$('.note', stage).forEach(note => {
      const pt = $(`.pt[data-pt="${note.dataset.pt}"]`, stage);
      const nr = note.getBoundingClientRect(), pr = pt.getBoundingClientRect();
      const left = nr.left < pr.left;
      const sx = (left ? nr.right + 12 : nr.left - 12) - sr.left, sy = nr.top + 20 - sr.top;
      const ex = pr.left + pr.width / 2 - sr.left + (left ? -17 : 17), ey = pr.top + pr.height / 2 - sr.top;
      const mx = sx + (ex - sx) * 0.4;
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', `M${sx} ${sy} H${mx} L${ex} ${ey}`);
      lines.appendChild(p);
      const len = p.getTotalLength();
      p.dataset.len = len;
      p.style.strokeDasharray = len;
    });
    paintLines();
  };
  $$('.note', stage).forEach(note => {
    const pt = $(`.pt[data-pt="${note.dataset.pt}"]`, stage);
    note.addEventListener('pointerenter', () => pt.classList.add('is-on'));
    note.addEventListener('pointerleave', () => pt.classList.remove('is-on'));
  });
  ScrollTrigger.addEventListener('refresh', drawLines);
  ScrollTrigger.create({ trigger: stage, start: 'top 75%', end: 'center 48%', scrub: true, onUpdate: self => { if (!reduce) { lineProgress = self.progress; paintLines(); } } });

  /* ---------- guess the weight ---------- */
  const GUESS = [{ n: 12, w: 28 }, { n: 14, w: 30.9 }, { n: 25, w: 12.5 }];
  let gi = 0;
  const gRange = $('#guess-range'), gNum = $('.guess-num'), gRead = $('.guess-read'), gVisual = $('.guess-visual');
  const gGo = $('.guess-go'), gNext = $('.guess-next'), gVerdict = $('.guess-verdict'), gImg = $('.guess-img');
  const gFill = () => gRange.style.setProperty('--fill', `${((gRange.value - 5) / 95) * 100}%`);
  gRange.addEventListener('input', () => { gNum.textContent = gRange.value; gFill(); });
  gFill();
  gGo.addEventListener('click', () => {
    const guess = +gRange.value, { w } = GUESS[gi];
    gRange.disabled = true;
    gGo.hidden = true;
    const o = { v: guess };
    const show = () => { gNum.textContent = Number.isInteger(w) ? Math.round(o.v) : o.v.toFixed(1); };
    const done = () => {
      gNum.textContent = w;
      gRead.classList.add('is-true');
      const diff = +(guess - w).toFixed(1);
      gVerdict.innerHTML = Math.abs(diff) <= 2
        ? `Spot on: <b>${w} gm</b>.`
        : diff > 0
          ? `Actual: <b>${w} gm</b>. That's <b>${diff} gm</b> less gold than it looks.`
          : `Actual: <b>${w} gm</b>.`;
      gNext.hidden = false;
    };
    if (reduce) { o.v = w; done(); }
    else gsap.to(o, { v: w, duration: 1.4, ease: 'power3.inOut', onUpdate: show, onComplete: done });
  });
  gNext.addEventListener('click', () => {
    gi = (gi + 1) % GUESS.length;
    const swap = () => {
      gImg.src = `img/p${pad(GUESS[gi].n)}-m.webp`;
      gVisual.dataset.open = GUESS[gi].n;
      gVisual.dataset.loupe = full(GUESS[gi].n);
    };
    if (reduce) swap();
    else gsap.timeline().to(gImg, { opacity: 0, scale: 0.95, duration: 0.25 }).add(swap).to(gImg, { opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' });
    gRange.disabled = false; gRange.value = 40; gNum.textContent = 40; gFill();
    gRead.classList.remove('is-true');
    gVerdict.textContent = '';
    gNext.hidden = true; gGo.hidden = false;
  });

  /* ---------- enquiry form ---------- */
  const form = $('.form'), formError = $('.form-error');
  const field = name => form.elements[name];
  const message = () => {
    const rows = [['Name', field('name').value], ['Business', field('company').value], ['City', field('city').value], ['Phone', field('phone').value], ['Looking for', field('need').value]];
    return 'Enquiry for Tarashna\n' + rows.filter(r => r[1] && r[1].trim()).map(r => `${r[0]}: ${r[1].trim()}`).join('\n');
  };
  const valid = () => {
    const ok = !!field('name').value.trim();
    formError.hidden = !!ok;
    if (!ok) field('name').focus();
    return ok;
  };
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (valid()) window.open(`https://wa.me/918910321939?text=${encodeURIComponent(message())}`, '_blank', 'noopener');
  });
  $('.form-mail').addEventListener('click', () => {
    if (valid()) location.href = `mailto:contact@tarashnajewels.in?subject=${encodeURIComponent('Enquiry')}&body=${encodeURIComponent(message())}`;
  });

  /* ---------- range scroll: pinned on desktop, swipe on phones ---------- */
  const bar = $('.range-bar span'), view = $('.range-view');
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', () => {
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    const travel = () => dist() * 0.55; // scroll distance is shorter than the track, so the row moves briskly
    const skew = gsap.quickTo(track, 'skewX', { duration: 0.5, ease: 'power3' });
    gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: '.range', start: 'top top', end: () => `+=${travel()}`, pin: '.range-pin', scrub: 0.8, invalidateOnRefresh: true,
        onUpdate: self => {
          gsap.set(bar, { scaleX: self.progress });
          skew(gsap.utils.clamp(-4, 4, self.getVelocity() / -450));
        }
      }
    });
    const settle = () => skew(0);
    ScrollTrigger.addEventListener('scrollEnd', settle);
    return () => ScrollTrigger.removeEventListener('scrollEnd', settle);
  });
  mm.add('(max-width: 900px), (prefers-reduced-motion: reduce)', () => {
    view.style.overflowX = 'auto';
    const on = () => gsap.set(bar, { scaleX: view.scrollLeft / Math.max(1, view.scrollWidth - view.clientWidth) });
    view.addEventListener('scroll', on, { passive: true });
    return () => { view.removeEventListener('scroll', on); view.style.overflowX = ''; };
  });

  /* ---------- making: the wire that runs through the five stages ---------- */
  const steps = $('.steps');
  const wire = document.createElement('span');
  wire.className = 'steps-wire';
  wire.setAttribute('aria-hidden', 'true');
  steps.appendChild(wire);
  if (reduce) gsap.set(wire, { scaleY: 1 });

  /* ---------- gold dust in the hero ---------- */
  const heroDust = () => {
    const cv = $('.hero-dust'), ctx = cv.getContext('2d');
    let W = 0, H = 0, parts = [], live = true;
    const mouse = { x: -999, y: -999 };
    const size = () => {
      const d = Math.min(devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * d; cv.height = H * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
      parts = Array.from({ length: W < 700 ? 30 : 90 }, () => ({
        x: Math.random() * W, y: Math.random() * H, r: 0.4 + Math.random() * 1.5,
        vx: (Math.random() - 0.5) * 0.12, vy: -(0.05 + Math.random() * 0.22),
        a: Math.random() * 6.28, s: 0.005 + Math.random() * 0.02
      }));
    };
    size();
    let lastW = innerWidth;
    addEventListener('resize', () => { if (innerWidth !== lastW) { lastW = innerWidth; size(); } }); // phones fire resize when the address bar hides
    $('.hero').addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    $('.hero').addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
    new IntersectionObserver(([en]) => { live = en.isIntersecting; }).observe(cv);
    gsap.ticker.add(() => {
      if (!live) return;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.a += p.s;
        const mx = p.x - mouse.x, my = p.y - mouse.y, d = Math.hypot(mx, my);
        if (d < 150 && d > 0.01) { const f = (150 - d) / 150; p.x += (mx / d) * f * 2.4; p.y += (my / d) * f * 2.4; }
        p.x += p.vx; p.y += p.vy;
        if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
        if (p.x < -5) p.x = W + 5; else if (p.x > W + 5) p.x = -5;
        ctx.fillStyle = `rgba(220,174,79,${0.2 + 0.6 * Math.abs(Math.sin(p.a))})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill();
      }
    });
  };

  /* ---------- motion ---------- */
  const motion = () => {
    const loader = $('.loader');
    if (reduce) { loader.remove(); drawLines(); return; }

    heroDust();

    // hero: tilt and showroom light follow the pointer
    const piece = $('.hero-piece'), light = $('.hero-light'), heroStage = $('.hero-stage');
    if (fine) {
      const tx = gsap.quickTo(piece, 'rotationY', { duration: 0.9, ease: 'power3' });
      const ty = gsap.quickTo(piece, 'rotationX', { duration: 0.9, ease: 'power3' });
      $('.hero').addEventListener('pointermove', e => {
        const r = heroStage.getBoundingClientRect();
        tx(((e.clientX - (r.left + r.width / 2)) / innerWidth) * 14);
        ty(((e.clientY - (r.top + r.height / 2)) / innerHeight) * -10);
        light.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
        light.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
      });
      $('.hero').addEventListener('pointerleave', () => { tx(0); ty(0); });
    }
    mm.add('(min-width: 901px)', () => {
      gsap.to(piece, { y: 140, scale: 0.9, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.hero-copy', { y: -70, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    });

    // loader: stones are set one by one around a ring, then the ring closes onto the page
    const ringSvg = $('.loader-ring'), N = 36;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2, x = 160 + Math.cos(a) * 146, y = 160 + Math.sin(a) * 146;
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', x - 5); r.setAttribute('y', y - 5); r.setAttribute('width', 10); r.setAttribute('height', 10);
      r.setAttribute('transform', `rotate(${(i / N) * 360 + 45} ${x} ${y})`);
      ringSvg.appendChild(r);
    }
    const stones = $$('rect', ringSvg);
    const brandChars = new SplitText('.loader-brand', { type: 'chars' }).chars;
    const heroChars = new SplitText('.hero-title .line', { type: 'chars' }).chars;
    gsap.set(heroChars, { yPercent: 115 });
    gsap.set(['.hero-lede', '.scale'], { opacity: 0, y: 24 });
    gsap.set(piece, { opacity: 0, scale: 1.14 });
    gsap.set(brandChars, { yPercent: 110 });
    gsap.set(loader, { clipPath: 'circle(100% at 50% 50%)' });
    const s = { v: 0 }, scaleNum = $('.scale-num');
    lenis?.stop();
    scrollTo(0, 0);
    gsap.timeline({ onComplete: () => { loader.remove(); lenis?.start(); ScrollTrigger.refresh(); } })
      .to(brandChars, { yPercent: 0, duration: 0.7, ease: 'power4.out', stagger: 0.035 })
      .to(stones, { fill: '#dcae4f', stroke: '#dcae4f', duration: 0.25, ease: 'power2.out', stagger: { each: 0.036 } }, 0.1)
      .to(ringSvg, { rotation: 40, scale: 1.12, opacity: 0, duration: 0.8, ease: 'power3.in', transformOrigin: '50% 50%' }, '+=0.15')
      .to('.loader-core', { opacity: 0, y: -16, duration: 0.4, ease: 'power2.in' }, '<')
      .to(loader, { clipPath: 'circle(0% at 50% 50%)', duration: 0.95, ease: 'power4.inOut' }, '<0.25')
      .to(piece, { opacity: 1, scale: 1, duration: 1.6, ease: 'power3.out' }, '<0.2')
      .to(heroChars, { yPercent: 0, duration: 1, ease: 'power4.out', stagger: 0.02 }, '<0.2')
      .to(['.hero-lede', '.scale'], { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12 }, '<0.5')
      .to(s, { v: 25, duration: 1.3, ease: 'power2.out', onUpdate: () => { scaleNum.textContent = s.v.toFixed(2); } }, '<');

    // headings rise letter by letter
    $$('.h2, .h1b').forEach(h => {
      const chars = new SplitText(h, { type: 'words,chars' }).chars;
      gsap.from(chars, { yPercent: 70, opacity: 0, duration: 0.8, ease: 'power4.out', stagger: 0.014, scrollTrigger: { trigger: h, start: 'top 88%' } });
    });

    // bench photograph drifts behind its words
    gsap.fromTo('.bench-img img', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.bench', start: 'top bottom', end: 'bottom top', scrub: true } });

    // anatomy
    gsap.from('.anatomy-piece', { scale: 0.88, opacity: 0, duration: 1.3, ease: 'power3.out', scrollTrigger: { trigger: stage, start: 'top 78%' } });
    gsap.from('.pt', { scale: 0, duration: 0.6, ease: 'back.out(2.2)', stagger: 0.12, scrollTrigger: { trigger: stage, start: 'top 55%' } });
    gsap.from('.note', { opacity: 0, y: 22, duration: 0.8, ease: 'power3.out', stagger: 0.1, scrollTrigger: { trigger: stage, start: 'top 62%' } });

    // guess
    gsap.from('.guess-visual', { scale: 0.88, opacity: 0, duration: 1.3, ease: 'power3.out', scrollTrigger: { trigger: '.guess', start: 'top 72%' } });

    // product band slides with the scroll
    gsap.fromTo('.band-row-a', { xPercent: 0 }, { xPercent: -28, ease: 'none', scrollTrigger: { trigger: '.band', start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
    gsap.fromTo('.band-row-b', { xPercent: -30 }, { xPercent: -2, ease: 'none', scrollTrigger: { trigger: '.band', start: 'top bottom', end: 'bottom top', scrub: 0.6 } });

    // making: the wire fills as the stages pass, each photograph wipes open
    gsap.to(wire, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: steps, start: 'top 62%', end: 'bottom 62%', scrub: true } });
    $$('.step').forEach(step => {
      gsap.from($('.kar', step), { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.2, ease: 'power4.out', scrollTrigger: { trigger: step, start: 'top 84%' } });
      gsap.fromTo($('.kar img', step), { scale: 1.18 }, { scale: 1, duration: 1.6, ease: 'power3.out', scrollTrigger: { trigger: step, start: 'top 84%' } });
      gsap.from($('.step-n', step), { scale: 0, duration: 0.5, ease: 'back.out(2.2)', scrollTrigger: { trigger: step, start: 'top 70%' } });
      gsap.from($('.step-body', step), { opacity: 0, y: 24, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: step, start: 'top 76%' } });
    });

    // trade facts
    gsap.from('.trade-img', { clipPath: 'inset(0% 100% 0% 0%)', duration: 1.3, ease: 'power4.out', scrollTrigger: { trigger: '.trade-img', start: 'top 86%' } });
    gsap.from('.spec-row', { '--line': 0, opacity: 0, y: 24, duration: 0.9, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: '.spec', start: 'top 82%' } });
    gsap.from('.field', { y: 22, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.06, scrollTrigger: { trigger: '.form', start: 'top 84%' } });
  };

  (document.fonts?.ready || Promise.resolve()).then(motion);
})();
