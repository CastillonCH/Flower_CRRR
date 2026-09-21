/* ============================================================
   CIELO — estrellas multicapa, estrellas fugaces y partículas doradas
   ============================================================ */
const Starfield = (() => {
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sky = document.getElementById('sky');
  const sctx = sky.getContext('2d');
  const goldenC = document.getElementById('golden');
  const gctx = goldenC.getContext('2d');

  let W, H, DPR, GW, GH;
  let layers = [];      // 3 capas de profundidad para efecto parallax
  let shooters = [];     // estrellas fugaces activas
  let nextShooter = 0;
  let gparts = [];
  let goldenOn = false;
  let skyT = 0;
  let pointer = { x: 0, y: 0 };

  const STAR_COLORS = [
    'rgba(243,240,228,ALPHA)',   // blanco cálido
    'rgba(246,198,81,ALPHA)',    // dorado
    'rgba(180,200,255,ALPHA)',   // azul pálido
    'rgba(240,200,220,ALPHA)',   // rosado pálido
  ];

  function sizeSky() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = sky.width = innerWidth * DPR;
    H = sky.height = innerHeight * DPR;
    sky.style.width = innerWidth + 'px';
    sky.style.height = innerHeight + 'px';

    const base = Math.round(innerWidth * innerHeight / 2600);
    layers = [
      { depth: .25, count: Math.round(base * .35), stars: [] }, // lejanas, pequeñas, lentas
      { depth: .55, count: Math.round(base * .40), stars: [] },
      { depth: 1.0, count: Math.round(base * .25), stars: [] }, // cercanas, más brillantes
    ];
    layers.forEach(layer => {
      layer.stars = Array.from({ length: layer.count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: (Math.random() * 1.15 + .25) * DPR * (.6 + layer.depth * .8),
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
    const n = Math.round(innerWidth * innerHeight / 9000);
    gparts = Array.from({ length: n }, () => ({
      x: Math.random() * GW, y: Math.random() * GH,
      r: (Math.random() * 2 + .8) * DPR,
      vy: (Math.random() * .25 + .06) * DPR,
      vx: (Math.random() - .5) * .12 * DPR,
      a: Math.random() * .6 + .3,
      tw: Math.random() * 7, ts: Math.random() * .05 + .01,
      rot: Math.random() * 7
    }));
  }

  function star4(ctx, x, y, r, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(r * .32, r * .32, 0, r);
      ctx.quadraticCurveTo(-r * .32, r * .32, 0, 0);
    }
    ctx.fill(); ctx.restore();
  }

  function maybeSpawnShooter() {
    if (REDUCED) return;
    if (skyT < nextShooter) return;
    nextShooter = skyT + (220 + Math.random() * 380); // ritmo aleatorio, poco frecuente
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
      maxLife: 46 + Math.random() * 20,
      len: (90 + Math.random() * 70) * DPR,
    });
  }

  function drawShooters() {
    shooters.forEach(s => {
      s.x += s.vx; s.y += s.vy; s.life++;
      const t = s.life / s.maxLife;
      const fade = t < .15 ? t / .15 : (1 - (t - .15) / .85);
      const tailX = s.x - Math.cos(Math.atan2(s.vy, s.vx)) * s.len;
      const tailY = s.y - Math.sin(Math.atan2(s.vy, s.vx)) * s.len;
      const grad = sctx.createLinearGradient(tailX, tailY, s.x, s.y);
      grad.addColorStop(0, 'rgba(255,250,235,0)');
      grad.addColorStop(1, `rgba(255,250,235,${.9 * fade})`);
      sctx.strokeStyle = grad;
      sctx.lineWidth = 1.6 * DPR;
      sctx.lineCap = 'round';
      sctx.beginPath();
      sctx.moveTo(tailX, tailY);
      sctx.lineTo(s.x, s.y);
      sctx.stroke();
      sctx.beginPath();
      sctx.fillStyle = `rgba(255,255,255,${fade})`;
      sctx.arc(s.x, s.y, 1.6 * DPR, 0, 7);
      sctx.fill();
    });
    shooters = shooters.filter(s => s.life < s.maxLife && s.x > -100 * DPR && s.x < W + 100 * DPR);
  }

  function drawSky() {
    sctx.clearRect(0, 0, W, H);
    skyT += 1;
    layers.forEach(layer => {
      const px = pointer.x * layer.depth * 10 * DPR;
      const py = pointer.y * layer.depth * 6 * DPR;
      for (const s of layer.stars) {
        const a = REDUCED ? s.a : s.a * (0.5 + 0.5 * Math.sin(s.tw + skyT * s.ts));
        sctx.beginPath();
        sctx.arc(s.x + px, s.y + py, s.r, 0, 7);
        sctx.fillStyle = STAR_COLORS[s.colorIdx].replace('ALPHA', a.toFixed(3));
        sctx.fill();
      }
    });
    maybeSpawnShooter();
    drawShooters();
    requestAnimationFrame(drawSky);
  }

  function drawGolden() {
    if (goldenOn) {
      gctx.clearRect(0, 0, GW, GH);
      for (const p of gparts) {
        p.y -= p.vy; p.x += p.vx; p.tw += p.ts;
        if (p.y < -10) { p.y = GH + 10; p.x = Math.random() * GW; }
        const a = p.a * (0.5 + 0.5 * Math.sin(p.tw));
        gctx.fillStyle = `rgba(246,201,90,${a})`;
        star4(gctx, p.x, p.y, p.r * 2.2, p.rot + p.tw * .2);
      }
    }
    requestAnimationFrame(drawGolden);
  }

  function init() {
    sizeSky();
    sizeGolden();
    drawSky();
    drawGolden();
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
