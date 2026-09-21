/* ============================================================
   FLORES CÓSMICAS — pool fijo de flores dibujadas en canvas
   (nunca se crean nodos DOM/SVG nuevos), con brillo sutil,
   balanceo orgánico y colores cálidos (dorado/ámbar).

   Igual que Starfield, este módulo no tiene su propio
   requestAnimationFrame: expone init/resize/bloomBatch/
   update(dt)/draw() para el bucle central de main.js.
   ============================================================ */
const CosmicFlowers = (() => {
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const BLOOM_MS = 1500;

  let canvas, ctx, W = 0, H = 0, dpr = 1;
  let boxW = 0, boxH = 0; // tamaño real de la caja del planeta (para %)
  let petalPath = null;
  let gradients = null;

  // un <canvas> SIEMPRE recorta su contenido a sus propios límites (a
  // diferencia de un SVG con overflow:visible), así que le damos un
  // margen extra para que los pétalos que florecen hacia arriba del
  // punto de anclaje no queden cortados justo en el borde del planeta
  const PAD = 70;

  // ---- pool fijo: bloomBatch() reactiva slots existentes, nunca crea
  // elementos nuevos — así se elimina el lag progresivo de acumular
  // nodos vivos para siempre, como ocurría con el DOM/SVG original ----
  const POOL_SIZE = 20;
  const pool = Array.from({ length: POOL_SIZE }, () => ({
    active: false, x: 0, y: 0, baseScale: 1, tilt: 0, colorIdx: 0,
    delay: 0, age: 0, bloom: 0,
    swayPhase: 0, swaySpeed: 0, sparklePhase: 0, z: 0,
  }));
  let activeList = []; // se reconstruye sólo al llamar bloomBatch, no por fotograma

  function easeOutBack(t) {
    const c1 = 1.55, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function buildStatic() {
    // un único pétalo (Path2D) reutilizado por todas las flores y pétalos:
    // nada de reconstruir curvas Bézier en cada fotograma
    petalPath = new Path2D();
    petalPath.ellipse(0, -15, 6.6, 14.5, 0, 0, TAU);

    const petalGold = ctx.createRadialGradient(-2, -22, 1, 0, -15, 15);
    petalGold.addColorStop(0, '#fff6d6');
    petalGold.addColorStop(.55, '#f6c651');
    petalGold.addColorStop(1, '#d79a2e');

    const petalAmber = ctx.createRadialGradient(-2, -22, 1, 0, -15, 15);
    petalAmber.addColorStop(0, '#ffe9b8');
    petalAmber.addColorStop(.55, '#e6a92f');
    petalAmber.addColorStop(1, '#b9772a');

    const center = ctx.createRadialGradient(-1.5, -1.5, 0, 0, 0, 8.5);
    center.addColorStop(0, '#fff6d6');
    center.addColorStop(.6, '#f6c651');
    center.addColorStop(1, '#8a5a1e');

    const halo = ctx.createRadialGradient(0, -14, 0, 0, -14, 34);
    halo.addColorStop(0, 'rgba(255,214,140,.35)');
    halo.addColorStop(1, 'rgba(255,214,140,0)');

    // los gradientes/paths están en coordenadas locales — el canvas los
    // reproyecta según la matriz de transformación vigente al pintar,
    // así que un mismo objeto sirve para las 20 flores del pool
    gradients = { petal: [petalGold, petalAmber], center, halo };
  }

  function resize() {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const parent = canvas.parentElement;
    boxW = parent ? parent.clientWidth : canvas.clientWidth;
    boxH = parent ? parent.clientHeight : canvas.clientHeight;
    W = boxW + PAD * 2;
    H = boxH + PAD * 2;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    canvas.style.left = -PAD + 'px';
    canvas.style.top = -PAD + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    buildStatic();
  }

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    resize();
  }

  // Las flores se van ACUMULANDO de escena en escena (nunca se limpian),
  // así que las 20 posiciones de abajo (= POOL_SIZE, se usan todas) son
  // un único jardín diseñado como un todo — no lotes independientes —
  // para que no haya dos flores casi en las mismas coordenadas y para
  // que la cobertura sobre el planeta sea pareja y llena, sin huecos
  // vacíos, en cada etapa (no sólo al final). Los tamaños se mantienen
  // en un rango angosto (.66–1) para que las flores doradas luzcan en
  // sincronía en vez de saltar entre gigantes y diminutas.
  const BATCHES = {
    // la flor protagonista
    one: [
      [50, 8, 1.00, 0, 0],
    ],
    // seis más alrededor de ella — ya se ve un ramo, no una flor sola
    few: [
      [20, 20, .86, -14, 0], [32, 16, .84, -8, 150], [44, 19, .82, -3, 300],
      [56, 19, .82, 3, 450], [68, 16, .84, 8, 600], [80, 20, .86, 14, 750],
    ],
    // trece más: cubre el resto de la cara visible del planeta de
    // lado a lado, en tres filas que bajan hacia el ecuador
    many: [
      [14, 30, .78, -16, 0], [28, 26, .76, -9, 120], [41, 29, .74, -3, 240],
      [59, 29, .74, 3, 360], [72, 26, .76, 9, 480], [86, 30, .78, 16, 600],
      [22, 40, .70, -12, 720], [36, 38, .72, -5, 840], [50, 36, .74, 0, 960],
      [64, 38, .72, 5, 1080], [78, 40, .70, 12, 1200],
      [42, 45, .66, -6, 1320], [58, 45, .66, 6, 1440],
    ],
  };

  function bloomBatch(name) {
    const list = BATCHES[name] || [];
    list.forEach(([leftPct, topPct, scale, tilt, delay], i) => {
      const slot = pool.find(f => !f.active);
      if (!slot) return;
      slot.active = true;
      slot.x = leftPct / 100;
      slot.y = topPct / 100;
      slot.baseScale = scale;
      slot.tilt = tilt;
      slot.colorIdx = i % 3 === 2 ? 1 : 0; // mayormente dorado, un toque de ámbar
      slot.delay = delay;
      slot.age = 0;
      slot.bloom = 0;
      slot.swayPhase = Math.random() * TAU;
      slot.swaySpeed = .45 + Math.random() * .25;
      slot.sparklePhase = Math.random() * TAU;
      slot.z = topPct;
    });
    // se reconstruye una vez por lote (3 veces en toda la experiencia),
    // no en cada fotograma
    activeList = pool.filter(f => f.active).sort((a, b) => b.z - a.z);
  }

  function update(dt) {
    for (const f of activeList) {
      f.age += dt * 1000;
      if (f.age < f.delay) continue;
      const t = Math.min(1, (f.age - f.delay) / BLOOM_MS);
      f.bloom = REDUCED ? t : easeOutBack(t);
      if (!REDUCED) {
        f.swayPhase += dt * f.swaySpeed;
        f.sparklePhase += dt * 1.6;
      }
    }
  }

  function drawFlower(f) {
    const px = f.x * boxW + PAD, py = f.y * boxH + PAD;
    const sway = REDUCED ? 0 : Math.sin(f.swayPhase) * 3;
    const scale = Math.max(0, f.baseScale * f.bloom);
    const bloomA = Math.min(1, Math.max(0, f.bloom));

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate((f.tilt + sway) * DEG);
    ctx.scale(scale, scale);

    // brillo sutil detrás de la flor
    ctx.globalAlpha = bloomA * .8;
    ctx.fillStyle = gradients.halo;
    ctx.beginPath(); ctx.arc(0, -14, 34, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;

    // tallo — un poco más largo que antes, para que se note bien entre
    // el follaje y la flor en vez de quedar como un tallito corto
    ctx.strokeStyle = '#3f6b3f';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 48);
    ctx.bezierCurveTo(-1.3, 32, -1.8, 14, 0, 2);
    ctx.stroke();

    // hojas — un poco más grandes, repartidas a lo largo del tallo nuevo
    ctx.fillStyle = '#4a7a48';
    ctx.beginPath();
    ctx.moveTo(0, 35);
    ctx.bezierCurveTo(-7, 30, -10.5, 34, -13, 28);
    ctx.bezierCurveTo(-7, 27, -3.5, 30, 0, 30);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.bezierCurveTo(7, 13, 10.5, 17, 13, 11);
    ctx.bezierCurveTo(7, 10, 3.5, 13, 0, 13);
    ctx.fill();

    // pétalos — mismo Path2D reutilizado, sólo rotado por pétalo
    ctx.fillStyle = gradients.petal[f.colorIdx];
    const N = 11;
    for (let i = 0; i < N; i++) {
      ctx.save();
      ctx.rotate((i * 360 / N) * DEG);
      ctx.fill(petalPath);
      ctx.restore();
    }

    // centro
    ctx.beginPath(); ctx.arc(0, 0, 8.5, 0, TAU);
    ctx.fillStyle = gradients.center; ctx.fill();

    // chispa diminuta que orbita muy despacio (movimiento orgánico)
    if (!REDUCED) {
      const r = 22;
      const sx = Math.cos(f.sparklePhase) * r;
      const sy = Math.sin(f.sparklePhase) * r * .6 - 4;
      const sa = .35 + .45 * (.5 + .5 * Math.sin(f.sparklePhase * 2));
      ctx.globalAlpha = sa;
      ctx.fillStyle = '#fff1c4';
      ctx.beginPath(); ctx.arc(sx, sy, 1.6, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    for (const f of activeList) {
      if (f.bloom <= 0) continue;
      drawFlower(f);
    }
  }

  return { init, resize, bloomBatch, update, draw };
})();
