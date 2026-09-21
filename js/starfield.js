/* ============================================================
   CIELO — estrellas multicapa, estrellas fugaces y partículas doradas
   Optimizado para rendimiento: en vez de recalcular trazos por
   estrella en cada fotograma, se dibujan sprites pre-renderizados
   (drawImage es mucho más barato que arc()+fill() repetido), y el
   parpadeo se refresca a ~30fps en vez de 60 (imperceptible a la
   vista, pero la mitad de trabajo para la CPU/GPU).
   ============================================================ */
const Starfield = (() => {
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sky = document.getElementById('sky');
  const sctx = sky.getContext('2d', { alpha: true });
  const goldenC = document.getElementById('golden');
  const gctx = goldenC.getContext('2d', { alpha: true });

  let W, H, DPR, GW, GH;
  let layers = [];
  let shooters = [];
  let nextShooter = 0;
  let gparts = [];
  let goldenOn = false;
  let skyT = 0;
  let pointer = { x: 0, y: 0 };
  let frameCount = 0;

  const STAR_COLORS = [
    '243,240,228',   // blanco cálido
    '246,198,81',    // dorado
    '180,200,255',   // azul pálido
    '240,200,220',   // rosado pálido
  ];

  // ---- sprites pre-renderizados (glow suave) ----
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
    cx.beginPath(); cx.arc(r, r, r, 0, 7); cx.fill();
    return c;
  }
  const starSprites = STAR_COLORS.map(rgb => makeGlowSprite(rgb, 16));
  const goldenSprite = makeGlowSprite('246,201,90', 20);

  function sizeSky() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    W = sky.width = innerWidth * DPR;
    H = sky.height = innerHeight * DPR;
    sky.style.width = innerWidth + 'px';
    sky.style.height = innerHeight + 'px';

    const base = Math.round(innerWidth * innerHeight / 3400);
    layers = [
      { depth: .25, count: Math.round(base * .35), stars: [] },
      { depth: .55, count: Math.round(base * .40), stars: [] },
      { depth: 1.0, count: Math.round(base * .25), stars: [] },
    ];
    layers.forEach(layer => {
      layer.stars = Array.from({ length: layer.count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: (Math.random() * 1.15 + .35) * DPR * (.6 + layer.depth * .8),
        a: Math.random() * .55 + .25,
        tw: Math.random() * Math.PI * 2,
        ts: Math.random() * .02 + .004,
        colorIdx: Math.random() < .78 ? 0 : (Math.random() < .55 ? 1 : (Math.random() < .5 ? 2 : 3)),
      }));
    });
  }

  function sizeGolden() {
    GW = goldenC.width = innerWidth * DPR;
    GH = goldenC.height = innerHeight * DPR;
    goldenC.style.width = innerWidth + 'px';
    goldenC.style.height = innerHeight + 'px';
  }

  function spawnGolden() {
    const n = Math.round(innerWidth * innerHeight / 11000);
    gparts = Array.from({ length: n }, () => ({
      x: Math.random() * GW, y: Math.random() * GH,
      r: (Math.random() * 2.2 + 1) * DPR,
      vy: (Math.random() * .25 + .06) * DPR,
      vx: (Math.random() - .5) * .12 * DPR,
      a: Math.random() * .6 + .3,
      tw: Math.random() * 7, ts: Math.random() * .05 + .01,
    }));
  }

  function maybeSpawnShooter() {
    if (REDUCED) return;
    if (skyT < nextShooter) return;
    nextShooter = skyT + (260 + Math.random() * 420);
    const fromLeft = Math.random() < .5;
    const y0 = Math.random() * H * .5;
    const speed = (7 + Math.random() * 4) * DPR;
    const angle = (fromLeft ? 1 : -1) * (.32 + Math.random() * .18);
    shooters.push({
      x: fromLeft ? -40 * DPR : W + 40 * DPR,
      y: y0,
      vx: Math.cos(angle) * speed * (fromLeft ? 1 : -1),
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: 34 + Math.random() * 14,
      len: (100 + Math.random() * 80) * DPR,
    });
  }

  function drawShooters() {
    if (!shooters.length) return;
    shooters.forEach(s => {
      s.x += s.vx; s.y += s.vy; s.life++;
      const t = s.life / s.maxLife;
      const fade = t < .15 ? t / .15 : (1 - (t - .15) / .85);
      const ang = Math.atan2(s.vy, s.vx);
      const tailX = s.x - Math.cos(ang) * s.len;
      const tailY = s.y - Math.sin(ang) * s.len;
      const grad = sctx.createLinearGradient(tailX, tailY, s.x, s.y);
      grad.addColorStop(0, 'rgba(255,250,235,0)');
      grad.addColorStop(1, `rgba(255,250,235,${(.9 * fade).toFixed(3)})`);
      sctx.strokeStyle = grad;
      sctx.lineWidth = 1.6 * DPR;
      sctx.lineCap = 'round';
      sctx.beginPath();
      sctx.moveTo(tailX, tailY);
      sctx.lineTo(s.x, s.y);
      sctx.stroke();
      const hs = 7 * DPR;
      sctx.globalAlpha = fade;
      sctx.drawImage(starSprites[0], s.x - hs / 2, s.y - hs / 2, hs, hs);
      sctx.globalAlpha = 1;
    });
    shooters = shooters.filter(s => s.life < s.maxLife && s.x > -100 * DPR && s.x < W + 100 * DPR);
  }

  function drawSky() {
    sctx.clearRect(0, 0, W, H);
    skyT += 1;
    layers.forEach(layer => {
      const px = pointer.x * layer.depth * 10 * DPR;
      const py = pointer.y * layer.depth * 6 * DPR;
      const sprites4 = starSprites;
      for (const s of layer.stars) {
        const a = REDUCED ? s.a : s.a * (0.5 + 0.5 * Math.sin(s.tw + skyT * s.ts));
        const d = s.r * 4.4; // tamaño del sprite dibujado
        sctx.globalAlpha = a;
        sctx.drawImage(sprites4[s.colorIdx], s.x + px - d / 2, s.y + py - d / 2, d, d);
      }
    });
    sctx.globalAlpha = 1;
    maybeSpawnShooter();
    drawShooters();
  }

  function drawGolden() {
    if (!goldenOn) return;
    gctx.clearRect(0, 0, GW, GH);
    for (const p of gparts) {
      p.y -= p.vy; p.x += p.vx; p.tw += p.ts;
      if (p.y < -10) { p.y = GH + 10; p.x = Math.random() * GW; }
      const a = p.a * (0.5 + 0.5 * Math.sin(p.tw));
      const d = p.r * 4.2;
      gctx.globalAlpha = a;
      gctx.drawImage(goldenSprite, p.x - d / 2, p.y - d / 2, d, d);
    }
    gctx.globalAlpha = 1;
  }

  // ~30fps para el cielo/partículas: el parpadeo es lento, no necesita 60fps,
  // y así se libera la mitad del tiempo de fotograma para el resto de la página.
  function loop() {
    frameCount++;
    if (frameCount % 2 === 0) {
      drawSky();
      drawGolden();
    }
    requestAnimationFrame(loop);
  }

  function init() {
    sizeSky();
    sizeGolden();
    requestAnimationFrame(loop);
    addEventListener('resize', () => { sizeSky(); sizeGolden(); });
    addEventListener('pointermove', e => {
      pointer.x = (e.clientX / innerWidth - .5);
      pointer.y = (e.clientY / innerHeight - .5);
    }, { passive: true });
  }

  function enableGolden() {
    goldenOn = true;
    spawnGolden();
    goldenC.classList.add('on');
  }

  return { init, enableGolden };
})();
