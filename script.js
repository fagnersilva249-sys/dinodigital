/* Dino Digital — Ariete Design (Parallax Code 2.5)
   Motor de scrub: blob preload · seek confirmado + lerp · prime no 1º gesto · sem guard de readyState no update */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  /* ---------- Lenis (scroll suave) ---------- */
  let lenis = null;
  if (!reduce && hasGsap && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollToY = (y) => (lenis ? lenis.scrollTo(y, { duration: 2.2 }) : window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' }));

  /* ---------- quebra de palavras (word reveal) ---------- */
  function splitWords(el) {
    let i = 0;
    const out = document.createDocumentFragment();
    [...el.childNodes].forEach((node) => {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { out.appendChild(document.createTextNode(' ')); return; }
          const s = document.createElement('span');
          s.className = 'w'; s.style.setProperty('--i', i++); s.textContent = part;
          out.appendChild(s);
        });
      } else {
        const s = document.createElement('span');
        s.className = 'w'; s.style.setProperty('--i', i++);
        s.appendChild(node.cloneNode(true));
        out.appendChild(s);
      }
    });
    el.textContent = '';
    el.appendChild(out);
  }
  document.querySelectorAll('.split, .reveal-text').forEach(splitWords);

  /* ---------- vídeo certo pela orientação ---------- */
  const video = document.getElementById('heroVideo');
  const portrait = matchMedia('(orientation: portrait)').matches;
  const src = portrait ? video.dataset.srcPort : video.dataset.srcLand;
  video.poster = portrait ? video.dataset.posterPort : video.dataset.posterLand;
  video.src = src; // fase 1: streaming

  /* ---------- motor de scrub ---------- */
  let target = 0, cur = 0, lastT = -1, seeking = false, failsafe = 0;
  const done = () => { seeking = false; clearTimeout(failsafe); };
  video.addEventListener('seeked', done);
  function seek(t) {
    seeking = true; lastT = t;
    try { video.currentTime = t; } catch (e) { seeking = false; return; }
    clearTimeout(failsafe);
    failsafe = setTimeout(() => { seeking = false; }, 250);
    if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(done);
  }
  (function loop() {
    cur += (target - cur) * 0.22;
    const d = video.duration;
    if (d && isFinite(d)) {
      const t = Math.min(cur * d, d - 0.05);
      if (!seeking && Math.abs(t - lastT) > 0.02) seek(t);
    }
    requestAnimationFrame(loop);
  })();

  // prime no primeiro gesto (iOS libera seeks só depois de um gesto)
  const gestures = ['touchstart', 'pointerdown', 'wheel', 'keydown'];
  const prime = () => {
    gestures.forEach((g) => removeEventListener(g, prime));
    const p = video.play();
    if (p && p.then) p.then(() => video.pause()).catch(() => {}); else video.pause();
  };
  gestures.forEach((g) => addEventListener(g, prime, { passive: true }));

  /* ---------- preloader + blob ---------- */
  const pre = document.getElementById('preloader');
  const prePct = document.getElementById('prePct');
  const preBar = document.getElementById('preBar');
  const preTxt = document.getElementById('preTxt');
  let preDone = false;
  const setPct = (f) => {
    const p = Math.max(0, Math.min(100, Math.round(f * 100)));
    prePct.textContent = p; preBar.style.width = p + '%';
  };
  const finishPre = () => {
    if (preDone) return; preDone = true;
    setPct(1); preTxt.textContent = 'RUA ACESA';
    setTimeout(() => { pre.classList.add('done'); if (hasGsap) ScrollTrigger.refresh(); }, 350);
  };
  setTimeout(finishPre, 8000); // failsafe

  (async () => {
    try {
      const r = await fetch(src);
      if (!r.ok || !r.body) throw new Error(r.status);
      const total = +r.headers.get('content-length') || 0;
      const reader = r.body.getReader();
      const chunks = []; let got = 0;
      for (;;) {
        const { done: end, value } = await reader.read();
        if (end) break;
        chunks.push(value); got += value.length;
        if (total) setPct(got / total * 0.98);
      }
      const t = video.currentTime;
      video.src = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' })); // fase 2: blob em memória
      video.addEventListener('loadedmetadata', () => { try { video.currentTime = t; } catch (e) {} lastT = -1; }, { once: true });
    } catch (e) { /* segue em streaming */ }
    finishPre();
  })();

  /* ---------- cenas + HUD ---------- */
  const scenes = [...document.querySelectorAll('.scene')];
  const hudLabel = document.getElementById('hudLabel');
  const hudSteps = [...document.querySelectorAll('.hud__steps i')];
  const phases = [[0, 'A BUSCA'], [0.25, 'INVISÍVEL'], [0.51, '1º LUGAR'], [0.77, 'CLIENTE']];
  function updateHero(p) {
    target = p;
    scenes.forEach((s) => {
      const on = p >= +s.dataset.from && p < +s.dataset.to;
      s.classList.toggle('is-on', on);
      s.setAttribute('aria-hidden', String(!on));
    });
    let idx = 0;
    phases.forEach(([at], i) => { if (p >= at) idx = i; });
    if (hudLabel.textContent !== phases[idx][1]) hudLabel.textContent = phases[idx][1];
    hudSteps.forEach((el, i) => el.classList.toggle('on', i <= idx));
  }
  updateHero(0);

  const spacer = document.querySelector('.hero-spacer');
  const progressBar = document.getElementById('progress');
  if (hasGsap) {
    ScrollTrigger.create({ trigger: spacer, start: 'top top', end: 'bottom bottom', onUpdate: (s) => updateHero(s.progress) });
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => { progressBar.style.transform = `scaleX(${s.progress})`; } });
  } else {
    addEventListener('scroll', () => {
      const r = spacer.getBoundingClientRect();
      updateHero(Math.min(1, Math.max(0, -r.top / (r.height - innerHeight))));
    }, { passive: true });
  }
  // botão "Desça a tela": leva até a primeira cena, mostrando o efeito
  document.getElementById('cueBtn').addEventListener('click', () => {
    scrollToY(spacer.offsetTop + 0.38 * (spacer.offsetHeight - innerHeight));
  });

  /* ---------- animações das seções ---------- */
  if (hasGsap && !reduce) {
    // text reveal com scrub
    gsap.utils.toArray('.reveal-text').forEach((el) => {
      gsap.from(el.querySelectorAll('.w'), {
        opacity: 0.12, y: 18, stagger: 0.05, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom 55%', scrub: true },
      });
    });
    // reveals
    gsap.utils.toArray('.diag__list li, .steps li, .fit__col, .faq details, .channels li, .form, .about__facts div, .diag .lead, .diag .btn').forEach((el) => {
      gsap.from(el, { y: 38, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
    // parallax multi-camada
    gsap.utils.toArray('[data-speed]').forEach((el) => {
      gsap.to(el, { yPercent: -60 * parseFloat(el.dataset.speed || 0.5), ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }


  /* ---------- seções em scroll horizontal — sticky + scrub, sem pin ----------
     A seção ganha a altura do percurso; o conteúdo fica "grudado" (sticky) e desliza com o scroll.
     Serviços: só no desktop. Carrossel de artes: em todas as telas. */
  if (hasGsap) {
    const setupH = (wrap) => {
      if (!wrap) return;
      const sec = wrap.parentElement;
      const track = wrap.querySelector('.h-track');
      const bar = wrap.querySelector('.arts__bar i');
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      const setH = () => { sec.style.height = (dist() + innerHeight) + 'px'; wrap.classList.add('is-sticky'); };
      setH();
      ScrollTrigger.addEventListener('refreshInit', setH);
      const tween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true,
          onUpdate: (s) => { if (bar) bar.style.transform = `scaleX(${s.progress})`; },
        },
      });
      // carrossel dinâmico: cada arte cresce e endireita ao passar pelo centro
      if (!reduce) wrap.querySelectorAll('.art-card').forEach((card, i) => {
        gsap.fromTo(card, { scale: 0.82, rotate: i % 2 ? 4 : -4, opacity: 0.55 }, {
          scale: 1, rotate: 0, opacity: 1, ease: 'sine.inOut', immediateRender: false,
          scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 95%', end: 'center 52%', scrub: true },
        });
        gsap.to(card, {
          scale: 0.86, rotate: i % 2 ? -3 : 3, opacity: 0.6, ease: 'sine.inOut', immediateRender: false,
          scrollTrigger: { trigger: card, containerAnimation: tween, start: 'center 48%', end: 'right 5%', scrub: true },
        });
      });
      return () => {
        ScrollTrigger.removeEventListener('refreshInit', setH);
        sec.style.height = ''; wrap.classList.remove('is-sticky');
      };
    };
    const mm = gsap.matchMedia();
    mm.add('(min-width: 861px)', () => setupH(document.querySelector('.services .h-wrapper')));
    mm.add('all', () => setupH(document.querySelector('.h-wrapper--arts')));
  }

  /* ---------- nav ---------- */
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('solid', scrollY > 40);
  onScroll(); addEventListener('scroll', onScroll, { passive: true });

  const burger = document.querySelector('.burger');
  const menu = document.getElementById('menu');
  const setMenu = (open) => { burger.setAttribute('aria-expanded', String(open)); menu.classList.toggle('open', open); };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  menu.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const el = document.querySelector(a.getAttribute('href'));
    setMenu(false);
    if (el && lenis) { e.preventDefault(); lenis.scrollTo(el, { offset: -70, duration: 1.6 }); }
  }));

  const links = [...menu.querySelectorAll('a[href^="#"]')];
  const spy = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    links.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === '#' + en.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main section[id]').forEach((s) => spy.observe(s));

  /* ---------- formulário → WhatsApp ---------- */
  const WHATSAPP = '5551996131655';
  document.getElementById('form').addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    ['nome', 'negocio'].forEach((id) => {
      const input = document.getElementById('f-' + id);
      const err = document.getElementById('e-' + id);
      const bad = !input.value.trim();
      input.setAttribute('aria-invalid', String(bad));
      bad ? input.setAttribute('aria-describedby', 'e-' + id) : input.removeAttribute('aria-describedby');
      err.hidden = !bad;
      if (bad && ok) { input.focus(); ok = false; }
    });
    if (!ok) return;
    const v = (id) => document.getElementById('f-' + id).value.trim();
    const txt = ['Oi Fagner! Vim pelo site da Dino Digital.', `Nome: ${v('nome')}`, `Negócio: ${v('negocio')}`,
      `Preciso de: ${v('servico')}`, v('msg') ? `Sobre o negócio: ${v('msg')}` : ''].filter(Boolean).join('\n');
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(txt)}`, '_blank', 'noopener');
  });

  /* ---------- cookies (LGPD) ---------- */
  const ck = document.getElementById('cookie');
  let c = null;
  try { c = localStorage.getItem('cookie-consent'); } catch (e) {}
  if (!c) ck.hidden = false;
  const setC = (v) => { try { localStorage.setItem('cookie-consent', v); } catch (e) {} ck.hidden = true; };
  document.getElementById('ck-ok').addEventListener('click', () => setC('accept'));
  document.getElementById('ck-no').addEventListener('click', () => setC('reject'));

  document.getElementById('ano').textContent = new Date().getFullYear();
  addEventListener('load', () => { if (hasGsap) ScrollTrigger.refresh(); });
})();
