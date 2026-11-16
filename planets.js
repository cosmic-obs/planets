// Where the planets are, as seen from Earth. Shared by the calendar (index.html) and the sky view (sky.html).
//
// Orbits are the Keplerian elements and rates of JPL's "Approximate Positions of the Planets" (E. M. Standish), valid
// 1800–2050. Positions come out good to a few arcminutes: well under a minute in a rising or setting time.
const Planets = (() => {
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const mod = (a, n) => ((a % n) + n) % n;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  // a (au), e, I, L, longitude of perihelion, longitude of the node (degrees) at J2000, then the same six per century
  const EL = {
    Mercury: [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593, 0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
    Venus: [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255, 0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418],
    Earth: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0, 0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0], // the Earth–Moon barycentre, near enough
    Mars: [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891, 0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
    Jupiter: [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909, -0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
    Saturn: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448, -0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
    Uranus: [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503, -0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589],
    Neptune: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574, 0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664],
  };
  // name, colour on the charts, diameter seen from 1 au (arcseconds), and magnitude from 5 log(r Δ) and the phase angle
  // in degrees (the Astronomical Almanac's formulae; Saturn's leaves out its rings, which add up to a magnitude)
  const LIST = [
    { id: 'Mercury', color: '#cdbcab', inner: true, size: 6.72, mag: (rd, i) => -0.42 + rd + 0.0380 * i - 0.000273 * i * i + 0.000002 * i ** 3 },
    { id: 'Venus', color: '#f6edc9', inner: true, size: 16.82, mag: (rd, i) => -4.40 + rd + 0.0009 * i + 0.000239 * i * i - 0.00000065 * i ** 3 },
    { id: 'Mars', color: '#ff7a55', size: 9.36, mag: (rd, i) => -1.52 + rd + 0.016 * i },
    { id: 'Jupiter', color: '#f0b46a', size: 196.88, mag: (rd, i) => -9.40 + rd + 0.005 * i },
    { id: 'Saturn', color: '#e3d072', size: 165.46, mag: rd => -8.88 + rd },
    { id: 'Uranus', color: '#96e2c4', faint: true, size: 70.04, mag: rd => -7.19 + rd },
    { id: 'Neptune', color: '#7fa2ff', faint: true, size: 67.0, mag: rd => -7.00 + rd },
  ];
  const BY_ID = Object.fromEntries(LIST.map(p => [p.id, p]));
  const EPS = 23.43928 * D2R, COS_EPS = Math.cos(EPS), SIN_EPS = Math.sin(EPS);

  // heliocentric position in the J2000 ecliptic, in au, at T Julian centuries from J2000
  function helio(name, T) {
    const k = EL[name], a = k[0] + k[6] * T, e = k[1] + k[7] * T, I = (k[2] + k[8] * T) * D2R;
    const L = k[3] + k[9] * T, peri = k[4] + k[10] * T, node = (k[5] + k[11] * T) * D2R;
    const w = peri * D2R - node, M = (mod(L - peri + 180, 360) - 180) * D2R;
    let E = M + e * Math.sin(M);
    for (let i = 0; i < 6; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
    const cw = Math.cos(w), sw = Math.sin(w), cn = Math.cos(node), sn = Math.sin(node), ci = Math.cos(I), si = Math.sin(I);
    return [
      (cw * cn - sw * sn * ci) * xp + (-sw * cn - cw * sn * ci) * yp,
      (cw * sn + sw * cn * ci) * xp + (-sw * sn + cw * cn * ci) * yp,
      sw * si * xp + cw * si * yp,
    ];
  }
  // J2000 RA (hours) and Dec (degrees) moved to the equinox some years on (first-order precession)
  function precess(ra, dec, years) {
    const a = ra * 15 * D2R, d = dec * D2R;
    return [mod(ra + (3.075 + 1.336 * Math.sin(a) * Math.tan(d)) * years / 3600, 24), dec + 20.04 * Math.cos(a) * years / 3600];
  }
  // A planet at a moment (JD, UT), seen from Earth's centre:
  //   ra (hours) and dec (degrees) of date; dist from Earth and r from the Sun (au);
  //   elong: degrees from the Sun, positive when east of it (an evening object), negative when west (a morning one);
  //   phase angle (degrees), lit fraction, magnitude, and diam, its apparent diameter (arcseconds)
  function at(id, jd) {
    const p = BY_ID[id], T = (jd + 69 / 86400 - 2451545) / 36525, earth = helio('Earth', T);
    let h = helio(id, T), g = h.map((v, i) => v - earth[i]);
    // where it was when the light now arriving left it
    h = helio(id, T - Math.hypot(...g) * 0.0057755183 / 36525);
    g = h.map((v, i) => v - earth[i]);
    const dist = Math.hypot(...g), r = Math.hypot(...h), R = Math.hypot(...earth);
    const ye = g[1] * COS_EPS - g[2] * SIN_EPS, ze = g[1] * SIN_EPS + g[2] * COS_EPS;
    const [ra, dec] = precess(mod(Math.atan2(ye, g[0]) * R2D / 15, 24), Math.asin(ze / dist) * R2D, (jd - 2451545) / 365.25);
    const elong = Math.acos(clamp(-(g[0] * earth[0] + g[1] * earth[1] + g[2] * earth[2]) / (dist * R), -1, 1)) * R2D;
    const east = mod(Math.atan2(g[1], g[0]) - Math.atan2(-earth[1], -earth[0]), 2 * Math.PI) < Math.PI;
    const phase = Math.acos(clamp((r * r + dist * dist - R * R) / (2 * r * dist), -1, 1)) * R2D;
    return {
      ra, dec, dist, r, elong: east ? elong : -elong, phase, lit: (1 + Math.cos(phase * D2R)) / 2,
      mag: p.mag(5 * Math.log10(r * dist), phase), diam: p.size / dist,
    };
  }
  return { LIST, at, precess };
})();
if (typeof module !== 'undefined') module.exports = Planets;
