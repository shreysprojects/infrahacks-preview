/* ------------------------------------------------------------------ *
 *  City-journey layer (loads after app.js).
 *  2. Departures board: the schedule renders as split-flap tiles that roll in like slot reels.
 *  3. Tri-vision billboard in the sponsors section (click to turn it).
 *  4. Crew ID badges, and the Kickoff Hall keynote screen.
 *  5. Blueprint mode (press B, or the footer button).
 *  Everything here enhances markup that already reads fine without JS.
 * ------------------------------------------------------------------ */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => motionQuery.matches;
  const clamp01 = n => Math.max(0, Math.min(1, n));
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };

  /* Polite screen-reader announcements for the visual-only toggles. */
  const live = el('div', 'ih-sr');
  live.setAttribute('role', 'status');
  document.body.appendChild(live);
  const announce = msg => { live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 30); };

  /* ================================================================ *
   *  2. DEPARTURES BOARD
   *  Every tile is a slot reel. When a departure scrolls into view its
   *  tiles spin through random letters and land one after another, left
   *  to right, like a split-flap board updating. Switching the day or the
   *  timezone rolls the board again; hovering (or tapping) a row spins it.
   * ================================================================ */
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const DIGITS = '0123456789';
  const CELL = 1.46; // a tile's height in em (.flap in redesign.css)
  const pick = set => set[(Math.random() * set.length) | 0];
  const canSpin = () => !reduced() && typeof Element.prototype.animate === 'function';
  const inOrder = (a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);

  // Build tiles for `text` inside `target`, one inline group per word so lines wrap between words.
  function flapify(target, text, blank) {
    target.textContent = '';
    const tiles = [];
    text.toUpperCase().split(/\s+/).filter(Boolean).forEach(word => {
      const group = el('span', 'flap-word');
      Array.from(word).forEach(ch => {
        const tile = el('span', 'flap', blank ? '' : ch);
        tile.dataset.ch = ch;
        tile._rest = blank ? '' : ch;
        group.appendChild(tile);
        tiles.push(tile);
      });
      target.appendChild(group);
    });
    return tiles;
  }

  // Spin one tile onto its letter. The reel holds [letter, random glyphs…, what the tile shows now]
  // and runs down until the letter is in the window, overshoots a touch and settles back.
  // Resolves once the tile has landed (or straight away for punctuation and reduced motion).
  function spin(tile, delay, duration) {
    const ch = tile.dataset.ch || '';
    if (tile._spin) tile._spin.cancel();
    tile._spin = null;
    if (!canSpin() || !/[A-Z0-9]/.test(ch)) {
      tile._rest = ch;
      tile.textContent = ch;
      return Promise.resolve();
    }
    const glyphs = /\d/.test(ch) ? DIGITS : LETTERS;
    const steps = Math.max(5, Math.round(duration / 60));
    const reel = el('span', 'flap-reel');
    reel.appendChild(el('span', null, ch));
    for (let i = 0; i < steps; i++) reel.appendChild(el('span', null, pick(glyphs)));
    reel.appendChild(el('span', null, tile._rest || ''));
    tile.textContent = '';
    tile.appendChild(reel);
    const run = reel.animate([
      { transform: `translateY(${(-(steps + 1) * CELL).toFixed(2)}em)`, easing: 'cubic-bezier(.18,.55,.3,1)' },
      { transform: 'translateY(.2em)', offset: 0.9, easing: 'cubic-bezier(.4,0,.5,1)' },
      { transform: 'translateY(0)' }
    ], { duration, delay, fill: 'backwards' });
    tile._spin = run;
    return run.finished.then(() => {
      if (tile._spin !== run) return;
      tile._spin = null;
      tile._rest = ch;
      tile.textContent = ch;
      // The letter glints as it lands (the tile face stays put, like a real board).
      const ink = getComputedStyle(tile).color;
      tile.animate([
        { color: '#fffbe6', textShadow: '0 0 9px rgba(255,212,104,.9)' },
        { color: ink, textShadow: '0 0 0 rgba(255,212,104,0)' }
      ], { duration: 420, easing: 'ease-out' });
    }, () => {});
  }

  const board = $('#schedule .board');
  if (board) {
    const rolling = canSpin() && 'IntersectionObserver' in window;
    const rows = [];

    // Roll a row: the time first, then the event. Each tile starts a beat after the one before
    // and spins a little longer, so they land left to right. `quick` re-spins just the event.
    const roll = (row, delay = 0, quick = false) => {
      const tiles = quick ? row.event : row.time.concat(row.event);
      const token = row.token = {};
      row.rolled = true;
      row.busy = true;
      row.el.classList.add('is-rolling');
      return Promise.all(tiles.map((tile, i) => (quick
        ? spin(tile, delay + i * 14, 340 + i * 24)
        : spin(tile, delay + i * 18, Math.min(1300, 480 + i * 34))))).then(() => {
        if (row.token !== token) return;
        row.busy = false;
        row.last = performance.now();
        row.el.classList.remove('is-rolling');
        row.el.classList.add('is-landed');
      });
    };

    $$('.agenda-row', board).forEach(rowEl => {
      const time = $('.t', rowEl);
      const title = $('h3', rowEl);
      if (!time || !title) return;
      const timeFlaps = el('span', 'flaps flaps-time');
      timeFlaps.setAttribute('aria-hidden', 'true');
      time.after(timeFlaps);

      const name = title.textContent.trim();
      const eventFlaps = el('span', 'flaps flaps-event');
      eventFlaps.setAttribute('aria-hidden', 'true');
      title.textContent = '';
      title.append(el('span', 'ih-sr', name), eventFlaps);

      if (!$('.agenda-label', rowEl)) {
        const status = el('span', 'agenda-status', 'Scheduled');
        status.setAttribute('aria-hidden', 'true');
        rowEl.appendChild(status);
      }

      // Tiles start blank when they are going to roll in.
      const row = { el: rowEl, rolled: false, busy: false, last: 0, token: null };
      row.time = flapify(timeFlaps, time.textContent.trim(), rolling);
      row.event = flapify(eventFlaps, name, rolling);
      rowEl._row = row;
      rows.push(row);

      // The ET / "My time" toggle in app.js rewrites the <time> text; roll that cell to the new time.
      new MutationObserver(() => {
        row.time = flapify(timeFlaps, time.textContent.trim(), rolling);
        if (rolling && row.rolled) row.time.forEach((tile, i) => spin(tile, i * 30, 420 + i * 45));
      }).observe(time, { childList: true, characterData: true, subtree: true });
    });
    board.classList.add('is-flapped');

    // Live Waterloo clock in the board header. Its tiles roll in with the first departure,
    // then each digit spins as the minute changes.
    let clockOn = !rolling;
    const now = $('#board-now');
    let tick = () => {};
    if (now) {
      const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit', hour12: false });
      let tiles = [];
      tick = () => {
        const text = fmt.format(new Date());
        if (tiles.length !== text.length) tiles = flapify(now, text, rolling);
        tiles.forEach((tile, i) => {
          tile.dataset.ch = text[i];
          if (clockOn && tile._rest !== text[i] && !tile._spin) spin(tile, i * 60, 620 + i * 80);
        });
      };
      tick();
      setInterval(tick, 5000);
    }

    if (rolling) {
      board.classList.add('is-reels');

      // Each departure rolls in as it scrolls into view; rows that arrive together go top to bottom.
      const watch = new IntersectionObserver(entries => {
        const ready = entries.filter(entry => entry.isIntersecting).map(entry => entry.target).sort(inOrder);
        ready.forEach((rowEl, k) => {
          watch.unobserve(rowEl);
          roll(rowEl._row, k * 130);
        });
        if (ready.length && !clockOn) { clockOn = true; tick(); }
      }, { threshold: 0.6, rootMargin: '0px 0px -6% 0px' });
      rows.forEach(row => watch.observe(row.el));

      // Switching Saturday / Sunday rolls the newly shown day (rows not seen yet roll as they scroll in).
      $$('.agenda-panel', board).forEach(panel => {
        new MutationObserver(() => {
          if (panel.hidden) return;
          let k = 0;
          $$('.agenda-row', panel).forEach(rowEl => {
            if (rowEl._row && rowEl._row.rolled) roll(rowEl._row, k++ * 110);
          });
        }).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
      });

      // Hover (or tap) a departure to spin it again.
      rows.forEach(row => {
        const again = () => {
          if (row.rolled && !row.busy && performance.now() - row.last > 600) roll(row, 0, true);
        };
        row.el.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') again(); });
        row.el.addEventListener('click', again);
      });
    }
  }

  /* ================================================================ *
   *  3. TRI-VISION BILLBOARD
   * ================================================================ */
  const face = $('.billboard .bb-face');
  if (face) {
    const messages = $$('.bb-msg', face);
    const SLATS = 14;
    const slats = document.createDocumentFragment();
    for (let i = 0; i < SLATS; i++) {
      const slat = el('div', 'bb-slat');
      slat.style.setProperty('--i', i);
      const prism = el('div', 'bb-prism');
      messages.forEach((msg, k) => {
        const side = el('div', 'bb-side');
        side.style.setProperty('--k', k);
        side.appendChild(msg.cloneNode(true));
        prism.appendChild(side);
      });
      slat.appendChild(prism);
      slats.appendChild(slat);
    }
    messages.forEach(m => m.remove());
    face.style.setProperty('--n', SLATS);
    face.appendChild(slats);
    face.classList.add('bb-slatted');

    let step = 0, timer = 0, visible = false, shownOnce = false;
    const run = () => {
      clearInterval(timer);
      if (visible && !document.hidden && !reduced()) {
        timer = setInterval(() => { step += 1; face.style.setProperty('--step', step); }, 4200);
      }
    };
    // Click (or tap) the billboard to turn it to the next message; the timer starts over.
    const turn = () => { step += 1; face.style.setProperty('--step', step); run(); };
    const sign = face.closest('.billboard');
    if (sign) {
      sign.classList.add('is-turnable');
      sign.addEventListener('click', turn);
    }
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      run();
      // The first time it comes into view, it turns once soon, so the slats are seen moving.
      if (visible && !shownOnce && !reduced()) {
        shownOnce = true;
        setTimeout(() => { if (visible) turn(); }, 1500);
      }
    }, { threshold: 0.35 }).observe(face);
    document.addEventListener('visibilitychange', run);
    motionQuery.addEventListener('change', run);
  }

  /* ================================================================ *
   *  4. CREW ID BADGES
   * ================================================================ */
  $$('#team .crew-roster li').forEach((li, i) => {
    const name = ($('h4', li) || {}).textContent || '';
    const initials = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const avatar = el('span', 'badge-avatar', initials);
    avatar.setAttribute('aria-hidden', 'true');
    avatar.style.setProperty('--hue', String(268 + ((i * 37) % 120)));
    const number = el('span', 'badge-no', 'No. ' + String(i + 1).padStart(3, '0'));
    number.setAttribute('aria-hidden', 'true');
    li.prepend(avatar);
    li.append(number);
    li.classList.add('badge');
  });

  /* ================================================================ *
   *  4b. KICKOFF HALL: the opening keynote
   *  The screen's light takes the colour of the track you point at, its
   *  glare follows the pointer, and the track cards try to open: each one
   *  flips to its seal, because the briefs stay sealed until kickoff.
   * ================================================================ */
  const stage = $('#about .ko-stage');
  if (stage) {
    const tint = color => {
      if (color) stage.style.setProperty('--ko-glow', color);
      else stage.style.removeProperty('--ko-glow');
    };
    $$('.ko-track', stage).forEach(track => {
      const color = track.style.getPropertyValue('--track').trim();
      let timer = 0;
      const close = () => { clearTimeout(timer); track.setAttribute('aria-pressed', 'false'); };
      track.addEventListener('pointerenter', () => tint(color));
      track.addEventListener('pointerleave', () => tint(null));
      track.addEventListener('focus', () => tint(color));
      track.addEventListener('blur', () => { tint(null); close(); });
      track.addEventListener('click', () => {
        if (track.getAttribute('aria-pressed') === 'true') { close(); return; }
        track.setAttribute('aria-pressed', 'true');
        tint(color);
        clearTimeout(timer);
        timer = setTimeout(close, 2800); // it seals itself again
      });
    });
    const glass = $('.ko-screen', stage);
    if (glass && matchMedia('(hover: hover)').matches) {
      glass.addEventListener('pointermove', event => {
        const box = glass.getBoundingClientRect();
        glass.style.setProperty('--gx', `${Math.round(event.clientX - box.left)}px`);
        glass.style.setProperty('--gy', `${Math.round(event.clientY - box.top)}px`);
      });
    }
  }

  /* Floor illustrations fade in once loaded (and stay hidden if one is missing).
     motion.js later swaps each <img> for the live SVG so the geese can react. */
  $$('.floor-art').forEach(art => {
    const img = $('img', art);
    if (!img) return;
    const ok = () => art.classList.add('is-loaded');
    if (img.complete && img.naturalWidth) ok(); else img.addEventListener('load', ok);
  });

  /* ================================================================ *
   *  9. ROOM OBJECTS (the Canteen's receipt prints from motion.js)
   *  Crew Room: tear a role off the "Crew wanted" flyer to read what it
   *  involves. Lobby: opening a question takes a number; the Now Serving
   *  sign flips to it and the help-desk goose calls it out.
   * ================================================================ */
  const flyer = $('#team .flyer');
  const rolePanel = flyer && $('.flyer-role', flyer);
  if (flyer && rolePanel) {
    rolePanel.appendChild(el('p', 'flyer-hint', 'Tear off a role to see what it involves.'));
    const tabs = $$('.flyer-tab', flyer);
    // The strip comes away from its stub and drops, then a fresh tab grows back in its place
    // (so every role stays on the flyer). With reduced motion the tab just stays marked.
    const tear = (slot, tab) => {
      if (slot.classList.contains('is-torn') || reduced() || typeof Element.prototype.animate !== 'function') return;
      slot.classList.add('is-torn');
      setTimeout(() => slot.classList.remove('is-torn'), 650);
      const ghost = tab.cloneNode(true);
      ghost.className = 'flyer-tab flyer-ghost';
      ['aria-controls', 'aria-pressed', 'data-about'].forEach(name => ghost.removeAttribute(name));
      ghost.setAttribute('aria-hidden', 'true');
      ghost.tabIndex = -1;
      Object.assign(ghost.style, { left: `${slot.offsetLeft}px`, top: `${slot.offsetTop}px`, width: `${slot.offsetWidth}px`, height: `${slot.offsetHeight}px` });
      flyer.appendChild(ghost);
      const side = Math.random() < 0.5 ? -1 : 1;
      ghost.animate([
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${side * 5}px, 14px) rotate(${side * 12}deg)`, opacity: 1, offset: 0.25 },
        { transform: `translate(${side * 28}px, 170px) rotate(${side * 46}deg)`, opacity: 0 }
      ], { duration: 950, easing: 'cubic-bezier(.45,.05,.7,.9)' }).onfinish = () => ghost.remove();
    };
    tabs.forEach(tab => {
      tab.setAttribute('aria-pressed', 'false');
      tab.addEventListener('click', () => {
        const name = tab.textContent.trim();
        tabs.forEach(other => other.setAttribute('aria-pressed', String(other === tab)));
        const apply = el('a', null, `Apply for ${name} `);
        apply.href = 'ExecApplication.html';
        const arrow = el('span', null, '↗');
        arrow.setAttribute('aria-hidden', 'true');
        apply.appendChild(arrow);
        rolePanel.classList.remove('is-new');
        rolePanel.replaceChildren(el('h4', null, name), el('p', null, tab.dataset.about || ''), apply);
        void rolePanel.offsetWidth; // replay the entrance
        rolePanel.classList.add('is-new');
        tear(tab.parentElement, tab);
      });
    });
  }

  const desk = $('#faq .tk-desk');
  const tickets = $$('#faq .faq details');
  const serving = desk && $('.tk-number', desk);
  if (desk && serving && tickets.length) {
    serving.classList.add('flaps');
    let tiles = flapify(serving, '--', false);
    let pulled = 0;
    const serve = n => {
      const text = String(n).padStart(2, '0');
      if (tiles.length !== text.length) tiles = flapify(serving, text, true);
      tiles.forEach((tile, i) => { tile.dataset.ch = text[i]; spin(tile, i * 90, 640 + i * 180); });
      // The next ticket pops out of the dispenser and the sign dings.
      desk.classList.remove('is-pulled');
      void desk.offsetWidth;
      desk.classList.add('is-pulled');
      clearTimeout(pulled);
      pulled = setTimeout(() => desk.classList.remove('is-pulled'), 700);
      document.dispatchEvent(new CustomEvent('ih:honk', { detail: { floor: '#floor-lobby', who: 'ask me!', text: `now serving ${text}!` } }));
    };
    tickets.forEach((ticket, i) => ticket.addEventListener('toggle', () => { if (ticket.open) serve(i + 1); }));
  }

  /* ================================================================ *
   *  5. BLUEPRINT MODE
   * ================================================================ */
  const root = document.documentElement;
  const toggle = $('#bp-toggle');
  const setBlueprint = on => {
    root.classList.toggle('blueprint', on);
    if (toggle) toggle.setAttribute('aria-pressed', String(on));
    announce(on ? 'Blueprint view on. Press B again to exit.' : 'Blueprint view off.');
  };
  const flipBlueprint = () => setBlueprint(!root.classList.contains('blueprint'));
  if (toggle) toggle.addEventListener('click', flipBlueprint);
  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    const target = event.target;
    if (target && target.closest && target.closest('input, textarea, select, [contenteditable]')) return;
    if (event.key === 'b' || event.key === 'B') flipBlueprint();
    else if (event.key === 'Escape' && root.classList.contains('blueprint')) setBlueprint(false);
  });

  /* ================================================================ *
   *  6. ZOOM HERO
   *  Scrolling the opening screen flies the camera into one lit window
   *  of the skyline (the venue), through the glass, and back out to the
   *  city as the event section arrives. The painted skyline is a raster,
   *  so a vector copy of that window, its wall and the room inside are
   *  drawn on top, in screen space, to stay sharp at any zoom.
   * ================================================================ */
  const hero = $('.hero');
  const rig = $('.cam-rig');
  const target = $('#cam-target');
  const overlay = $('.cam-overlay');
  const canvas = $('.cam-canvas');
  const art = $('.hero-city-art');
  // The camera's CSS variables live on the layers that use them (not <html>, which restyles everything).
  const sky = $('.hero-world') || root;
  const firstFloor = $('#building .floor') || root;
  if (hero && rig && target && overlay && canvas && art && canvas.getContext && !reduced()) {
    const ctx = canvas.getContext('2d');
    const win = $('.cam-win', overlay);
    const wash = $('.tw-wash', overlay);
    const facade = $('.cam-facade', overlay);
    const sign = $('.cam-sign', overlay);
    const room = $('.cam-room', overlay);
    const glow = $('.cam-glow', overlay);
    const vignette = $('.cam-vignette', overlay);
    // The room seen through the window: a picture of Kickoff Hall, attached only once it has loaded.
    const roomArt = $('.cam-room-art', overlay);
    if (roomArt && roomArt.dataset.src) {
      const pic = new Image();
      pic.onload = () => roomArt.setAttribute('href', roomArt.dataset.src);
      pic.src = roomArt.dataset.src;
    }
    const caption = $('.cam-caption', overlay);
    const captionMain = $('.cam-caption-main', overlay);
    const captionSub = $('.cam-caption-sub', overlay);
    const captionFloor = $('.cam-caption-floor', overlay);
    const cue = $('.cam-cue');
    const cueFill = $('.cam-cue-fill');
    const motionSvg = $('.city-motion');
    const train = $('#city-train');
    const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
    // Aim at the middle of the venue window: the lit top-floor window of the tallest tower.
    const AIM_X = 0.5, AIM_Y = 0.5;
    let queued = false, enabled = true, dpr = 1;

    // The camera never scales page elements (a 100x-scaled layer makes the browser drop
    // tiles across the whole scene). The resting city stays in place, and while flying
    // the skyline is painted into one screen-sized canvas instead.
    const skyline = new Image();
    skyline.src = (art.querySelector('image') && art.querySelector('image').getAttribute('href')) || 'assets/skyline-cutout.webp';
    // The train is vector art on its own layer; snapshot it once so the canvas can draw it too.
    let trainImage = null;
    if (train) {
      const snap = new Image();
      snap.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 264 34" width="1056" height="136">${train.innerHTML}</svg>`);
      snap.decode().then(() => { trainImage = snap; request(); }).catch(() => {});
    }

    root.classList.add('cam');

    // `sharp` < 1 draws the city at a lower resolution: while it is blurred the detail can't be seen,
    // and a smaller canvas is much cheaper to fill and to blur every frame.
    function fitCanvas(w, h, sharp = 1) {
      dpr = Math.min(window.devicePixelRatio || 1, 2) * sharp;
      const cw = Math.round(w * dpr), ch = Math.round(h * dpr);
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    }

    function paintCity(w, h, tx, ty, s, blueprint, sharp = 1) {
      fitCanvas(w, h, sharp);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!skyline.complete || !skyline.naturalWidth) return;
      const camera = new DOMMatrix([dpr * s, 0, 0, dpr * s, dpr * tx, dpr * ty]);
      const a = art.getBoundingClientRect();
      ctx.setTransform(camera);
      if (blueprint) { ctx.filter = 'invert(1) grayscale(1) brightness(1.15)'; ctx.globalAlpha = 0.45; }
      ctx.drawImage(skyline, a.left, a.top, a.width, a.height);
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
      if (!blueprint && trainImage && motionSvg) {
        const railSpace = motionSvg.getScreenCTM(), trainSpace = train.getScreenCTM();
        if (railSpace && trainSpace) {
          ctx.save();
          ctx.setTransform(camera.multiply(railSpace));
          ctx.beginPath();
          ctx.rect(328, 687, 758, 44); // same clip as #rail-mask
          ctx.clip();
          ctx.setTransform(camera.multiply(trainSpace));
          ctx.drawImage(trainImage, -2, -2, 264, 34);
          ctx.restore();
        }
      }
    }

    // ---- The way out (street level): the same camera, run backwards ----
    // At the bottom of the page the street front (.cam-door, in the pinned .exit-stage) scrolls in
    // under the lobby like any floor; the browser keeps it glued to the page, so nothing here has to
    // chase the scroll. Once it fills the screen the camera pulls back from the front door, cranes up
    // the tower (the street drops out of the bottom of the frame instead of fading over the city),
    // and settles on the city exactly as the flight in began. The street front is drawn in the same
    // window units as the tower and anchored to #cam-target, so it lands on the painted tower.
    const exitRun = $('.exit-run');
    const door = $('.cam-door');
    const doorAll = door && $('.ex-all', door);
    const doorStreet = door ? $$('.ex-street', door) : [];
    const doorLower = door && $('.ex-lower', door);
    const doorFade = $('#door-fadeg');
    // The doors meet the pavement at (x, y), in window units; the opening shot frames w x h around
    // them (h reaches the top of the sign over the canopy).
    const DOOR = { x: 14, y: 5600, w: 470, h: 338 };
    // In viewport heights: a pause on the door before the camera moves, and the stretch at the
    // end where the sign-up rises over the settled city.
    const EXIT_HOLD = 0.12, EXIT_TAIL = 0.7;
    // Only touch the DOM when a value really changes (the street front is costly to repaint).
    const put = (el, name, value) => { if (el.getAttribute(name) !== value) el.setAttribute(name, value); };
    const show = (el, on) => { const v = on ? '' : 'none'; if (el.style.display !== v) el.style.display = v; };

    function hideDoor() {
      if (door) show(door, false);
      root.classList.remove('cam-exit');
    }

    // Draws the way out; returns false when it is not on screen (the city is then at rest).
    function exitShot(w, h, blueprint) {
      if (!exitRun || !door || !doorAll || !doorFade) return false;
      const run = exitRun.getBoundingClientRect();
      if (blueprint || !run.height || run.top >= h * 1.6) { hideDoor(); return false; }
      // Pointer parallax rests while the street is near: the zoomed camera would magnify every wobble.
      if (run.top >= h) {
        sky.style.setProperty('--cam-calm', smooth(h, h * 1.6, run.top).toFixed(3));
        hideDoor();
        return false;
      }
      const span = Math.max(1, run.height - (EXIT_HOLD + EXIT_TAIL) * h);
      const q = clamp01((-run.top - EXIT_HOLD * h) / span);
      sky.style.setProperty('--cam-calm', smooth(0.94, 1, q).toFixed(3));
      if (q >= 1) { hideDoor(); return false; }
      const arriving = run.top > 0;                  // the stage is still scrolling in under the lobby

      const at = target.getBoundingClientRect();
      const a = art.getBoundingClientRect();         // the painted city, at rest
      const u = at.width / 70;                       // screen px per window unit, at rest
      const ex = at.left + DOOR.x * u;               // the tower's middle, at rest
      // Opening shot: the pavement near the bottom, the sign clear of the header and plaque.
      const fy = h * 0.86;
      const s0 = Math.max(6, Math.min(w / (DOOR.w * u), (fy - 140) / (DOOR.h * u)));
      const z = smooth(0, 1, q);
      const s = Math.pow(s0, 1 - z);                 // exponential, like the flight in
      // Three moves: pull back with the doors low in the frame (s0 to sTop), crane up the tower
      // until the top-floor window sits where it rests (sTop to sBot), then pull back around it.
      const sTop = Math.min(6.5, s0 * 0.45), sBot = Math.min(3, sTop * 0.5);
      const m = 1 - smooth(sBot, sTop, s);
      const py = DOOR.y * (1 - m);                   // the point the camera follows: the doors, then the window
      const ry = at.top + py * u;                    // ...and where that point sits at rest
      const k = smooth(1, 2.2, s);                   // the tower slides to its resting place at the very end
      let dx = ex + (w / 2 - ex) * k;
      let dy = fy + (at.top - fy) * m;
      // Never look past the ends of the painted city, or below its ground.
      dx = Math.min(Math.max(dx, w - s * (a.right - ex)), s * (ex - a.left));
      dy = Math.max(dy, h - s * (a.bottom - ry));
      const tx = dx - s * ex, ty = dy - s * ry;
      const r = { left: tx + s * at.left, top: ty + s * at.top, width: s * at.width, height: s * at.height };
      const px = s * u;                              // screen px per window unit, now

      // The street front's lower edge (#door-fade): nothing fades while the street is in view; as the
      // camera cranes up the fade stays just below the bottom of the screen, so the street leaves
      // the frame rather than dissolving; then it settles where the hero's facade fades too.
      const bottom = (h - r.top) / px;               // window units at the bottom of the screen
      let y1 = 6500;
      if (s < sBot) y1 = 1645 + (Math.max(1645, (h - at.top) / (sBot * u) + 80) - 1645) * smooth(2.2, sBot, s);
      else if (s < sTop) y1 = Math.min(6500, Math.max(1645, bottom + 80));
      put(doorFade, 'y1', y1.toFixed(1));
      put(doorFade, 'y2', (y1 + 460).toFixed(1));
      if (y1 < 6500) put(doorAll, 'mask', 'url(#door-fade)');
      else if (doorAll.hasAttribute('mask')) doorAll.removeAttribute('mask');
      doorStreet.forEach(part => show(part, y1 >= 4300)); // street level is below the fade by now: skip it
      if (doorLower) show(doorLower, y1 + 460 > 2110);    // so are the lower floors, once the fade has settled
      const vector = smooth(1.12, 1.9, s);           // then the painted tower takes over, as in the flight in

      // Skip painting the city while the street front covers the whole screen.
      const L = -r.left / px, R = (w - r.left) / px, T = -r.top / px;
      const covered = arriving || (vector >= 1 && bottom <= y1 &&
        ((L >= -660 && R <= 407 && T >= -275) || (L >= -2500 && R <= 1900 && T >= 4950)));

      win.style.display = 'none';
      vignette.setAttribute('opacity', '0');
      glow.setAttribute('opacity', '0');
      rig.style.transform = '';
      rig.style.visibility = arriving ? '' : 'hidden'; // the lobby's windows still show the city at rest
      if (covered) {
        canvas.style.visibility = 'hidden';
      } else {
        canvas.style.visibility = 'visible';
        const blur = Math.min(9, Math.max(0, (s - 1.5) * 1.1));
        canvas.style.filter = `blur(${(Math.round(blur * 2) / 2).toFixed(1)}px)`;
        paintCity(w, h, tx, ty, s, false, blur >= 1.5 ? 0.5 : 1);
      }
      root.classList.toggle('cam-exit', !covered);

      show(door, true);
      put(door, 'x', r.left.toFixed(1));
      put(door, 'y', r.top.toFixed(1));
      put(door, 'width', Math.max(0.1, r.width).toFixed(2));
      put(door, 'height', Math.max(0.1, r.height).toFixed(2));
      put(door, 'opacity', vector.toFixed(3));
      if (sign) put(sign, 'opacity', '1');
      if (wash) put(wash, 'opacity', (0.42 * (parseFloat(sky.style.getPropertyValue('--daywash')) || 0)).toFixed(3));
      return true;
    }

    // Timeline (p = how far through the hero you have scrolled):
    //   0    → .70  fly from the skyline into the venue window
    //   .58  → .70  the window's warm light fills the screen
    //   .705 → .955 "Welcome in." holds in the light, like a title card
    //   .945 → .985 Kickoff Hall fades in around you; the city settles behind its windows
    const FLY_END = 0.7;
    function frame() {
      queued = false;
      if (!enabled) return;
      const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
      const p = clamp01(scrollY / Math.max(1, hero.offsetHeight - innerHeight));
      const blueprint = root.classList.contains('blueprint');
      const flying = p > 0.001 && p < FLY_END;

      hero.style.setProperty('--cam-out', smooth(0.02, 0.16, p).toFixed(3));
      hero.classList.toggle('cam-copy-gone', p > 0.17);
      root.classList.toggle('cam-active', flying);
      const enter = smooth(0.945, 0.985, p);
      firstFloor.style.setProperty('--cam-enter', enter.toFixed(3));
      root.classList.toggle('cam-inside', enter > 0.001);
      // Mouse parallax fades out while the camera moves (it would swing the target), then returns.
      sky.style.setProperty('--cam-calm', (p < 0.5 ? 1 - smooth(0, 0.04, p) : smooth(0.92, 1, p)).toFixed(3));
      if (cue) cue.classList.toggle('cam-cue-gone', p > 0.64);
      if (cueFill) cueFill.style.strokeDasharray = `${(clamp01(p / 0.64) * 100).toFixed(1)} 100`;

      // "Welcome in." holds in the light like a title card, drifting slowly closer.
      const card = smooth(0.705, 0.745, p) * (1 - smooth(0.93, 0.955, p));
      caption.setAttribute('opacity', card.toFixed(3));
      if (card > 0) {
        const size = Math.max(30, Math.min(84, w * 0.065));
        captionMain.setAttribute('font-size', size.toFixed(1));
        captionMain.setAttribute('y', (h / 2).toFixed(1));
        captionSub.setAttribute('font-size', Math.max(11, size * 0.2).toFixed(1));
        captionSub.setAttribute('y', (h / 2 + size * 0.78).toFixed(1));
        if (captionFloor) {
          captionFloor.setAttribute('font-size', Math.max(11, size * 0.2).toFixed(1));
          captionFloor.setAttribute('y', (h / 2 + size * 1.42).toFixed(1));
          captionFloor.setAttribute('opacity', smooth(0.76, 0.8, p).toFixed(3));
        }
        const k = 0.95 + 0.1 * smooth(0.705, 0.955, p);
        caption.setAttribute('transform', `translate(${(w / 2).toFixed(1)} ${(h / 2).toFixed(1)}) scale(${k.toFixed(4)}) translate(${(-w / 2).toFixed(1)} ${(-h / 2).toFixed(1)})`);
      }

      if (exitShot(w, h, blueprint)) return;

      if (!flying) {
        canvas.style.visibility = 'hidden';
        rig.style.visibility = '';
        win.style.display = 'none';
        vignette.setAttribute('opacity', '0');
        if (p >= FLY_END) {
          // In the light: the real city settles back to rest behind it (a small, safe scale),
          // so Kickoff Hall's windows show it when the room fades in.
          const s = 1 + 0.12 * (1 - smooth(0.9, 0.985, p));
          rig.style.transform = `translate(${((1 - s) * w) / 2}px, ${((1 - s) * h) / 2}px) scale(${s})`;
          glow.setAttribute('opacity', (1 - smooth(0.97, 1, p)).toFixed(3));
        } else {
          rig.style.transform = '';
          glow.setAttribute('opacity', '0');
        }
        return;
      }

      // Camera, in screen space: point (x, y) is drawn at (tx + s*x, ty + s*y).
      rig.style.transform = '';
      const at = target.getBoundingClientRect(); // the window in the resting city
      const ax = at.left + at.width * AIM_X, ay = at.top + at.height * AIM_Y;
      const t = clamp01(p / FLY_END);
      const sEnd = Math.max((w * 1.18) / Math.max(0.5, at.width), (h * 1.18) / Math.max(0.5, at.height));
      const s = Math.pow(sEnd, Math.pow(t, 1.6)); // exponential: every scroll step feels like the same distance
      const drift = smooth(0, 0.7, t);            // ease the target toward the middle of the screen
      const tx = ax + (w / 2 - ax) * drift - s * ax;
      const ty = ay + (h / 2 - ay) * drift - s * ay;
      const r = { left: tx + s * at.left, top: ty + s * at.top, width: s * at.width, height: s * at.height };

      // The crisp vector tower takes over from the painted one almost at once, and the
      // rest of the city softens behind it like a camera's depth of field.
      const tower = smooth(1.12, 1.9, s);
      rig.style.visibility = 'hidden';
      if (blueprint || s < 45) {
        canvas.style.visibility = 'visible'; // the stylesheet keeps it hidden by default
        const blur = blueprint ? 0 : Math.min(9, Math.max(0, (s - 1.5) * 1.1));
        canvas.style.filter = blueprint ? '' : `blur(${(Math.round(blur * 2) / 2).toFixed(1)}px)`;
        paintCity(w, h, tx, ty, s, blueprint, blur >= 1.5 ? 0.5 : 1);
      } else {
        canvas.style.visibility = 'hidden'; // the tower fills the screen: skip painting the city
      }

      win.style.display = '';
      win.setAttribute('x', r.left.toFixed(2));
      win.setAttribute('y', r.top.toFixed(2));
      win.setAttribute('width', Math.max(0.1, r.width).toFixed(2));
      win.setAttribute('height', Math.max(0.1, r.height).toFixed(2));
      facade.setAttribute('opacity', tower.toFixed(3));
      sign.setAttribute('opacity', smooth(2.2, 3.8, s).toFixed(3));
      // Same daylight haze the painted city gets, so the two match.
      if (wash) wash.setAttribute('opacity', (0.42 * (parseFloat(sky.style.getPropertyValue('--daywash')) || 0)).toFixed(3));
      const wf = r.width / w; // how much of the screen the window spans
      const depth = smooth(0.12, 2.5, wf); // the room sits behind the glass, so it grows a little slower
      room.setAttribute('transform', `translate(35 55) scale(${(1 - 0.12 * depth).toFixed(4)}) translate(-35 -55)`);
      vignette.setAttribute('opacity', (smooth(0.05, 0.33, p) * (1 - smooth(0.56, 0.66, p)) * 0.85).toFixed(3));
      glow.setAttribute('opacity', smooth(0.58, 0.695, p).toFixed(3));
    }

    function request() { if (!queued) { queued = true; requestAnimationFrame(frame); } }
    addEventListener('scroll', request, { passive: true });
    addEventListener('resize', request);
    addEventListener('load', request);
    skyline.decode().then(request).catch(() => {});
    // The train keeps moving while you hover mid-flight (or mid-way out).
    setInterval(() => { if ((root.classList.contains('cam-active') || root.classList.contains('cam-exit')) && !document.hidden) request(); }, 120);
    // Blueprint mode switches the way out off (and back on) without a scroll.
    let drafting = root.classList.contains('blueprint');
    new MutationObserver(() => {
      if (root.classList.contains('blueprint') !== drafting) { drafting = !drafting; request(); }
    }).observe(root, { attributes: true, attributeFilter: ['class'] });
    motionQuery.addEventListener('change', () => {
      if (!reduced()) return;
      enabled = false;
      hideDoor();
      root.classList.remove('cam', 'cam-active');
      rig.style.transform = '';
      rig.style.visibility = '';
      canvas.style.visibility = 'hidden';
    });
    request();
  }

  try {
    console.log('%cinfrahacks%c  You read source code for fun. Press B on the homepage, then come build with us: https://infrahacks.org/ExecApplication.html',
      'font:900 16px sans-serif;color:#c482f4', 'color:inherit');
  } catch (e) { /* console unavailable */ }
})();
