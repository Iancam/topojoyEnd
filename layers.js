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
function mountainLayer(bounds, zoom) {
  textSize(32 * 1.5);
  textFont("Copperplate-Light");
  textAlign(CENTER, CENTER);
  LOCATIONS.forEach((loc) => {
    const pt = latLngToScreenPoint(bounds, loc, zoom);

    textFont(loc.font || "Copperplate-Light");
    fill(res(chroma.scale(["#FCD94E", loc.col])(0.7)));
    text(loc.name, pt.x, pt.y);
  });
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

/**
 * Given a topology `topo`, and a collection of trail coordinates `trails`
 * this function renders the trails on
 * the canvas.  The trails are rendered in a gradient of colors, depending
 * on the slope of the terrain at each point.  The names of the trails
 * are also rendered in the middle of the trail.
 *
 * @param {Object} topo - A topology object, as returned by `processImage`.
 * @param {Object} trails - A collection of trail coordinates, where each
 *     key is the name of the trail and each value is a list of xy
 *     coordinates.
 */
function trailsLayer(topo, trails) {
  // ## TRAIL NAMES ##
  const ts = 16 * 1.5;
  textSize(ts);
  textFont("Courier");
  fill(p.yellow);

  Object.entries(trails).forEach(([name, coords]) => {
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
