/* =========================================================
   Isabella Ferreira 30777 — interações e animações
   GSAP + ScrollTrigger (via CDN). Sem GSAP ou com
   prefers-reduced-motion, o site aparece estático e completo.
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const animate = hasGSAP && !reduceMotion;

  /* ---------------- Utilidades ---------------- */
  const toastEl = $('.toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2600);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback para navegadores sem Clipboard API / contexto inseguro
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    }
  }

  /* ---------------- Header, progresso e FAB ---------------- */
  function initChrome() {
    const header = $('.header');
    const bar = $('.progress span');
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 24);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();

    // Link ativo no menu conforme a seção visível
    const links = $$('.nav a');
    const sections = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        links.forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === `#${e.target.id}`)));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(s => io.observe(s));

    // Botão flutuante: aparece depois do hero e some na seção de apoio/contato
    const fab = $('.fab');
    const state = { hero: true, apoie: false, contato: false };
    const fabIO = new IntersectionObserver(entries => {
      entries.forEach(e => { state[e.target.dataset.fab] = e.isIntersecting; });
      fab.classList.toggle('is-visible', !state.hero && !state.apoie && !state.contato);
    }, { threshold: 0.05 });
    [['hero', '#inicio'], ['apoie', '#apoie'], ['contato', '#contato']].forEach(([k, sel]) => {
      const el = $(sel);
      el.dataset.fab = k;
      fabIO.observe(el);
    });
  }

  /* ---------------- Menu mobile ---------------- */
  function initMobileMenu() {
    const btn = $('.burger');
    const menu = $('#menu-mobile');

    const open = () => {
      menu.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
      btn.setAttribute('aria-expanded', 'true');
      btn.setAttribute('aria-label', 'Fechar menu');
      root.classList.add('menu-open');
      $('a', menu).focus({ preventScroll: true });
    };
    const close = (focusBtn = true) => {
      menu.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Abrir menu');
      root.classList.remove('menu-open');
      setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, reduceMotion ? 0 : 700);
      if (focusBtn) btn.focus({ preventScroll: true });
    };

    btn.addEventListener('click', () => (btn.getAttribute('aria-expanded') === 'true' ? close() : open()));
    $$('a', menu).forEach(a => a.addEventListener('click', () => close(false)));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') close();
    });
  }

  /* ---------------- Accordion do plano de mandato ---------------- */
  function initAccordion() {
    $$('.eixo').forEach(item => {
      const btn = $('.eixo__head', item);
      const panel = $('.eixo__panel', item);
      if (btn.getAttribute('aria-expanded') !== 'true') panel.hidden = true;

      btn.addEventListener('click', () => {
        const opening = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', String(opening));
        item.classList.toggle('is-open', opening);

        if (!animate) { panel.hidden = !opening; return; }

        gsap.killTweensOf(panel);
        if (opening) {
          panel.hidden = false;
          gsap.fromTo(panel, { height: 0 }, {
            height: 'auto', duration: 0.8, ease: 'expo.out',
            onComplete: () => ScrollTrigger.refresh()
          });
          // Propostas entram em cascata ao expandir
          gsap.from($$('.eixo__desc, .fisc__text p, .props li, .fisc__media', panel), {
            autoAlpha: 0, y: 24, duration: 0.6, ease: 'power3.out', stagger: 0.045, delay: 0.1
          });
        } else {
          gsap.to(panel, {
            height: 0, duration: 0.55, ease: 'power3.inOut',
            onComplete: () => { panel.hidden = true; gsap.set(panel, { clearProps: 'height' }); ScrollTrigger.refresh(); }
          });
        }
      });
    });
  }

  /* ---------------- Pix, compartilhar, formulário ---------------- */
  function initActions() {
    $$('.js-copy').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await copyText(btn.dataset.copy);
        const label = $('span', btn);
        if (ok) {
          btn.classList.add('is-copied');
          label.textContent = 'Copiado!';
          toast('Chave Pix copiada. Agora é só colar no app do seu banco.');
          setTimeout(() => { btn.classList.remove('is-copied'); label.textContent = 'Copiar'; }, 2600);
        } else {
          toast('Não foi possível copiar. Chave: 68.235.970/0001-00');
        }
      });
    });

    $$('.js-share').forEach(btn => {
      btn.addEventListener('click', async () => {
        const data = {
          title: 'Isabella Ferreira 30777 — Deputada Estadual (ES)',
          text: 'Conheça as propostas de Isabella Ferreira, 30777, para o Espírito Santo.',
          url: location.href.split('#')[0]
        };
        if (navigator.share) {
          try { await navigator.share(data); } catch { /* usuário cancelou */ }
        } else if (await copyText(data.url)) {
          toast('Link copiado! Cole onde quiser compartilhar.');
        }
      });
    });

    // Sem backend: o formulário monta um e-mail pronto no app do usuário.
    const form = $('#form-contato');
    const status = $('.form__status', form);
    form.addEventListener('submit', e => {
      e.preventDefault();
      const fields = $$('input, textarea', form);
      let firstInvalid = null;
      fields.forEach(f => {
        const valid = f.checkValidity() && f.value.trim() !== '';
        f.setAttribute('aria-invalid', String(!valid));
        if (!valid && !firstInvalid) firstInvalid = f;
      });
      if (firstInvalid) {
        status.textContent = 'Preencha nome, um e-mail válido e sua mensagem.';
        status.classList.add('is-error');
        firstInvalid.focus();
        return;
      }
      const d = Object.fromEntries(new FormData(form));
      const subject = `Contato pelo site — ${d.nome}`;
      const body = `${d.mensagem}\n\n—\n${d.nome}\n${d.email}`;
      window.location.href = `mailto:isabellanovo30@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      status.classList.remove('is-error');
      status.textContent = 'Abrimos seu app de e-mail com a mensagem pronta. Se nada acontecer, escreva para isabellanovo30@gmail.com.';
      form.reset();
      fields.forEach(f => f.removeAttribute('aria-invalid'));
    });
  }

  /* =========================================================
     ANIMAÇÕES (somente com GSAP e sem movimento reduzido)
     ========================================================= */

  // Divide o texto em palavras mascaradas, preservando elementos internos (ex.: <em>)
  function splitWords(el) {
    const walk = node => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          const parts = child.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach(p => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            const inner = document.createElement('span');
            inner.className = 'w-in';
            inner.textContent = p;
            w.appendChild(inner);
            frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    walk(el);
    return $$('.w-in', el);
  }

  function initReveals() {
    // Títulos: palavras sobem de dentro de uma máscara, em stagger
    $$('.split').forEach(el => {
      gsap.from(splitWords(el), {
        yPercent: 115, rotate: 3, duration: 1.1, ease: 'expo.out', stagger: 0.06,
        scrollTrigger: { trigger: el, start: 'top 88%' }
      });
    });

    // Elementos isolados
    $$('[data-reveal]').forEach(el => {
      gsap.from(el, {
        autoAlpha: 0, y: 40, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%' }
      });
    });

    // Grupos: filhos entram em cascata
    $$('[data-stagger]').forEach(group => {
      const each = parseFloat(group.dataset.stagger) || 0.12;
      gsap.from(group.children, {
        autoAlpha: 0, y: 50, duration: 0.95, ease: 'power3.out', stagger: each,
        scrollTrigger: { trigger: group, start: 'top 86%' }
      });
    });

    // Cards de valores: entrada 3D em cascata
    gsap.from('.card', {
      y: 40, autoAlpha: 0,
      duration: 0.9, ease: 'expo.out', stagger: 0.12,
      scrollTrigger: { trigger: '.cards', start: 'top 85%' }
    });

    // Imagens: abertura em máscara + zoom de câmera + parallax
    $$('[data-media]').forEach(fig => {
      const img = $('img', fig);
      gsap.fromTo(fig,
        { clipPath: 'inset(16% 14% 16% 14% round 28px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: fig, start: 'top 82%' } });
      gsap.fromTo(img, { scale: 1.35 }, { scale: 1.1, duration: 2, ease: 'power3.out', scrollTrigger: { trigger: fig, start: 'top 82%' } });
      gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // Contadores
    $$('[data-count]').forEach(el => {
      const end = +el.dataset.count;
      const pad = +(el.dataset.pad || 0);
      const obj = { v: 0 };
      el.textContent = String(0).padStart(pad, '0');
      gsap.to(obj, {
        v: end, duration: 1.8, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 92%' },
        onUpdate: () => { el.textContent = String(Math.round(obj.v)).padStart(pad, '0'); }
      });
    });

    // Créditos finais do rodapé
    gsap.from('.footer__credits span', {
      yPercent: 100, duration: 1.2, ease: 'expo.out', stagger: 0.08,
      scrollTrigger: { trigger: '.footer__credits', start: 'top 95%' }
    });
  }

  function initScenes() {
    // Painel navy "abre" como uma tela de cinema ao entrar
    gsap.fromTo('.valores__panel',
      { scale: 0.92, borderRadius: 56 },
      { scale: 1, borderRadius: 28, ease: 'none', scrollTrigger: { trigger: '.valores', start: 'top bottom', end: 'top 15%', scrub: true } });

    // Faixas em marquee; a direção acompanha a rolagem
    const tracks = $$('.band__track');
    const loops = tracks.map((t, i) => gsap.to(t, { xPercent: -50, duration: 28 + i * 6, ease: 'none', repeat: -1 }));
    loops[0].reversed(true); loops[0].progress(0.5);
    ScrollTrigger.create({
      trigger: '.bands', start: 'top bottom', end: 'bottom top',
      onUpdate: self => {
        const speed = gsap.utils.clamp(1, 5, Math.abs(self.getVelocity()) / 300);
        loops.forEach((l, i) => gsap.to(l, { timeScale: (i === 0 ? -1 : 1) * self.direction * speed, duration: 0.3, overwrite: true }));
      }
    });
    gsap.to(loops, { timeScale: 1, duration: 1.2, delay: 0.3 });

    // Parallax do hero ao rolar (câmera se afastando)
    const heroST = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('.hero__numeral', { yPercent: 35, ease: 'none', scrollTrigger: heroST });
    gsap.matchMedia().add('(min-width: 1024px)', () => {
      // No desktop o texto divide a tela com o palco; no mobile ele fica abaixo e não deve esmaecer
      // Valores iniciais explícitos: o hero ainda está oculto aqui e o GSAP leria alpha 0
      gsap.fromTo('.hero__stage', { y: 0 }, { y: -60, ease: 'none', scrollTrigger: heroST });
      gsap.fromTo('.hero__copy', { y: 0, opacity: 1 }, { y: 80, opacity: 0.2, ease: 'none', scrollTrigger: heroST });
    });

    // Santinho gira levemente no scroll
    gsap.fromTo('.santinho', { rotate: 9, y: 60 }, { rotate: 3, y: -20, ease: 'none', scrollTrigger: { trigger: '.apoie', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  function initSpotlight() {
    $$('.card').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  /* =========================================================
     ABERTURA: montagem da urna + digitação do 30777
     ========================================================= */
  function playIntro() {
    const hero = $('.hero');
    const header = $('.header');
    const urna = $('.urna');
    const body = $('.urna__body');
    const skip = $('.intro-skip');

    const q = s => $$(s, hero);
    const digits = q('[data-digit]');
    const boxes = q('.digit');
    const keys = Object.fromEntries(q('.key').map(k => [k.dataset.key, k]));
    const confirmKey = $('.act--confirma', hero);
    const hint = $('.screen__hint', hero);
    const ok = $('.screen__ok', hero);
    const copy = {
      overline: $('.hero__overline', hero),
      words: q('.hero__title .word'),
      digits: q('.hero__digits span'),
      lead: $('.hero__lead', hero),
      ctas: $('.hero__ctas', hero)
    };

    const reveal = () => gsap.set([hero, header], { visibility: 'visible' });

    // Link direto para uma seção (#plano etc.): pula a abertura
    if (location.hash && location.hash !== '#inicio') { reveal(); return; }

    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    root.classList.add('is-intro');

    /* --- FLIP: a urna começa centralizada e grande, depois viaja ao seu lugar --- */
    const r = urna.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const targetW = Math.min(vw * 0.9, 780, (vh * 0.62) * (r.width / r.height));
    const flip = {
      x: vw / 2 - (r.left + r.width / 2),
      y: vh / 2 - (r.top + r.height / 2),
      scale: targetW / r.width
    };

    /* --- Estados iniciais --- */
    gsap.set(urna, flip);
    gsap.set('.hero__bg', { autoAlpha: 0, scale: 1.18 });
    gsap.set('.letterbox__bar', { scaleY: 1 });
    gsap.set(body, { autoAlpha: 0, y: 70, scale: 0.82, rotateX: 28, transformPerspective: 1200 });
    gsap.set(q('.urna__top, .urna__screen, .urna__keypad'), { autoAlpha: 0 });
    gsap.set(q('.key'), { autoAlpha: 0, scale: 0.3, y: 10 });
    gsap.set(q('.act'), { autoAlpha: 0, scale: 0.6, y: 16 });
    gsap.set(q('.screen__line, .digit'), { autoAlpha: 0 });
    gsap.set(q('.screen__info, .screen__photo'), { autoAlpha: 0 });
    gsap.set(ok, { autoAlpha: 0 });
    gsap.set(hint, { autoAlpha: 0 });
    digits.forEach(d => { d.textContent = ''; });

    gsap.set('.portrait__frame', { clipPath: 'inset(100% 0% 0% 0% round 28px)' });
    gsap.set('.portrait img', { scale: 1.3 });
    gsap.set('.portrait__glow', { autoAlpha: 0, scale: 0.5 });
    gsap.set(copy.overline, { autoAlpha: 0, y: 20 });
    gsap.set(copy.words, { yPercent: 115 });
    gsap.set(copy.digits, { yPercent: 110 });
    gsap.set([copy.lead, copy.ctas], { autoAlpha: 0, y: 30 });
    gsap.set('.scroll-cue', { autoAlpha: 0 });
    gsap.set(header, { yPercent: -100, autoAlpha: 0 });
    reveal();

    skip.hidden = false;
    gsap.fromTo(skip, { autoAlpha: 0 }, { autoAlpha: 1, delay: 0.6, duration: 0.4 });

    /* --- Linha do tempo --- */
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: finish });

    // 1. Fundo: fade-in + zoom-out de câmera
    tl.to('.hero__bg', { autoAlpha: 1, scale: 1, duration: 2.6, ease: 'power2.out' }, 0);

    // 2. Montagem da urna peça por peça (stagger)
    tl.to(body, { autoAlpha: 1, y: 0, scale: 1, rotateX: 0, duration: 0.9, ease: 'expo.out' }, 0.15)
      .to(q('.urna__top'), { autoAlpha: 1, duration: 0.4 }, 0.45)
      .fromTo(q('.urna__screen'), { scale: 0.9, y: 14 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.6 }, 0.4)
      .fromTo(q('.urna__keypad'), { x: 40 }, { autoAlpha: 1, x: 0, duration: 0.6 }, 0.5)
      .to(q('.key'), { autoAlpha: 1, scale: 1, y: 0, duration: 0.4, ease: 'back.out(2.2)', stagger: 0.032 }, 0.62)
      .to(q('.act'), { autoAlpha: 1, scale: 1, y: 0, duration: 0.45, ease: 'back.out(2.4)', stagger: { each: 0.09, from: 'end' } }, 0.9)
      // tela liga (piscada de LCD)
      .fromTo(q('.screen'), { filter: 'brightness(.25)' }, { filter: 'brightness(1)', duration: 0.4, ease: 'steps(5)' }, 0.95)
      .to(q('.screen__line'), { autoAlpha: 1, duration: 0.3, stagger: 0.08 }, 1.05)
      .to(boxes, { autoAlpha: 1, duration: 0.2, stagger: 0.04 }, 1.2);

    // 3. Digitação 3 · 0 · 7 · 7 · 7 com flash em cada dígito
    let t = 1.45;
    '30777'.split('').forEach((ch, i) => {
      const key = keys[ch];
      tl.call(() => key.classList.add('is-hit'), null, t)
        .call(() => { digits[i].textContent = ch; }, null, t + 0.04)
        .fromTo(digits[i], { scale: 1.9, autoAlpha: 0, filter: 'blur(4px)' }, { scale: 1, autoAlpha: 1, filter: 'blur(0px)', duration: 0.26, ease: 'power2.out', immediateRender: false }, t + 0.04)
        .fromTo(boxes[i], { backgroundColor: 'rgba(248,96,24,.45)' }, { backgroundColor: 'rgba(248,96,24,0)', duration: 0.45, ease: 'power1.out', immediateRender: false }, t + 0.04)
        .call(() => key.classList.remove('is-hit'), null, t + 0.14);
      t += 0.21;
    });

    // 4. Candidata aparece na tela
    t += 0.05;
    tl.to(q('.screen__info, .screen__photo'), { autoAlpha: 1, duration: 0.35, stagger: 0.08 }, t)
      .fromTo(q('.screen__photo img'), { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.55, ease: 'expo.out' }, t)
      .to(hint, { autoAlpha: 1, duration: 0.25 }, t + 0.12);

    // 5. CONFIRMA → flash → FIM → voto confirmado
    t += 0.55;
    tl.call(() => confirmKey.classList.add('is-hit'), null, t)
      .to(q('.screen__flash'), { autoAlpha: 1, duration: 0.07, yoyo: true, repeat: 1 }, t + 0.04)
      .to('.flash', { autoAlpha: 0.9, duration: 0.1, yoyo: true, repeat: 1, ease: 'power1.inOut' }, t + 0.04)
      .call(() => confirmKey.classList.remove('is-hit'), null, t + 0.22)
      .set(q('.screen__fim'), { autoAlpha: 1 }, t + 0.12)
      .set(q('.screen__fim'), { autoAlpha: 0 }, t + 0.62)
      .set(hint, { autoAlpha: 0 }, t + 0.62)
      .set(ok, { autoAlpha: 1 }, t + 0.62);

    // 6. Câmera: urna vai ao seu lugar, retrato é revelado, texto entra em stagger
    t += 0.62;
    tl.to(skip, { autoAlpha: 0, duration: 0.3 }, t)
      .to(urna, { x: 0, y: 0, scale: 1, duration: 1.25, ease: 'expo.inOut' }, t)
      .to('.letterbox__bar', { scaleY: 0, duration: 1.1, ease: 'expo.inOut' }, t + 0.05)
      .to('.portrait__frame', { clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 1.3, ease: 'expo.inOut' }, t + 0.12)
      .to('.portrait img', { scale: 1, duration: 2.2, ease: 'power3.out' }, t + 0.12)
      .to('.portrait__glow', { autoAlpha: 1, scale: 1, duration: 1.8 }, t + 0.35)
      .to(copy.overline, { autoAlpha: 1, y: 0, duration: 0.7 }, t + 0.5)
      .to(copy.words, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.1 }, t + 0.55)
      .to(copy.digits, { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06 }, t + 0.8)
      .to([copy.lead, copy.ctas], { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.12 }, t + 0.95)
      .to(header, { yPercent: 0, autoAlpha: 1, duration: 0.9, ease: 'expo.out' }, t + 1.05)
      .to('.scroll-cue', { autoAlpha: 1, duration: 0.6 }, t + 1.4);

    // Pular abertura (botão ou Esc)
    const skipIntro = () => { if (tl.isActive() || tl.progress() < 1) tl.progress(1); };
    skip.addEventListener('click', skipIntro);
    const onKey = e => { if (e.key === 'Escape') skipIntro(); };
    document.addEventListener('keydown', onKey);

    function finish() {
      root.classList.remove('is-intro');
      skip.hidden = true;
      document.removeEventListener('keydown', onKey);
      gsap.set(q('.screen, .screen__photo img, .portrait__frame'), { clearProps: 'filter,clipPath' });
      ScrollTrigger.refresh();
      // Movimento ambiente: urna "flutua"
      gsap.to(body, { y: -8, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    }
  }

  /* ---------------- Boot ---------------- */
  initChrome();
  initMobileMenu();
  initAccordion();
  initActions();

  if (!animate) {
    // Estático: mostra tudo imediatamente (urna já com 30777)
    root.classList.remove('js');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  initReveals();
  initScenes();
  initSpotlight();
  playIntro();
})();
