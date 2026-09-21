/* ============================================================
   ✦  CONFIGURACIÓN  ✦
   Cambia el nombre de tu persona aquí:
   ============================================================ */
const CONFIG = {
  name: "Cynthia",           // ← el nombre que aparece entre las estrellas
};
/* ============================================================ */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = s => document.querySelector(s);
const stage = $('#stage');
const ui = $('#ui');
const finale = $('#finale');
const ftop = $('#ftop'), fbot = $('#fbot');
const chapNum = $('#chapNum'), chapName = $('#chapName');
const wish = $('#wish'), cosmos = $('#cosmos'), curtain = $('#curtain');
const flash = $('#flash'), constel = $('#constellation');

/* ---------- ARQUITECTURA: un único bucle central ----------
   main.js orquesta un solo requestAnimationFrame que actualiza y
   dibuja Starfield y CosmicFlowers en orden (fondo → flores). Ninguno
   de los dos módulos corre su propio rAF, así no compiten por el
   hilo principal. */
const skyCanvas = document.getElementById('sky');
const flowersCanvas = document.getElementById('flowersCanvas');
Starfield.init(skyCanvas);
CosmicFlowers.init(flowersCanvas);

let lastTs = 0;
function tick(ts) {
  if (!lastTs) lastTs = ts;
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  dt = Math.min(dt, .05); // evita saltos grandes si la pestaña estuvo oculta

  Starfield.update(dt); Starfield.draw();
  CosmicFlowers.update(dt); CosmicFlowers.draw();

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// debouncing del resize: recalcula tamaño/DPR sólo cuando el usuario
// termina de redimensionar, no en cada evento intermedio
function debounce(fn, waitMs) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), waitMs); };
}
const handleResize = debounce(() => {
  Starfield.resize();
  CosmicFlowers.resize();
  if (currentHeart) layoutHeart();
}, 150);
addEventListener('resize', handleResize);

// transición de entrada: toda la experiencia aparece desde opacity:0
requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.add('in')));

/* ---------- AUDIO: la canción del proyecto ---------- */
const bgm = $('#bgm');
bgm.volume = 0;
const BGM_VOLUME = 0.55;
let audioMuted = true;
const audioBtn = $('#audio'), aX1 = $('#audio-x1'), aX2 = $('#audio-x2');

// pequeño fundido de volumen (HTMLMediaElement no trae uno propio).
// El valor de "volume" DEBE quedar siempre dentro de [0,1] — asignar
// algo fuera de rango lanza una excepción y corta el fundido a medias
// (así se descubrió: un fundido interrumpido por otro sin recortar
// bien "t" podía calcular un valor momentáneamente fuera de rango).
let fadeRaf = null;
function fadeVolume(target, ms, onDone) {
  if (fadeRaf) cancelAnimationFrame(fadeRaf);
  const start = bgm.volume, t0 = performance.now();
  function step(now) {
    const t = Math.max(0, Math.min(1, (now - t0) / ms));
    bgm.volume = Math.max(0, Math.min(1, start + (target - start) * t));
    if (t < 1) { fadeRaf = requestAnimationFrame(step); }
    else { fadeRaf = null; if (onDone) onDone(); }
  }
  fadeRaf = requestAnimationFrame(step);
}

function setMuted(m) {
  audioMuted = m;
  audioBtn.classList.toggle('muted', m);
  aX1.style.display = m ? 'block' : 'none';
  aX2.style.display = m ? 'block' : 'none';
  if (m) {
    fadeVolume(0, 900, () => bgm.pause());
  } else {
    bgm.play().catch(() => {}); // requiere gesto del usuario; este click lo es
    fadeVolume(BGM_VOLUME, 900);
  }
}
audioBtn.addEventListener('click', () => setMuted(!audioMuted));
setMuted(true);
// el toggle queda visible desde el principio para que la persona active
// la música ella misma cuando quiera (no hay ya un primer botón de
// "empezar" del que colgarse para desbloquear el audio del navegador)
audioBtn.classList.add('on');

/* ---------- TYPEWRITER ---------- */
let skipReq = false;
function typeInto(el, text, speed = 42) {
  return new Promise(res => {
    if (REDUCED) { el.textContent = text; res(); return; }
    el.textContent = '';
    const caret = document.createElement('span'); caret.className = 'caret'; caret.textContent = '|';
    el.appendChild(caret);
    let i = 0; skipReq = false;
    function step() {
      if (skipReq) { el.textContent = text; res(); return; }
      i++;
      el.textContent = text.slice(0, i);
      el.appendChild(caret);
      if (i >= text.length) { setTimeout(() => { caret.remove(); res(); }, 350); return; }
      const ch = text[i - 1];
      let d = speed + (Math.random() * 30 - 10);
      if ('.,…'.includes(ch)) d += 260;
      setTimeout(() => requestAnimationFrame(step), d);
    }
    requestAnimationFrame(step);
  });
}
document.addEventListener('click', e => { if (!e.target.closest('#audio,#replay')) skipReq = true; });

/* ---------- helpers UI ---------- */
function clearUI() { ui.innerHTML = ''; }
function fadeOutUI() { return new Promise(r => { ui.classList.add('ui-fade'); setTimeout(() => { ui.classList.remove('ui-fade'); r(); }, 900); }); }
// transición breve entre capítulos: un respiro de la viñeta + el número/nombre
// del capítulo se desvanecen y reaparecen, en vez de saltar de golpe
function chapter(num, name) {
  curtain.classList.add('on');
  chapNum.classList.add('swap'); chapName.classList.add('swap');
  setTimeout(() => {
    chapNum.textContent = num; chapName.textContent = name;
    chapNum.classList.remove('swap'); chapName.classList.remove('swap');
    curtain.classList.remove('on');
  }, REDUCED ? 10 : 300);
}
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ---------- CONSTELACIÓN CORAZÓN ---------- */
let currentHeart = null;
function heartPoints() {
  // Vértices trazados a mano (no muestreados de una curva paramétrica):
  // la mitad derecha se define explícitamente y la izquierda es su
  // espejo exacto, para garantizar simetría perfecta y los ángulos
  // característicos de un corazón — la hendidura en V arriba, un
  // hombro (el punto más ancho) a cada lado, y una punta definida abajo.
  const right = [
    { x: 0, y: 9 },    // hendidura central, arriba
    { x: 6, y: 15 },   // sube hacia el lóbulo derecho
    { x: 13, y: 14 },  // cresta redondeada del lóbulo
    { x: 18, y: 4 },   // hombro derecho — el punto más ancho
    { x: 13, y: -8 },  // cintura: se curva hacia ADENTRO (lo que da
                       // la silueta acorazonada, no de escudo/cometa)
    { x: 7, y: -14 },  // se acerca a la punta
    { x: 0, y: -19 },  // punta inferior
  ];
  const left = right.slice(1, -1).reverse().map(p => ({ x: -p.x, y: p.y }));
  return right.concat(left);
}
function layoutHeart() {
  if (!currentHeart) return;
  const { pts, svgPts, lines } = currentHeart;
  const w = innerWidth, h = innerHeight;
  constel.setAttribute('viewBox', `0 0 ${w} ${h}`);
  // compacto y desplazado hacia arriba, dejando un respiro claro antes
  // del texto (que se centra verticalmente en la pantalla)
  const scale = Math.min(w, h) * 0.007;
  const cx = w / 2, cy = h * 0.26;
  let bottomY = cy;
  pts.forEach((p, i) => {
    const X = cx + p.x * scale, Y = cy - p.y * scale;
    svgPts[i].sx = X; svgPts[i].sy = Y;
    svgPts[i].c.setAttribute('cx', X); svgPts[i].c.setAttribute('cy', Y);
    if (Y > bottomY) bottomY = Y;
  });
  // el texto de esta escena se ancla justo debajo de la punta real del
  // corazón (calculada aquí, no adivinada por el centrado del viewport),
  // así el espacio queda correcto en cualquier tamaño de pantalla
  document.documentElement.style.setProperty('--heart-bottom', (bottomY + 46) + 'px');
  lines.forEach((ln, i) => {
    const a = svgPts[i], b = svgPts[(i + 1) % pts.length];
    ln.setAttribute('x1', a.sx); ln.setAttribute('y1', a.sy);
    ln.setAttribute('x2', b.sx); ln.setAttribute('y2', b.sy);
    const len = Math.hypot(b.sx - a.sx, b.sy - a.sy);
    ln.style.strokeDasharray = len; if (!ln.dataset.drawn) ln.style.strokeDashoffset = len;
  });
  if (currentHeart.dot) { currentHeart.dot.setAttribute('cx', cx); currentHeart.dot.setAttribute('cy', cy - 1 * scale); }
}
function buildHeart() {
  constel.innerHTML = '';
  const pts = heartPoints();
  const lines = [], svgPts = [];
  for (let i = 0; i < pts.length; i++) {
    const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    constel.appendChild(ln); lines.push(ln);
  }
  const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  dot.setAttribute('r', 2.2); dot.setAttribute('opacity', '0'); constel.appendChild(dot);
  const comet = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  comet.setAttribute('r', 3.4); comet.setAttribute('class', 'comet'); constel.appendChild(comet);
  for (let i = 0; i < pts.length; i++) {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('r', 2.6); constel.appendChild(c);
    svgPts.push({ c });
  }
  currentHeart = { pts, svgPts, lines, dot, comet };
  layoutHeart();
}
const STAR_R = 2.6;
async function drawHeart() {
  buildHeart();
  constel.classList.add('on');
  const { svgPts, lines, dot, comet } = currentHeart;
  for (let i = 0; i < svgPts.length; i++) {
    // las estrellas aparecen en su propio lugar (radio 0 → radio final).
    // Ojo: NO usar `transform:scale()` aquí — en SVG el transform-origin
    // por defecto es la esquina (0,0) del viewport, no el centro del
    // círculo, así que escalar por transform hace que la estrella
    // "se deslice" desde esa esquina en vez de aparecer en su sitio.
    svgPts[i].c.animate([{ r: 0, opacity: 0 }, { r: STAR_R, opacity: 1 }],
      { duration: 460, fill: 'forwards', easing: 'ease-out' });
    await wait(REDUCED ? 10 : 95);
  }
  await wait(250);
  // un cometa recorre el contorno mientras se dibujan las líneas, con
  // un ritmo pausado — que se sienta como un trazo deliberado, ni
  // arrastrado ni instantáneo
  comet.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, fill: 'forwards' });
  const LINE_MS = REDUCED ? 10 : 250;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i]; ln.dataset.drawn = '1';
    const len = parseFloat(ln.style.strokeDasharray);
    const a = svgPts[i], b = svgPts[(i + 1) % svgPts.length];
    ln.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
      { duration: LINE_MS, fill: 'forwards', easing: 'linear' });
    ln.style.strokeDashoffset = 0;
    if (!REDUCED) comet.animate([
      { cx: a.sx, cy: a.sy }, { cx: b.sx, cy: b.sy }
    ], { duration: LINE_MS, fill: 'forwards', easing: 'linear' });
    comet.setAttribute('cx', b.sx); comet.setAttribute('cy', b.sy);
    await wait(REDUCED ? 5 : LINE_MS * .6);
  }
  comet.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' });
  dot.animate([{ opacity: 0 }, { opacity: .9 }], { duration: 600, fill: 'forwards' });
}
function hideHeart() { constel.classList.remove('on'); }

/* ---------- ESCENAS ---------- */
function addEl(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; ui.appendChild(e); return e; }

async function sceneNoche() {
  chapter('01', 'LA NOCHE');
  ftop.classList.add('on'); fbot.classList.add('on');
  clearUI();
  const eb = addEl('div', 'eyebrow', 'ENTRE MILLONES DE ESTRELLAS');
  const name = addEl('h1', 'hero-name', '');
  const line = addEl('p', 'line', '');
  await wait(400);
  wish.classList.add('on');
  eb.classList.add('in');
  await wait(700);
  name.textContent = CONFIG.name + '…'; name.classList.add('in');
  await wait(1500);
  await typeInto(line, 'Encontré algo en el universo que quería mostrarte.', 40);
  await wait(2600);
  await fadeOutUI();
}

async function sceneLuz() {
  chapter('02', 'TU LUZ');
  clearUI();
  wish.classList.remove('on');
  // el texto se ancla debajo de la punta real del corazón (ver
  // layoutHeart) en vez de centrarse a ciegas en todo el viewport,
  // donde a veces casi no quedaba espacio entre ambos
  ui.classList.add('below-heart');
  const line = addEl('p', 'line big', '');
  drawHeart();
  await wait(600);
  await typeInto(line, 'Dicen que hay millones de estrellas…', 55);
  // el corazón tarda ~5.6s en terminar de dibujarse desde que empezó;
  // se espera lo suficiente para que nunca se corte a mitad de trazo
  await wait(3400);
  await fadeOutUI();
}

async function sceneDestello() {
  chapter('03', 'EL DESTELLO');
  clearUI();
  hideHeart();
  flash.classList.add('fire');
  await wait(700);
  cosmos.classList.add('show');
  cosmos.style.transform = 'translate(-50%,-50%) scale(1)';
  await wait(2000);
  flash.classList.remove('fire');
}

async function sceneLugar() {
  chapter('04', 'UN LUGAR PARA TI');
  clearUI();
  // de aquí en adelante el planeta está a la vista, así que el texto
  // se ancla en su propia franja arriba de él en vez de centrarse en
  // todo el viewport (donde terminaría encimado sobre el planeta)
  ui.classList.remove('below-heart');
  ui.classList.add('top');
  const line = addEl('p', 'line big', '');
  await wait(700);
  await typeInto(line, 'Entonces entendí algo…', 60);
  await wait(600);
  CosmicFlowers.bloomBatch('one');
  await wait(2600);
  await fadeOutUI();
}

async function sceneFlorece() {
  chapter('05', 'LO QUE FLORECE');
  clearUI();
  const line = addEl('p', 'line big', '');
  await typeInto(line, 'No importa cuántos lugares existan…', 55);
  await wait(400);
  CosmicFlowers.bloomBatch('few');
  await wait(3200);
  await fadeOutUI();
}

async function sceneTodo() {
  chapter('06', 'TODO PARA TI');
  clearUI();
  Starfield.enableDust();
  const line = addEl('p', 'line big', '');
  await typeInto(line, 'Podría regalarte todas las flores del mundo…', 52);
  await wait(400);
  CosmicFlowers.bloomBatch('many');
  await wait(3600);
  await fadeOutUI();
}

async function sceneFinal() {
  chapter('07', 'EL INFINITO');
  clearUI();
  // el acercamiento final se mantiene muy sutil (antes escalaba a 1.12 y
  // subía el ancla a -54%, lo que hacía crecer el planeta lo bastante
  // para meterse debajo del texto/firma de esta escena)
  cosmos.style.transform = 'translate(-50%,-50%) scale(1.04)';
  const line = addEl('p', 'line big', '');

  // eyebrow + símbolo + botón NO cuelgan del bloque de texto de arriba
  // (#ui): viven en #finale, fijo cerca del borde inferior de la
  // pantalla, así su posición nunca depende de cuántas líneas ocupe el
  // texto ni puede terminar encima del planeta
  finale.innerHTML = '';
  const eb = document.createElement('div'); eb.className = 'eyebrow'; eb.textContent = 'PARA ' + CONFIG.name.toUpperCase();
  const heart = document.createElement('div');
  heart.style.cssText = 'font-family:var(--serif);font-style:italic;font-size:30px;line-height:1;color:var(--gold);opacity:0';
  heart.textContent = '∞';
  const rep = document.createElement('button'); rep.id = 'replay'; rep.textContent = 'VOLVER A EMPEZAR';
  finale.append(eb, heart, rep);
  rep.addEventListener('click', () => location.reload());

  await typeInto(line, '…pero preferí regalarte un universo entero.', 52);
  await wait(1400);
  eb.classList.add('in');
  await wait(1000);
  heart.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1400, fill: 'forwards' });
  rep.classList.add('in');
}

/* ---------- DIRECTOR ---------- */
async function run() {
  await sceneNoche();
  await sceneLuz();
  await sceneDestello();
  await sceneLugar();
  await sceneFlorece();
  await sceneTodo();
  await sceneFinal();
}

// La historia arranca recién cuando la persona presiona "Comenzar": ese
// click es un gesto de usuario real, así que ahí SÍ se puede arrancar la
// música con sonido — sin este botón el navegador la bloquea siempre y
// la experiencia empezaría en silencio.
const gate = $('#gate'), enterBtn = $('#enterBtn');
enterBtn.addEventListener('click', () => {
  setMuted(false);
  gate.classList.add('out');
  setTimeout(() => gate.remove(), 850);
  run();
}, { once: true });
