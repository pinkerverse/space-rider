/* =====================
   CANVAS SETUP
===================== */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 360;
canvas.height = 640;

/* =====================
   UI STYLE
===================== */

const UI_FILL = "#FF2D55";     // laser red / pink
const UI_STROKE = "#00F5FF";   // cyan outline
const UI_FONT = "'Orbitron', 'Exo', 'Rajdhani', system-ui, sans-serif";

/* =====================
   IMAGE LOADING
===================== */

const backgrounds = [];
for (let i = 1; i <= 5; i++) {
  const img = new Image();
  img.src = `images/bg${i}.png`;
  backgrounds.push(img);
}

const shipIdle = new Image();
shipIdle.src = "images/ship_idle.png";

const shipBoostFrames = [];
for (let i = 1; i <= 4; i++) {
  const img = new Image();
  img.src = `images/ship_boost${i}.png`;
  shipBoostFrames.push(img);
}

const pillarImg = new Image();
pillarImg.src = "images/pillar.png";

/* =====================
   GAME STATE
===================== */

let gameState = "start";
let score = 0;

/* =====================
   HIGHSCORES (TOP 3)
===================== */

const HIGHSCORE_KEY = "spaceRidersHighscores";
let highscores = JSON.parse(localStorage.getItem(HIGHSCORE_KEY)) || [];

/* =====================
   BACKGROUND
===================== */

let bgFrameIndex = 0;
let bgDirection = 1;
let bgTimer = 0;
const BG_FRAME_TIME = 70;

/* =====================
   SHIP
===================== */

const ship = {
  x: 80,
  y: 300,
  width: 64,
  height: 48,
  velocity: 0,
  gravity: 0.61,
  lift: -11
};

let boosting = false;
let boostFrame = 0;
let boostTimer = 0;

/* =====================
   HITBOXES (10% SMALLER)
===================== */

const SHIP_HITBOX_PADDING = { x: 18, y: 14 };
const PILLAR_HITBOX_PADDING = { x: 6, y: 6 };

/* =====================
   PIPES
===================== */

const pipes = [];
const pipeWidth = 60;
const gap = 170;
let pipeTimer = 0;
let pipeSpeed = 2.5;

/* =====================
   BUTTONS
===================== */

const startButton = {
  x: canvas.width / 2 - 90,
  y: canvas.height / 2 + 40,
  width: 180,
  height: 50
};

const fullscreenButton = {
  x: canvas.width / 2 - 90,
  y: canvas.height / 2 + 100,
  width: 180,
  height: 40
};

/* =====================
   INPUT (DESKTOP + MOBILE SAFE)
===================== */

canvas.addEventListener("mousedown", e => handlePointer(e.clientX, e.clientY));
canvas.addEventListener("touchstart", e => {
  handlePointer(e.touches[0].clientX, e.touches[0].clientY);
  e.preventDefault();
});

document.addEventListener("keyup", () => boosting = false);
document.addEventListener("touchend", () => boosting = false);

document.addEventListener("keydown", e => {
  if (e.code === "Space" && gameState === "playing") {
    ship.velocity = ship.lift;
    boosting = true;
  }
});

function handlePointer(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();

  // FIX for fullscreen scaling
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = (clientX - rect.left) * scaleX;
  const y = (clientY - rect.top) * scaleY;

  if ((gameState === "start" || gameState === "gameover") && isInside(startButton, x, y)) {
    startGame();
    return;
  }

  if ((gameState === "start" || gameState === "gameover") && isInside(fullscreenButton, x, y)) {
    requestFullscreen();
    return;
  }

  if (gameState === "playing") {
    ship.velocity = ship.lift;
    boosting = true;
  }
}

/* =====================
   GAME LOOP
===================== */

let lastTime = 0;

function update(time) {
  const delta = time - lastTime;
  lastTime = time;

  bgTimer += delta;
  if (bgTimer > BG_FRAME_TIME) {
    bgFrameIndex += bgDirection;
    if (bgFrameIndex === backgrounds.length - 1) bgDirection = -1;
    if (bgFrameIndex === 0) bgDirection = 1;
    bgTimer = 0;
  }

  ctx.drawImage(backgrounds[bgFrameIndex], 0, 0, canvas.width, canvas.height);

  if (gameState === "start") {
    drawText("SPACE RIDERS", 260, 30);
    drawButton(startButton, "START");
    drawButton(fullscreenButton, "FULLSCREEN", 14);
    requestAnimationFrame(update);
    return;
  }

  if (gameState === "gameover") {
    drawText("GAME OVER", 200, 26);
    drawText(`SCORE ${score}`, 240, 18);
    drawHighscores(280);
    drawButton(startButton, "RESTART");
    drawButton(fullscreenButton, "FULLSCREEN", 14);
    requestAnimationFrame(update);
    return;
  }

  ship.velocity += ship.gravity;
  ship.y += ship.velocity;

  let img = shipIdle;
  if (boosting) {
    boostTimer += delta;
    if (boostTimer > 50) {
      boostFrame = (boostFrame + 1) % shipBoostFrames.length;
      boostTimer = 0;
    }
    img = shipBoostFrames[boostFrame];
  } else {
    boostFrame = 0;
  }

  ctx.save();
  ctx.translate(ship.x + ship.width / 2, ship.y + ship.height / 2);
  ctx.rotate(ship.velocity * 0.035);
  ctx.drawImage(img, -ship.width / 2, -ship.height / 2, ship.width, ship.height);
  ctx.restore();

  pipeTimer += delta;
  if (pipeTimer > 1400) {
    const top = Math.random() * (canvas.height - gap - 120) + 60;
    pipes.push({
      x: canvas.width,
      top,
      bottom: canvas.height - top - gap,
      passed: false
    });
    pipeTimer = 0;
  }

  pipes.forEach(pipe => {
    pipe.x -= pipeSpeed;

    ctx.save();
    ctx.translate(pipe.x + pipeWidth / 2, pipe.top / 2);
    ctx.scale(1, -1);
    ctx.drawImage(pillarImg, -pipeWidth / 2, -pipe.top / 2, pipeWidth, pipe.top);
    ctx.restore();

    ctx.drawImage(pillarImg, pipe.x, canvas.height - pipe.bottom, pipeWidth, pipe.bottom);

    const shipHB = {
      x: ship.x + SHIP_HITBOX_PADDING.x,
      y: ship.y + SHIP_HITBOX_PADDING.y,
      width: ship.width - SHIP_HITBOX_PADDING.x * 2,
      height: ship.height - SHIP_HITBOX_PADDING.y * 2
    };

    const topHB = {
      x: pipe.x + PILLAR_HITBOX_PADDING.x,
      y: 0,
      width: pipeWidth - PILLAR_HITBOX_PADDING.x * 2,
      height: pipe.top
    };

    const bottomHB = {
      x: pipe.x + PILLAR_HITBOX_PADDING.x,
      y: canvas.height - pipe.bottom,
      width: pipeWidth - PILLAR_HITBOX_PADDING.x * 2,
      height: pipe.bottom
    };

    if (overlap(shipHB, topHB) || overlap(shipHB, bottomHB)) endGame();

    if (!pipe.passed && pipe.x + pipeWidth < ship.x) {
      score++;
      pipe.passed = true;
    }
  });

  if (pipes.length && pipes[0].x < -pipeWidth) pipes.shift();
  if (ship.y < 0 || ship.y + ship.height > canvas.height) endGame();

  drawOutlinedText(score.toString(), 20, 36, 18);

  requestAnimationFrame(update);
}

/* =====================
   FULLSCREEN HANDLING
===================== */

function requestFullscreen() {
  // Desktop + Android Chrome
  if (canvas.requestFullscreen) {
    canvas.requestFullscreen();
    return;
  }

  // iOS Safari fallback (pseudo-fullscreen)
  mobileFullscreenFallback();
}

function mobileFullscreenFallback() {
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // hide address bar as much as iOS allows
  setTimeout(() => window.scrollTo(0, 1), 100);
}

/* =====================
   DRAW HELPERS
===================== */

function drawOutlinedText(text, x, y, size) {
  ctx.font = `${size}px ${UI_FONT}`;
  ctx.lineWidth = 3;
  ctx.strokeStyle = UI_STROKE;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = UI_FILL;
  ctx.fillText(text, x, y);
}

function drawText(text, y, size) {
  ctx.font = `${size}px ${UI_FONT}`;
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = UI_STROKE;
  ctx.strokeText(text, canvas.width / 2, y);
  ctx.fillStyle = UI_FILL;
  ctx.fillText(text, canvas.width / 2, y);
  ctx.textAlign = "left";
}

function drawButton(btn, label, size = 18) {
  ctx.strokeStyle = UI_STROKE;
  ctx.lineWidth = 2;
  ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);
  ctx.font = `${size}px ${UI_FONT}`;
  ctx.textAlign = "center";
  ctx.strokeText(label, canvas.width / 2, btn.y + btn.height / 2 + 6);
  ctx.fillStyle = UI_FILL;
  ctx.fillText(label, canvas.width / 2, btn.y + btn.height / 2 + 6);
  ctx.textAlign = "left";
}

function drawHighscores(y) {
  drawText("TOP 3", y, 14);
  highscores.forEach((s, i) => {
    drawOutlinedText(`${i + 1}. ${s}`, canvas.width / 2, y + 24 + i * 18, 14);
  });
}

/* =====================
   GAME FLOW
===================== */

function startGame() {
  resetGame();
  gameState = "playing";
}

function endGame() {
  saveHighscore(score);
  gameState = "gameover";
}

function resetGame() {
  ship.y = 300;
  ship.velocity = 0;
  pipes.length = 0;
  score = 0;
  boosting = false;
  boostFrame = 0;
  pipeTimer = 0;
}

function saveHighscore(s) {
  highscores.push(s);
  highscores.sort((a, b) => b - a);
  highscores = highscores.slice(0, 3);
  localStorage.setItem(HIGHSCORE_KEY, JSON.stringify(highscores));
}

/* =====================
   UTIL
===================== */

function isInside(btn, x, y) {
  return x > btn.x && x < btn.x + btn.width &&
         y > btn.y && y < btn.y + btn.height;
}

function overlap(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

/* =====================
   START
===================== */

requestAnimationFrame(update);
