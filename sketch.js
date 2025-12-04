let cols, rows;
let grid, nextGrid;
let cellSize = 12;

let startPauseBtn, stepBtn, randomizeBtn, clearBtn;
let placeSingleBtn, placeGliderBtn, patternSelector;
let colorPicker, speedSlider;
let enableSoundBtn, soundStatusSpan;
let genCountP, runTimeP;

let mode = "toggle";

let running = false;
let generation = 0;
let lastStepMillis = 0;
let runStartMillis = 0;

let osc, env;
let soundEnabled = false;

function setup() {
  calculateGrid();
  let cnv = createCanvas(cols * cellSize, rows * cellSize);
  cnv.parent("canvasContainer");

  colorPicker = select("#colorPicker");
  speedSlider = select("#speed");

  startPauseBtn = select("#startPause");
  stepBtn = select("#step");
  randomizeBtn = select("#randomize");
  clearBtn = select("#clear");

  placeSingleBtn = select("#placeSingle");
  placeGliderBtn = select("#placeGlider");
  patternSelector = select("#patternSelector");

  enableSoundBtn = select("#enableSound");
  soundStatusSpan = select("#soundStatus");

  genCountP = select("#genCount");
  runTimeP = select("#runTime");

  startPauseBtn.mousePressed(toggleRun);
  stepBtn.mousePressed(step);
  randomizeBtn.mousePressed(randomizeGrid);
  clearBtn.mousePressed(clearGrid);

  placeSingleBtn.mousePressed(() => {
    mode = "single";
    placeSingleBtn.html("Modo: Célula (activo)");
    placeGliderBtn.html("Colocar Glider");
    patternSelector.value("none");
  });

  placeGliderBtn.mousePressed(() => {
    mode = "glider";
    placeGliderBtn.html("Modo: Glider (activo)");
    placeSingleBtn.html("Colocar célula");
    patternSelector.value("none");
  });

  patternSelector.changed(() => {
    mode = patternSelector.value();
    placeSingleBtn.html("Colocar célula");
    placeGliderBtn.html("Colocar Glider");
  });

  enableSoundBtn.mousePressed(toggleSound);

  osc = new p5.Oscillator("sine");
  env = new p5.Envelope();
  env.setADSR(0.001, 0.05, 0, 0.05);
  env.setRange(0.5, 0);

  initGrid();
  randomizeGrid();
}

function draw() {
  background(0);
  drawGrid();

  if (running) {
    const gensPerSec = Number(speedSlider.elt.value);
    const interval = 1000 / gensPerSec;

    if (millis() - lastStepMillis >= interval) {
      step();
      lastStepMillis = millis();
    }

    if (runStartMillis === 0) runStartMillis = millis();
    runTimeP.html(formatMillis(millis() - runStartMillis));
  }
}

function calculateGrid() {
  cols = Math.floor(windowWidth / cellSize) - 2;
  rows = Math.floor(windowHeight / cellSize) - 2;
  cols = max(cols, 10);
  rows = max(rows, 10);
}

function initGrid() {
  grid = Array.from({ length: cols }, () => Array(rows).fill(0));
  nextGrid = Array.from({ length: cols }, () => Array(rows).fill(0));
}

function randomizeGrid() {
  for (let x = 0; x < cols; x++)
    for (let y = 0; y < rows; y++) grid[x][y] = random() < 0.25 ? 1 : 0;

  generation = 0;
  genCountP.html(generation);
}

function clearGrid() {
  for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) grid[x][y] = 0;

  generation = 0;
  genCountP.html(generation);
  running = false;
  startPauseBtn.html("Iniciar");
  runStartMillis = 0;
}

function drawGrid() {
  stroke(50);
  fill(colorPicker.value());

  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      if (grid[x][y] === 1) {
        noStroke();
        fill(colorPicker.value());
        rect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }
}

function neighbors(x, y) {
  let sum = 0;
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      if (i === 0 && j === 0) continue;
      let nx = x + i;
      let ny = y + j;

      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      sum += grid[nx][ny];
    }
  }
  return sum;
}

function step() {
  let births = [];
  let deaths = [];

  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      let n = neighbors(x, y);

      if (grid[x][y] === 1) {
        if (n === 2 || n === 3) nextGrid[x][y] = 1;
        else {
          nextGrid[x][y] = 0;
          deaths.push({ x, y });
        }
      } else {
        if (n === 3) {
          nextGrid[x][y] = 1;
          births.push({ x, y });
        } else nextGrid[x][y] = 0;
      }
    }
  }

  for (let x = 0; x < cols; x++)
    for (let y = 0; y < rows; y++) grid[x][y] = nextGrid[x][y];

  generation++;
  genCountP.html(generation);

  if (soundEnabled) {
    if (births.length) playSound(900);
    if (deaths.length) playSound(300);
  }
}

function mousePressed() {
  if (mouseX < 0 || mouseY < 0 || mouseX >= width || mouseY >= height) return;

  let gx = Math.floor(mouseX / cellSize);
  let gy = Math.floor(mouseY / cellSize);

  if (mode === "single") {
    grid[gx][gy] = 1;
    if (soundEnabled) playSound(600);
    return;
  }

  if (mode === "glider") {
    placeGlider(gx, gy);
    if (soundEnabled) playSound(900);
    return;
  }

  if (mode === "lwss") placeLWSS(gx, gy);
  if (mode === "mwss") placeMWSS(gx, gy);
  if (mode === "hwss") placeHWSS(gx, gy);
  if (mode === "pulsar") placePulsar(gx, gy);
  if (mode === "pentadecathlon") placePentadecathlon(gx, gy);
  if (mode === "glidergun") placeGliderGun(gx, gy);

  if (mode !== "none" && mode !== "toggle") {
    if (soundEnabled) playSound(600);
    return;
  }

  grid[gx][gy] = grid[gx][gy] ? 0 : 1;
  if (soundEnabled) playSound(600);
}

function placeGlider(x, y) {
  const p = [
    [1, 0],
    [2, 1],
    [0, 2],
    [1, 2],
    [2, 2],
  ];
  placePattern(x, y, p);
}

function placeLWSS(x, y) {
  const p = [
    [1, 0],
    [4, 0],
    [0, 1],
    [0, 2],
    [4, 2],
    [0, 3],
    [1, 3],
    [2, 3],
    [3, 3],
  ];
  placePattern(x, y, p);
}

function placeMWSS(x, y) {
  const p = [
    [1, 0],
    [4, 0],
    [5, 1],
    [0, 2],
    [0, 3],
    [5, 3],
    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],
  ];
  placePattern(x, y, p);
}

function placeHWSS(x, y) {
  const p = [
    [1, 0],
    [4, 0],
    [5, 0],
    [6, 1],
    [0, 2],
    [0, 3],
    [5, 3],
    [6, 3],
    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],
    [5, 4],
  ];
  placePattern(x, y, p);
}

function placePulsar(x, y) {
  const p = [];
  const offsets = [0, -6, 6];

  const pulsarRows = [
    [2, 0],
    [3, 0],
    [4, 0],
    [8, 0],
    [9, 0],
    [10, 0],
    [0, 2],
    [5, 2],
    [7, 2],
    [12, 2],
    [0, 3],
    [5, 3],
    [7, 3],
    [12, 3],
    [0, 4],
    [5, 4],
    [7, 4],
    [12, 4],
    [2, 5],
    [3, 5],
    [4, 5],
    [8, 5],
    [9, 5],
    [10, 5],
  ];

  for (const row of pulsarRows) {
    p.push(row);
    let mirror = [row[1], row[0]];
    p.push(mirror);
  }

  placePattern(x, y, p);
}

function placePentadecathlon(x, y) {
  const p = [
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 0],
    [3, 2],
    [4, 1],
    [5, 0],
    [5, 2],
    [6, 1],
    [7, 1],
    [8, 1],
  ];
  placePattern(x, y, p);
}

function placeGliderGun(x, y) {
  const gun = [
    [0, 4],
    [0, 5],
    [1, 4],
    [1, 5],
    [10, 4],
    [10, 5],
    [10, 6],
    [11, 3],
    [11, 7],
    [12, 2],
    [12, 8],
    [13, 2],
    [13, 8],
    [14, 5],
    [15, 3],
    [15, 7],
    [16, 4],
    [16, 5],
    [16, 6],
    [17, 5],
    [20, 2],
    [20, 3],
    [20, 4],
    [21, 2],
    [21, 3],
    [21, 4],
    [22, 1],
    [22, 5],
    [24, 0],
    [24, 1],
    [24, 5],
    [24, 6],
    [34, 2],
    [34, 3],
    [35, 2],
    [35, 3],
  ];
  placePattern(x, y, gun);
}

function placePattern(x, y, pattern) {
  for (const [dx, dy] of pattern) {
    const gx = x + dx;
    const gy = y + dy;
    if (gx >= 0 && gy >= 0 && gx < cols && gy < rows) grid[gx][gy] = 1;
  }
}

function toggleSound() {
  userStartAudio();
  soundEnabled = !soundEnabled;
  soundStatusSpan.html(soundEnabled ? "Activado" : "Desactivado");
  enableSoundBtn.html(soundEnabled ? "Desactivar sonido" : "Activar sonido");
}

function playSound(freq) {
  if (!osc.started) {
    osc.start();
    osc.amp(0);
  }
  osc.freq(freq);
  env.play(osc);
}

//hola
function toggleRun() {
  running = !running;
  startPauseBtn.html(running ? "Pausar" : "Iniciar");
}

function formatMillis(ms) {
  let s = Math.floor(ms / 1000);
  let m = Math.floor(s / 60);
  s %= 60;
  return `${nf(m, 2)}:${nf(s, 2)}`;
}

function windowResized() {
  calculateGrid();
  resizeCanvas(cols * cellSize, rows * cellSize);
  initGrid();
}
