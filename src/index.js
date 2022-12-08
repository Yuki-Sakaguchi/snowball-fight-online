const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer);

const PORT = process.env.PORT || 5000;

const loadMap = require('./mapLoader');

const SPEED = 5;
const TICK_RATE = 30;
const SNOWBALL_SPEED = 7;
const PLAYER_SIZE = 32;
const TILE_SIZE = 32;

const inputMap = {};

let players = [];
let snowballs = [];
let ground2D;
let decal2D;

/**
 * 当たり判定
 * @see https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection
 */
function isColliding(rect1, rect2) {
  return (
    rect1.x < rect2.x + rect2.w &&
    rect1.x + rect1.w > rect2.x &&
    rect1.y < rect2.y + rect2.h &&
    rect1.h + rect1.y > rect2.y
  );
}

/**
 * キャラクターとマップの当たり判定
 */
function isCollidingWithMap(player) {
  for (let row = 0; row < decal2D.length; row++) {
    for (let col = 0; col < decal2D[0].length; col++) {
      const tile = decal2D[row][col];
      const rect1 = {
        x: player.x,
        y: player.y,
        w: PLAYER_SIZE,
        h: PLAYER_SIZE
      };
      const rect2 = {
        x: col * TILE_SIZE,
        y: row * TILE_SIZE,
        w: TILE_SIZE,
        h: TILE_SIZE,
      };
      if (tile && isColliding(rect1, rect2)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * ループで実行される処理
 * @params {Date} delta
 */
function tick (delta) {
  // プレイヤーのの位置計算
  for (const player of players) {
    const inputs = inputMap[player.id];
    const previousY = player.y;
    const previousX = player.x;

    // 上下
    if (inputs.up) {
      player.y -= SPEED;
    } else if (inputs.down) {
      player.y += SPEED;
    }

    // 当たり判定があれば動かさない
    if (isCollidingWithMap(player)) {
      player.y = previousY;
    }

    // 左右
    if (inputs.left) {
      player.x -= SPEED;
    } else if (inputs.right) {
      player.x += SPEED;
    }

    // 当たり判定があれば動かさない
    if (isCollidingWithMap(player)) {
      player.x = previousX;
    }
  }

  // 雪玉の位置計算
  for (const snowball of snowballs) {
    snowball.x += Math.cos(snowball.angle) * SNOWBALL_SPEED;
    snowball.y += Math.sin(snowball.angle) * SNOWBALL_SPEED;
    snowball.timeLeft -= delta;

    // 当たり判定
    for (const player of players) {
      if (player.id === snowball.playerId) continue; // 自キャラは無視
      const distance = Math.sqrt((player.x + PLAYER_SIZE / 2 - snowball.x)**2 + (player.y + PLAYER_SIZE / 2 - snowball.y)**2);
      if (distance <= PLAYER_SIZE / 2) {
        player.x = 0;
        player.y = 0;
        snowball.timeLeft = -1; // 当たった雪玉も消す
      }
    }
  }
  snowballs = snowballs.filter((snowball) => snowball.timeLeft > 0); // 不要な雪玉を削除

  io.emit('players', players);
  io.emit('snowballs', snowballs);
}

/**
 * メイン処理
 */
async function main () {
  // サーバー起動時にマップを取得
  const map = await loadMap();
  ground2D = map.ground2D;
  decal2D = map.decal2D;

  io.on('connect', (socket) => {
    console.log('socket', socket.id);

    // プレイヤーを追加
    players.push({
      id: socket.id,
      x: 1500,
      y: 1000,
      voiceId: Math.floor(Math.random() * 1000000),
      isMuted: false,
    });

    // プレイヤーごとの入力の初期値を設定
    inputMap[socket.id] = {
      up: false,
      down: false,
      left: false,
      right: false,
    };

    // マップデータをクライアントに送信
    socket.emit('map', {
      ground: ground2D,
      decal: decal2D,
    });

    // 入力を受け取ったら更新
    socket.on('inputs', (inputs) => {
      inputMap[socket.id] = inputs; // ユーザーごとの入力を保存
    });

    // ユーザーのマイクのON/OFFを受信
    socket.on('mute', (isMuted) => {
      const player = players.find((player) => player.id === socket.id);
      player.isMuted = isMuted;
    });

    // ユーザーの音声用のIDを受信
    socket.on('voiceId', (voiceId) => {
      const player = players.find((player) => player.id === socket.id);
      player.voiceId = voiceId;
    });

    // 雪玉を投げるアクションを受信
    socket.on('snowball', (angle) => {
      const player = players.find((player) => player.id === socket.id);
      snowballs.push({
        angle,
        x: player.x,
        y: player.y,
        timeLeft: 1000,
        playerId: socket.id,
      })
    });

    // 接続が切れたときにユーザーを削除
    socket.on('disconnect', () => {
      players = players.filter((player) => player.id !== socket.id);
    });
  });

  app.use(express.static('public'));

  httpServer.listen(PORT);

  let lastUpdate = Date.now();
  setInterval(() => {
    const now = Date.now();
    const delta = now - lastUpdate;
    tick(delta);
    lastUpdate = now;
  }, 1000 / TICK_RATE);
}

main();
