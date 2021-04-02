const fs = require("fs");
const _ = require("lodash");
const { promisify } = require("util");

promisify(fs.readFile)("swoosh/cotrails.json")
  .then((source) => JSON.parse(source))
  .then(async (res) => {
    const { box: bounds } = JSON.parse(
      await promisify(fs.readFile)("swoosh/snowMesaBounds.json")
    );

    const trails = [];
    const l = res.features.length;
    for (let i = 0; i < l; i++) {
      const {
        properties,
        geometry: { coordinates },
      } = res.features[i];
      const isNamedTrail =
        properties.type === "Trail" &&
        properties.surface === "dirt" &&
        properties.name !== "";
      if (!isNamedTrail) continue;
      const lats = coordinates
        .map((coord) => pointToTileFraction(...coord, 14))
        .filter(
          ([x, y]) =>
            x < bounds[2] + 1 &&
            y < bounds[3] + 1 &&
            x > bounds[0] &&
            y > bounds[1]
        )
        .map(([x, y]) => [
          Math.floor(256 * (x - bounds[0])),
          Math.floor(256 * (y - bounds[1])),
        ]);
      const coords = _.uniqBy(lats, JSON.stringify);
      coords.length && trails.push({ coords, name: properties.name });
    }
    trailObj = trails.reduce((obj, { name, coords }) => {
      obj[name] = obj[name] ? [...obj[name], ...coords] : coords;
      return obj;
    }, {});
    fs.writeFileSync(
      "swoosh/trailsData.js",
      "const trails = " + JSON.stringify(trailObj)
    );
  })
  .catch((err) => {
    console.error(err);
    return console.trace();
  });

function pointToTileFraction(lon, lat, z) {
  var d2r = Math.PI / 180,
    r2d = 180 / Math.PI;
  var sin = Math.sin(lat * d2r),
    z2 = Math.pow(2, z),
    x = z2 * (lon / 360 + 0.5),
    y = z2 * (0.5 - (0.25 * Math.log((1 + sin) / (1 - sin))) / Math.PI);

  // Wrap Tile X
  x = x % z2;
  if (x < 0) x = x + z2;
  return [x, y];
}

// console.log(mapped);
// const cdtPoints = cdt.features[0].geometry.paths[0];
// const sampled = cdtPoints.filter((pt, i) => i % 20 == 0);
// fs.writeFileSync("sampledcdt.json", JSON.stringify(sampled));
