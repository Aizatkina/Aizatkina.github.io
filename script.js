// ==============================
// Helpers
// ==============================
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

// ==============================
// Drawer toggle (safe guards)
// ==============================
const drawer    = $('#drawer');
const toggleBtn = $('#drawerToggle');
const handIcon  = toggleBtn ? toggleBtn.querySelector('.hand__icon') : null;

const HAND_SRC  = 'Hand_icon.svg';
const CROSS_SRC = 'cross_icon.svg';

function setDrawerState(isOpen) {
  if (!drawer || !toggleBtn || !handIcon) return;
  drawer.classList.toggle('open', isOpen);
  drawer.setAttribute('aria-hidden', String(!isOpen));
  toggleBtn.setAttribute('aria-expanded', String(isOpen));
  handIcon.src = isOpen ? CROSS_SRC : HAND_SRC;
  handIcon.alt = isOpen ? 'Close menu' : 'Open menu';
}

if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    const isOpen = !drawer.classList.contains('open');
    setDrawerState(isOpen);
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && drawer && drawer.classList.contains('open')) {
    setDrawerState(false);
  }
});

// Close drawer when clicking outside
document.addEventListener('click', (e) => {
  if (!drawer || !toggleBtn) return;
  if (!drawer.classList.contains('open')) return;
  const inside = drawer.contains(e.target) || toggleBtn.contains(e.target);
  if (!inside) setDrawerState(false);
});

// ==============================
// Header "dock" when scrolled
// ==============================
const hdr = $('.hdr');
function onScroll() {
  if (!hdr) return;
  const threshold = window.innerHeight * 0.45;
  const show = window.scrollY > threshold;
  hdr.classList.toggle('show', show);
  document.body.classList.toggle('shrunk', show);
}
document.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ==============================
// Tactile keys: press anim + color rotate
// (palette only for the key backgrounds)
// ==============================
const PALETTE = ['#FFDC23', '#661FFF', '#F8376E', '#00FCAA', '#FFFFFF'];
function nextColor(current) {
  const choices = PALETTE.filter(c => c.toLowerCase() !== (current || '').toLowerCase());
  return choices[Math.floor(Math.random() * choices.length)];
}
$$('.tactile .key').forEach(key => {
  key.addEventListener('click', () => {
    key.classList.add('is-pressed');
    setTimeout(() => key.classList.remove('is-pressed'), 110);

    const computed = getComputedStyle(key).backgroundColor;
    let currentHex = '';
    if (computed.startsWith('rgb')) {
      const [r, g, b] = computed.match(/\d+/g).map(Number);
      currentHex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
    } else {
      currentHex = computed;
    }
    key.style.backgroundColor = nextColor(currentHex);
  });
});

// ==============================
// About: typewriter on first reveal
// ==============================
const bioEl = $('#typedBio');
if (bioEl) {
  const bioText = `I’m a highly skilled and versatile UX designer who blends technical expertise with clear, empathetic communication. I have a keen eye for detail and a genuine passion for creating user-centered designs that make a real impact. Every project I take on is an opportunity to solve problems thoughtfully and craft experiences people love. Let’s create something meaningful together: Aizatkina1104@gmail.com`;
  let typed = false;

  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !typed) {
      typed = true; typeWrite(bioEl, bioText, 70);
    }
  }, { threshold: 0.35 });
  io.observe(bioEl);

  function typeWrite(el, text, speed = 70) {
    let i = 0;
    (function tick() {
      el.textContent = text.slice(0, i++);
      if (i <= text.length) {
        const ch = text[i - 1];
        const delay = (ch === '.' || ch === ',') ? 160 : 0;
        setTimeout(tick, speed + delay);
      }
    })();
  }
}

// ==============================
// Works: single-select filter + cursor pill
// (cards use data-category: product | experimentals | drawings)
// ==============================
const works = $('.works');
const segs  = $$('.seg[data-filter]');
const grid  = $('.grid');
const cards = grid ? $$('.proj', grid) : [];
const pill  = $('#cursorPill');

function applyFilter(key) {
  // button states
  segs.forEach(s => s.classList.toggle('is-active', s.dataset.filter === key));
  // show/hide cards based on data-category
  cards.forEach(c => {
    const cat = (c.getAttribute('data-category') || '').toLowerCase();
    c.style.display = cat === key ? '' : 'none';
  });
}

segs.forEach(s => s.addEventListener('click', () => applyFilter(s.dataset.filter)));

// Default to "product" if present; else first tab
const defaultKey = segs.some(s => s.dataset.filter === 'product') ? 'product'
                  : (segs[0]?.dataset.filter || 'product');
applyFilter(defaultKey);

// Custom cursor pill follows mouse within .works over .proj
if (works && pill) {
  works.addEventListener('mousemove', e => {
    const overProj = e.target.closest('.proj');
    if (!overProj) { works.classList.remove('hovering'); pill.style.opacity = 0; return; }
    works.classList.add('hovering');
    pill.style.opacity = 1;
    pill.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 14}px)`;
  });
  works.addEventListener('mouseleave', () => {
    works.classList.remove('hovering');
    pill.style.opacity = 0;
  });
}

// Smooth internal scroll for on-page anchors
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href').slice(1);
  const el = document.getElementById(id);
  if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
});

// ==============================
// Snake Game (unchanged logic, with guards)
// ==============================
const overlay    = $('#gameOverlay');
const scoreVal   = $('#scoreVal');
const finalScore = $('#finalScore');
const dialog     = $('#gameOver');
const playAgain  = $('#playAgain');
const exitBtns   = [$('#exitGame'), $('#exitGame2')].filter(Boolean);
const canvas     = $('#gameCanvas');
const ctx        = canvas ? canvas.getContext('2d') : null;

if (canvas && ctx) {
  const gridSize = 20;
  const cols = Math.floor(canvas.width / gridSize);
  const rows = Math.floor(canvas.height / gridSize);
  let loop = null, snake = [], dir = {x:1,y:0}, next = {x:1,y:0}, food = null, score = 0;

  function showGame(){ overlay.classList.add('on'); overlay.setAttribute('aria-hidden','false'); start(); }
  function hideGame(){ overlay.classList.remove('on'); overlay.setAttribute('aria-hidden','true'); stop(); }

  const playBtn = $('#playfulBtn');
  if (playBtn) playBtn.addEventListener('click', showGame);
  exitBtns.forEach(b=>b.addEventListener('click', hideGame));

  function start(){ reset(); window.addEventListener('keydown', onKey); loop = setInterval(step, 180); }
  function stop(){ clearInterval(loop); window.removeEventListener('keydown', onKey); }
  function reset(){
    score = 0; if (scoreVal) scoreVal.textContent = '0'; dialog.classList.remove('show');
    const cx = cols >> 1, cy = rows >> 1;
    snake = [{x:cx,y:cy},{x:cx-1,y:cy},{x:cx-2,y:cy}];
    dir = next = {x:1,y:0}; food = placeFood(); draw();
  }
  function placeFood(){
    let p;
    do { p = { x: (Math.random()*cols)|0, y: (Math.random()*rows)|0 }; }
    while (snake.some(s=>s.x===p.x && s.y===p.y));
    return p;
  }
  function onKey(e){
    const k = e.key.toLowerCase();
    if ((k==='arrowup'||k==='w')    && dir.y!== 1) next = {x: 0,y:-1};
    if ((k==='arrowdown'||k==='s')  && dir.y!==-1) next = {x: 0,y: 1};
    if ((k==='arrowleft'||k==='a')  && dir.x!== 1) next = {x:-1,y: 0};
    if ((k==='arrowright'||k==='d') && dir.x!==-1) next = {x: 1,y: 0};
  }
  function step(){
    dir = next;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (head.x<0 || head.y<0 || head.x>=cols || head.y>=rows) { end(); return; }
    snake.unshift(head);
    if (head.x===food.x && head.y===food.y) { score++; if (scoreVal) scoreVal.textContent = String(score); food = placeFood(); }
    else snake.pop();
    draw();
  }
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // food
    ctx.fillStyle = '#4ad8ff'; ctx.beginPath();
    ctx.arc(food.x*gridSize+gridSize/2, food.y*gridSize+gridSize/2, gridSize*0.38, 0, Math.PI*2); ctx.fill();
    // snake
    ctx.fillStyle = '#2bdc76';
    snake.forEach((s,i) => {
      const x = s.x*gridSize, y = s.y*gridSize;
      ctx.fillRect(x+2, y+2, gridSize-4, gridSize-4);
      if (i===0) {
        ctx.fillStyle = '#111'; ctx.fillRect(x+gridSize/2, y+6, 4, 4);
        ctx.fillStyle = '#2bdc76';
      }
    });
  }
  function end(){ stop(); if (finalScore) finalScore.textContent = String(score); dialog.classList.add('show'); }
  if (playAgain) playAgain.addEventListener('click', () => { reset(); loop = setInterval(step, 180); window.addEventListener('keydown', onKey); });

  // Keyboard open for PLAYFUL (accessibility)
  if (playBtn) {
    playBtn.addEventListener('keydown', e=>{
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); showGame(); }
    });
  }
}

// ==============================
// Optional: normalize external “group-interactive” if present (safe to keep)
// ==============================
(function () {
  const WORD = 'tactical';
  const group = document.querySelector('.group-interactive');
  if (!group) return;

  const capTextEls = () => Array.from(group.querySelectorAll('.text'));
  if (capTextEls().length === 0) return;

  while (capTextEls().length < WORD.length) {
    const lastCap = group.lastElementChild;
    if (!lastCap) break;
    const clone = lastCap.cloneNode(true);
    group.appendChild(clone);
  }
  while (capTextEls().length > WORD.length) {
    group.lastElementChild?.remove();
  }
  capTextEls().forEach((el, i) => el.textContent = WORD[i]);

  if (!group.getAttribute('role')) group.setAttribute('role','group');
  group.setAttribute('aria-label', `Interactive word: ${WORD}`);
})();
