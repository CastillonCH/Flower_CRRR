/* ============================================================
   FLORES CÓSMICAS — pétalos redondeados dorados, con brillo suave
   y un pequeño destello en el centro. Dos tonos de amarillo/dorado
   para dar variedad sutil sin salirse de la paleta.
   ============================================================ */
const CosmicFlowers = (() => {
  const flowersEl = document.getElementById('flowers');

  const VARIANTS = {
    gold:  { g1: '--bloom-gold-1',  g2: '--bloom-gold-2',  g3: '--bloom-gold-3',  glow: 'glow-gold' },
    amber: { g1: '--bloom-amber-1', g2: '--bloom-amber-2', g3: '--bloom-amber-3', glow: 'glow-amber' },
  };

  let uid = 0;

  function flowerSVG(id, variant) {
    const v = VARIANTS[variant];
    const pg = `pg${id}`, cg = `cg${id}`, hg = `hg${id}`;
    // pétalos ovalados clásicos, redondeados — reconocibles como flor, no como espinas
    let petals = '';
    const N = 11;
    for (let i = 0; i < N; i++) {
      const ang = i * (360 / N);
      petals += `<g transform="rotate(${ang})">
        <ellipse cx="0" cy="-15" rx="6.6" ry="14.5" fill="url(#${pg})" stroke="rgba(255,255,255,.22)" stroke-width=".5"/>
      </g>`;
    }
    return `<svg width="70" height="118" viewBox="-35 -40 70 118" fill="none">
      <defs>
        <radialGradient id="${pg}" cx="46%" cy="72%" r="72%">
          <stop offset="0%" stop-color="var(${v.g1})"/>
          <stop offset="55%" stop-color="var(${v.g2})"/>
          <stop offset="100%" stop-color="var(${v.g3})"/>
        </radialGradient>
        <radialGradient id="${cg}" cx="42%" cy="38%" r="65%">
          <stop offset="0%" stop-color="var(${v.g1})"/>
          <stop offset="60%" stop-color="var(${v.g2})"/>
          <stop offset="100%" stop-color="#8a5a1e"/>
        </radialGradient>
        <radialGradient id="${hg}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fff" stop-opacity=".85"/>
          <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
        </radialGradient>
      </defs>

      <path d="M0,74 C-2,50 -3,28 0,6" stroke="#3f6b3f" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M0,52 C-14,44 -20,50 -24,42 C-14,40 -6,44 0,44" fill="#4a7a48"/>
      <path d="M0,40 C12,32 19,38 23,30 C13,28 6,32 0,32" fill="#4a7a48"/>

      <g transform="translate(0,-2)">
        ${petals}
        <circle r="10" fill="url(#${hg})" opacity=".5"/>
        <circle r="8.5" fill="url(#${cg})"/>
        <circle r="8.5" fill="none" stroke="rgba(255,255,255,.25)" stroke-width=".6"/>
        <circle cx="-2.4" cy="-2.6" r="1.6" fill="#fffdf3" opacity=".8"/>
      </g>
    </svg>`;
  }

  function sparkleOrbit(color) {
    const wrap = document.createElement('div');
    wrap.className = 'sparkle-orbit';
    const radius = 24 + Math.random() * 10;
    const dur = 11 + Math.random() * 7;
    wrap.style.animationDuration = dur + 's';
    wrap.style.setProperty('--sc', color);
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.transform = `translate(-50%,-50%) translateX(${radius}px)`;
    wrap.appendChild(dot);
    return wrap;
  }

  function makeFlower(leftPct, topPct, scale, tilt, delay, variant) {
    uid++;
    const f = document.createElement('div');
    f.className = 'flower';
    f.style.left = leftPct + '%';
    f.style.top = topPct + '%';
    f.style.setProperty('--tilt', tilt + 'deg');
    f.style.width = (70 * scale) + 'px';
    f.style.zIndex = Math.round(1000 - topPct * 10);
    f.innerHTML = flowerSVG(uid, variant);
    f.querySelector('svg').classList.add(VARIANTS[variant].glow);
    f.appendChild(sparkleOrbit('#f6dd9c'));
    flowersEl.appendChild(f);
    setTimeout(() => {
      f.classList.add('bloom');
      setTimeout(() => f.classList.add('sway'), 1500);
    }, delay);
    return f;
  }

  const palette = ['gold', 'gold', 'amber'];
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
