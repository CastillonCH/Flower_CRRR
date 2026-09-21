/* ============================================================
   CIELO — estrellas cálidas con profundidad (parallax pasivo,
   nunca ligado al mouse) y estrellas fugaces ocasionales.

   Este módulo NO tiene su propio requestAnimationFrame: expone
   init/resize/update(dt)/draw() para que main.js orqueste un
   único bucle central junto con CosmicFlowers. Todas las
   colecciones (estrellas, estrellas fugaces, polvo cálido) son
   pools de tamaño fijo que se reciclan en vez de crearse y
   destruirse en cada fotograma, para evitar el lag progresivo
   por presión de GC.
   ============================================================ */
const Starfield = (() => {
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;

  let canvas, ctx, W = 0, H = 0, dpr = 1;
  let elapsed = 0;

  // paleta cálida — crema, dorado, cobre y un rosa muy cálido; sin azules fríos
  const STAR_COLORS = ['255,244,219', '255,201,122', '255,176,120', '255,205,180'];
  const starSprites = [];
  let dustSprite = null;

  const LAYER_DEFS = [
    { depth: .28, share: .38 },
    { depth: .58, share: .38 },
    { depth: 1.0, share: .24 },
  ];
  let layers = []; // cada capa mantiene su propio pool de estrellas

  // ---- estrellas fugaces: pool fijo, jamás se crean/destruyen objetos ----
  const MAX_SHOOTERS = 3;
  const shooters = Array.from({ length: MAX_SHOOTERS }, () => ({ active: false }));
  let nextShooterAt = 3;

  // ---- polvo cálido ambiental (opcional, escena final) ----
  let dust = [];
  let dustOn = false;

  function makeGlowSprite(rgb, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const cx = c.getContext('2d');
    const r = size / 2;
    const g = cx.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, `rgba(${rgb},1)`);
    g.addColorStop(.4, `rgba(${rgb},.9)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    cx.fillStyle = g;
    cx.beginPath(); cx.arc(r, r, r, 0, TAU); cx.fill();
    return c;
  }

  function ensureSprites() {
    if (starSprites.length) return;
    STAR_COLORS.forEach(rgb => starSprites.push(makeGlowSprite(rgb, 16)));
    dustSprite = makeGlowSprite('255,206,140', 20);
  }

  // ---- reciclaje de pools: crece/recorta reutilizando los objetos ya
  // existentes en vez de descartar el array entero en cada resize ----
  function fitPool(pool, target, factory, reset) {
    while (pool.length < target) pool.push(factory());
    pool.length = target;
    pool.forEach(reset);
    return pool;
  }

  function makeStar() { return { x: 0, y: 0, r: 1, a: .4, tw: 0, ts: 0, colorIdx: 0 }; }
  function resetStar(s) {
    s.x = Math.random() * W;
    s.y = Math.random() * H;
    s.r = Math.random() * 1.1 + .35;
    s.a = Math.random() * .5 + .28;
    s.tw = Math.random() * TAU;
    s.ts = Math.random() * 1.1 + .35; // rad/s
    s.colorIdx = Math.random() < .7 ? 0 : (Math.random() < .5 ? 1 : (Math.random() < .5 ? 2 : 3));
  }

  function buildLayers() {
    const base = Math.round((W * H) / 3400);
    layers = LAYER_DEFS.map((def, i) => {
      const prev = layers[i];
      const target = Math.max(6, Math.round(base * def.share));
      const stars = fitPool(prev ? prev.stars : [], target, makeStar, resetStar);
      return { depth: def.depth, stars, phase: i * 1.7, driftX: 0, driftY: 0 };
    });
  }

  function makeDustParticle() { return { x: 0, y: 0, r: 1, vy: 0, vx: 0, a: .4, tw: 0, ts: 0 }; }
  function resetDustParticle(p) {
    p.x = Math.random() * W; p.y = Math.random() * H;
    p.r = Math.random() * 2 + 1;
    p.vy = Math.random() * 14 + 4;   // px/s
    p.vx = (Math.random() - .5) * 7; // px/s
    p.a = Math.random() * .55 + .3;
    p.tw = Math.random() * TAU;
    p.ts = Math.random() * 1.4 + .5; // rad/s
  }
  function buildDust() {
    const target = Math.round((W * H) / 12000);
    dust = fitPool(dust, target, makeDustParticle, resetDustParticle);
  }

  function resize() {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    // alta densidad de píxeles: el canvas físico va en px de dispositivo,
    // pero dibujamos siempre en coordenadas CSS gracias a ctx.scale
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    buildLayers();
    buildDust();
  }

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    ensureSprites();
    resize();
  }

  function spawnShooter() {
    const slot = shooters.find(s => !s.active);
    if (!slot) return;
    const fromLeft = Math.random() < .5;
    slot.active = true;
    slot.x = fromLeft ? -40 : W + 40;
    slot.y = Math.random() * H * .45;
    const speed = 460 + Math.random() * 220; // px/s
    const angle = (fromLeft ? 1 : -1) * (.32 + Math.random() * .18);
    slot.vx = Math.cos(angle) * speed * (fromLeft ? 1 : -1);
    slot.vy = Math.sin(angle) * speed;
    slot.life = 0;
    slot.maxLife = .55 + Math.random() * .25;
    slot.len = 70 + Math.random() * 55;
  }

  function update(dt) {
    elapsed += dt;

    layers.forEach(layer => {
      // parallax pasivo: deriva lenta y autónoma por capa — nunca ligada al mouse
      layer.driftX = Math.sin(elapsed * .06 + layer.phase) * layer.depth * 10;
      layer.driftY = Math.cos(elapsed * .05 + layer.phase) * layer.depth * 6;
      if (!REDUCED) for (const s of layer.stars) s.tw += s.ts * dt;
    });

    if (!REDUCED) {
      nextShooterAt -= dt;
      if (nextShooterAt <= 0) { spawnShooter(); nextShooterAt = 4 + Math.random() * 7; }
    }
    for (const s of shooters) {
      if (!s.active) continue;
      s.x += s.vx * dt; s.y += s.vy * dt; s.life += dt;
      if (s.life >= s.maxLife || s.x < -100 || s.x > W + 100) s.active = false;
    }

    if (dustOn) {
      for (const p of dust) {
        p.y -= p.vy * dt; p.x += p.vx * dt; p.tw += p.ts * dt;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
      }
    }
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    layers.forEach(layer => {
      for (const s of layer.stars) {
        const a = REDUCED ? s.a : s.a * (.5 + .5 * Math.sin(s.tw));
        const d = s.r * 4.4;
        ctx.globalAlpha = a;
        ctx.drawImage(starSprites[s.colorIdx], s.x + layer.driftX - d / 2, s.y + layer.driftY - d / 2, d, d);
      }
    });

    if (dustOn) {
      for (const p of dust) {
        const a = p.a * (.5 + .5 * Math.sin(p.tw));
        const d = p.r * 4.2;
        ctx.globalAlpha = a;
        ctx.drawImage(dustSprite, p.x - d / 2, p.y - d / 2, d, d);
      }
    }

    ctx.globalAlpha = 1;
    for (const s of shooters) {
      if (!s.active) continue;
      const t = s.life / s.maxLife;
      const fade = t < .15 ? t / .15 : (1 - (t - .15) / .85);
      const ang = Math.atan2(s.vy, s.vx);
      const tailX = s.x - Math.cos(ang) * s.len;
      const tailY = s.y - Math.sin(ang) * s.len;
      const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
      grad.addColorStop(0, 'rgba(255,240,220,0)');
      grad.addColorStop(1, `rgba(255,240,220,${(.9 * fade).toFixed(3)})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
      const hs = 6;
      ctx.globalAlpha = fade;
      ctx.drawImage(starSprites[0], s.x - hs / 2, s.y - hs / 2, hs, hs);
      ctx.globalAlpha = 1;
    }
  }

  function enableDust() { dustOn = true; }

  return { init, resize, update, draw, enableDust };
})();
