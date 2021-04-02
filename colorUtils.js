const res = (c) => c._rgb.slice(0, 3);
const brighten = (c, v) => res(chroma(c).brighten(v));
const darken = (c, v) => res(chroma(c).darken(v));

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
const randsFactory = (topo) => (percentOfHeight, tightness) => () =>
  randomGaussian(
    topo.max - percentOfHeight * topo.magnitude,
    topo.magnitude / tightness
  );

const colorAt = ([x, y], topo) => {
  const [height, slope, aspect] = topo.pixels[y][x];
  const vert = Math.abs(aspect > 90 ? aspect - 180 : aspect) % 180;
  const brightness = vert / 90;
  const rands = randsFactory(topo);

  const colorPlan = [
    [rands(1.1, 7), () => random([p.orange, p.aquamarine])],
    [rands(0.9, 15), p.sienna],
    [rands(0.8, 15), () => random([p.orange, p.siennaBright, p.sienna])],

    [
      rands(0.6, 10),
      () =>
        shortestAngle(aspect, 270) < 30
          ? res(chroma.scale([p.bgBlue, "yellow"])(slope / 70))
          : p.fgBlue,
    ],
    [rands(0.65, 5), () => random(["#53C1EB", p.fgBlue, p.darkness])],
    [rands(0.3, 15), darken(p.fgBlue, 1)],

    [rands(0.3, 10), p.white],
    [rands(0.1, 10), () => random([p.white, p.siennaBright, p.aquamarine])],
    [rands(0.1, 10), () => random([p.white, p.siennaBright, p.aquamarine])],
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
