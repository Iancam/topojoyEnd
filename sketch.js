p5.disableFriendlyErrors = true;

async function setup() {
  const { topo, canvas } = await processImage("leviathan.png");
  const dims = { bounds: [3314, 6317, 3331, 6327], width: 18, height: 11 };
  createCanvas(canvas.width, canvas.height);
  const curveCount = 2 * (3 / 6) * 100000;

  const genCurve = (v) =>
    makeCurve(
      floor(random(0, topo.width - 1)),
      floor(random(0, topo.height - 1)),
      random(8, 12),
      8,
      topo,
      {
        angleTransform: random([(a) => a + 180, (a) => a]),
      }
    );
  const renderCurve = (c) => {
    const col = color(colorAt(c[0], topo));
    col.setAlpha(128);
    stroke(col);
    drawCurve(c, 1.8);
  };
  background(p.darkness);

  // times(0.2 * curveCount, genCurve).forEach(renderCurve);
  textsLayer(topo);
  // mountainLayer(dims.bounds);
  // times(0.4 * curveCount, genCurve).forEach(renderCurve);
  // trailsLayer(topo);
  // times(0.4 * curveCount, genCurve).forEach(renderCurve);
}

function getPoints(bounds) {
  const [x0, y0] = bounds;
  return locs.map((val) => {
    const { lat, long } = val;
    let [x, y] = pointToTileFraction(lat, long, 14);
    [x, y] = [x - x0, y - y0].map((v) => Math.floor(v * 256));
    return { ...val, x, y };
  });
}

function makeCurve(
  x,
  y,
  length,
  step_length,
  topo,
  options = { angleTransform: (a) => a }
) {
  let ret = [[x, y, topo.pixels[y][x][2]]];
  let last = (array) => array[array.length - 1];
  for (let i = 0; i < length; i++) {
    const [h, s, a] = topo.pixels[y]?.[x] || [undefined, undefined, undefined];
    const [, , lastAspect] = last(ret);
    const heightScalar = 1; //- scaledH(topo)(h);
    const aspect = radians(
      lerpAngle(lastAspect, options.angleTransform(a, [h, s, a]), 0.7)
    );
    if (!a) {
      break;
    }
    const x_step = heightScalar * step_length * cos(aspect);
    const y_step = heightScalar * step_length * sin(aspect);
    x = floor(x + x_step);
    y = floor(y + y_step);
    ret.push([x, y, degrees(aspect)]);
  }
  return ret;
}

function drawCurve(curve, weight) {
  noFill();
  strokeWeight(weight);
  beginShape();
  curve.forEach(([x, y]) => curveVertex(x, y));
  endShape();
}

async function processImage(url) {
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
  const { lat } = tilenum_to_lonlat(1657, 3158, 13);
  const topo = processPixels(pixels, pixDist(lat, 14));
  return { topo, canvas };
}

function fillText(
  topo,
  inpText,
  alpha,
  size,
  pred,
  bbox = [0, 0, width, height],
  margin = 40
) {
  textSize(size);
  noStroke();
  let words = inpText.split(/\s/).reverse();
  let y = bbox[1] + margin;
  let x = bbox[0] + margin;
  let word = words.pop() + " ";
  let wordWidth;
  while (word && y < bbox[3] - margin) {
    wordWidth = Math.ceil(textWidth(word)) + 10;
    [x, y] = [Math.floor(x), Math.round(y)];
    if (pred(topo, x, y, wordWidth)) {
      word.split("").forEach((char) => {
        const pixel = topo.pixels[y][x];
        if (!pixel) return;
        const [h, s, aspect] = pixel;
        const vert = Math.abs(aspect > 90 ? aspect - 180 : aspect) % 180;
        const brightness = vert / 90;
        const col = color(
          res(chroma(colorAt([x, y], topo)).brighten((brightness * s) / 70))
        );
        col.setAlpha(alpha);
        fill(col);
        push();
        const jitter = random(-s * 0.01, s * 0.01);
        console.log(jitter);
        translate(x + jitter, y + jitter);
        rotate(radians(aspect / 45));
        text(char, 0, 0);
        pop();
        const charLen = textWidth(char);
        x += Math.ceil(charLen);
      });
      // text(word, x, y);
      word = words.length ? words.pop() + " " : undefined;
    } else x += wordWidth;

    if (x > bbox[2] - margin - wordWidth) {
      y += size;
      x = bbox[0] + margin;
    }
  }
}

function textsLayer(topo) {
  textFont("Courier");
  const predicate = (topo, x, y, wordWidth) => {
    const translate = (percentOfHeight) =>
      topo.max - percentOfHeight * topo.magnitude;
    const pix1 = topo.pixels[y]?.[x];
    const pix2 = topo.pixels[y]?.[Math.floor(x + wordWidth)];
    if (x + wordWidth + 80 > topo.width) return;
    if (!pix1 || !pix2) return;
    const [h1] = pix1;
    const [h2] = pix2;

    const [hmax, hmin] = [0.43, 0.7].map(translate);
    return random() > 0.2 && h1 < hmax && h1 > hmin && h2 < hmax && h2 > hmin;
  };
  textAlign(CENTER, CENTER);
  const alpha = 128;

  fill(...res(chroma(p.aquamarine).darken(2)), alpha);
  fillText(
    topo,
    texts.HalfMountain + "\n" + texts.netherlands,
    alpha,
    16 * 2,

    predicate,
    [0, 0, width / 3, height]
  );
  fillText(
    topo,
    texts.sangaha + "\n" + texts.mangala,
    alpha,
    16 * 2,

    predicate,
    [(2 * width) / 3, 0, width, height]
  );
}
function mountainLayer(bounds) {
  textSize(32 * 1.5);
  textFont("Copperplate-Light");
  textAlign(CENTER, CENTER);
  const pts = getPoints(bounds);
  pts.forEach((pt) => {
    textFont(pt.font || "Copperplate-Light");
    fill(res(chroma.scale(["#FCD94E", pt.col])(0.7)));
    text(pt.name, pt.x, pt.y);
  });
}
function trailsLayer(topo) {
  // ## TRAIL NAMES ##
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
  Object.entries(trails)
    .filter(([name]) => !exclude.some((drop) => name.includes(drop)))
    .forEach(([name, coords]) => {
      const mid = floor(coords.length / 2);
      const [x, y] = coords[mid];
      name.split(" ").join("\n");
      text(name.split(" ").join("\n"), x, y);
    });

  // ## TRAIL LINES ##
  const slopeScale = chroma.scale([p.yellow, "red"]);
  Object.values(trails).forEach((coords) => {
    coords.forEach(([x, y], i) => {
      if (x > topo.width || y > topo.height) return;
      const [, slope] = topo.pixels[y][x];
      stroke(...res(slopeScale(slope / 60)), 155);

      drawCurve(
        makeCurve(x, y, abs(randomGaussian(8, 3)), 4, topo, {
          angleTransform: (() => {
            let counter = i;
            return (a) => getAngle([x, y], coords[counter++] || [0, 0]);
          })(),
        }),
        1.5
      );
    });
  });
}
