// color palette
const p = {
  orange: "#ed9228",
  aquamarine: "aquamarine",
  white: "#A8FFFF", //"#F2EBDC",
  bgBlue: "#004E63", //"#273240"
  fgBlue: "teal",
  sienna: "#8C5332",
  darkness: "#273240",
  brown: "brown",
  siennaBright: "#BF805C",
  yellow: "#FCD94E",
  ochre: "#D38614",
};
/**
 * A factory that returns a function which generates random heights for a pixel on a topographic map.
 *
 * The returned function takes no arguments and returns a random height that is
 * sampled from a Gaussian distribution with a mean determined by the percent
 * of the map's total height and a standard deviation determined by the
 * tightness of the distribution.
 * A higher percentOfHeight represents a lower elevation
 *
 * @param {max: number, magnitude: number} topo - The topographic data containing pixel information as well as summary info on the map.
 * @param {number} percentOfHeight - The mean height as a percent of the map's total height.
 * @param {number} gaussDistTightness - The standard deviation of the distribution as a multiple of the total height.
 * @returns {function(): number} - A function that generates a random height.
 */
const randsFactory = (topo) => (percentOfHeight, gaussDistTightness) => () =>
  randomGaussian(
    topo.max - percentOfHeight * topo.magnitude,
    topo.magnitude / gaussDistTightness
  );

const res = (c) => c._rgb.slice(0, 3);
const brighten = (c, v) => res(chroma(c).brighten(v));
const darken = (c, v) => res(chroma(c).darken(v));

/**
 * Determines the color for a specific pixel on a topographic map based on its height, slope, and aspect.
 * @param {Array<number>} coordinates - The x and y coordinates of the pixel.
 * @param {Object} topo - The topographic data containing pixel information as well as summary info on the map.
 * @param {Array<Array<number>>} topo.pixels - A 2D array where each element represents [height, slope, aspect] of a pixel.
 * @returns {string} - The color assigned to the pixel as a hexadecimal or named color.
 */
const colorAt = ([x, y], topo) => {
  const [height, slope, aspect] = topo.pixels[y][x];
  // const vert = Math.abs(aspect > 90 ? aspect - 180 : aspect) % 180;
  // const brightness = vert / 90;
  const randHeight = randsFactory(topo);
  /*
   * colorPlan is an array of tuples, where each tuple represents a "rule"
   * for determining the color of a pixel. The first element of the tuple
   * is a function that returns a height value, and the second element is the
   * color to use if the pixel's height is less than that value. Each rule is
   * applied in order, and the first rule that matches determines the color.
   * The rules are defined so that the color will change as the height increases.
   *
   * Confusingly, higher numbers to randHeight's first argument represent lower
   * elevations.
   *
   * To make your own colorPlan, begin with a rule for very low elevations, that
   * always returns Infinity.
   * Then, above it, add rules for elevations you want to highlight. I split mine
   * into low, middle, and high elevations. Begin with simple rules, like always
   * returning the same base color, then expand.
   *
   */
  const colorPlan = [
    // lower elevations
    [randHeight(1.1, 7), () => random([p.orange, p.aquamarine])],
    [randHeight(0.9, 15), p.sienna],
    [randHeight(0.8, 15), () => random([p.orange, p.siennaBright, p.sienna])],
    //  middle elevations
    [
      randHeight(0.6, 10),
      () =>
        shortestAngle(aspect, 270) < 30
          ? res(chroma.scale([p.bgBlue, "yellow"])(slope / 70))
          : p.fgBlue,
    ],
    [randHeight(0.65, 5), () => random(["#53C1EB", p.fgBlue, p.darkness])],
    [randHeight(0.3, 15), darken(p.fgBlue, 1)],
    //high elevations
    [randHeight(0.3, 10), p.white],
    [
      randHeight(0.1, 10),
      () => random([p.white, p.siennaBright, p.aquamarine]),
    ],
    [
      randHeight(0.1, 10),
      () => random([p.white, p.siennaBright, p.aquamarine]),
    ],
    [
      () => Infinity,
      () => random([p.white, p.siennaBright, p.aquamarine, "pink"]),
    ],
  ];

  for (let [compHeight, clar] of colorPlan) {
    if (height < compHeight()) {
      const color = typeof clar === "function" ? clar() : clar;
      return color;
    }
  }
};
