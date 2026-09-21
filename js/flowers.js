/* ============================================================
   FLORES CÓSMICAS — pétalos en forma de llama estelar, con
   brillo propio, centro de estrella y chispas orbitando.
   Tres variantes de color para que el jardín no se sienta genérico.
   ============================================================ */
const CosmicFlowers = (() => {
  const flowersEl = document.getElementById('flowers');

  const VARIANTS = {
    gold:   { g1: '--bloom-gold-1',   g2: '--bloom-gold-2',   g3: '--bloom-gold-3',   glow: 'glow-gold',   sparkle: '#f6d98b' },
    rose:   { g1: '--bloom-rose-1',   g2: '--bloom-rose-2',   g3: '--bloom-rose-3',   glow: 'glow-rose',   sparkle: '#f6b6d6' },
    violet: { g1: '--bloom-violet-1', g2: '--bloom-violet-2', g3: '--bloom-violet-3', glow: 'glow-violet', sparkle: '#c7bbfa' },
    cyan:   { g1: '--bloom-cyan-1',   g2: '--bloom-cyan-2',   g3: '--bloom-cyan-3',   glow: 'glow-cyan',   sparkle: '#a0eaf2' },
  };

  let uid = 0;

  // pétalo alargado y puntiagudo, como una llama de estrella — no un óvalo genérico
  function petalPath() {
    return 'M0,0 C-6,-9 -8.5,-19 -4,-29 C-1.5,-34 1.5,-34 4,-29 C8.5,-19 6,-9 0,0 Z';
  }

  function petalLayer(count, radiusOffset, scaleP, gradId, rotOffset) {
    let out = '';
    for (let i = 0; i < count; i++) {
      const ang = rotOffset + (i * 360 / count);
      out += `<g transform="rotate(${ang}) translate(0,${-radiusOffset}) scale(${scaleP})">
        <path d="${petalPath()}" fill="url(#${gradId})" stroke="rgba(255,255,255,.18)" stroke-width=".4"/>
      </g>`;
    }
    return out;
  }

  function flowerSVG(id, variant) {
    const v = VARIANTS[variant];
    const gid = `pg${id}`, gid2 = `pg2-${id}`, cg = `cg${id}`, gg = `gg${id}`;
    // dos capas de pétalos (8 exteriores largos + 6 interiores cortos) para una silueta menos "flor de plástico"
    const outer = petalLayer(8, 21, 1, gid, 0);
    const inner = petalLayer(6, 12, .62, gid2, 22);
    return `<svg width="76" height="122" viewBox="-38 -42 76 122" fill="none">
      <defs>
        <radialGradient id="${gid}" cx="50%" cy="18%" r="85%">
          <stop offset="0%" stop-color="var(${v.g1})"/>
          <stop offset="55%" stop-color="var(${v.g2})"/>
          <stop offset="100%" stop-color="var(${v.g3})"/>
        </radialGradient>
        <radialGradient id="${gid2}" cx="50%" cy="10%" r="90%">
          <stop offset="0%" stop-color="var(${v.g1})" stop-opacity=".95"/>
          <stop offset="100%" stop-color="var(${v.g2})"/>
        </radialGradient>
        <radialGradient id="${cg}" cx="45%" cy="40%" r="65%">
          <stop offset="0%" stop-color="var(${v.g1})"/>
          <stop offset="55%" stop-color="var(${v.g2})"/>
          <stop offset="100%" stop-color="var(${v.g3})"/>
        </radialGradient>
        <radialGradient id="${gg}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fff" stop-opacity=".9"/>
          <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
        </radialGradient>
      </defs>

      <path d="M0,74 C-2,50 -3,28 0,6" stroke="#3f6b3f" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M0,52 C-13,45 -19,50 -23,43 C-13,41 -6,45 0,45" fill="#4a7a48"/>
      <path d="M0,40 C11,33 18,38 22,31 C13,29 6,33 0,33" fill="#4a7a48"/>

      <g transform="translate(0,-2)">
        ${outer}
        ${inner}
        <circle r="11" fill="url(${'#' + gg})" opacity=".55"/>
        <circle r="7.2" fill="url(${'#' + cg})"/>
        <g fill="#fff8e6" opacity=".9">
          <path d="M0,-3.4 L1,0 L0,3.4 L-1,0 Z"/>
          <path d="M-3.4,0 L0,1 L3.4,0 L0,-1 Z"/>
        </g>
      </g>
    </svg>`;
  }

  function sparkleOrbit(color) {
    const wrap = document.createElement('div');
    wrap.className = 'sparkle-orbit';
    const radius = 26 + Math.random() * 14;
    const dur = 9 + Math.random() * 7;
    wrap.style.animationDuration = dur + 's';
    wrap.style.setProperty('--sc', color);
    [0, 180].forEach((deg, i) => {
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.style.transform = `translate(-50%,-50%) rotate(${deg}deg) translateX(${radius}px)`;
      dot.style.animationDelay = (i * 1.3) + 's';
      wrap.appendChild(dot);
    });
    return wrap;
  }

  function makeFlower(leftPct, topPct, scale, tilt, delay, variant) {
    uid++;
    const f = document.createElement('div');
    f.className = 'flower';
    f.style.left = leftPct + '%';
    f.style.top = topPct + '%';
    f.style.setProperty('--tilt', tilt + 'deg');
    f.style.width = (76 * scale) + 'px';
    f.style.zIndex = Math.round(1000 - topPct * 10);
    f.innerHTML = flowerSVG(uid, variant);
    f.querySelector('svg').classList.add(VARIANTS[variant].glow);
    f.appendChild(sparkleOrbit(VARIANTS[variant].sparkle));
    flowersEl.appendChild(f);
    setTimeout(() => {
      f.classList.add('bloom');
      setTimeout(() => f.classList.add('breathe'), 1500);
    }, delay);
    return f;
  }

  const palette = ['gold', 'rose', 'violet', 'cyan'];
  function colorFor(i) { return palette[i % palette.length]; }

  const flowerBatches = {
    one:  [[50, 4, 1.15, 0, 0]],
    few:  [[34, 10, .8, -8, 0], [50, 3, 1.15, 0, 180], [66, 10, .82, 9, 360], [42, 15, .7, -5, 540], [58, 15, .72, 6, 700]],
    many: [[24, 20, .6, -14, 0], [38, 26, .66, -8, 120], [50, 24, .72, 0, 240], [62, 26, .66, 9, 360], [76, 20, .6, 13, 480],
           [30, 33, .55, -10, 600], [46, 36, .6, -4, 720], [56, 36, .6, 5, 840], [70, 33, .56, 11, 960]],
  };

  function bloomBatch(name) {
    (flowerBatches[name] || []).forEach(([l, t, s, ti, d], i) => makeFlower(l, t, s, ti, d, colorFor(i)));
  }

  return { bloomBatch };
})();
