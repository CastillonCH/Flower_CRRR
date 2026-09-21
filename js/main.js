/* ============================================================
   ✦  CONFIGURACIÓN  ✦
   Cambia el nombre de tu persona aquí:
   ============================================================ */
const CONFIG = {
  name: "Andrea",            // ← el nombre que aparece entre las estrellas
};
/* ============================================================ */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = s => document.querySelector(s);
const ui = $('#ui');
const ftop = $('#ftop'), fbot = $('#fbot');
const chapNum = $('#chapNum'), chapName = $('#chapName');
const wish = $('#wish'), cosmos = $('#cosmos');
const flash = $('#flash'), rays = $('#rays'), constel = $('#constellation'), goldenC = $('#golden');

Starfield.init();

/* ---------- AUDIO ambiental (generado, sutil) ---------- */
let actx = null, master = null, audioReady = false, audioMuted = true;
const audioBtn = $('#audio'), aX1 = $('#audio-x1'), aX2 = $('#audio-x2');
function initAudio() {
  if (audioReady) return;
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain(); master.gain.value = 0; master.connect(actx.destination);
    const freqs = [110, 164.81, 220, 277.18];
    freqs.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = i % 2 ? 'sine' : 'triangle'; o.frequency.value = f;
      g.gain.value = 0.22 / (i + 1);
      const lfo = actx.createOscillator(), lg = actx.createGain();
      lfo.frequency.value = 0.05 + i * 0.02; lg.gain.value = 0.08;
      lfo.connect(lg); lg.connect(g.gain); lfo.start();
      o.connect(g); g.connect(master); o.start();
    });
    audioReady = true;
  } catch (e) {}
}
function setMuted(m) {
  audioMuted = m;
  audioBtn.classList.toggle('muted', m);
  aX1.style.display = m ? 'block' : 'none';
  aX2.style.display = m ? 'block' : 'none';
  if (audioReady && actx) {
    const now = actx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.linearRampToValueAtTime(m ? 0 : 0.16, now + 1.2);
    if (!m && actx.state === 'suspended') actx.resume();
  }
}
audioBtn.addEventListener('click', () => { initAudio(); setMuted(!audioMuted); });
setMuted(true);

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
document.addEventListener('click', e => { if (!e.target.closest('.cta,#audio,#replay')) skipReq = true; });

/* ---------- helpers UI ---------- */
function clearUI() { ui.innerHTML = ''; }
function fadeOutUI() { return new Promise(r => { ui.classList.add('ui-fade'); setTimeout(() => { ui.classList.remove('ui-fade'); r(); }, 900); }); }
function chapter(num, name) { chapNum.textContent = num; chapName.textContent = name; }
function makeButton(label) {
  const b = document.createElement('button'); b.className = 'cta';
  b.innerHTML = `<svg viewBox="0 0 220 60"><ellipse cx="110" cy="30" rx="105" ry="26"/><ellipse class="glow" cx="110" cy="30" rx="105" ry="26"/></svg>
    <span class="label">${label}<span class="spark">✦</span></span>`;
  return b;
}
function waitClick(btn) {
  return new Promise(r => { btn.classList.add('in'); btn.addEventListener('click', () => r(), { once: true }); });
}
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ---------- CONSTELACIÓN CORAZÓN ---------- */
let currentHeart = null;
function heartPoints() {
  const pts = []; const N = 15;
  for (let k = 0; k < N; k++) {
    const t = Math.PI - (k / (N - 1)) * 2 * Math.PI;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pts.push({ x, y });
  }
  return pts;
}
function layoutHeart() {
  if (!currentHeart) return;
  const { pts, svgPts, lines } = currentHeart;
  const w = innerWidth, h = innerHeight;
  constel.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const scale = Math.min(w, h) * 0.020;
  const cx = w / 2, cy = h * 0.40;
  pts.forEach((p, i) => {
    const X = cx + p.x * scale, Y = cy - p.y * scale;
    svgPts[i].sx = X; svgPts[i].sy = Y;
    svgPts[i].c.setAttribute('cx', X); svgPts[i].c.setAttribute('cy', Y);
  });
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
async function drawHeart() {
  buildHeart();
  constel.classList.add('on');
  const { svgPts, lines, dot, comet } = currentHeart;
  for (let i = 0; i < svgPts.length; i++) {
    svgPts[i].c.animate([{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1)' }],
      { duration: 500, fill: 'forwards', easing: 'ease-out' });
    await wait(REDUCED ? 10 : 90);
  }
  await wait(200);
  // un cometa recorre el contorno mientras se dibujan las líneas
  comet.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'forwards' });
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i]; ln.dataset.drawn = '1';
    const len = parseFloat(ln.style.strokeDasharray);
    const a = svgPts[i], b = svgPts[(i + 1) % svgPts.length];
    ln.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
      { duration: REDUCED ? 10 : 340, fill: 'forwards', easing: 'ease-in-out' });
    ln.style.strokeDashoffset = 0;
    if (!REDUCED) comet.animate([
      { cx: a.sx, cy: a.sy }, { cx: b.sx, cy: b.sy }
    ], { duration: 340, fill: 'forwards', easing: 'ease-in-out' });
    comet.setAttribute('cx', b.sx); comet.setAttribute('cy', b.sy);
    await wait(REDUCED ? 5 : 170);
  }
  comet.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' });
  dot.animate([{ opacity: 0 }, { opacity: .9 }], { duration: 800, fill: 'forwards' });
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
  await wait(300);
  const b = makeButton('Descubrir'); ui.appendChild(b);
  b.addEventListener('mouseenter', initAudio, { once: true });
  await waitClick(b);
  if (!audioReady) { initAudio(); }
  audioBtn.classList.add('on');
  await fadeOutUI();
}

async function sceneLuz() {
  chapter('02', 'TU LUZ');
  clearUI();
  wish.classList.remove('on');
  const line = addEl('p', 'line big', '');
  drawHeart();
  await wait(600);
  await typeInto(line, 'Dicen que hay millones de estrellas…', 55);
  await wait(2600);
  const b = makeButton('Continuar'); ui.appendChild(b);
  await waitClick(b);
  await fadeOutUI();
}

async function sceneDestello() {
  chapter('03', 'EL DESTELLO');
  clearUI();
  hideHeart();
  flash.classList.add('fire');
  rays.classList.add('fire');
  await wait(700);
  cosmos.classList.add('show');
  cosmos.style.transform = 'translate(-50%,-50%) scale(1)';
  await wait(2000);
  flash.classList.remove('fire');
  rays.classList.remove('fire');
}

async function sceneLugar() {
  chapter('04', 'UN LUGAR PARA TI');
  clearUI();
  const line = addEl('p', 'line big', '');
  await wait(700);
  await typeInto(line, 'Entonces entendí algo…', 60);
  await wait(600);
  CosmicFlowers.bloomBatch('one');
  await wait(1800);
  const b = makeButton('Continuar'); ui.appendChild(b);
  await waitClick(b);
  await fadeOutUI();
}

async function sceneFlorece() {
  chapter('05', 'LO QUE FLORECE');
  clearUI();
  const line = addEl('p', 'line big', '');
  await typeInto(line, 'No importa cuántos lugares existan…', 55);
  await wait(400);
  CosmicFlowers.bloomBatch('few');
  await wait(2400);
  const b = makeButton('Continuar'); ui.appendChild(b);
  await waitClick(b);
  await fadeOutUI();
}

async function sceneTodo() {
  chapter('06', 'TODO PARA TI');
  clearUI();
  Starfield.enableGolden();
  const line = addEl('p', 'line big', '');
  await typeInto(line, 'Podría regalarte todas las flores del mundo…', 52);
  await wait(400);
  CosmicFlowers.bloomBatch('many');
  await wait(2600);
  const b = makeButton('Continuar'); ui.appendChild(b);
  await waitClick(b);
  await fadeOutUI();
}

async function sceneFinal() {
  chapter('07', 'EL INFINITO');
  clearUI();
  cosmos.style.transform = 'translate(-50%,-54%) scale(1.12)';
  const line = addEl('p', 'line big', '');
  await typeInto(line, '…pero preferí regalarte un universo entero.', 52);
  await wait(1400);
  const eb = addEl('div', 'eyebrow', 'PARA ' + CONFIG.name.toUpperCase());
  eb.style.marginTop = '4px'; eb.classList.add('in');
  await wait(1000);
  const heart = addEl('div', 'line', '∞');
  heart.style.cssText = 'font-family:var(--serif);font-style:italic;font-size:34px;color:var(--gold);opacity:0';
  heart.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1400, fill: 'forwards' });
  const rep = document.createElement('button'); rep.id = 'replay'; rep.textContent = 'VOLVER A EMPEZAR';
  ui.appendChild(rep); rep.classList.add('in');
  rep.addEventListener('click', () => location.reload());
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
run();
