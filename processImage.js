const gpu = new GPU();
const toHeights = gpu
  .createKernel(function hmap(data, width) {
    const { x, y } = this.thread;

    const start = y * (width * 4) + x * 4;
    const [R, G, B, A] = [
      data[start],
      data[start + 1],
      data[start + 2],
      data[start + 3],
    ];
    const h = -10000 + (R * 256 * 256 + G * 256 + B) * 0.1;
    if (h < 0) {
      const prev = y * (width * 4) + (x - 1) * 4;
      const [R, G, B, A] = [
        data[prev],
        data[prev + 1],
        data[prev + 2],
        data[prev + 3],
      ];
      const prevh = -10000 + (R * 256 * 256 + G * 256 + B) * 0.1;
      return Math.abs(prevh);
    }
    return h;
  })
  .setPipeline(true)
  .setDynamicOutput(true);

const slope = gpu
  .createKernel(function (hArray, pixDist) {
    const { x, y } = this.thread;
    const height = hArray[y][x];

    const eleN = hArray[y][x - 1];
    const eleS = hArray[y][x + 1];
    const eleE = hArray[y + 1][x];
    const eleW = hArray[y - 1][x];
    const d = 3 * pixDist;
    const dzdx = (eleE - eleW) / d;
    const dzdy = (eleN - eleS) / d;
    const slope = Math.atan(Math.sqrt(dzdx ** 2 + dzdy ** 2)) * (180 / Math.PI);
    const aspect =
      d !== 0 // counterclockwise from east
        ? (Math.atan2(dzdy, dzdx) * (180 / Math.PI) + 180) % 360
        : (90 * (d > 0 ? 1 : -1) + 180) % 360;
    return [height, slope, aspect];
  })
  .setDynamicOutput(true);

function toHmap(image, pixDist) {
  const x = toHeights.setOutput([image.width, image.height])(
    image.data,
    image.width
  );
  const slopes = slope.setPipeline(true).setOutput([image.width, image.height])(
    x,
    pixDist
  );
  const render = gpu
    .createKernel(function (slArray) {
      const { x, y } = this.thread;
      const v = slArray[y][x];
      const c = (255 * v[2]) / 360;
      this.color(c, c, c, 1);
    })
    .setOutput([image.width, image.height])
    .setGraphical(true);
  render(slopes);

  document.getElementsByTagName("body")[0].appendChild(render.canvas);
}

function processPixels(image, pixDist) {
  const { width, height, data } = image;
  console.log(height, height / 4);
  const extrema_y = gpu
    .createKernel(function (hArray, height) {
      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < height; i++) {
        const h = hArray[this.thread.x][i];
        if (h < min) min = h;
        if (h > max) max = h;
      }
      return [min, max];
    })
    .setDynamicOutput(true);
  // 139, 988,-3395
  const nSlices = 4;
  const step = height / nSlices;
  const slices = times(nSlices, (i) =>
    data.slice(i * step * width * 4, (i + 1) * step * width * nSlices)
  ).map((data) => {
    const htex = toHeights.setOutput([width, step])(data, width);
    const pixels = slope.setOutput([width, step])(htex, pixDist);
    const extremay = extrema_y.setOutput([step])(htex, step);
    const extrema = extremay.reduce(([min, max], [mi, ma]) => {
      return [mi < min ? mi : min, ma > max ? ma : max];
    });
    return {
      min: extrema[0],
      max: extrema[1],
      magnitude: extrema[1] - extrema[0],
      pixels,
      width,
      height,
    };
  });

  // const pixels = pixelTex.toArray();

  const min = Math.min(...slices.map(({ min }) => min));
  const max = Math.max(...slices.map(({ max }) => max));
  return {
    min,
    max,
    magnitude: max - min,
    pixels: [].concat(...slices.map(({ pixels }) => pixels)),
    width,
    height,
  };
}

function getPixel(pixels, width, x, y) {
  return pixels[y * width + x];
}
