p5.disableFriendlyErrors = true;

const MAP_NAME = "snowMesa";
const TRAILS_SHP_FILE = "COTrails/Trails_COTREX02192019-wgs84.shp";
async function setup() {
  // Load the output of the topojoy tool
  // https://github.com/Iancam/topojoy
  const response = await fetch(MAP_NAME + "Bounds.json");
  const bounds = await response.json();
  const {
    box: [x0, y0, x1, y1],
    width,
    height,
    zoom,
  } = bounds;
  const { topo, canvas } = await processImage(
    MAP_NAME + ".png",
    [x0, y0],
    zoom
  );
  createCanvas(canvas.width, canvas.height);
  const curveCount = 2 * (3 / 6) * 100000;

  const genCurve = () =>
    makeCurve(
      floor(random(0, topo.width - 1)),
      floor(random(0, topo.height - 1)),
      random(8, 12),
      8,
      topo,
      {
        angleTransform: random([(aspect) => aspect + 180, (aspect) => aspect]),
      }
    );
  const renderCurve = (c) => {
    const col = color(colorAt(c[0], topo));
    col.setAlpha(128);
    stroke(col);
    drawCurve(c, 1.8);
  };
  background(p.darkness);

  const ts = 16 * 1.5;
  textSize(ts);
  textFont("Courier");
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

  // times(0.2 * curveCount, genCurve).forEach(renderCurve);
  // textsLayer(topo);
  // mountainLayer(dims.bounds);
  // times(0.4 * curveCount, genCurve).forEach(renderCurve);
  // trails comes from trailsData.js
  const trails = await getTrails(TRAILS_SHP_FILE, bounds);
  trailsLayer(topo, trails, exclude);
  // times(0.4 * curveCount, genCurve).forEach(renderCurve);
}

/**
 * Creates a curve that meanders through the terrain, with control over aspect, slope, and height of the curve.
 * @param {number} x x-coordinate of the starting point
 * @param {number} y y-coordinate of the starting point
 * @param {number} length The length of the curve in steps
 * @param {number} step_length The length of each step of the curve
 * @param {object} topo The terrain object
 * @param {object} options An object with an optional `angleTransform` method.
 *  `angleTransform` takes the current aspect of the curve, and an array of [height, slope, aspect1],
 *  and returns the new aspect of the curve.
 *  The `angleTransform` method is called with the current aspect of the curve as the first argument,
 *  and the array of [height, slope, aspect1] as the second argument.
 *  The `angleTransform` method is expected to return the new aspect of the curve.
 * @returns {Array<Array<number>>} The curve as an array of [x, y, aspect] points.
 */
function makeCurve(
  x,
  y,
  length,
  step_length,
  topo,
  options = { angleTransform: (a) => a }
) {
  let curvePoints = [[x, y, topo.pixels[y][x][2]]];
  let last = (array) => array[array.length - 1];
  for (let i = 0; i < length; i++) {
    const [height, slope, aspect1] = topo.pixels[y]?.[x] || [
      undefined,
      undefined,
      undefined,
    ];
    const [, , lastAspect] = last(curvePoints);
    const heightScalar = 1; //- scaledH(topo)(height);
    const aspect = radians(
      lerpAngle(
        lastAspect,
        options.angleTransform(aspect1, [height, slope, aspect1]),
        0.7
      )
    );
    if (!aspect1) {
      break;
    }
    const x_step = heightScalar * step_length * cos(aspect);
    const y_step = heightScalar * step_length * sin(aspect);
    x = floor(x + x_step);
    y = floor(y + y_step);
    curvePoints.push([x, y, degrees(aspect)]);
  }
  return curvePoints;
}

function drawCurve(curve, weight) {
  noFill();
  strokeWeight(weight);
  beginShape();
  curve.forEach(([x, y]) => curveVertex(x, y));
  endShape();
}

/**
 * Process an image from a url. This function is used to pre-process each of the
 * map tiles that make up the map. The image is processed into a 3d array, where
 * each pixel is an array of [height, slope, aspect] as inferred from the image.
 * The image is also drawn onto a canvas element, which is returned as part of
 * the object.
 *
 * @param {String} url the url to download the image from
 * @param {Array} [tileX, tileY] the x and y coordinates of the tile in the
 *     mercator projection
 * @param {Number} zoom the zoom level of the tile
 * @returns {Promise<Object>} an object with two properties. The first is `topo`,
 *     a 3d array representing the height, slope, and aspect of each pixel in the
 *     image. The second is `canvas`, a canvas element that the image has been
 *     drawn onto.
 */
async function processImage(url, [tileX, tileY], zoom) {
  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.src = url;

    image.onload = (ev) => {
      // document.getElementById("sketchy").appendChild(image);
      resolve(image);
    };
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);
  const pixels = ctx.getImageData(0, 0, img.width, img.height);
  const { lat } = tilenum_to_lonlat(tileX, tileY, zoom);
  const topo = processPixels(pixels, getMetersPerPixelAtLatitude(lat, 14));
  return { topo, canvas };
}
