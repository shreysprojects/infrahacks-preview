/* ------------------------------------------------------------------ *
 *  Motion layer (loads after redesign.js; pairs with motion.css).
 *  0. Scroll progress along the bottom of the header.
 *  1. Scroll reveals: every block on a floor arrives as you reach it.
 *  2. Text: headings rise word by word, mono labels decode, numbers roll.
 *  3. Floors: the lights flicker on as you arrive, and the plaque dings.
 *  4. Play: magnetic buttons, spotlights, a tilting billboard, smooth FAQ
 *     drawers, hopping hero letters, a nav marker, confetti on sign-up.
 *  5. Geese: the floor strips go live; point at (or tap) a goose and it
 *     hops and honks, and one goose per floor waddles in as you arrive.
 *  With reduced motion (or without IntersectionObserver) only the
 *  progress bar runs, and every element shows exactly as before.
 * ------------------------------------------------------------------ */
(() => {
  'use strict';
  const root = document.documentElement;
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };
  const quiet = node => { node.setAttribute('aria-hidden', 'true'); return node; };
  const sr = text => el('span', 'ih-sr', text);
  const inOrder = (a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
  const live = () => root.classList.contains('mo');
  const EASE = 'cubic-bezier(.2,.8,.2,1)';
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/+';

  /* ================================================================ *
   *  0. SCROLL PROGRESS (runs with reduced motion too: it only reports)
   * ================================================================ */
  const header = $('header');
  if (header) {
    const bar = quiet(el('mo-progress'));
    header.appendChild(bar);
    let queued = false;
    const paint = () => {
      queued = false;
      const max = root.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${clamp(max > 0 ? scrollY / max : 0, 0, 1).toFixed(4)})`;
    };
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(paint); } }, { passive: true });
    addEventListener('resize', paint);
    paint();
  }

  const building = $('#building');
  if (!building || calm.matches || !('IntersectionObserver' in window) || typeof Element.prototype.animate !== 'function') return;
  root.classList.add('mo');
  try {
    start();
  } catch (error) {
    root.classList.remove('mo'); // never leave anything hidden
    throw error;
  }
  // Turning on reduced motion mid-visit shows everything at once and keeps it still.
  calm.addEventListener('change', () => { if (calm.matches) root.classList.remove('mo'); });

  function start() {
    const firstFloor = $('.floor', building);

    /* ================================================================ *
     *  1. SCROLL REVEALS
     *  Blocks are tagged with data-mo (the effect). When one scrolls in,
     *  it gets .mo-in and its CSS animation runs. Blocks that arrive in the
     *  same moment go one after another (stagger); `then` adds the extras.
     * ================================================================ */
    const RULES = [
      // Every floor
      { sel: '.floor-plaque', fx: 'plaque', then: (n, d) => $$('b, i', n).forEach((part, i) => odometer(part, d + 280 + i * 170, 850)) },
      { sel: '.floor-ground', fx: 'ground' },
      // Kickoff Hall: the keynote screen switches on, the title rises, the track cards pop up,
      // a little confetti goes off, then the facts roll and the cue cards are dealt
      { sel: '#about .ko-screen', fx: 'power', delay: 100, then: (n, d) => { n.parentElement.classList.add('is-on'); cheer(n, d + 1650); } },
      { sel: '#about .ko-bar', fx: 'fade', delay: 650 },
      { sel: '#about h2', fx: 'words', delay: 760 },
      { sel: '#about .ko-lede', fx: 'blur', delay: 1050 },
      { sel: '#about .ko-track', fx: 'pop', stagger: 90, delay: 1250 },
      { sel: '#about .ko-note', fx: 'fade', delay: 1700 },
      { sel: '#about .ko-facts > div', fx: 'up', stagger: 110, delay: 200, then: (n, d) => $$('strong', n).forEach(x => odometer(x, d + 150, 1300)) },
      { sel: '#about .ko-cue', fx: 'deal', stagger: 150, delay: 140, then: (n, d) => $$('.benefit-number', n).forEach(x => odometer(x, d + 380, 900)) },
      { sel: '#about .ko-foot', fx: 'up', delay: 120, then: (n, d) => $$('.section-footnote b', n).forEach((x, i) => odometer(x, d + 160 + i * 140, 1100)) },
      { sel: '.tagchip', fx: 'fade', then: (n, d) => decode(n, d, 700) },
      { sel: '.section-meta', fx: 'fade', delay: 160 },
      { sel: 'h2', fx: 'words', delay: 80 },
      { sel: '.section-description, .sec > .wrap > .lede', fx: 'blur', delay: 260 },
      // Departures (the board's slot reels are in redesign.js)
      { sel: '#schedule .timezone-control', fx: 'up', delay: 340 },
      { sel: '#schedule .board', fx: 'rise', delay: 100 },
      { sel: '#schedule .agenda-footer', fx: 'up', delay: 120 },
      // Workshop: spec sheets are pinned to the wall, then their lines appear
      { sel: '.lookcols .lookcol', fx: 'pin', stagger: 170, delay: 100 },
      { sel: '.lookcols .lookcol li', fx: 'up', stagger: 70, delay: 520 },
      // Canteen: the till prints the prize pool (its amounts spin, then land on TBA) and
      // tonight's menu is chalked up line by line, each perk's icon drawn on
      { sel: '#prizes .till-art', fx: 'up', delay: 100 },
      { sel: '#prizes .receipt', fx: 'print', delay: 420, then: (n, d) => tally(n, d + 1750) },
      { sel: '#prizes .included-perks', fx: 'up', delay: 200 },
      { sel: '#prizes .included-perks > .small-label', fx: 'chalk', delay: 560 },
      { sel: '#prizes .perk', fx: 'chalk', stagger: 260, delay: 720 },
      { sel: '#prizes .perk-note', fx: 'chalk', delay: 900 },
      // Sponsor Lounge
      { sel: '#sponsors .billboard', fx: 'rise', delay: 140 },
      { sel: '#sponsors .wrap > .reveal:last-child', fx: 'up', delay: 220 },
      // Crew Room: the flyer is pinned up (its tabs pop in), and the badges are hung on the
      // corkboard and swing to rest
      { sel: '#team .flyer', fx: 'pin', delay: 260 },
      { sel: '#team .flyer-tabs li', fx: 'pop', stagger: 70, delay: 900 },
      { sel: '#team .crew-note', fx: 'up', delay: 220 },
      { sel: '#team .crew-apply', fx: 'up', delay: 300 },
      { sel: '#team .apply-detail', fx: 'up', delay: 360 },
      { sel: '#team .crew-roster', fx: 'up', delay: 80 },
      { sel: '#team .roster-heading', fx: 'up', delay: 260 },
      { sel: '#team .crew-roster li', fx: 'swing', stagger: 120, delay: 380, then: (n, d) => $$('.badge-no', n).forEach(x => odometer(x, d + 650, 1000)) },
      { sel: '#team .roster-note', fx: 'up', delay: 320 },
      // Lobby: the take-a-number desk, then the tickets file in
      { sel: '#faq .tk-desk', fx: 'up', delay: 160 },
      { sel: '#faq .faq', fx: 'fade', delay: 120 },
      { sel: '#faq .faq details', fx: 'up', stagger: 70, delay: 320 },
      // Street level
      { sel: '#register .wrap > p:not(.signup-count)', fx: 'blur', stagger: 120, delay: 320 }, // the live counter animates itself
      { sel: '#register .notify', fx: 'up', delay: 460 }
    ];

    // Kickoff Hall sits behind the hero's flight until you step inside (html.cam-inside),
    // so its blocks are ignored until then instead of revealing unseen.
    const veiled = () => root.classList.contains('cam') && !root.classList.contains('cam-inside');

    const show = nodes => {
      const seen = new Map();
      nodes.sort(inOrder).forEach(node => {
        reveal.unobserve(node);
        const rule = node._mo;
        const k = seen.get(rule) || 0;
        seen.set(rule, k + 1);
        const d = (rule.delay || 0) + k * (rule.stagger || 0);
        node.style.setProperty('--mo-d', `${d}ms`);
        node.classList.add('mo-in');
        if (rule.then) rule.then(node, d);
      });
    };

    const reveal = new IntersectionObserver(entries => {
      const ready = entries.filter(entry => entry.isIntersecting && !(firstFloor && firstFloor.contains(entry.target) && veiled()))
        .map(entry => entry.target);
      if (ready.length) show(ready);
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });

    // Stepping inside: observe the first floor's waiting blocks afresh. A new observation always
    // reports where a block is right now, so everything already in view arrives together.
    let wasVeiled = veiled();
    new MutationObserver(() => {
      const now = veiled();
      if (wasVeiled && !now && firstFloor) {
        $$('[data-mo]', firstFloor).forEach(node => {
          if (node.classList.contains('mo-in')) return;
          reveal.unobserve(node);
          reveal.observe(node);
        });
      }
      wasVeiled = now;
    }).observe(root, { attributes: true, attributeFilter: ['class'] });

    for (const rule of RULES) {
      for (const node of $$(rule.sel, building)) {
        if (node._mo) continue;
        node._mo = rule;
        node.dataset.mo = rule.fx;
        if (rule.fx === 'words') words(node);
        reveal.observe(node);
      }
    }

    /* ================================================================ *
     *  3. FLOORS: the lights flicker on as each floor arrives
     * ================================================================ */
    const lights = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('mo-lit');
      lights.unobserve(entry.target);
    }), { rootMargin: '0px 0px -32% 0px' });
    $$('.floor', building).forEach(floor => {
      if (floor === firstFloor || !$('.floor-shell', floor)) return;
      floor.dataset.lights = '';
      lights.observe(floor);
    });

    /* ================================================================ *
     *  4. PLAY
     * ================================================================ */
    drawers();
    confettiOnSignup();
    try { geese(); } catch (error) { console.warn('Geese stayed still:', error); } // the plain pictures remain
    if (!fine) return; // the rest follows a mouse

    $$('.btn').forEach(magnet);
    [['#schedule .board', 'gold'], ['#looking .lookcol', 'paper'], ['#prizes .included-perks', 'chalk'], ['#team .crew-roster li', 'badge']]
      .forEach(([sel, tone]) => $$(sel, building).forEach(card => spotlight(card, tone)));
    tilt($('#sponsors .billboard'));
    hopLetters($('.hero h1'));
    navMarker();

    // Hover replays: the numbers roll again and the labels decode again.
    $$('#about .event-facts > div').forEach(div => div.addEventListener('pointerenter', () => {
      if (live() && div.classList.contains('mo-in')) $$('strong', div).forEach(n => odometer(n, 0, 900));
    }));
    $$('#about .ko-cue').forEach(card => card.addEventListener('pointerenter', () => {
      if (live() && card.classList.contains('mo-in')) $$('.benefit-number', card).forEach(n => odometer(n, 0, 700));
    }));
    $$('.tagchip', building).forEach(chip => chip.addEventListener('pointerenter', () => {
      if (live() && chip.classList.contains('mo-in')) decode(chip, 0, 450);
    }));
    // Pointing at the receipt's prices tots them up again.
    $$('#prizes .rc-lines').forEach(lines => lines.addEventListener('pointerenter', () => {
      const receipt = lines.closest('.receipt');
      if (live() && receipt && receipt.classList.contains('mo-in')) tally(lines, 0);
    }));
  }

  /* ================================================================ *
   *  2. TEXT
   * ================================================================ */

  // Headings: each word rises out of its own slot. Screen readers get the plain sentence.
  function words(node) {
    const text = node.textContent.replace(/\s+/g, ' ').trim();
    const row = quiet(el('mo-words'));
    let i = 0;
    const word = content => {
      const slot = el('mo-w');
      const inner = el('mo-wi');
      inner.style.setProperty('--wi', i++);
      inner.append(content);
      slot.appendChild(inner);
      return slot;
    };
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        for (const part of child.data.split(/(\s+)/)) {
          if (part) row.append(/^\s+$/.test(part) ? ' ' : word(part));
        }
      } else if (child.nodeName === 'BR') {
        row.appendChild(child);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        row.appendChild(word(child));
      }
    }
    node.textContent = '';
    node.append(sr(text), row);
  }

  // Mono labels decode: random glyphs resolve into the label, left to right.
  function decode(node, delay = 0, duration = 700) {
    if (node._decoding) return;
    const text = node.textContent;
    const chars = Array.from(text);
    const shown = quiet(el('mo-dec'));
    node.textContent = '';
    node.append(sr(text), shown);
    const begin = performance.now() + delay;
    let last = 0;
    const frame = now => {
      const p = clamp((now - begin) / duration, 0, 1);
      if (now - last > 45 || p === 1) {
        last = now;
        const fixed = Math.floor(p * chars.length);
        shown.textContent = chars.map((c, i) => (i < fixed || !/[A-Za-z0-9]/.test(c) ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
      }
      if (p < 1) { node._decoding = requestAnimationFrame(frame); return; }
      node._decoding = 0;
      node.textContent = text;
    };
    node._decoding = requestAnimationFrame(frame);
  }

  // Numbers roll like an odometer: every digit is a reel that counts up and lands on its value.
  // The real text is kept for screen readers, and comes back as plain text once the reels stop.
  function odometer(node, delay = 0, duration = 1300) {
    if (node._rolling) return;
    const text = node.textContent;
    if (!/\d/.test(text)) return;
    const shown = quiet(el('mo-odo'));
    const reels = [];
    for (const ch of text) {
      if (!/\d/.test(ch)) { shown.append(ch); continue; }
      const box = el('mo-dg');
      const reel = el('mo-reel');
      box.append(el('mo-sz', null, ch), reel);
      shown.appendChild(box);
      reels.push({ reel, digit: Number(ch) });
    }
    node.textContent = '';
    node.append(sr(text), shown);
    const h = shown.querySelector('mo-dg').offsetHeight;
    if (!h) { node.textContent = text; return; }
    shown.style.setProperty('--h', `${h}px`);
    const runs = reels.map(({ reel, digit }, j) => {
      const laps = j === reels.length - 1 ? 2 : 1; // the last digit spins fastest, like an odometer
      for (let lap = 0; lap < laps; lap++) for (let n = 0; n < 10; n++) reel.appendChild(el('mo-c', null, String(n)));
      for (let n = 0; n <= digit; n++) reel.appendChild(el('mo-c', null, String(n)));
      const cells = laps * 10 + digit;
      return reel.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${-cells * h}px)` }],
        { duration: duration + j * 140, delay, easing: 'cubic-bezier(.12,.7,.16,1)', fill: 'backwards' }).finished;
    });
    node._rolling = Promise.all(runs).catch(() => {}).then(() => {
      node._rolling = null;
      node.textContent = text;
    });
  }

  // Receipt prices tot up like a till: amounts flick past, then the line lands on what it says (TBA).
  function tally(node, delay = 0) {
    $$('.rc-amt', node).forEach((amt, i) => {
      if (amt._tally) return;
      const final = amt.textContent;
      const begin = performance.now() + delay + i * 260;
      const duration = 1000 + i * 220;
      let last = 0;
      const frame = now => {
        if (now >= begin) {
          if (now - begin >= duration) {
            amt._tally = 0;
            amt.textContent = final;
            amt.classList.remove('is-landed');
            void amt.offsetWidth; // restart the stamp
            amt.classList.add('is-landed');
            return;
          }
          if (now - last > 55) {
            last = now;
            amt.textContent = `$${(5 + Math.floor(Math.random() * 95)) * 100}`.replace(/\B(?=(\d{3})+$)/, ',');
          }
        }
        amt._tally = requestAnimationFrame(frame);
      };
      amt._tally = requestAnimationFrame(frame);
    });
  }

  /* ================================================================ *
   *  4. PLAY
   * ================================================================ */

  // Buttons lean toward the pointer and spring back when it leaves.
  function magnet(node) {
    let x = 0, y = 0, tx = 0, ty = 0, frame = 0;
    const step = () => {
      x += (tx - x) * 0.2;
      y += (ty - y) * 0.2;
      const settled = Math.abs(tx - x) < 0.05 && Math.abs(ty - y) < 0.05;
      if (settled) { x = tx; y = ty; }
      node.style.translate = x || y ? `${x.toFixed(2)}px ${y.toFixed(2)}px` : '';
      frame = settled ? 0 : requestAnimationFrame(step);
    };
    node.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || !live()) return;
      const box = node.getBoundingClientRect();
      tx = clamp((event.clientX - (box.left - x + box.width / 2)) * 0.3, -10, 10);
      ty = clamp((event.clientY - (box.top - y + box.height / 2)) * 0.35, -7, 7);
      if (!frame) frame = requestAnimationFrame(step);
    });
    node.addEventListener('pointerleave', () => {
      tx = 0;
      ty = 0;
      if (!frame) frame = requestAnimationFrame(step);
    });
  }

  // A soft light follows the pointer across dark panels.
  function spotlight(card, tone) {
    if (getComputedStyle(card).position === 'static') card.style.position = 'relative';
    card.dataset.glow = tone;
    card.classList.add('mo-spot');
    card.appendChild(quiet(el('mo-glow')));
    card.addEventListener('pointermove', event => {
      const box = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${Math.round(event.clientX - box.left)}px`);
      card.style.setProperty('--my', `${Math.round(event.clientY - box.top)}px`);
    });
  }

  // The billboard turns a little toward the pointer, like a sign you can walk around.
  function tilt(node) {
    if (!node) return;
    let x = 0, y = 0, tx = 0, ty = 0, frame = 0;
    const step = () => {
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      const settled = Math.abs(tx - x) + Math.abs(ty - y) < 0.002;
      if (settled) { x = tx; y = ty; }
      node.style.transform = x || y ? `perspective(1100px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 7).toFixed(2)}deg)` : '';
      frame = settled ? 0 : requestAnimationFrame(step);
    };
    node.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || !live()) return;
      const box = node.getBoundingClientRect();
      tx = clamp(((event.clientX - box.left) / box.width) * 2 - 1, -1, 1);
      ty = clamp(((event.clientY - box.top) / box.height) * 2 - 1, -1, 1);
      if (!frame) frame = requestAnimationFrame(step);
    });
    node.addEventListener('pointerleave', () => {
      tx = 0;
      ty = 0;
      if (!frame) frame = requestAnimationFrame(step);
    });
  }

  // The hero title's letters hop when the pointer passes over them, and nudge their neighbours.
  function hopLetters(title) {
    if (!title || title.children.length) return; // plain text titles only
    const text = title.textContent.trim();
    const row = quiet(el('mo-letters'));
    const letters = Array.from(text, ch => row.appendChild(el('mo-ch', null, ch)));
    title.textContent = '';
    title.append(sr(text), row);
    letters.forEach((letter, i) => letter.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse' || !live()) return;
      for (let k = -2; k <= 2; k++) {
        const other = letters[i + k];
        if (!other) continue;
        const lift = [0.2, 0.1, 0.045][Math.abs(k)];
        other.animate([
          { translate: '0 0', rotate: '0deg', easing: 'cubic-bezier(.2,.7,.3,1)' },
          { translate: `0 ${-lift}em`, rotate: `${k === 0 ? -6 : k * 2}deg`, offset: 0.38, easing: 'cubic-bezier(.34,1.8,.64,1)' },
          { translate: '0 0', rotate: '0deg' }
        ], { duration: 720, delay: Math.abs(k) * 60 });
      }
    }));
  }

  // A marker under the nav slides to the link you point at, then back to the section you're in.
  function navMarker() {
    const nav = $('.nav');
    const list = $('.nav-links');
    if (!nav || !list) return;
    const links = $$('a', list);
    if (getComputedStyle(nav).position === 'static') nav.style.position = 'relative';
    const ink = quiet(el('mo-ink'));
    nav.appendChild(ink);
    let hovered = null;
    const active = () => links.find(a => a.classList.contains('active')) || null;
    const place = link => {
      const box = link && link.getBoundingClientRect();
      if (!box || !box.width || innerWidth <= 720) { ink.classList.remove('is-on'); return; }
      const base = nav.getBoundingClientRect();
      const appearing = !ink.classList.contains('is-on');
      if (appearing) ink.style.transition = 'none'; // appear in place instead of sliding from the corner
      ink.style.width = `${box.width.toFixed(1)}px`;
      ink.style.translate = `${(box.left - base.left).toFixed(1)}px ${(box.bottom - base.top + 6).toFixed(1)}px`;
      if (appearing) { void ink.offsetWidth; ink.style.transition = ''; }
      ink.classList.add('is-on');
    };
    const sync = () => { if (!hovered) place(active()); };
    const watcher = new MutationObserver(sync);
    links.forEach(link => {
      watcher.observe(link, { attributes: true, attributeFilter: ['class'] });
      link.addEventListener('pointerenter', () => { hovered = link; place(link); });
    });
    list.addEventListener('pointerleave', () => { hovered = null; sync(); });
    addEventListener('resize', () => place(hovered || active()));
    if (document.fonts) document.fonts.ready.then(sync);
    sync();
  }

  // FAQ drawers slide open and shut instead of snapping.
  function drawers() {
    $$('#faq .faq details').forEach(item => {
      const summary = $('summary', item);
      const answer = $('.a', item);
      if (!summary) return;
      summary.addEventListener('click', event => {
        if (!live()) return;
        event.preventDefault();
        const opening = !item.open || item._closing;
        const from = item.offsetHeight;
        if (item._anim) item._anim.cancel();
        item.style.overflow = 'hidden';
        let to;
        if (opening) {
          item._closing = false;
          item.open = true;
          to = item.offsetHeight;
          if (answer) answer.animate([{ opacity: 0, translate: '0 -8px' }, { opacity: 1, translate: '0 0' }], { duration: 420, delay: 90, easing: EASE, fill: 'backwards' });
        } else {
          item._closing = true;
          const cs = getComputedStyle(item);
          to = summary.offsetHeight + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
        }
        const run = item._anim = item.animate({ height: [`${from}px`, `${to}px`] }, { duration: 460, easing: EASE });
        run.onfinish = () => {
          if (item._anim !== run) return;
          item._anim = null;
          if (item._closing) { item._closing = false; item.open = false; }
          item.style.overflow = '';
        };
      });
    });
  }

  // A burst of confetti when someone joins the list.
  function confettiOnSignup() {
    const done = $('#notify-done');
    if (!done) return;
    new MutationObserver(() => {
      if (!done.hidden && live()) burst($('h3', done) || done);
    }).observe(done, { attributes: true, attributeFilter: ['hidden'] });
  }

  function burst(from) {
    const box = from.getBoundingClientRect();
    burstAt(box.left + box.width / 2, box.top + box.height / 2, 46);
  }

  // Kickoff: two small bursts from the top corners of the keynote screen, once the title is up.
  function cheer(screen, delay) {
    setTimeout(() => {
      const box = screen.getBoundingClientRect();
      if (!live() || box.bottom < 0 || box.top > innerHeight) return; // only if you're looking at it
      burstAt(box.left + 28, box.top + 20, 16);
      burstAt(box.right - 28, box.top + 20, 16);
    }, delay);
  }

  /* ================================================================ *
   *  5. GEESE
   *  Each floor strip is an <img> until it nears the screen; then the same
   *  SVG is fetched and put in a shadow root (so every strip keeps its own
   *  ids and styles) and the picture underneath stops rendering. Geese are
   *  marked in the artwork: <g class="gz"> moves as one goose (with its hat
   *  and whatever it holds), data-say gives it a line, and one
   *  <g class="gz-walk" data-from="l|r"> per floor waddles in from offstage.
   *  The geese perched on content (.cameo, assets/cameo-*.svg) go live the
   *  same way; data-arrive="drop|peek" on the host says how they turn up
   *  once their object (or data-gate) has been revealed.
   * ================================================================ */
  function geese() {
    const hosts = $$('.floor-art, .cameo', building).filter(host => $('img', host) && !host.shadowRoot);
    if (!hosts.length || typeof Element.prototype.attachShadow !== 'function' || typeof fetch !== 'function') return;

    const HONKS = ['honk!', 'HONK', 'honk honk', 'honk!'];
    const SHEET = `
      svg{display:block;width:100%;height:100%;overflow:hidden;pointer-events:none}
      :host(.cameo) svg{overflow:visible}
      .gz{pointer-events:visiblePainted;cursor:pointer;transform-box:fill-box;transform-origin:50% 100%;-webkit-tap-highlight-color:transparent}
      :host(.is-still) svg *{animation-play-state:paused!important}
      .say{position:absolute;z-index:3;translate:-50% -100%;transform-origin:50% 100%;padding:.5em .8em .55em;border-radius:999px;
        background:#fffdf5;color:#1d1a24;font:800 clamp(11px,.9vw,15px)/1 'Unbounded',system-ui,sans-serif;font-style:normal;
        letter-spacing:.01em;white-space:nowrap;pointer-events:none;box-shadow:0 8px 20px rgba(20,12,40,.24),0 0 0 1.5px rgba(29,26,36,.08)}
      .say::after{content:'';position:absolute;left:calc(50% - 5px);bottom:-4px;width:10px;height:10px;border-radius:2px;background:inherit;rotate:45deg}
      .say.is-right{translate:-24% -100%;transform-origin:24% 100%}
      .say.is-right::after{left:calc(24% - 5px)}
      .say.is-left{translate:-76% -100%;transform-origin:76% 100%}
      .say.is-left::after{left:calc(76% - 5px)}
      @media print{.say{display:none}}`;
    const HOP = [
      { transform: 'translateY(0) scale(1, 1)', easing: 'ease-out' },
      { transform: 'translateY(2px) scale(1.05, .93)', offset: 0.14, easing: 'cubic-bezier(.2,.8,.3,1)' },
      { transform: 'translateY(-26px) scale(.95, 1.06)', offset: 0.45, easing: 'cubic-bezier(.6,0,.85,.4)' },
      { transform: 'translateY(0) scale(1.07, .92)', offset: 0.72, easing: 'ease-out' },
      { transform: 'translateY(-4px) scale(.98, 1.02)', offset: 0.86, easing: 'ease-in-out' },
      { transform: 'translateY(0) scale(1, 1)' }
    ];
    const STIR = [ // sleepers only twitch
      { transform: 'translateY(0) rotate(0deg)' },
      { transform: 'translateY(-6px) rotate(-3deg)', offset: 0.25 },
      { transform: 'translateY(0) rotate(2deg)', offset: 0.55 },
      { transform: 'translateY(0) rotate(-1deg)', offset: 0.8 },
      { transform: 'translateY(0) rotate(0deg)' }
    ];
    const WADDLE = [
      { transform: 'translateY(0) rotate(0deg)' },
      { transform: 'translateY(-3px) rotate(-4deg)', offset: 0.25 },
      { transform: 'translateY(0) rotate(0deg)', offset: 0.5 },
      { transform: 'translateY(-3px) rotate(4deg)', offset: 0.75 },
      { transform: 'translateY(0) rotate(0deg)' }
    ];
    const states = new Map(); // host -> { gate, entrances, visible, delay }

    // Swap a strip in shortly before it scrolls into view.
    const ahead = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      ahead.unobserve(entry.target);
      inline(entry.target).catch(error => console.warn('A floor strip stayed a picture:', error));
    }), { rootMargin: '1200px 0px' });
    hosts.forEach(host => ahead.observe(host));

    // Animations inside a strip pause while it is off screen; a walker sets off once the
    // whole strip (down to the floor line) is in view.
    const watch = new IntersectionObserver(entries => entries.forEach(entry => {
      const state = states.get(entry.target);
      if (!state) return;
      entry.target.classList.toggle('is-still', !entry.isIntersecting);
      const fits = Math.min(entry.boundingClientRect.height, entry.rootBounds ? entry.rootBounds.height : innerHeight);
      state.visible = entry.isIntersecting && fits > 0 && entry.intersectionRect.height / fits > 0.94;
      setOff(state);
    }), { threshold: [0, 0.3, 0.6, 0.8, 0.9, 0.95, 1] });

    // If reduced motion is switched on mid-visit, everyone goes back to their spot and stays still.
    calm.addEventListener('change', () => {
      if (calm.matches) states.forEach(state => state.entrances.splice(0).forEach(entrance => entrance.reset()));
    });

    // Other scripts can have a goose speak up, e.g. the lobby's help desk calling a ticket:
    // document.dispatchEvent(new CustomEvent('ih:honk', { detail: { floor: '#floor-lobby', who: 'ask me!', text: 'now serving 04!' } }))
    // `who` is the goose's own line (data-say). Geese that are off screen stay quiet.
    document.addEventListener('ih:honk', event => {
      const { floor, who, text } = event.detail || {};
      if (!live() || !text) return;
      for (const host of states.keys()) {
        if ((floor && !host.closest(floor)) || host.classList.contains('is-still') || !host.shadowRoot) continue;
        const goose = $$('.gz', host.shadowRoot).find(g => !who || g.dataset.say === who);
        if (!goose || goose.inWalk) continue;
        goose.lastHop = performance.now();
        honk(goose, text);
        goose.animate(HOP, { duration: 680 });
        return;
      }
    });

    async function inline(host) {
      const img = $('img', host);
      const response = await fetch(img.getAttribute('src'));
      if (!response.ok) return;
      const doc = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
      const art = doc.documentElement;
      if (art.localName !== 'svg' || doc.getElementsByTagName('parsererror').length || host.shadowRoot) return;
      // A strip crops like the picture's object-fit; a perched goose shows whole, sitting on the bottom edge.
      art.setAttribute('preserveAspectRatio', host.classList.contains('cameo') ? 'xMidYMax meet' : 'xMidYMax slice');
      art.setAttribute('focusable', 'false');
      honkPoses(art);
      const style = document.createElement('style');
      style.textContent = SHEET;
      const shadow = host.attachShadow({ mode: 'open' });
      shadow.append(style, document.importNode(art, true));
      host.classList.add('is-live', 'is-loaded');
      wire(host, shadow);
    }

    // Every pose gets a twin with the open-beak head, swapped in while a goose honks.
    function honkPoses(art) {
      if (!art.querySelector('[id="gk-head-honk"]')) return;
      $$('symbol[id^="goose-"]', art).forEach(pose => {
        if (!$$('use', pose).some(use => use.getAttribute('href') === '#gk-head')) return;
        const twin = pose.cloneNode(true);
        twin.setAttribute('id', `${pose.id}--honk`);
        $$('use', twin).forEach(use => { if (use.getAttribute('href') === '#gk-head') use.setAttribute('href', '#gk-head-honk'); });
        pose.after(twin);
      });
    }

    function wire(host, shadow) {
      const art = $('svg', shadow);
      const cameo = host.classList.contains('cameo');
      // What has to be revealed first: the strip's floor, or the object a goose sits on.
      const gate = cameo
        ? (host.dataset.gate ? $(host.dataset.gate, host.parentElement) : host.parentElement.closest('[data-mo]'))
        : host.closest('.floor-ground');
      const state = { host, gate, entrances: [], visible: false, delay: Number(host.dataset.delay) || (cameo ? 500 : 0) };
      states.set(host, state);

      // Nobody has seen this yet: walkers wait offstage, perched geese out of sight.
      if (!gate || !gate.classList.contains('mo-in')) {
        if (cameo) holdBack(host, art, state);
        else $$('.gz-walk', art).forEach(walker => holdOffstage(art, walker, state));
      }
      if (gate && state.entrances.length) {
        new MutationObserver(() => setOff(state)).observe(gate, { attributes: true, attributeFilter: ['class'] });
      }
      watch.observe(host);

      // A mouse makes a goose hop on the way in; a tap or click works for everyone.
      shadow.addEventListener('pointerover', event => {
        if (event.pointerType !== 'mouse') return;
        const goose = event.target.closest && event.target.closest('.gz');
        if (goose && !(event.relatedTarget && goose.contains(event.relatedTarget))) react(goose, false);
      });
      shadow.addEventListener('click', event => {
        const goose = event.target.closest && event.target.closest('.gz');
        if (!goose) return;
        event.stopPropagation(); // poking the goose on the billboard shouldn't also turn the billboard
        react(goose, true);
      });
    }

    function holdOffstage(art, walker, state) {
      const goose = $('.gz', walker);
      const box = walker.getBBox();
      if (!goose || !box.width) return;
      const width = art.viewBox.baseVal && art.viewBox.baseVal.width || 1600;
      const dx = walker.dataset.from === 'l' ? -(box.x + box.width + 30) : width - box.x + 30;
      walker.style.transform = `translateX(${dx.toFixed(1)}px)`;
      goose.inWalk = true;
      state.entrances.push({
        go: () => stroll({ walker, goose, dx }),
        reset: () => { walker.style.transform = ''; goose.inWalk = false; }
      });
    }

    function holdBack(host, art, state) {
      const goose = $('.gz', art);
      const how = host.dataset.arrive;
      if (!goose || (how !== 'peek' && how !== 'drop')) return;
      // A peeker waits below the edge it will look over; a percher waits out of sight above its spot.
      if (how === 'peek') goose.style.transform = `translateY(${(goose.getBBox().height + 8).toFixed(1)}px)`;
      else goose.style.opacity = '0';
      goose.inWalk = true;
      state.entrances.push({
        go: () => arrive(goose, how),
        reset: () => { goose.style.transform = ''; goose.style.opacity = ''; goose.inWalk = false; }
      });
    }

    function setOff(state) {
      const { gate, entrances, visible } = state;
      if (!entrances.length || !visible || !live()) return;
      if (gate && gate.hasAttribute('data-mo') && !gate.classList.contains('mo-in')) return; // still veiled
      entrances.splice(0).forEach((entrance, i) => setTimeout(entrance.go, state.delay + 260 + i * 400));
    }

    function arrive(goose, how) {
      const from = goose.style.transform;
      goose.style.transform = '';
      goose.style.opacity = '';
      const settle = () => { goose.inWalk = false; honk(goose, goose.dataset.say || 'honk!'); };
      if (how === 'peek') {
        goose.animate([{ transform: from }, { transform: 'translateY(-6px)', offset: 0.72 }, { transform: 'translateY(0)' }],
          { duration: 950, easing: 'cubic-bezier(.25,.8,.35,1)' }).onfinish = settle;
        return;
      }
      goose.animate([ // flutters down and lands with a squash
        { opacity: 0, transform: 'translateY(-48px) scale(1, 1)', easing: 'cubic-bezier(.5,0,.8,.45)' },
        { opacity: 1, transform: 'translateY(0) scale(1, 1)', offset: 0.5, easing: 'ease-out' },
        { opacity: 1, transform: 'translateY(0) scale(1.08, .9)', offset: 0.68, easing: 'ease-in-out' },
        { opacity: 1, transform: 'translateY(-4px) scale(.98, 1.03)', offset: 0.84 },
        { opacity: 1, transform: 'translateY(0) scale(1, 1)' }
      ], { duration: 820 }).onfinish = settle;
    }

    function stroll({ walker, goose, dx }) {
      const duration = clamp(Math.abs(dx) / 0.34, 900, 2600); // about 340 viewBox units a second
      const cycles = Math.max(2, Math.round(duration / 560)); // two steps per cycle
      walker.style.transform = '';
      goose.animate(WADDLE, { duration: duration / cycles, iterations: cycles });
      walker.animate([{ transform: `translateX(${dx.toFixed(1)}px)` }, { transform: 'translateX(0)' }],
        { duration, easing: 'cubic-bezier(.3,.55,.4,1)' }).onfinish = () => {
        goose.inWalk = false;
        honk(goose, goose.dataset.say || 'honk!'); // made it: say hello
      };
    }

    function react(goose, poke) {
      const now = performance.now();
      if (!live() || goose.inWalk || now - (goose.lastHop || 0) < (poke ? 450 : 900)) return;
      goose.lastHop = now;
      const line = goose.dataset.say;
      const sleepy = line === 'zzz';
      goose.lines = (goose.lines || 0) + 1;
      honk(goose, line && (sleepy || goose.lines % 2) ? line : HONKS[Math.floor(Math.random() * HONKS.length)], sleepy);
      goose.animate(sleepy ? STIR : HOP, { duration: sleepy ? 700 : 680 });
    }

    // Open the beak for a moment and show what the goose said.
    function honk(goose, text, sleepy) {
      const shadow = goose.getRootNode();
      const host = shadow.host;
      if (!host) return;
      const poses = $$('use', goose).filter(use => (use.getAttribute('href') || '').startsWith('#goose-'));
      if (!sleepy) {
        poses.forEach(use => {
          const href = use.getAttribute('href');
          if (href.endsWith('--honk') || !shadow.getElementById(`${href.slice(1)}--honk`)) return;
          use.setAttribute('href', `${href}--honk`);
          setTimeout(() => use.setAttribute('href', href), 560);
        });
      }
      const box = goose.getBoundingClientRect();
      const frame = host.getBoundingClientRect();
      if (!box.width || !frame.width) return;
      // Bubble above the beak: geese face right unless mirrored; a pair gets one bubble in the middle.
      let side = 1;
      if (poses.length > 1) side = 0;
      else if (poses.length === 1) {
        const m = poses[0].getCTM();
        side = m && m.a < 0 ? -1 : 1;
      }
      const x = side < 0 ? box.left + box.width * 0.22 : side > 0 ? box.right - box.width * 0.22 : box.left + box.width / 2;
      const bubble = quiet(el('i', `say${side < 0 ? ' is-left' : side > 0 ? ' is-right' : ''}`, text));
      bubble.style.top = `${(box.top - frame.top - 4).toFixed(1)}px`;
      $$('.say', shadow).forEach(old => { if (old.goose === goose) old.remove(); });
      bubble.goose = goose;
      shadow.appendChild(bubble);
      // Keep the whole bubble on screen, even over a goose that is half cut off at the edge.
      const anchor = side < 0 ? 0.76 : side > 0 ? 0.24 : 0.5; // where the tail sits along the bubble
      const width = bubble.offsetWidth;
      const room = document.documentElement.clientWidth;
      bubble.style.left = `${clamp(x, anchor * width + 8, room - (1 - anchor) * width - 8) - frame.left}px`;
      bubble.animate([
        { opacity: 0, transform: 'translateY(8px) scale(.5) rotate(-8deg)' },
        { opacity: 1, transform: 'translateY(0) scale(1.08) rotate(3deg)', offset: 0.14 },
        { opacity: 1, transform: 'translateY(-2px) scale(1) rotate(0deg)', offset: 0.28 },
        { opacity: 1, transform: 'translateY(-8px) scale(1)', offset: 0.8 },
        { opacity: 0, transform: 'translateY(-16px) scale(.94)' }
      ], { duration: sleepy ? 1700 : 1300, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => bubble.remove();
    }
  }

  function burstAt(x, y, count) {
    const colors = ['#ffd468', '#c98cff', '#ff8a5c', '#46d4e8', '#fff3d6', '#86e3a8'];
    for (let i = 0; i < count; i++) {
      const bit = quiet(el('mo-bit'));
      const size = 6 + Math.random() * 7;
      Object.assign(bit.style, {
        left: `${x}px`, top: `${y}px`, width: `${size}px`, height: `${i % 4 ? size : size * 0.45}px`,
        background: colors[i % colors.length], borderRadius: i % 3 ? '50%' : '2px'
      });
      document.body.appendChild(bit);
      const angle = Math.random() * Math.PI * 2;
      const reach = 80 + Math.random() * 200;
      const dx = Math.cos(angle) * reach;
      const dy = Math.sin(angle) * reach - 90;
      bit.animate([
        { transform: 'translate(-50%, -50%) scale(.4)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${Math.random() * 320}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(calc(-50% + ${dx * 1.15}px), calc(-50% + ${dy + 180}px)) rotate(${Math.random() * 640}deg) scale(.7)`, opacity: 0 }
      ], { duration: 1200 + Math.random() * 700, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => bit.remove();
    }
  }
})();
