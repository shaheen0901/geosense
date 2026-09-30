/* Colour theme: LSU Health New Orleans purple and gold. */
/* GeoSENSE hero animation
   1. Globe faces Bangladesh and the Indian Ocean, study sites labeled
   2. Globe turns to the United States (highlighted), sites labeled
   3. Zoom to the contiguous U.S.; a polar-orbiting satellite passes north to south
      three times, building land surface temperature, NO2, and PM2.5 maps row by row
      (all maps are illustrative, not real data)                                    */
(function () {
  const cv = document.getElementById('geoanim');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const RAD = Math.PI / 180;

  // ---- Study sites: [name, longitude, latitude, label offset x, label offset y] ----
  // Offsets are fractions of the globe radius; they fan labels out so nearby names don't collide.
  const SITES = [
    ["Rajshahi",      88.60, 24.37, -0.40, -0.10],
    ["Singra",        89.13, 24.50, -0.26, -0.30],
    ["Dhaka",         90.41, 23.81,  0.28, -0.30],
    ["Chittagong",    91.78, 22.36,  0.42, -0.08],
    ["Cox's Bazar",   92.01, 21.43,  0.36,  0.12],
    ["Indian Ocean",  80.00, -8.00,  0.14,  0.10],
    ["Nebraska",     -99.80, 41.50, -0.36, -0.14],
    ["Iowa",         -93.50, 42.00, -0.06, -0.32],
    ["New Orleans",  -90.07, 29.95,  0.06,  0.26],
    ["Camden",       -75.12, 39.93,  0.36,  0.10],
    ["Jersey City",  -74.08, 40.73,  0.30, -0.20]
  ];

  // ---- Colors ----
  const C = { bg: "#3C1053", ocean: "#4A1D66", land: "186,168,212", usa: "253,222,110", glow: "#FDD023", text: "#EFEAF5", muted: "#B4A6C6" };
  const RAMP = [[44,123,182],[171,217,233],[255,255,191],[253,174,97],[215,25,28]];      // temperature
  const RAMP_NO2 = [[45,30,62],[140,41,129],[222,73,104],[254,159,109],[252,253,191]];  // nitrogen dioxide
  const RAMP_PM = [[68,1,84],[59,82,139],[33,145,140],[94,201,98],[253,231,37]];        // PM2.5
  const rampOf = stops => t => { const p = t * 4, i = Math.min(3, Math.floor(p)), f = p - i, a = stops[i], b = stops[i + 1];
    return "rgb(" + a.map((x, k) => Math.round(x + (b[k] - x) * f)).join(",") + ")"; };

  // ---- Masks (Natural Earth via world-atlas), packed as bits ----
  const bit = (s, k) => s.charCodeAt(k >> 3) & (1 << (k & 7));
  const LAND = atob("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPj/z////3EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/++f///wcAAPADgAEAAOADAAAAAAAAAAAAAAAg3N4f/v///wcAAB8AAAAAAAA4AAAAAAAAAAAAAAADAOAH/P///wcAAA4AAAAAAAAwAAAAAAAAAAAAAAC8cQwBAP///wcAAAAAAIAHAMD/DwDwAAAAAAAAAOAAAAAAAPz//wMAAAAAAGAAAPz/AQAAAAAAAAAAAOBdc/MDAPj//wEAAAAAABjAwP///z9gAAAAA4AAAED8A/P/AOD//wEAAAAAADjg/v///z//HwCAAPj/A0/8X4PwB/D//wAAAOA/AADh/v///////wM+A/7///8Pw56BB+D/DwAAAPz/Y+zf/f//////////N/D///////+Bf/D/AQAAAP7/x////v//////////GP7//////7/wJ+AfAH4AAD9++P//////////////AOD//////88GH8AfAAwAwJ////////////////9/APz//////wNxDIAPAAAA8M///////////////98/APzf/////wHwAwAGAAAA+M///////////////+ADAPAB+P///wHwMwAAAAAA8A//////////////ZBgAAIACgP///wPgfwAAAAAQAAf///////////8fAA4AACAAAP///z/gfwAAAAAwYMf///////////8PAB8AAAQAAP7////5/wMAAABoQOj///////////8DAA8AAAAAgPz////5/wcAAADs+P////////////9/AAcAAAAAAPj////7/wMAAADg+f////////////9/AAEAAAAAAPj/////zwAAAAAw/v////////////+/AAAAAAAAAPD/////Gw4AAACg//////////////8fAAAAAAAAAOD/////HxAAAADA//////////////8fAAAAAAAAAOD//////wAAAACA//9P/vj///////8PAAAAAAAAAOD/////EwAAAACA//wHfPz////////HAAAAAAAAAOD/////AQAAAAD8g/EH8Pj////////gAAAAAAAAAOD/////AAAAAAD8Aebn+fH//////z8AAAAAAAAAAOD///9/AAAAAAD8AGT8//H//////xpgAAAAAAAAAMD///8/AAAAAAD8AMT8//H/////fzggAAAAAAAAAID///8fAAAAAABwdAD8/////////zE4AAAAAAAAAID///8fAAAAAACwfwBD/////////zA/AAAAAAAAAAD+//8PAAAAAAD4fwAA/////////wAHAAAAAAAAAAD8//8DAAAAAAD8/2OA/////////4EAAAAAAAAAAADo//8DAAAAAAD8/+///////////wEAAAAAAAAAAADo/wkCAAAAAAD+//////z//////wEAAAAAAAAAAADYfwACAAAAAID///8///n//////wEAAAAAAAAAAACgfwAWAAAAAMD///9//+H//////wAAAAAAAAAAAAAgfwAAAAAAAMD///9//jPg////fwAAAAAAAAAAAAAAfgAAAAAAAOD//////H/A////PwEAAAAAAAAAAAAAfAAIAAAAAOD//////f/A/+f/BwAAAAAAAAAAAAAAfDBwAAAAAOD/////+X8A/sN/AAAAAAAAAAAAAAAA+DgAAwAAAOD/////+T8A/oB/AwAAAAAAAAAAAAAA4B8AAAAAAOD/////8x8AfoB/AAMAAAAAAAAAAAAAgPwAAAAAAOD/////8wcAPoD+AAEAAAAAAAAAAAAAAPgBAAAAAOD/////7wEAHAD+AQEAAAAAAAAAAAAAAMAAAAAAAOD/////PwAAHAD8AQQAAAAAAAAAAAAAAICAAgAAAMD/////HwMAGADgAAoAAAAAAAAAAAAAAADBfgAAAID//////wMAGABAAAAAAAAAAAAAAAAAAADy/wAAAID//////wEAIAAGAAwAAAAAAAAAAAAAAADw/wEAAAD//////wEAIAAIAAgAAAAAAAAAAAAAAADw/x8AAAD8+P///wAAAAAZYAAAAAAAAAAAAAAAAADg/z8AAAAAwP///wAAAAAbMAAAAAAAAAAAAAAAAADw/z8AAAAAwP//fwAAAAAWfAAAAAAAAAAAAAAAAAD4/38AAAAAwP//HwAAAAAcficAAAAAAAAAAAAAAAD8//8BAAAAwP//DwAAAAAYPiABAAAAAAAAAAAAAAD8//8DAAAAwP//BwAAAAA4vgEaAAAAAAAAAAAAAAD8//8/AAAAgP//BwAAAABwEBL+AAAAAAAAAAAAAAD8////AAAAAP//AwAAAABgAADwAQAAAAAAAAAAAAD8////AQAAAP//AwAAAADABADyAwEAAAAAAAAAAAD4////AQAAAP7/AwAAAAAAHADwBgQAAAAAAAAAAADw////AAAAAP7/BwAAAAAAAAQADAAAAAAAAAAAAADw//9/AAAAAP7/BwAAAAAAAAAAAAAAAAAAAAAAAADg//9/AAAAAP7/BwAAAAAAAICHAAAAAAAAAAAAAADg//8/AAAAAP//BwEAAAAAANDHAAAAAAAAAAAAAADA//8/AAAAAP//hwMAAAAAAPjHAQAAAAAAAAAAAAAA//8/AAAAAP//4QEAAAAAAPzfAQAAAAAAAAAAAAAA/v8/AAAAAP//4AEAAAAAAP7/AwAAAAAAAAAAAAAA/v8fAAAAAP5/wAAAAAAAgP//ByAAAAAAAAAAAAAA/v8fAAAAAP7/4AAAAAAA4P//D0AAAAAAAAAAAAAA/v8HAAAAAPz/4AAAAAAA8P//HwAAAAAAAAAAAAAA/v8AAAAAAPx/YAAAAAAA8P//PwAAAAAAAAAAAAAA/v8AAAAAAPw/AAAAAAAA8P//PwAAAAAAAAAAAAAA/v8AAAAAAPw/AAAAAAAA8P//PwAAAAAAAAAAAAAA/38AAAAAAPgfAAAAAAAA4P//PwAAAAAAAAAAAAAA/z8AAAAAAPAPAAAAAAAA4P//PwAAAAAAAAAAAAAA/x8AAAAAAPAHAAAAAAAA4B/+PwAAAAAAAAAAAAAA/w8AAAAAAPABAAAAAAAA4Af0HwAAAAAAAAAAAAAA/wMAAAAAAAAAAAAAAAAAAADwDwAIAAAAAAAAAACA/wMAAAAAAAAAAAAAAAAAAADgDwAQAAAAAAAAAACA/wEAAAAAAAAAAAAAAAAAAADAAgBwAAAAAAAAAACAfwAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAACAHwAAAAAAAAAAAAAAAAAAAAAABgAQAAAAAAAAAACAHwAAAAAAAAAAAAAAAAAAAAAABgAMAAAAAAAAAADADwAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAADABwAAAAAAAAAAAAAAAAAAAAAAAIADAAAAAAAAAADADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAgwEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGAAAAAAAAAAAADwAAAR4Pv4HAAAAAAAAAAAAAAAACAAAAAAAAAAA4P8/4P//////BwAAAAAAAAAAAAAAPwAAAAAAAADg//8//P///////wMAAAAAAAAAAACAewAAAADI/v////8///////////8BAAAAAAAAABAAeAAAAID///////////////////8DAAAAAAAe4P//fwAAAMD//////////////////38AAADA////////BwAAAPz//////////////////x8AAEDz//////8/AAAA8P///////////////////x8AABj///////8PAIAH/////////////////////38AAADA//////8/gPAD4P///////////////////wcAAAD+////////P4Dx/////////////////////w8AAAD8//////////////////////////////////8A/wMA/v//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////"), USA = atob("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPj/AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP7/AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPD/AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP7/AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOD/AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPz/AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPzfAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPABKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMD//wEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOD//38ABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOD///8ABgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOD////hAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOD////5AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOD/////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOD///9/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMD///8/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAID///8fAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAID///8fAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+//8PAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADw//8DAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/P8DAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AkCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"), CONUS = atob("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/v///////wEAAAAAAACI/////////w8IAAAAAADu//////////8PAAAAAAD///////////8fAAAAoMD///////////8PAAAAPOD///////////8PAAAAD/z///////////8HAADgA/////////////8HAAD+wf////////////8BgP//8P///////////38A8P8D/P///////////z8A/j+A/////////////wf8/wfg/////////////wH//wD4////////////P/z/PwD8////////////7///HwD///////////////8/AMD///////////////8PAPj///////////////8AAPz//////////////z8AAP//////////////fwUAgP//////////////3wAAwP//////////////MwAAwP//////////////BQAA+P////////////9/AAAA/P////////////8/AAAA//////////////8PAACA//////////////8HAADA/////////////38AAADg/////////////x8AAADg/////////////wAAAADA////////////DwAAAADg////////////AQAAAAD4//////////8/AAAAAAAA//////////8HAAAAAAAA/uP///////8AAAAAAAAAAPD//////x8AAAAAAAAAAPD//////wcAAAAAAAAAAPj//38J/wEAAAAAAAAAAJ7/L3+A+AAAAAAAAAAAAMP/AywAPAAAAAAAAAAAAOB/AAAAHgAAAAAAAAAAAPADAACABwAAAAAAAAAAAHwAAADwAQAAAAAAAAAAAB4AAAD4AAAAAAAAAAAAAAcAAAA8AAAAAAAAAAAAgAEAAAAPAAAAAAAAAAAAAAAAAIADAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
  const dots = [];                                   // [lon, lat, isUSA] on a 1.5 degree grid
  for (let j = 0; j < 120; j++) for (let i = 0; i < 240; i++) {
    const k = j * 240 + i;
    if (bit(LAND, k)) dots.push([(-180 + 1.5 * (i + .5)) * RAD, (90 - 1.5 * (j + .5)) * RAD, !!bit(USA, k)]);
  }

  // ---- Contiguous U.S. grids (illustrative), 0.5 degree cells ----
  // Each cell holds [col, row, temperature, NO2, PM2.5], all scaled 0 to 1.
  const GW = 118, GH = 52, L0 = -125, B1 = 50;
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const g = (x, y, cx, cy, sx, sy) => Math.exp(-((x - cx) ** 2) / (2 * sx * sx) - ((y - cy) ** 2) / (2 * sy * sy));
  const fit = v => Math.max(0, Math.min(1, v));
  const HEAT_CITIES = [[-90.07,29.95],[-95.4,29.8],[-84.4,33.7],[-87.6,41.9],[-74.1,40.7],[-112,33.4],[-96.8,32.8]];
  // [lon, lat, strength] for traffic and industry hot spots
  const NO2_CITIES = [[-74.0,40.7,1],[-75.2,39.95,.7],[-77.0,38.9,.6],[-71.1,42.4,.55],[-87.6,41.9,.9],[-83.0,42.3,.6],
    [-118.2,34.05,1],[-122.3,37.8,.6],[-122.3,47.6,.45],[-95.4,29.8,.8],[-96.8,32.8,.65],[-84.4,33.7,.55],
    [-112.1,33.45,.55],[-104.99,39.74,.45],[-90.07,29.95,.45],[-91.15,30.45,.5],[-80.2,25.8,.4],[-93.3,44.98,.35],[-90.2,38.6,.4]];
  const cells = [];
  for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) {
    if (!bit(CONUS, r * GW + c)) continue;
    const lon = L0 + .5 * (c + .5), lat = B1 - .5 * (r + .5);
    // Land surface temperature: warm south and desert, cool mountains, urban heat islands
    let lst = .2 + .5 * (50 - lat) / 26 + .35 * g(lon, lat, -113, 34, 5, 3) + .15 * g(lon, lat, -98, 31, 5, 3)
      - .35 * g(lon, lat, -107, 41, 3, 6) - .15 * g(lon, lat, -121, 45, 2, 4) - .12 * g(lon, lat, -80, 38, 2, 3);
    HEAT_CITIES.forEach(([x, y]) => lst += .18 * g(lon, lat, x, y, .8, .8));
    lst += (rnd() - .5) * .12;
    // NO2: low background, sharp peaks over cities and the Northeast corridor
    let no2 = .06 + .08 * g(lon, lat, -76, 40.5, 4, 2) + .06 * g(lon, lat, -86, 41, 5, 2);
    NO2_CITIES.forEach(([x, y, k]) => no2 += .8 * k * g(lon, lat, x, y, .7, .6));
    no2 += (rnd() - .5) * .06;
    // PM2.5: wildfire smoke in the West, Central Valley, Ohio Valley, and the Southeast
    let pm = .18 + .45 * g(lon, lat, -121, 41, 3.5, 4) + .3 * g(lon, lat, -119.6, 36.5, 1.2, 1.8)
      + .25 * g(lon, lat, -85.5, 39, 6, 3.5) + .15 * g(lon, lat, -89, 33, 6, 3) - .12 * g(lon, lat, -108, 42, 5, 4);
    NO2_CITIES.forEach(([x, y, k]) => pm += .12 * k * g(lon, lat, x, y, 1, 1));
    pm += (rnd() - .5) * .1;
    cells.push([c, r, fit(lst), fit(no2), fit(pm)]);
  }

  // ---- Map layers, scanned one after another ----
  const LAYERS = [
    { name: "Land surface temperature",       low: "Cooler", high: "Warmer", stops: RAMP,     scan: 7500, hold: 1500 },
    { name: "Nitrogen dioxide (NO\u2082)",   low: "Lower",  high: "Higher", stops: RAMP_NO2, scan: 6500, hold: 1500 },
    { name: "Fine particulate matter (PM2.5)", low: "Lower",  high: "Higher", stops: RAMP_PM,  scan: 6500, hold: 2500 }
  ];
  LAYERS.forEach(L => L.color = rampOf(L.stops));
  const MAPS = LAYERS.reduce((sum, L) => sum + L.scan + L.hold, 0);

  // ---- Timeline (ms) ----
  const T = { bd: 3500, turn: 4500, us: 3500, zoom: 1500, maps: MAPS, fade: 1000 };
  let acc = 0; const at = {}; for (const k in T) { at[k] = acc; acc += T[k]; } const TOTAL = acc;
  const ease = t => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
  const clamp = t => Math.max(0, Math.min(1, t));
  const lerp = (a, b, t) => a + (b - a) * t;
  const VIEW_BD = [88, 12], VIEW_US = [-88, 34];     // [center longitude, tilt latitude]

  // The canvas spans the full page width. On wide screens the scene sits in the
  // right part of the banner so the headline on the left stays readable.
  let W = 0, H = 0, FW = 0, SX = 0;
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    FW = cv.clientWidth; H = cv.clientHeight;
    if (!FW || !H) return;
    cv.width = FW * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const wide = FW >= 860 && FW / H > 1.3;
    SX = wide ? FW * .42 : 0; W = wide ? FW * .56 : FW;
  }
  function label(text, x, y, size, color, align) {
    ctx.font = "600 " + size + "px 'Public Sans', 'Segoe UI', Arial, sans-serif";
    ctx.fillStyle = color; ctx.textAlign = align || "left"; ctx.textBaseline = "middle"; ctx.fillText(text, x, y);
  }
  function satellite(x, y, s, a, angle) {
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(angle || 0);
    ctx.fillStyle = "#A39AAC"; ctx.fillRect(-s * 2.2, -s * .35, s * 1.5, s * .7); ctx.fillRect(s * .7, -s * .35, s * 1.5, s * .7);
    ctx.fillStyle = "#EFEAF5"; ctx.fillRect(-s * .55, -s * .55, s * 1.1, s * 1.1);
    ctx.restore();
  }

  // ---- Globe ----
  function drawGlobe(t, view, labels, zoom, alpha) {
    const lon0 = view[0] * RAD, lat0 = view[1] * RAD;
    const R = Math.min(W, H) * .36 * (1 + zoom * 4), cx = W / 2, cy = H / 2;
    const sl = Math.sin(lat0), cl = Math.cos(lat0);
    const proj = (lam, phi) => {
      const cp = Math.cos(phi), d = lam - lon0;
      return [cx + R * cp * Math.sin(d), cy - R * (cl * Math.sin(phi) - sl * cp * Math.cos(d)), sl * Math.sin(phi) + cl * cp * Math.cos(d)];
    };
    ctx.save(); ctx.globalAlpha = alpha;

    // Polar orbit: a circle through both poles, turned 55 degrees from the viewer.
    // The satellite crosses north to south on the near side.
    const beta = 55 * RAD, orR = 1.3, th = t / 1600;
    const orbit = a => {
      const x = Math.sin(a) * Math.sin(beta), y = Math.cos(a), z = Math.sin(a) * Math.cos(beta);
      const y2 = y * cl - z * sl, z2 = y * sl + z * cl;          // tilt with the globe
      return [cx + R * orR * x, cy - R * orR * y2, z2];
    };
    const path = front => {
      ctx.beginPath(); let on = false;
      for (let k = 0; k <= 96; k++) {
        const [x, y, z] = orbit(k / 96 * Math.PI * 2);
        if ((z >= 0) === front) { on ? ctx.lineTo(x, y) : ctx.moveTo(x, y); on = true; } else on = false;
      }
      ctx.stroke();
    };
    const [sx, sy, sz] = orbit(th), [nx, ny] = orbit(th + .01), heading = Math.atan2(ny - sy, nx - sx) + Math.PI / 2;
    ctx.setLineDash([3, 6]); ctx.lineWidth = 1;
    if (zoom === 0) { ctx.strokeStyle = "rgba(239,234,245,.12)"; path(false); if (sz < 0) satellite(sx, sy, R * .045, .45, heading); }

    ctx.fillStyle = C.ocean; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    const dot = Math.max(1.2, R * .011);
    for (const [lam, phi, us] of dots) {
      const [x, y, z] = proj(lam, phi);
      if (z <= 0 || x < -5 || x > W + 5 || y < -5 || y > H + 5) continue;
      ctx.fillStyle = "rgba(" + (us ? C.usa : C.land) + "," + ((us ? .45 : .25) + .55 * z).toFixed(2) + ")";
      ctx.fillRect(x - dot / 2, y - dot / 2, dot, dot);
    }

    // study sites, labels fanned out with leader lines
    const pulse = .5 + .5 * Math.sin(t / 300), fs = Math.max(11, R * .058);
    SITES.forEach(([name, lo, la, ox, oy]) => {
      const [x, y, z] = proj(lo * RAD, la * RAD);
      if (z <= .05) return;
      const r = dot * 1.5;
      ctx.fillStyle = "rgba(253,208,35," + (.28 * pulse * z) + ")";
      ctx.beginPath(); ctx.arc(x, y, r * (1.8 + 1.8 * pulse), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.glow; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      if (labels > 0) {
        const lx = x + ox * R, ly = y + oy * R;
        ctx.save(); ctx.globalAlpha = alpha * labels;
        ctx.setLineDash([]); ctx.strokeStyle = "rgba(239,234,245,.55)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lx, ly); ctx.stroke();
        label(name, lx + (ox >= 0 ? 4 : -4), ly, fs, C.text, ox >= 0 ? "left" : "right");
        ctx.restore();
      }
    });

    if (zoom === 0) { ctx.setLineDash([3, 6]); ctx.strokeStyle = "rgba(239,234,245,.3)"; path(true); ctx.setLineDash([]); if (sz >= 0) satellite(sx, sy, R * .045, 1, heading); }
    ctx.restore();
  }

  // ---- Contiguous U.S. scans: satellite descends north to south, once per layer ----
  function drawScan(t, alpha) {
    // which layer is being scanned, and how far along
    let i = 0, local = t;
    while (i < LAYERS.length - 1 && local >= LAYERS[i].scan + LAYERS[i].hold) { local -= LAYERS[i].scan + LAYERS[i].hold; i++; }
    const L = LAYERS[i], prev = LAYERS[i - 1], p = clamp(local / L.scan);

    const k = Math.cos(38 * RAD), aspect = (59 * k) / 26;          // simple equirectangular view
    let mw = W * .84, mh = mw / aspect;
    if (mh > H * .72) { mh = H * .72; mw = mh * aspect; }
    const mx = (W - mw) / 2, my = H * .1, cw = mw / GW, ch = mh / GH;
    const toXY = (lon, lat) => [mx + (lon - L0) / 59 * mw, my + (B1 - lat) / 26 * mh];
    ctx.save(); ctx.globalAlpha = alpha;

    // Whiskbroom scan: the sensor sweeps each row from west to east, cell by cell,
    // while the satellite moves north to south. Unscanned cells show the previous map
    // (or a faint empty grid before the first pass).
    const pos = p * GH, row = Math.floor(pos), col = (pos - row) * GW;
    const scanned = (r, c) => r < row || (r === row && c < col);
    for (const cell of cells) {
      const [c, r] = cell, x = mx + c * cw, y = my + r * ch;
      if (scanned(r, c)) { ctx.fillStyle = L.color(cell[2 + i]); ctx.fillRect(x, y, Math.ceil(cw), Math.ceil(ch)); }
      else if (prev) { ctx.fillStyle = prev.color(cell[1 + i]); ctx.fillRect(x, y, Math.ceil(cw), Math.ceil(ch)); }
      else { ctx.fillStyle = "rgba(239,234,245,.09)"; ctx.fillRect(x + .5, y + .5, cw - 1, ch - 1); }
    }

    // satellite on a descending pass, drifting slightly west like a sun-synchronous orbit;
    // its beam follows the scan head across the current row
    if (p < 1) {
      const hx = mx + col * cw, hy = my + (row + .5) * ch;             // scan head
      const sx = mx + mw * lerp(.62, .48, p), sy = hy - H * .14, s = Math.max(5, W * .012);
      // short glowing trail behind the scan head
      const tr = ctx.createLinearGradient(hx - cw * 14, 0, hx, 0);
      tr.addColorStop(0, "rgba(253,208,35,0)"); tr.addColorStop(1, "rgba(253,208,35,.55)");
      ctx.fillStyle = tr; ctx.fillRect(Math.max(mx, hx - cw * 14), my + row * ch, Math.min(cw * 14, hx - mx), ch);
      // beam from the satellite to the scan head
      const bm = ctx.createLinearGradient(sx, sy, hx, hy);
      bm.addColorStop(0, "rgba(253,208,35,.45)"); bm.addColorStop(1, "rgba(253,208,35,.12)");
      ctx.fillStyle = bm; ctx.beginPath(); ctx.moveTo(sx, sy);
      ctx.lineTo(hx - cw * 1.5, hy + ch * .5); ctx.lineTo(hx + cw * 1.5, hy + ch * .5); ctx.closePath(); ctx.fill();
      // bright scan head
      ctx.fillStyle = "#FFF6D6"; ctx.fillRect(hx - cw * .6, my + row * ch - ch * .1, cw * 1.2, ch * 1.2);
      satellite(sx, sy, s, 1, Math.atan2(mh, -mw * .14) - Math.PI / 2);
    }

    // study sites in the U.S. appear after each completed pass
    if (p >= 1) {
      const a = clamp((local - L.scan) / 500);
      SITES.filter(s => s[1] < -60).forEach(([, lo, la]) => {
        const [x, y] = toXY(lo, la);
        ctx.strokeStyle = "rgba(60,16,83," + a + ")"; ctx.lineWidth = 2;
        ctx.fillStyle = "rgba(239,234,245," + a + ")";
        ctx.beginPath(); ctx.arc(x, y, Math.max(3.5, W * .006), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
    }

    // variable name and legend
    const fs = Math.max(11, W * .018), by = H - H * .065;
    label(L.name, mx, by, fs * .9, C.text);
    const nameW = ctx.measureText(L.name).width;
    label("Illustrative", mx + nameW + 10, by, fs * .75, C.muted);
    const lw = W * .1, lx = mx + mw - lw - W * .06;
    const lg = ctx.createLinearGradient(lx, 0, lx + lw, 0);
    L.stops.forEach((c, j) => lg.addColorStop(j / 4, "rgb(" + c.join(",") + ")"));
    label(L.low, lx - 6, by, fs * .8, C.muted, "right");
    ctx.fillStyle = lg; ctx.fillRect(lx, by - 4, lw, 8);
    label(L.high, lx + lw + 6, by, fs * .8, C.muted);
    ctx.restore();
  }

  function frame(ms) {
    if (!W) return;
    ctx.globalAlpha = 1; ctx.fillStyle = C.bg; ctx.fillRect(0, 0, FW, H);
    ctx.save(); ctx.translate(SX, 0); draw(ms % TOTAL); ctx.restore();
  }
  function draw(t) {
    if (t < at.turn) drawGlobe(t, VIEW_BD, clamp(t / 500), 0, 1);
    else if (t < at.us) {
      const q = ease((t - at.turn) / T.turn);
      drawGlobe(t, [lerp(VIEW_BD[0], VIEW_BD[0] - 360 + (VIEW_US[0] + 360 - VIEW_BD[0]) % 360, q), lerp(VIEW_BD[1], VIEW_US[1], q)],
        clamp(1 - (t - at.turn) / 400), 0, 1);
    } else if (t < at.zoom) drawGlobe(t, VIEW_US, clamp((t - at.us) / 500), 0, 1);
    else if (t < at.maps) {
      const z = ease((t - at.zoom) / T.zoom);
      drawGlobe(t, [VIEW_US[0] - 8 * z, VIEW_US[1] + 4 * z], 0, z, 1 - z);
      drawScan(0, z);
    } else if (t < at.fade) drawScan(t - at.maps, 1);
    else {
      const f = (t - at.fade) / T.fade;
      drawScan(T.maps - 1, 1 - f); drawGlobe(0, VIEW_BD, 0, 0, f);
    }
  }

  resize();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, still = at.maps + LAYERS[0].scan + 500;
  addEventListener("resize", () => { resize(); if (reduce) frame(still); });
  if (reduce) frame(still);                          // finished U.S. map as a still image
  else {
    const start = performance.now();
    (function loop(now) { if (cv.offsetParent !== null) frame(now - start); requestAnimationFrame(loop); })(start);  // pauses on other tabs
  }
  window.addEventListener("geoanim:show", () => { resize(); if (reduce) frame(still); });
})();
