const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const objectiveText = document.getElementById("objectiveText");
const treasureText = document.getElementById("treasureText");
const livesText = document.getElementById("livesText");
const restartButton = document.getElementById("restartButton");

const keys = new Set();

const TILE = 32;
const map = [
  "##############################",
  "#S....#........#.............#",
  "#.###.#.######.#.###########.#",
  "#...#.#......#.#.....#.....#.#",
  "###.#.######.#.#####.#.###.#.#",
  "#...#......#.#.....#.#.#...#.#",
  "#.########.#.#####.#.#.#.###.#",
  "#.#........#.....#.#...#.....#",
  "#.#.############.#.#########.#",
  "#.#......#.......#.......#...#",
  "#.######.#.#############.#.###",
  "#......#.#.......#.......#...#",
  "######.#.#######.#.#########.#",
  "#......#.....#...#.....#.....#",
  "#.#########.#.#######.#.###.#",
  "#.....#.....#.........#...#T#",
  "#####.#.#################.#.#",
  "#.....#...................#.#",
  "#.#########################.#",
  "#...........................#",
  "##############################"
];

const ROWS = map.length;
const COLS = map[0].length;

let player;
let monsters;
let hasTreasure;
let lives;
let gameOver;
let gameWon;
let messageTimer;

const entrance = { x: 1 * TILE + 4, y: 1 * TILE + 4, width: 24, height: 24 };
const treasure = { x: 28 * TILE + 5, y: 15 * TILE + 5, size: 22 };

const monsterStarts = [
  { x: 9 * TILE, y: 1 * TILE, size: 24, dx: 1.6, dy: 0, minX: 8 * TILE, maxX: 14 * TILE, minY: 1 * TILE, maxY: 1 * TILE },
  { x: 17 * TILE, y: 7 * TILE, size: 24, dx: 0, dy: 1.7, minX: 17 * TILE, maxX: 17 * TILE, minY: 3 * TILE, maxY: 9 * TILE },
  { x: 4 * TILE, y: 11 * TILE, size: 24, dx: 1.8, dy: 0, minX: 1 * TILE, maxX: 7 * TILE, minY: 11 * TILE, maxY: 11 * TILE },
  { x: 21 * TILE, y: 13 * TILE, size: 24, dx: 1.5, dy: 0, minX: 19 * TILE, maxX: 25 * TILE, minY: 13 * TILE, maxY: 13 * TILE },
  { x: 14 * TILE, y: 19 * TILE, size: 24, dx: 1.9, dy: 0, minX: 1 * TILE, maxX: 27 * TILE, minY: 19 * TILE, maxY: 19 * TILE }
];

function resetGame() {
  player = {
    x: entrance.x,
    y: entrance.y,
    width: 24,
    height: 28,
    speed: 2.6
  };

  monsters = monsterStarts.map(monster => ({ ...monster }));
  hasTreasure = false;
  lives = 3;
  gameOver = false;
  gameWon = false;
  messageTimer = 100;
  updateHud("Find the treasure.");
}

function updateHud(objective) {
  objectiveText.textContent = objective;
  treasureText.textContent = hasTreasure ? "Collected" : "Not collected";
  livesText.textContent = lives;
}

function getTileAtPixel(x, y) {
  const col = Math.floor(x / TILE);
  const row = Math.floor(y / TILE);

  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return "#";
  return map[row][col];
}

function isWallAtPixel(x, y) {
  return getTileAtPixel(x, y) === "#";
}

function rectHitsWall(rect) {
  return (
    isWallAtPixel(rect.x, rect.y) ||
    isWallAtPixel(rect.x + rect.width, rect.y) ||
    isWallAtPixel(rect.x, rect.y + rect.height) ||
    isWallAtPixel(rect.x + rect.width, rect.y + rect.height)
  );
}

function rectanglesOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function circleRectOverlap(circle, rect) {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy < circle.radius * circle.radius;
}

function movePlayer() {
  if (gameOver || gameWon) return;

  let dx = 0;
  let dy = 0;

  if (keys.has("arrowup") || keys.has("w")) dy -= player.speed;
  if (keys.has("arrowdown") || keys.has("s")) dy += player.speed;
  if (keys.has("arrowleft") || keys.has("a")) dx -= player.speed;
  if (keys.has("arrowright") || keys.has("d")) dx += player.speed;

  const nextX = { x: player.x + dx, y: player.y, width: player.width, height: player.height };
  if (!rectHitsWall(nextX)) player.x += dx;

  const nextY = { x: player.x, y: player.y + dy, width: player.width, height: player.height };
  if (!rectHitsWall(nextY)) player.y += dy;
}

function moveMonsters() {
  if (gameOver || gameWon) return;

  for (const monster of monsters) {
    monster.x += monster.dx;
    monster.y += monster.dy;

    if (monster.x < monster.minX || monster.x > monster.maxX) monster.dx *= -1;
    if (monster.y < monster.minY || monster.y > monster.maxY) monster.dy *= -1;
  }
}

function loseLife() {
  lives--;

  if (lives <= 0) {
    gameOver = true;
    updateHud("Game over.");
    return;
  }

  player.x = entrance.x;
  player.y = entrance.y;
  monsters = monsterStarts.map(monster => ({ ...monster }));
  updateHud(hasTreasure ? "You dropped nothing. Return to the entrance!" : "Careful! Find the treasure.");
  messageTimer = 80;
}

function checkGameState() {
  if (gameOver || gameWon) return;

  const playerRect = { x: player.x, y: player.y, width: player.width, height: player.height };

  for (const monster of monsters) {
    const monsterCircle = {
      x: monster.x + monster.size / 2,
      y: monster.y + monster.size / 2,
      radius: monster.size / 2
    };

    if (circleRectOverlap(monsterCircle, playerRect)) {
      loseLife();
      return;
    }
  }

  if (!hasTreasure) {
    const treasureCircle = {
      x: treasure.x + treasure.size / 2,
      y: treasure.y + treasure.size / 2,
      radius: treasure.size / 2
    };

    if (circleRectOverlap(treasureCircle, playerRect)) {
      hasTreasure = true;
      updateHud("Treasure collected! Return to the entrance.");
      messageTimer = 120;
    }
  }

  if (hasTreasure && rectanglesOverlap(playerRect, entrance)) {
    gameWon = true;
    updateHud("You escaped the cave with the treasure!");
  }
}

function drawBackground() {
  ctx.fillStyle = "#100c0a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawMap() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const tile = map[row][col];
      const x = col * TILE;
      const y = row * TILE;

      if (tile === "#") {
        ctx.fillStyle = "#4b3528";
        ctx.fillRect(x, y, TILE, TILE);

        ctx.fillStyle = "#6b4b35";
        ctx.fillRect(x, y, TILE, 6);
        ctx.fillRect(x, y, 6, TILE);

        ctx.fillStyle = "#241912";
        ctx.fillRect(x, y + TILE - 6, TILE, 6);
        ctx.fillRect(x + TILE - 6, y, 6, TILE);

        ctx.fillStyle = "#342419";
        ctx.fillRect(x + 11, y + 12, 6, 6);
      } else {
        ctx.fillStyle = (row + col) % 2 === 0 ? "#18120f" : "#1d1510";
        ctx.fillRect(x, y, TILE, TILE);

        ctx.fillStyle = "#2b211a";
        ctx.fillRect(x + 6, y + 7, 4, 4);
        ctx.fillRect(x + 22, y + 20, 5, 5);
      }
    }
  }
}

function drawEntrance() {
  ctx.fillStyle = hasTreasure ? "#fff1a6" : "#42526c";
  ctx.fillRect(entrance.x - 4, entrance.y - 4, 32, 36);

  ctx.fillStyle = hasTreasure ? "#facc15" : "#1f2937";
  ctx.fillRect(entrance.x + 4, entrance.y + 4, 16, 24);

  ctx.fillStyle = "#f8e7b6";
  ctx.font = "16px Courier New";
  ctx.textAlign = "left";
  ctx.fillText("EXIT", entrance.x + 35, entrance.y + 20);
}

function drawTreasure() {
  if (hasTreasure) return;

  ctx.fillStyle = "#7b3f18";
  ctx.fillRect(treasure.x, treasure.y + 12, treasure.size, treasure.size - 6);

  ctx.fillStyle = "#ffd76a";
  ctx.fillRect(treasure.x + 2, treasure.y + 7, treasure.size - 4, 10);
  ctx.fillRect(treasure.x + 7, treasure.y, treasure.size - 14, 9);

  ctx.fillStyle = "#fff1a6";
  ctx.fillRect(treasure.x + 5, treasure.y + 18, 5, 5);
  ctx.fillRect(treasure.x + 14, treasure.y + 18, 5, 5);

  ctx.strokeStyle = "#20130a";
  ctx.lineWidth = 2;
  ctx.strokeRect(treasure.x, treasure.y + 7, treasure.size, treasure.size - 1);
}

function drawPlayer() {
  const x = Math.round(player.x);
  const y = Math.round(player.y);

  ctx.fillStyle = "rgba(255, 215, 106, 0.14)";
  ctx.fillRect(x - 22, y - 20, 70, 70);

  ctx.fillStyle = "#d79a68";
  ctx.fillRect(x + 7, y, 11, 11);

  ctx.fillStyle = "#2a1710";
  ctx.fillRect(x + 7, y, 11, 4);

  ctx.fillStyle = "#3e8cc7";
  ctx.fillRect(x + 5, y + 11, 15, 14);

  ctx.fillStyle = "#d79a68";
  ctx.fillRect(x + 1, y + 13, 4, 10);
  ctx.fillRect(x + 20, y + 13, 4, 10);

  ctx.fillStyle = "#24324e";
  ctx.fillRect(x + 6, y + 25, 6, 7);
  ctx.fillRect(x + 15, y + 25, 6, 7);
}

function drawMonsters() {
  for (const monster of monsters) {
    const x = Math.round(monster.x);
    const y = Math.round(monster.y);
    const s = monster.size;

    ctx.fillStyle = "#7b2630";
    ctx.fillRect(x, y + 6, s, s - 6);
    ctx.fillRect(x + 5, y, s - 10, 8);

    ctx.fillStyle = "#a83a46";
    ctx.fillRect(x + 4, y + 10, s - 8, s - 14);

    ctx.fillStyle = "#fff3f3";
    ctx.fillRect(x + 6, y + 12, 5, 5);
    ctx.fillRect(x + s - 11, y + 12, 5, 5);

    ctx.fillStyle = "#111";
    ctx.fillRect(x + 8, y + 14, 2, 2);
    ctx.fillRect(x + s - 9, y + 14, 2, 2);

    ctx.fillRect(x + 8, y + 22, s - 16, 3);
  }
}

function drawPathHint() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(270, 10, 420, 54);

  ctx.fillStyle = "#f8e7b6";
  ctx.font = "15px Courier New";
  ctx.textAlign = "center";

  if (hasTreasure) {
    ctx.fillText("Treasure collected: return to the START entrance!", 480, 42);
  } else {
    ctx.fillText("Two cave paths lead to the treasure chamber.", 480, 42);
  }
}

function drawMessage() {
  if (messageTimer > 0 && !gameOver && !gameWon) {
    messageTimer--;
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(230, 260, 500, 90);

    ctx.fillStyle = "#ffd76a";
    ctx.font = "24px Courier New";
    ctx.textAlign = "center";
    ctx.fillText(hasTreasure ? "Now go back to the beginning!" : "Explore the cave. Choose a path.", 480, 313);
  }

  if (!gameOver && !gameWon) return;

  ctx.fillStyle = "rgba(0, 0, 0, 0.82)";
  ctx.fillRect(170, 225, 620, 170);

  ctx.textAlign = "center";
  ctx.font = "34px Courier New";
  ctx.fillStyle = gameWon ? "#ffd76a" : "#ff9a9a";
  ctx.fillText(gameWon ? "YOU ESCAPED!" : "GAME OVER", 480, 280);

  ctx.font = "19px Courier New";
  ctx.fillStyle = "#f8e7b6";
  ctx.fillText(
    gameWon ? "You returned to the entrance with the treasure." : "The cave monsters caught you.",
    480,
    320
  );
  ctx.fillText("Press Restart Game to play again.", 480, 356);
}

function gameLoop() {
  movePlayer();
  moveMonsters();
  checkGameState();

  drawBackground();
  drawMap();
  drawEntrance();
  drawTreasure();
  drawMonsters();
  drawPlayer();
  drawPathHint();
  drawMessage();

  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
    event.preventDefault();
    keys.add(key);
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

restartButton.addEventListener("click", resetGame);

resetGame();
gameLoop();
