const mapImage = new Image();
mapImage.src = '/snowy-sheet.png';

const santaImage = new Image();
santaImage.src = '/santa.png';

const canvasEl = document.getElementById('canvas');
canvasEl.width = window.innerWidth;
canvasEl.height = window.innerHeight;
const canvas = canvasEl.getContext('2d');

const socket = io(`ws://localhost:5000`);

const TILE_SIZE = 32; // 動画だと16だったけど画像のサイズ的に合わないので大きめに
const TILES_IN_ROW = 8;
const SNOWBALL_SIZE = 5;

let myId = null;
let map = [[]];
let players = [];
let snowballs = [];

// socket接続成功
socket.on('connect', () => {
  console.log('connected');
  myId = socket.id;
  console.log(myId);
});

// サーバーからmapデータを受信
socket.on('map', (loadedMap) => {
  map = loadedMap;
});

// サーバーからプレイヤー情報を受信
socket.on('players', (serverPlayers) => {
  players = serverPlayers; 
});

// サーバーから雪玉情報を受信
socket.on('snowballs', (serverSnowballs) => {
  snowballs = serverSnowballs; 
});

const inputs = {
  up: false,
  down: false,
  left: false,
  right: false,
};

window.addEventListener('keydown', (e) => {
  if (e.key === 'w') {
    inputs['up'] = true;
  } else if (e.key === 's') {
    inputs['down'] = true;
  } else if (e.key === 'a') {
    inputs['left'] = true;
  } else if (e.key === 'd') {
    inputs['right'] = true;
  }
  socket.emit('inputs', inputs);
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'w') {
    inputs['up'] = false;
  } else if (e.key === 's') {
    inputs['down'] = false;
  } else if (e.key === 'a') {
    inputs['left'] = false;
  } else if (e.key === 'd') {
    inputs['right'] = false;
  }
  socket.emit('inputs', inputs);
});

window.addEventListener('click', (e) => {
  const angle = Math.atan2(e.clientY - canvasEl.height / 2, e.clientX - canvasEl.width / 2);
  socket.emit('snowball', angle);
});

function loop () {
  canvas.clearRect(0, 0, canvasEl.width, canvasEl.height);

  // 自キャラを取得
  const myPlayer = players.find((player) => player.id === socket.id);

  // 自キャラが入ればカメラの位置を自キャラが真ん中に来るように調整する
  let cameraX = 0;
  let cameraY = 0;
  if (myPlayer) {
    cameraX = parseInt(myPlayer.x - canvasEl.width / 2);
    cameraY = parseInt(myPlayer.y - canvasEl.height / 2);
  }

  // マップを描画
  for (let row = 0; row < map.length; row++) {
    for (let col = 0; col < map[0].length; col++) {
      const { id } = map[row][col];
      const imageRow = parseInt(id / TILES_IN_ROW);
      const imageCol = id % TILES_IN_ROW;
      // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
      canvas.drawImage(
        mapImage,
        imageCol * TILE_SIZE,
        imageRow * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
        col * TILE_SIZE - cameraX,
        row * TILE_SIZE - cameraY,
        TILE_SIZE,
        TILE_SIZE
      );
    }
  }

  // キャラクターを描画
  for (const player of players) {
    canvas.drawImage(santaImage, player.x - cameraX, player.y - cameraY);
  }

  // 雪玉描画
  for (const snowball of snowballs) {
    canvas.fillStyle = '#fff';
    canvas.beginPath();
    canvas.arc(snowball.x - cameraX, snowball.y - cameraY, SNOWBALL_SIZE, 0, 2 * Math.PI);
    canvas.fill();
  }

  window.requestAnimationFrame(loop);
}

window.requestAnimationFrame(loop);

