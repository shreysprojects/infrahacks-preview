
    /* Reload used to land a little scrolled down: with html{scroll-behavior:smooth}
       a smooth scroll is often still settling, and the browser saves that mid-flight
       position and restores it after reload. On this page the scroll position is the
       time of day, so a plain load/reload should just start at the top (dawn). Hash
       deep-links (/#register, /#faq) are handed back to the browser so they still jump
       to their section. (scrollRestoration persists per tab, hence the explicit reset.) */
    if ('scrollRestoration' in history) {
      if (location.hash) {
        history.scrollRestoration = 'auto';
      } else {
        history.scrollRestoration = 'manual';
        window.addEventListener('pageshow', function () {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        });
      }
    }
  

    (function () {
      /* ============================================
         REAL LINKS: edit once, every button updates.
         ============================================ */
      var LINKS = {
        'apply': '/apply.html',
        'apply-final': '/apply.html',
        'discord': 'https://discord.gg/89ehseh5',
        'instagram': 'https://www.instagram.com/infrahacksorg/',
        'coc': 'coc.html'
      };

      var $ = function (s) { return document.querySelector(s) };
      var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)) };
      document.documentElement.classList.add('js');
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      $$('[data-link]').forEach(function (a) {
        var k = a.getAttribute('data-link');
        if (LINKS[k]) a.setAttribute('href', LINKS[k]);
        if (LINKS[k] && LINKS[k].charAt(0) === '#') a.removeAttribute('target');
      });

const localPreview = document.documentElement.hasAttribute('data-local-preview');
if (localPreview) {
  $('.notify-fine').textContent = 'Local preview: saved on this computer only. No email is sent.';
  $('#notify-done h3').textContent = 'Saved to the local list.';
  $('#notify-done p').textContent = 'Your interest is saved in this local preview. Visit the official InfraHacks website or join the community for event updates.';
}

/* live public signup counter (/api/stats is edge-cached, so polling is cheap) */
const counter = $('#signup-count');
let shownCount = null, countFloor = 0;
const paintCount = n => {
  if (n <= 0) { counter.classList.remove('on'); counter.innerHTML = ''; return; }
  counter.classList.add('on');
  counter.innerHTML = `<span class="scdot"></span> <b>${n}</b> ${n === 1 ? 'builder' : 'builders'} already on the list`;
};
const showCount = target => {
  if (shownCount === null || reduce) { shownCount = target; return paintCount(target); }
  if (target === shownCount) return;
  const from = shownCount; let t0 = null;
  const step = ts => { t0 = t0 || ts; const k = Math.min((ts - t0) / 700, 1); paintCount(Math.round(from + (target - from) * k)); if (k < 1) requestAnimationFrame(step); };
  shownCount = target; requestAnimationFrame(step);
};
// countFloor keeps a just-made signup from being "undone" by a stale cached count.
const refreshCount = () => fetch('/api/stats').then(r => r.ok ? r.json() : null)
  .then(j => { if (j && j.ok) showCount(Math.max(Math.floor(Number(j.count)) || 0, countFloor)); }).catch(() => {});
refreshCount();
setInterval(() => { if (!document.hidden) refreshCount(); }, 25000);

/* referral: capture ?ref=, persist it, pass it along on signup */
const cleanRef = v => String(v || '').replace(/[^a-z0-9]/gi, '').slice(0, 16);
const REF = (() => {
  const fromUrl = cleanRef(new URLSearchParams(location.search).get('ref'));
  try { if (fromUrl) localStorage.setItem('ih_ref', fromUrl); return fromUrl || cleanRef(localStorage.getItem('ih_ref')); }
  catch (e) { return fromUrl; }
})();
$('#ref-copy').addEventListener('click', async () => {
  const input = $('#ref-link'), copy = $('#ref-copy');
  input.select();
  try { await navigator.clipboard.writeText(input.value); } catch (e) { try { document.execCommand('copy'); } catch (e2) {} }
  copy.textContent = 'Copied ✓'; copy.classList.add('done');
  setTimeout(() => { copy.textContent = 'Copy'; copy.classList.remove('done'); }, 1800);
});

$('#notify-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const button = $('#notify-submit');
  const message = $('#notify-msg');
  button.disabled = true; button.textContent = 'Saving…'; message.textContent = ''; message.classList.remove('err');
  try {
    const response = await fetch('/api/subscribe', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:$('#notify-email').value.trim(), company:form.elements.company.value, source:'home', ref:REF || undefined})});
    // A crashed function answers with an HTML error page, not JSON.
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      const errors = {rate_limited:'Too many attempts. Please try again in a few minutes.', invalid_email:'Please enter a valid email address.', server_error:'Could not save your email. Please try again.', server_misconfigured:'Signups are briefly unavailable. Please try again soon.'};
      throw new Error(errors[result.error] || (response.status === 429 ? errors.rate_limited : errors.server_error));
    }
    form.hidden = true; $('#notify-done').hidden = false;
    if (result.already) $('#notify-done h3').textContent = "You're already on the list.";
    if (result.ref) { $('#ref-link').value = 'https://infrahacks.org/?ref=' + encodeURIComponent(result.ref); $('#ref-share').hidden = false; }
    if (!result.already && shownCount !== null) { countFloor = shownCount + 1; showCount(countFloor); }
    $('#notify-done').setAttribute('tabindex','-1'); $('#notify-done').focus();
  } catch (error) { message.textContent = error.message; message.classList.add('err'); }
  finally { button.disabled = false; button.textContent = 'Notify me ↗'; }
});

      /* mobile nav */
      var mb = $('.menu-btn');
      if (mb) {
        mb.addEventListener('click', function () {
          var open = document.body.classList.toggle('nav-open');
          mb.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        $$('.nav-links a').forEach(function (a) {
          a.addEventListener('click', function () {
            document.body.classList.remove('nav-open');
            mb.setAttribute('aria-expanded', 'false');
          });
        });
      }

      /* reveal */
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { threshold: .12 });
      $$('.reveal').forEach(function (el) { io.observe(el); });

      /* nav active */
      var navMap = {};
      $$('.nav-links a').forEach(function (a) {
        var id = (a.getAttribute('href') || '').replace('#', '');
        if (id) navMap[id] = a;
      });
      var secObs = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var link = navMap[e.target.id]; if (!link) return;
          if (e.isIntersecting) {
            $$('.nav-links a').forEach(function (x) { x.classList.remove('active') });
            link.classList.add('active');
          }
        });
      }, { rootMargin: '-30% 0px -55% 0px' });
      Object.keys(navMap).forEach(function (id) {
        var s = document.getElementById(id); if (s) secObs.observe(s);
      });

      /* tz toggle */
      var bET = $('#tz-et'), bLoc = $('#tz-local'), note = $('#tznote');
      function setMode(local) {
        $$('.tt-row .t').forEach(function (t) {
          if (local) {
            try {
              var fmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
              t.textContent = fmt.format(new Date(t.getAttribute('data-utc')));
              t.parentElement.querySelector('.day').textContent = new Intl.DateTimeFormat('en-US', {weekday:'short',month:'short',day:'numeric'}).format(new Date(t.getAttribute('data-utc'))).replaceAll(',', '');
            } catch (e) { t.textContent = t.getAttribute('data-et'); }
          } else { t.textContent = t.getAttribute('data-et'); t.parentElement.querySelector('.day').textContent = new Intl.DateTimeFormat('en-US',{timeZone:'America/Toronto',weekday:'short',month:'short',day:'numeric'}).format(new Date(t.getAttribute('data-utc'))).replaceAll(',', ''); }
        });
        document.querySelector('#schedule').dataset.local = String(local);
        bET.setAttribute('aria-pressed', local ? 'false' : 'true');
        bLoc.setAttribute('aria-pressed', local ? 'true' : 'false');
        try { note.textContent = local ? ('All times ' + Intl.DateTimeFormat().resolvedOptions().timeZone) : 'All times ET (UTC−5)'; }
        catch (e) { note.textContent = local ? 'All times local' : 'All times ET (UTC−5)'; }
      }
      if (bET && bLoc) {
        bET.addEventListener('click', function () { setMode(false) });
        bLoc.addEventListener('click', function () { setMode(true) });
        try {
          var z = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
          setMode(!/America\/(Toronto|New_York|Montreal|Detroit)/.test(z));
        } catch (e) { setMode(false); }
      }


})();
// A single viewport-fixed city stays behind every section. Only content scrolls.
(() => {
  const root=document.documentElement;
  const world=document.querySelector('.hero-world');
  // The sky's CSS variables are set on the sky layer itself (and --night on the billboards that use it):
  // set on <html> they would restyle the whole page on every scroll frame.
  const sky=world||root,nightAlso=Array.from(document.querySelectorAll('.billboard'));
  const hero=document.querySelector('.hero');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  // Reveal building districts from the ground without deforming the artwork.
  // Wait for the image to decode so the entrance is visible on a cold load too.
  const lastBuilding=document.querySelector('[data-last-rise]');
  let entranceFinished=false;
  function finishBuildings(){
    entranceFinished=true;
    world.classList.remove('buildings-loading','buildings-entering');
    document.querySelector('.city-buildings').removeAttribute('clip-path');
  }
  if(reduce.matches)finishBuildings();
  if(!reduce.matches){
    world.classList.add('buildings-loading');
    const skylineImage=new Image();
    skylineImage.src='assets/skyline-cutout.webp';
    skylineImage.decode().then(()=>{
      if(reduce.matches||entranceFinished){finishBuildings();return;}
      requestAnimationFrame(()=>{
        world.classList.replace('buildings-loading','buildings-entering');
      });
    }).catch(finishBuildings);
    lastBuilding.addEventListener('animationend',event=>{
      if(event.animationName==='skyline-build-up')finishBuildings();
    });
  }
  reduce.addEventListener('change',()=>{if(reduce.matches)finishBuildings();});
  const lights=document.querySelector('#window-lights');
  const ns='http://www.w3.org/2000/svg';
  [[1290,310],[1330,318],[1358,316],[1293,372],[1331,387],[1358,402],[1241,659],[1264,659],[1328,706],[1350,706],[1074,484],[18,689],[55,686],[77,350],[43,350]].forEach(([x,y],i)=>{
    const r=document.createElementNS(ns,'rect');r.setAttribute('x',x);r.setAttribute('y',y);r.setAttribute('width',4);r.setAttribute('height',9);r.setAttribute('fill','#ffc76c');r.setAttribute('class','living-window');r.style.setProperty('--light-delay',`${-i*1.9}s`);lights.appendChild(r);
  });
  const clamp01=n=>Math.max(0,Math.min(n,1));
  const sun=world&&world.querySelector('.hero-sun'),signup=document.querySelector('#register .wrap'),heroCopy=document.querySelector('.hero-copy');
  // Keeps the sun (centre x, y, radius r) out from behind the text in `box`: under it in open
  // sky (tall screens), beside it where there's room (desktop), or else low under it, over the
  // skyline (phones). `show` is how visible that text is; the sun is held clear until it's
  // half faded, then eases back to where it was headed.
  function keepClear(box,x,y,r,show){
    if(!box||show<=0)return [x,y];
    const pad=r+20,boxes=[];
    for(const el of box.children){const range=document.createRange();range.selectNodeContents(el);const b=range.getBoundingClientRect();if(b.width&&b.height)boxes.push(b);}
    const off=b=>[Math.max(b.left-x,0,x-b.right),Math.max(b.top-y,0,y-b.bottom)];
    if(!boxes.some(b=>Math.hypot(...off(b))<pad))return [x,y];
    const reach=d=>Math.sqrt(Math.max(0,pad*pad-d*d));
    let left=Infinity,below=-Infinity;
    for(const b of boxes){const [dx,dy]=off(b);if(dy<pad)left=Math.min(left,b.left-reach(dy));if(dx<pad)below=Math.max(below,b.bottom+reach(dx));}
    const [tx,ty]=below+r<=innerHeight*.62||left<r+8?[x,below]:[left,y],k=Math.min(1,show/.5);
    return [x+(tx-x)*k,y+(ty-y)*k];
  }
  const clock={hour:document.querySelector('#clk-hour'),min:document.querySelector('#clk-min'),digi:document.querySelector('#clk-digi')};
  // Time of day follows the sun. Each row: phase, sky (top, upper, lower, horizon),
  // cloud colour, sun colour (top, bottom), and how lit the city is (0 day .. 1 night).
  // The page is the 24 hours of the event, seen through the building's windows:
  // Saturday morning at the top, sunset around the canteen, night through the crew
  // room and lobby, and sunrise over the street at the very bottom.
  const DAY=[
    [0,  '#2a64bd','#3f86d6','#86c1ef','#ffe2b4','#ffffff','#fff6c4','#ffe36b',0],
    [.30,'#1d5fb8','#3a82d6','#82bff0','#d7eeff','#ffffff','#fffbe0','#fff0a0',0],
    [.46,'#2f58a6','#6a6fb8','#e6a07a','#ffcf8a','#ffd9b8','#ffe08a','#ffb14a',.08],
    [.55,'#262063','#6a2f6c','#e2655a','#ffae62','#f08a7a','#ffc46a','#ff8c42',.4],
    [.63,'#141133','#2a1a4f','#5a2b62','#9c4569','#583a78','#ffc46a','#ff8c42',.85],
    [.80,'#0a0820','#120d2c','#1f1640','#2e2050','#2a2148','#ffc46a','#ff8c42',1],
    [.90,'#111639','#29275c','#5c3f7c','#c2707c','#77598c','#ffc46a','#ff8c42',.75],
    [1,  '#4a5fa8','#8f6fae','#f39d88','#ffd59c','#ffc8aa','#fff2c4','#ffb85a',.12]];
  const hex=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
  const mix=(a,b,k)=>'#'+hex(a).map((v,i)=>Math.round(v+(hex(b)[i]-v)*k).toString(16).padStart(2,'0')).join('');
  function timeOfDay(u){
    let i=1;while(i<DAY.length-1&&DAY[i][0]<u)i++;
    const a=DAY[i-1],b=DAY[i],k=clamp01((u-a[0])/(b[0]-a[0]));
    ['--sky-0','--sky-1','--sky-2','--sky-3','--cloud','--sun-a','--sun-b'].forEach((name,j)=>sky.style.setProperty(name,mix(a[j+1],b[j+1],k)));
    const night=a[8]+(b[8]-a[8])*k;
    sky.style.setProperty('--night',String(night));
    nightAlso.forEach(board=>board.style.setProperty('--night',String(night)));
    // Daylight haze over the night-painted skyline: full by day, gone from sunset on
    // (at sunrise the city stays a dark silhouette against the bright sky).
    sky.style.setProperty('--daywash',String((1-night)*(1-clamp01((u-.48)/.1))));
  }
  let queued=false;
  const exitRun=document.querySelector('.exit-run');
  function draw(){
    const range=Math.max(1,document.documentElement.scrollHeight-innerHeight);
    // The way out (a long run at street level) would stretch the day: every floor keeps the time it
    // has without it, and the last of the night turns into sunrise while the camera pulls back.
    const extra=exitRun?exitRun.offsetHeight:0,base=Math.max(1,range-extra);
    const from=exitRun?Math.min(base,Math.max(0,exitRun.getBoundingClientRect().top+scrollY-innerHeight)):range;
    const progress=scrollY<=from?Math.max(0,scrollY/base):Math.min(1,from/base+(1-from/base)*(scrollY-from)/Math.max(1,range-from));
    const reading=Math.max(0,Math.min(scrollY/Math.max(1,hero.offsetHeight*.7),1));
    // Sun: already up at the top of the page, it crosses the sky and sets behind the
    // towers on the right around 58%; at the very end it rises again over the street.
    const phase=reduce.matches?0:progress;
    const u=.3+.7*clamp01(phase/.58),R=sun?sun.offsetWidth/2:60;
    let sunX=(.08+.84*u)*innerWidth,sunY=(.8-.66*4*u*(1-u))*innerHeight,sunOn=1-clamp01((phase-.56)/.04);
    // Sunrise never sits behind the sign-up. With room beside it (desktop) the sun comes up
    // between the towers on the right; where the text spans the screen (phones, tablets) it
    // stays tucked under the sign-up and peeks over the skyline as you reach the end.
    if(phase>.88){
      const r=clamp01((phase-.9)/.1),col=signup&&signup.getBoundingClientRect();
      sunX=(.74+.04*r)*innerWidth;sunY=(.9-.3*r)*innerHeight;sunOn=clamp01((phase-.9)/.03);
      if(col&&col.height){
        if(innerWidth-col.right>=2*R+24)sunX=Math.max(sunX,col.right+R+24);
        else{sunX=(.68+.04*r)*innerWidth;sunY=col.bottom+R+20;}
      }
    }
    // With reduced motion the sun holds still, but still never behind the sign-up text.
    if(reduce.matches){sunX=.3*innerWidth;sunY=.3*innerHeight;sunOn=1;[sunX,sunY]=keepClear(signup,sunX,sunY,R,1);}
    // The morning sun waits clear of the hero title and eases onto its arc as the title fades.
    if(phase<.25&&!hero.classList.contains('cam-copy-gone'))[sunX,sunY]=keepClear(heroCopy,sunX,sunY,R,1-(parseFloat(hero.style.getPropertyValue('--cam-out'))||0));
    sky.style.setProperty('--sun-cx',`${sunX}px`);
    sky.style.setProperty('--sun-cy',`${sunY}px`);
    sky.style.setProperty('--sun-opacity',String(sunOn));
    timeOfDay(phase);
    // The moon arcs across the night floors (main, PR #7 started it on the left).
    const moon=clamp01((phase-.6)/.3);
    sky.style.setProperty('--moon-rise',`${Math.sin(Math.PI*moon)*innerHeight*.42}px`);
    sky.style.setProperty('--moon-x',`${moon*innerWidth*.5}px`);
    sky.style.setProperty('--moon-opacity',String(clamp01((phase-.6)/.03)*(1-clamp01((phase-.87)/.03))));
    // Scene clock: scroll is time, Saturday 09:30 at the top to Sunday 07:00 at the bottom (main, PR #8).
    if(clock.hour&&clock.min){
      const mins=Math.round(570+(1860-570)*progress),hh=Math.floor(mins/60)%24,mm=mins%60;
      clock.min.setAttribute('transform',`rotate(${mm*6} 20 20)`);
      clock.hour.setAttribute('transform',`rotate(${((hh%12)+mm/60)*30} 20 20)`);
      if(clock.digi)clock.digi.textContent=`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
    }
    sky.style.setProperty('--reading-mode',String(reading));
    sky.style.setProperty('--hero-scroll','0');
    sky.style.setProperty('--skyline-depth','0px');
    document.body.classList.toggle('scrolled',scrollY>50);
    queued=false;
  }
  window.addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(draw);}},{passive:true});
  window.addEventListener('resize',draw);reduce.addEventListener('change',draw);
  document.querySelectorAll('details').forEach(d=>d.addEventListener('toggle',draw));
  if(heroCopy)heroCopy.addEventListener('animationend',draw); // re-measure the title once it has settled
  draw();
  // Animation keeps running below the hero, but pauses when the tab is hidden.
  function pause(){world.classList.toggle('scene-paused',document.hidden);}
  document.addEventListener('visibilitychange',pause);pause();
  if(matchMedia('(hover:hover)').matches){
    let current=0,target=0,frame=0;
    function move(){current+=(target-current)*.07;world.style.setProperty('--pointer-x',`${Math.round(current*devicePixelRatio)/devicePixelRatio}px`);if(Math.abs(target-current)>.05)frame=requestAnimationFrame(move);else frame=0;}
    window.addEventListener('pointermove',event=>{if(reduce.matches)return;target=(event.clientX/innerWidth-.5)*18;if(!frame)frame=requestAnimationFrame(move);},{passive:true});
  }
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.body.classList.contains('nav-open')){document.body.classList.remove('nav-open');const button=document.querySelector('.menu-btn');button.setAttribute('aria-expanded','false');button.focus();}});
})();

// Accessible day navigation, scoped to the weekend section.
(() => {
  const section=document.querySelector('#schedule');
  const tabs=[...section.querySelectorAll('.agenda-tab')];
  function selectTab(tab,focus=false){
    tabs.forEach(item=>{
      const active=item===tab;
      item.setAttribute('aria-selected',String(active));
      item.tabIndex=active?0:-1;
      section.querySelector('#'+item.getAttribute('aria-controls')).hidden=!active;
    });
    if(focus)tab.focus();
  }
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>selectTab(tab));
    tab.addEventListener('keydown',event=>{
      let next;
      if(event.key==='ArrowRight')next=(index+1)%tabs.length;
      else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;
      else if(event.key==='Home')next=0;
      else if(event.key==='End')next=tabs.length-1;
      else return;
      event.preventDefault();selectTab(tabs[next],true);
    });
  });
})();
