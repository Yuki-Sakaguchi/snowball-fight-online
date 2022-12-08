const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer);

const loadMap = require('./mapLoader');

const SPEED = 5;
const TICK_RATE = 30;
const SNOWBALL_SPEED = 7;
const PLAYER_SIZE = 32;

const inputMap = {};
let players = [];
let snowballs = [];

/**
 * ループで実行される処理
 * @params {Date} delta
 */
function tick (delta) {
  // プレイヤーのの位置計算
  for (const player of players) {
    const inputs = inputMap[player.id];
    if (inputs.up) {
      player.y -= SPEED;
    } else if (inputs.down) {
      player.y += SPEED;
    }
    if (inputs.left) {
      player.x -= SPEED;
    } else if (inputs.right) {
      player.x += SPEED;
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
  const map2D = await loadMap();

  io.on('connect', (socket) => {
    console.log('socket', socket.id);

    // プレイヤーを追加
    players.push({
      id: socket.id,
      x: 0,
      y: 0,
    });

    // プレイヤーごとの入力の初期値を設定
    inputMap[socket.id] = {
      up: false,
      down: false,
      left: false,
      right: false,
    };

    // マップデータをクライアントに送信
    socket.emit('map', map2D);

    // 入力を受け取ったら更新
    socket.on('inputs', (inputs) => {
      inputMap[socket.id] = inputs; // ユーザーごとの入力を保存
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

  httpServer.listen(5000);

  let lastUpdate = Date.now();
  setInterval(() => {
    const now = Date.now();
    const delta = now - lastUpdate;
    tick(delta);
    lastUpdate = now;
  }, 1000 / TICK_RATE);
}

main();
