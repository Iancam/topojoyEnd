async function getTrails(shapefilePath, { box, zoom }) {
  const shp = new ShpToGeoJson({
    remotePath: shapefilePath,
  });
  await shp.load();
  console.log(box, zoom);

  let geoJSON = shp.getGeoJson();
  const trails = [];
  for (let i = 0; i < geoJSON.features.length; i++) {
    const feature = geoJSON.features[i];
    const {
      properties,
      geometry: { coordinates },
    } = feature;
    const isNamedTrail =
      properties.type === "Trail" &&
      properties.surface === "dirt" &&
      properties.name !== "";
    if (!isNamedTrail) continue;
    const imageCoords = coordinates
      .map((coord) => pointToTileFraction(...coord, zoom))
      .filter(([x, y]) => {
        return x < box[2] + 1 && y < box[3] + 1 && x > box[0] && y > box[1];
      })
      .map(([x, y]) => [
        Math.floor(256 * (x - box[0])),
        Math.floor(256 * (y - box[1])),
      ]);
    const coords = _.uniqBy(imageCoords, JSON.stringify);

    coords.length && trails.push({ name: properties.name, coords });
  }

  trailObj = trails.reduce((obj, trail) => {
    const { name, coords } = trail;
    obj[name] = obj[name] ? [...obj[name], ...coords] : coords;
    return obj;
  }, {});
  return trailObj;
}

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

function TransformGeojson(srs, forward) {
  var trans = proj4(srs);
  if (forward) {
    this.func = function (c) {
      return trans.forward(c);
    };
  } else {
    this.func = function (c) {
      return trans.inverse(c);
    };
  }
}
TransformGeojson.prototype.point = function (coord) {
  return this.func(coord);
};
TransformGeojson.prototype.line = function (line) {
  return line.map(this.point, this);
};
TransformGeojson.prototype.multiLine = function (lnGroup) {
  return lnGroup.map(this.line, this);
};
TransformGeojson.prototype.multiPoly = function (multPoly) {
  return multPoly.map(this.multiLine, this);
};
TransformGeojson.prototype.geometries = function (geometries) {
  return geometries.map(this.geometry, this);
};
TransformGeojson.prototype.bbox = function (bbox) {
  return this.point(bbox.slice(0, 2)).concat(this.point(bbox.slice(2)));
};
TransformGeojson.prototype.geometry = function (geometry) {
  var out = {};
  for (var key in geometry) {
    if (key === "bbox") {
      out.bbox = this.bbox(geometry.bbox);
    } else if (key !== "coordinates" && key !== "geometries") {
      out[key] = geometry[key];
    }
  }
  switch (geometry.type) {
    case "Point":
      out.coordinates = this.point(geometry.coordinates);
      return out;
    case "LineString":
      out.coordinates = this.line(geometry.coordinates);
      return out;
    case "MultiPoint":
      out.coordinates = this.line(geometry.coordinates);
      return out;
    case "MultiLineString":
      out.coordinates = this.multiLine(geometry.coordinates);
      return out;
    case "Polygon":
      out.coordinates = this.multiLine(geometry.coordinates);
      return out;
    case "MultiPolygon":
      out.coordinates = this.multiPoly(geometry.coordinates);
      return out;
    case "GeometryCollection":
      out.geometries = this.geometries(geometry.geometries);
      return out;
  }
};
TransformGeojson.prototype.feature = function (feature) {
  var out = {};
  for (var key in feature) {
    if (key !== "geometry") {
      out[key] = feature[key];
    }
  }
  out.geometry = this.geometry(feature.geometry);
  return out;
};
TransformGeojson.prototype.featureCollection = function (fc) {
  var out = {};
  for (var key in fc) {
    if (key === "bbox") {
      out.bbox = this.bbox(fc.bbox);
    } else if (key !== "features") {
      out[key] = fc[key];
    }
  }
  out.features = fc.features.map(this.feature, this);
  return out;
};

function toWGS84(geojson, srs) {
  var tFunc = new TransformGeojson(srs, false);
  return tFunc.featureCollection(geojson);
}
function fromWGS84(geojson, srs) {
  var tFunc = new TransformGeojson(srs, true);
  return tFunc.featureCollection(geojson);
}
