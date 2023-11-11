let cnv;
let maze, child, parent;

function Child() {
   this.cell = maze.initCell;

   this.draw = () => {
      circle(this.cell.pos.x, this.cell.pos.y, 5);
   }
}


function Parent() {
   this.cell = maze.endCell;
   this.prevCell = this.cell;
   this.subStepsForOneMove = 10;
   this.subSteps = this.subStepsForOneMove;

   this.tryMove = (side) => {
      let tryCell = this.cell.connected[side];

      if (tryCell !== 0 && this.subSteps === this.subStepsForOneMove) {
         this.prevCell = this.cell;
         this.cell = tryCell;
         this.subSteps = 0;
         stepCount++;
      }
   }

   this.draw = () => {
      let amt = this.subSteps / this.subStepsForOneMove;
      let lerpPoint = this.cell.pos;
      if (amt < 1) {
         lerpPoint = lerpPos(this.prevCell.pos, this.cell.pos, amt);
         this.subSteps++;
      }

      circle(lerpPoint.x, lerpPoint.y, 10);
   }
}

function lerpPos(p1, p2, amt) {
   return {
      x: lerp(p1.x, p2.x, amt),
      y: lerp(p1.y, p2.y, amt),
   }
}

function Maze(cellSize, pixelSize) {
   this.cellSize = cellSize;
   this.pixelSize = pixelSize;
   this.cellPixelSize = pixelSize / cellSize;
   this.cells = [];
   this.path = [];
   this.initCell = undefined;
   this.endCell = undefined;
   this.way = [];
   this.pathVisibleAmt = 0;
   this.pathShown = false;

   this.getCell = (...args) => {
      if (args.length === 1) {
         let pos = args[0];
         return this.cells[pos.x][pos.y];
      }
      else {
         let x = args[0];
         let y = args[1];
         return this.cells[x][y];
      }
   }

   this.fill = () => {
      for (let i = 0; i < this.cellSize; i++) {
         this.cells.push([]);
         for (let j = 0; j < this.cellSize; j++) {
            this.cells[i].push(new Cell(i, j));
         }
      }
   }

   this.draw = () => {
      let duration = 36;
      let difference = 4;
      for (let i = 0; i < this.cellSize; i++) {
         for (let j = 0; j < this.cellSize; j++) {
            let c = this.getCell(i, j);
            if (frameCount > duration) {
               c.draw();
               continue;
            }
            let dist = c.gridDistTo(this.initCell);
            let ff = map(frameCount, 0, duration, 0, difference);
            let f = map(
               dist / frameCount,
               0, this.cellSize * 1.41 / 2 / frameCount,
               ff, -difference + 1, true);
            let amt = constrain(f + ff, 0, 1);
            if (amt > 0) c.draw(amt);
         }
      }
   }

   this.drawPath = () => {
      let path = this.way;
      let lenToDraw = path.length;
      if (this.pathVisibleAmt < 1) lenToDraw = path.length * this.pathVisibleAmt;
      let smoothEndLen = 5;
      let actualSmoothLen = map(lenToDraw,
         path.length - smoothEndLen, path.length,
         smoothEndLen, 0, true);
      for (let i = 0; i < floor(lenToDraw - 1); i += 0.47) {

         let n = noise(i);
         let a = map(n, 0, 1, 0, TWO_PI);
         let sinA = sin(a);
         let cosA = cos(a);
         let r = map(i, lenToDraw - actualSmoothLen, lenToDraw, this.cellPixelSize / 6, 1, true);

         //console.log(lenToDraw, i)
         let cellPos = path[floor(i)].pos;
         let cellNextPos = path[floor(i + 1)].pos;
         let lerpPoint = lerpPos(cellPos, cellNextPos, fract(i));
         drawFlower(lerpPoint.x + sinA * 2, lerpPoint.y + cosA * 2, r);
      }
      // push();
      // noFill();
      // beginShape();
      // let start = path[0].pos;
      // curveVertex(start.x, start.y);
      // curveTightness(0.25);
      // for (let i = 0; i < lenToDraw - 1; i++) {
      //    let cellPos = path[i].pos;
      //    curveVertex(cellPos.x, cellPos.y);
      // }
      // let anchorIndex = lenToDraw === path.length ? lenToDraw - 1 : lenToDraw
      // let end = path.at(lenToDraw - 1).pos;
      // let endAnchor = path.at(anchorIndex).pos;
      // curveVertex(end.x, end.y);
      // curveVertex(endAnchor.x, endAnchor.y);
      // endShape();
      // pop();
      this.pathVisibleAmt += 0.01;
   }

   this.getValidNears = (cell, checkVisited = true) => {
      let x = cell.gridPos.x;
      let y = cell.gridPos.y;
      let around = [
         {side: 0, x: x - 1, y: y, do: [0, 2]},
         {side: 1, x: x, y: y + 1, do: [1, 3]},
         {side: 2, x: x + 1, y: y, do: [2, 0]},
         {side: 3, x: x, y: y - 1, do: [3, 1]}
      ];
      let valid = [];

      for (let l = 0; l < 4; l++) {
         if (around[l].x > -1 &&
             around[l].x < this.cellSize &&
             around[l].y > -1 &&
             around[l].y < this.cellSize) {
            if (checkVisited && this.getCell(around[l]).visited) continue;
            valid.push({...around[l], cell: this.getCell(around[l])});
         }
      }
      return valid;
   }

   this.generate = () => {
      let x = floor(this.cellSize / 2);
      let y = floor(this.cellSize / 2);
      this.initCell = this.getCell(x, y);
      let cell = this.initCell;
      this.path = [cell];
      cell.visited = true;
      let visitedAmt = 1;
      let totalCells = this.cellSize * this.cellSize;
      while (visitedAmt < totalCells) {
         let around = this.getValidNears(cell);

         if (around.length) {
            let nextPos = around[floor(random() * around.length)];
            let nextCell = nextPos.cell;

            cell.connected[nextPos.do[0]] = nextCell;
            nextCell.connected[nextPos.do[1]] = cell;

            visitedAmt++;
            cell = nextCell;
            cell.visited = true;
            this.path.push(cell);
            let straightDist = Math.hypot(
               cell.gridPos.x - this.initCell.gridPos.x,
               cell.gridPos.y - this.initCell.gridPos.x);
            if (this.path.length > this.way.length * straightDist / 2) {
               this.way = [...this.path];
               this.endCell = cell;
            }
         }
         else {
            this.path.pop();
            cell = this.path.at(-1);
         }
      }
      this.way.reverse();
   }
}


let globalCellID = 0;

function drawFlower(x, y, r) {
   push()
   let hr = r * 0.75;
   noStroke();
   fill(0, 150, 0);
   circle(x, y, r * 1.5);
   fill(250, 200, 250);
   circle(x + hr, y, r);
   circle(x - hr, y, r);
   circle(x, y + hr, r);
   circle(x, y - hr, r);
   pop()
}

function bubbleWall(p1, p2, thick = 5) {
   let amt = 0;
   let den = 4;
   let scale = 0.0001;
   let time = frameCount / 10;
   for (let i = 1; i < den - 1; i++) {
      amt = constrain(i / den, 0, 1);
      let pos = lerpPos(p1, p2, amt);

      let n = noise(pos.x * scale, pos.y * scale);
      let n2 = noise(time + pos.x * scale, pos.y * scale);
      let r = map(n, 0, 1, thick * 0.75, thick);
      let r2 = map(n2, 0, 1, 0, TWO_PI);
      let c = cos(r2);
      let s = sin(r2);

      stroke(0, 150, 0);
      strokeWeight(r);
      circle(pos.x + s, pos.y + c, 1);
   }
}

function Cell(x, y) {
   this.ID = globalCellID++;
   this.gridPos = {x: x, y: y};
   //координаты необходимо инвертировать, хз почему
   this.pos = {
      y: maze.cellPixelSize * (x + 0.5),
      x: maze.cellPixelSize * (y + 0.5)
   }
   this.connected = [0, 0, 0, 0];
   this.visited = false;

   this.draw = (amt = 1) => {
      push();
      let size = maze.cellPixelSize;
      let halfSize = size / 2;
      stroke(0, 170, 0);
      strokeWeight(size / 2);
      strokeCap(ROUND);
      noFill();
      translate(this.pos.x, this.pos.y);
      for (let i = 0; i < this.connected.length; i++) {
         if (this.connected[i] === 0) {
            if (this.gridPos.x === 0 || this.gridPos.y === 0 || i === 1 || i === 2) {
               let x1 = -halfSize;
               let x2 = x1 + halfSize * amt * 2;
               line(x1, -halfSize, x2, -halfSize);
            }
         }
         rotate(HALF_PI);
      }
      pop();
   }
   this.gridDistTo = (c) => {
      return Math.hypot(this.gridPos.x - c.gridPos.x, this.gridPos.y - c.gridPos.y)
   }
}

function play() {
   frameRate(20);
   frameCount = 0;
   globalCellID = 0;
   stepCount = 0;
   gameStart = true;

   maze = new Maze(15, 600);

   console.log(maze)

   maze.fill();
   maze.generate();

   parent = new Parent();
   child = new Child();

   resizeCanvas(maze.pixelSize,maze.pixelSize, false);
   updateScene();
}

function restart() {
   parent = new Parent();
   stepCount = 0;
}

function setup() {
   //randomSeed(10000);
   cnv = createCanvas(0, 0).id("maze");
}

function updateScene() {
   background(0, 100, 30);
   maze.draw();
   if (maze.pathShown) maze.drawPath();
   parent.draw();
   child.draw();
}

function draw() {
   if (!gameStart) return;
   updateScene();
   if (gameOver && maze.pathVisibleAmt >= 1.1) frameRate(0);
}

let gameStart = false;
let gameOver = false;
let stepCount = 0;

function keyPressed() {
   if (frameRate() === 0) return;
   if (keyCode === 83) { //S
      gameOver = false;
      play();
   }
   if (keyCode === 88) { //X
      gameOver = true;
      maze.pathShown = true;
   }
   if (!gameOver) {
      if (keyCode === 82) { //R
         restart();
      }
      if (keyCode === UP_ARROW) {
         parent.tryMove(0);
      }
      if (keyCode === RIGHT_ARROW) {
         parent.tryMove(1);
      }
      if (keyCode === DOWN_ARROW) {
         parent.tryMove(2);
      }
      if (keyCode === LEFT_ARROW) {
         parent.tryMove(3);
      }
   }
   console.log(keyCode);
}