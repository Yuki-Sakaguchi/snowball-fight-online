const tmx = require('tmx-parser');

async function loadMap () {
  const map = await new Promise((resolve, _) => {
    tmx.parseFile("./src/map.tmx", (err, loadedMap) => {
      if (err) throw err;
      resolve(loadedMap);
    });
  })

  const groundTiles = map.layers[0].tiles; 
  const decalTiles = map.layers[1].tiles;
  const ground2D = [];
  const decal2D = [];
  for (let row = 0; row < map.height; row++) {
    const groundRow = [];
    const decalRow = [];
    for (let col = 0; col < map.width; col++) {
      const groundTile = groundTiles[row * map.height + col];
      groundRow.push({ id: groundTile.id, gid: groundTile.gid });

      const decalTile = decalTiles[row * map.height + col];
      if (decalTile) {
        decalRow.push({ id: decalTile.id, gid: decalTile.gid });
      } else {
        decalRow.push(undefined);
      }
    }
    ground2D.push(groundRow);
    decal2D.push(decalRow);
  }
  return { ground2D, decal2D };
}

module.exports = loadMap;
