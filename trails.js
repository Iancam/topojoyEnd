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
const featuresToScreenCoords =
  (zoom, box) =>
  ({ properties, geometry: { coordinates } }) => {
    const imageCoords = coordinates
      .map((coord) => pointToTileFraction(...coord, zoom))
      .filter(([x, y]) => {
        const inBounds =
          x < box[2] + 1 && y < box[3] + 1 && x > box[0] && y > box[1];
        // if (inBounds) console.log(x, y, ...box);
        return inBounds;
      })
      .map(([x, y]) => [
        Math.floor(256 * (x - box[0])),
        Math.floor(256 * (y - box[1])),
      ]);
    const coords = _.uniqBy(imageCoords, JSON.stringify);

    return { name: properties.name, coords };
  };

// #### edit here to only include certain features ####
const isNamedTrail = ({ properties }) =>
  properties.type === "Trail" &&
  properties.surface === "dirt" &&
  properties.name !== "";

const exclude = [
  "Cut-Off",
  "Twin Peak",
  "Cutoff",
  "Lake Fork",
  "Powderhorn",
  "East Mineral Creek",
  "Halfmoon",
  "San Luis",
  "Plateau",
  "Whee",
  "Machin",
  "Wason",
];
const excludeList = ({ properties: name }) =>
  !exclude.some((drop) => name.includes(drop));

const screenCoordListToObj = (obj, { name, coords }) => {
  obj[name] = obj[name] ? [...obj[name], ...coords] : coords;
  return obj;
};

async function getTrails(shapefilePath, { box, zoom }) {
  const shp = new ShpToGeoJson({
    remotePath: shapefilePath,
  });
  await shp.load();
  let geoJSON = shp.getGeoJson();

  const trails = geoJSON.features
    .filter(isNamedTrail)
    .filter(excludeList)
    .map(featuresToScreenCoords(zoom, box))
    .filter(({ coords }) => coords.length > 0)
    .reduce(screenCoordListToObj, {});

  return trails;
}
