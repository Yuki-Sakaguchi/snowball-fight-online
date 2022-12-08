const mapImage = new Image();
mapImage.src = '/snowy-sheet.png';

const canvasEl = document.getElementById('canvas');
canvasEl.width = window.innerWidth;
canvasEl.height = window.innerHeight;
const canvas = canvasEl.getContext('2d');

const socket = io(`ws://localhost:5000`);

const TILE_SIZE = 32; // 動画だと16だったけど画像のサイズ的に合わないので大きめに
const TILES_IN_ROW = 8;
let map = [[]];

socket.on('connect', () => {
  console.log('connected');
});

socket.on('map', (loadedMap) => {
  map = loadedMap;
  console.log(map)
});

function loop () {
  canvas.clearRect(0, 0, canvas.width, canvas.height);

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
        col * (TILE_SIZE / 2), // 画像が大きくて配置するときのサイズ感が合わないので配置のサイズは調整する
        row * (TILE_SIZE / 2),
        TILE_SIZE / 2,
        TILE_SIZE / 2
      );
    }
  }
  window.requestAnimationFrame(loop);
}

window.requestAnimationFrame(loop);
