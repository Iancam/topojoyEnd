// utils.js;
const tilenum_to_lonlat = function (x, y, zoom) {
  const n_tiles = Math.pow(2, zoom);
  const lon_rad = ((x / n_tiles) * 2 - 1) * Math.PI;
  const merc_lat = (1 - (y / n_tiles) * 2) * Math.PI;
  const lat_rad = Math.atan(Math.sinh(merc_lat));

  return { lon: (lon_rad * 180) / Math.PI, lat: (lat_rad * 180) / Math.PI };
};
lon2tile = (lon, zoom) => Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
lat2tile = (lat, zoom) =>
  Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
      Math.pow(2, zoom)
  );

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
  return [x, y, z];
}

const earthCircumference = 40075016.686;
const pixDist = (latitude, zoomlevel) =>
  (earthCircumference * cos(latitude)) / Math.pow(2, zoomlevel + 8);

function shortestAngle(start, end) {
  return ((((end - start) % 360) + 540) % 360) - 180;
}
function lerpAngle(start, end, ratio) {
  return start + ((shortestAngle(start, end) * ratio) % 360);
}
const scaledH = (topo) => (height) => (height - topo.min) / topo.magnitude;

function times(num, func) {
  let ret = [];
  for (let i = 0; i < num; i++) {
    ret.push(func(i));
  }
  return ret;
}

function dotProd(v1, v2) {
  let ret = 0;
  for (let i = 0; i < v1.length; i++) {
    ret += v1[i] * v2[i];
  }
  return ret;
}

function magnitude(v) {
  let ret = 0;
  for (let i = 0; i < v.length; i++) {
    ret += v[i] * v[i];
  }
  return Math.sqrt(ret);
}

function getAngle(v1, v2) {
  return (Math.atan2(v2[1] - v1[1], v2[0] - v1[0]) * 180) / Math.PI;
}

function windowForEach(array, windowSize, callback, step = 1) {
  let ret = [];
  for (let i = windowSize; i <= array.length; i += step) {
    ret.push(callback(array.slice(i - windowSize, i)));
  }
  return ret;
}

function aline(x, y, length, angle) {
  line(x, y, x + length * cos(angle), y + length * sin(angle));
}

const vert = (angle) => Math.min(...[90, -90].map((v) => Math.abs(angle - v)));
