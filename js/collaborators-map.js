/* Dr. Rahman's Collaborators across the globe — interactive co-author network map
   GeoSENSE Lab website. Requires Leaflet 1.9.4 and js/world-110m.js. */
(function(){
  /* Set useTiles:true on your own website for a detailed street basemap (CARTO/OpenStreetMap).
     With false, a built-in world outline is used and nothing external is loaded. */
  /* ---------------------------------------------------------------------------
     SETTINGS
     Data files live in /resources. Paths are relative to pages/collaborators-map.html.
     Edit the CSV files and the map, year bar and counts update on the next page load.
     useTiles:true shows a detailed CARTO/OpenStreetMap basemap; false uses only the
     built-in world outline (js/world-110m.js).
     --------------------------------------------------------------------------- */
  var CONFIG = {
    useTiles: true,
    /* CARTO Basemaps key (https://carto.com/basemaps/apikey/). This key is visible to every visitor,
       so protect it with a domain restriction in the CARTO dashboard. Leave "" to use the plain outline map. */
    cartoKey: "",
    coauthorsCsv: "../resources/coauthors.csv",
    homesCsv:     "../resources/homes.csv",
    papersCsv:    "../resources/papers.csv"
  };
  var EMBED = { coauthors: null, homes: null, papers: null };

  function parseCSV(t){
    t = String(t).replace(/^\uFEFF/, "");
    var rows=[], row=[], f="", q=false;
    for (var i=0;i<t.length;i++){ var c=t[i];
      if (q){ if(c==='"'){ if(t[i+1]==='"'){ f+='"'; i++; } else q=false; } else f+=c; }
      else if (c==='"') q=true;
      else if (c===','){ row.push(f); f=""; }
      else if (c==='\n' || c==='\r'){ if(c==='\r' && t[i+1]==='\n') i++; row.push(f); f=""; if(row.join("").trim()!=="") rows.push(row); row=[]; }
      else f+=c; }
    row.push(f); if(row.join("").trim()!=="") rows.push(row);
    var head = rows.shift().map(function(h){ return h.trim(); });
    return rows.map(function(r){ var o={}; head.forEach(function(h,k){ o[h]=(r[k]||"").trim(); }); return o; });
  }
  function num(v){ var n=parseFloat(v); return isNaN(n)?null:n; }
  function buildData(coRows, hoRows, paRows){
    /* papers.csv: one row per publication with its research theme */
    var PAPERS = {};
    (paRows||[]).forEach(function(r){ if(r.paper_id) PAPERS[r.paper_id.trim()] = { year:num(r.year), title:r.title||"", theme:(r.theme||"").trim() }; });
    var homes = hoRows.filter(function(r){ return r.home; }).map(function(r){
      return { id:r.home, name:r.institution, city:r.city, country:r.country, lat:num(r.lat), lon:num(r.lon),
               period:r.period, order:num(r.career_order)||0, color:r.color||"", label:r.label||r.home }; });
    var people = {}, totals = {}, papers = {};
    coRows.forEach(function(r){
      var lat=num(r.lat), lon=num(r.lon), n=num(r.pubs)||0;
      if (!r.author || lat===null || lon===null || !r.home || n<=0) return;
      var k = r.author+"|"+lat.toFixed(4)+"|"+lon.toFixed(4);
      var p = people[k] || (people[k] = { name:r.author, inst:r.coauthor_institution, city:r.city, country:r.country,
                                          lat:lat, lon:lon, group:r.theme||r.group||"Other", area:r.group||"", links:[] });
      var pids = (r.papers||"").split(";").map(function(x){ return x.trim(); }).filter(Boolean);
      p.links.push({ home:r.home, n:n, y0:num(r.first_year), y1:num(r.last_year), pids:pids,
                     theme:((r.theme||r.group||"Other").split(";")[0]).trim() });
      totals[r.author] = (totals[r.author]||0) + n;
      (r.papers||"").split(";").forEach(function(x){ x=x.trim(); if(x) papers[x]=1; });
    });
    var list = Object.keys(people).map(function(k){ var p=people[k]; p.total=totals[p.name]; return p; });
    return { homes:homes, people:list, npapers:Object.keys(papers).length, papers:PAPERS };
  }
  function load(url, fallback){
    if (!url || !window.fetch) return Promise.resolve(fallback);
    return fetch(url, {cache:"no-cache"}).then(function(r){ if(!r.ok) throw new Error(r.status); return r.text(); })
      .catch(function(){ return fallback; });
  }
  var WORLD = window.GC_WORLD || { type:"FeatureCollection", features:[] };

  function start(DATA){
  /* research themes of the GeoSENSE Lab (from the "theme" column in coauthors.csv) */
  var GROUPS = [
    ["Environmental Health","Environmental Health","#777","Exposure to heat, air pollution, soil contaminants, and natural hazards."],
    ["Sustainability","Sustainability","#777","Land, food, and climate adaptation."],
    ["Public Health","Public Health","#777","Access to care and population health vulnerability."]
  ];
  var COLOR = {}, LABEL = {}, active = {};
  GROUPS.forEach(function(g){ COLOR[g[0]]=g[2]; LABEL[g[0]]=g[1]; });
  var PAPERS = DATA.papers || {};
  /* each link's papers carry their own theme, so one co-author can belong to several themes */
  function paperTheme(id, l){ var pp=PAPERS[id]; return (pp && pp.theme) || l.theme; }
  function paperYear(id, l){ var pp=PAPERS[id]; return (pp && pp.year) || l.y0 || l.y1 || null; }
  var USED = {};
  DATA.people.forEach(function(p){ p.links.forEach(function(l){
    if (l.pids.length) l.pids.forEach(function(id){ USED[paperTheme(id,l)]=1; }); else USED[l.theme]=1; }); });
  Object.keys(USED).forEach(function(t){ if(!(t in LABEL)){ LABEL[t]=t; GROUPS.push([t,t,"#777"]); } });
  GROUPS = GROUPS.filter(function(g){ return USED[g[0]]; });
  GROUPS.forEach(function(g){ active[g[0]]=true; });
  var SHORT = {BUET:"BUET", UACh:"UACh", GMU:"GMU", NJCU:"NJCU", Harvard:"Harvard", LSUHSC:"LSUHSC"};
  /* Institution colours, taken from each university's official brand palette */
  var HOMECOLOR = {
    BUET:   "#7D1A1E", // BUET logo red (#AC1F24) deepened to maroon so it stays distinct from Harvard Crimson
    UACh:   "#5999C2", // UACh institutional celeste (Pantone 291 variant)
    GMU:    "#005239", // George Mason Green
    NJCU:   "#00857C", // NJCU green (PMS 561), lifted slightly to separate it from Mason Green
    Harvard:"#A51C30", // Harvard Crimson
    LSUHSC: "#461D7C"  // LSU Health purple
  };
  DATA.homes.forEach(function(h){ if(h.color) HOMECOLOR[h.id]=h.color; if(!HOMECOLOR[h.id]) HOMECOLOR[h.id]="#555"; SHORT[h.id]=h.label||SHORT[h.id]||h.id; });
  /* year bar limits come straight from the data, so they grow when new publications are added */
  var YMIN=9999, YMAX=0;
  function seeYear(y){ if(!y) return; if(y<YMIN) YMIN=y; if(y>YMAX) YMAX=y; }
  DATA.people.forEach(function(p){ p.links.forEach(function(l){ seeYear(l.y0); seeYear(l.y1); l.pids.forEach(function(id){ seeYear(PAPERS[id] && PAPERS[id].year); }); }); });
  if (YMAX===0){ YMIN=2009; YMAX=new Date().getFullYear(); }
  var FALLBACK_YEAR = 2018; // used only for entries without a year

  var root = document.getElementById("gc-root");
  var HOME = {}; DATA.homes.forEach(function(h){ HOME[h.id]=h; h.start=9999; h.end=0; });
  DATA.people.forEach(function(p){ p.links.forEach(function(l){
    var y0=l.y0||FALLBACK_YEAR, y1=l.y1||FALLBACK_YEAR, h=HOME[l.home];
    if(y0<h.start) h.start=y0; if(y1>h.end) h.end=y1; });
    /* a co-author's figure takes the colour of the institution where most shared papers were written (latest wins a tie) */
    var best=null; p.links.forEach(function(l){ if(!best || l.n>best.n || (l.n===best.n && HOME[l.home].order>HOME[best.home].order)) best=l; });
    p.color = HOMECOLOR[best.home]; });

  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function width(n){ return 1 + 1.6*Math.sqrt(n); }
  function headSize(n){ return Math.round(13 + 2.4*Math.sqrt(n)); }
  function headSVG(color,s){
    return '<svg class="gc-head" width="'+s+'" height="'+s+'" viewBox="0 0 24 24" aria-hidden="true">'+
      '<circle cx="12" cy="7.2" r="4.7" fill="'+color+'" stroke="#fff" stroke-width="1.3"/>'+
      '<path d="M3.2 22.5c0-5.3 3.9-8.6 8.8-8.6s8.8 3.3 8.8 8.6z" fill="'+color+'" stroke="#fff" stroke-width="1.3"/></svg>';
  }

  var WORLD_VIEW = [[-42,-128],[62,148]];
  var map = L.map("gc-map", { minZoom:1, maxZoom: (CONFIG.useTiles && CONFIG.cartoKey)?14:8, zoomSnap:0.5, zoomDelta:0.5,
    scrollWheelZoom:true, worldCopyJump:false, maxBounds:[[-75,-220],[88,220]], maxBoundsViscosity:0.7 });
  map.fitBounds(WORLD_VIEW);
  map.createPane("gcLines").style.zIndex = 410;
  map.createPane("gcHomes").style.zIndex = 660;

  L.geoJSON(WORLD, { interactive:false, style:function(){ return {className:"gc-land", weight:0.6}; } }).addTo(map);
  if (CONFIG.useTiles && CONFIG.cartoKey) {
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=" + encodeURIComponent(CONFIG.cartoKey), {
      subdomains:"abcd", maxZoom:19,
      attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);
  } else {
    map.attributionControl.addAttribution("Boundaries: Natural Earth");
  }

  /* markers */
  function scaleFor(z){ return z<2.5 ? 0.66 : (z<4 ? 0.82 : 1); }
  function headIcon(p,k){ var s=Math.round(headSize(p.total)*k);
    return L.divIcon({ className:"", html: headSVG(p.color, s), iconSize:[s,s], iconAnchor:[s/2,s/2], popupAnchor:[0,-s/2] }); }
  var curScale = null;
  /* one person can appear at several places (e.g. at BUET early on, later at UCL); group those figures */
  var BYNAME = {};
  DATA.people.forEach(function(p){ (BYNAME[p.name] = BYNAME[p.name] || []).push(p); });
  /* Highlighting: hovering a co-author shows all of their links; hovering one of Dr. Rahman's
     institutions (on the map or in the legend) shows only the links made while he was there. */
  var focusName = null, focusHome = null;
  function focusOn(name){
    focusName = name; focusHome = null;
    lineLayer.eachLayer(function(l){
      var mine = l.options.who === name;
      l.setStyle({ opacity: mine ? .95 : .08 }); if (mine) l.bringToFront(); });
    DATA.people.forEach(function(p){ p.marker.setOpacity(1); });
  }
  function focusHomeOn(id){
    focusHome = id; focusName = null;
    var linked = {};
    lineLayer.eachLayer(function(l){
      var mine = l.options.home === id;
      if (mine) linked[l.options.who] = 1;
      l.setStyle({ opacity: mine ? .9 : .06 }); if (mine) l.bringToFront(); });
    DATA.people.forEach(function(p){
      var on = p.links.some(function(k){ return k.home === id && linkOn(k); });
      p.marker.setOpacity(on ? 1 : .3); });
  }
  function focusOff(){ focusName = null; focusHome = null;
    lineLayer.eachLayer(function(l){ l.setStyle({opacity:l.options.baseOpacity}); });
    DATA.people.forEach(function(p){ p.marker.setOpacity(1); }); }
  DATA.people.forEach(function(p){
    p.marker = L.marker([p.lat,p.lon], { keyboard:true, title:p.name, riseOnHover:true, icon: headIcon(p,1) });
    var all = BYNAME[p.name].slice().sort(function(a,b){
      function first(q){ return Math.min.apply(null, q.links.map(function(l){ return HOME[l.home].order; })); }
      return first(a)-first(b); });
    function items(q){ return q.links.slice().sort(function(a,b){ return HOME[a.home].order-HOME[b.home].order; }).map(function(l){
      var yr = l.y0 ? (l.y0===l.y1 ? l.y0 : l.y0+"–"+l.y1) : "undated";
      return "<li>"+esc(SHORT[l.home])+": "+l.n+(l.n===1?" publication":" publications")+" ("+yr+")</li>"; }).join(""); }
    var body;
    if (all.length===1) body = "<div>Dr. Rahman's institution at the time:</div><ul class='gc-pop-list'>"+items(p)+"</ul>";
    else body = all.map(function(q){ return "<div"+(q===p?"":" class='gc-pop-meta'")+">While "+esc(p.name.split(" ").slice(-1)[0])+
      " was at "+esc(q.inst)+(q===p?"":" (also on the map, highlighted)")+":</div><ul class='gc-pop-list'>"+items(q)+"</ul>"; }).join("");
    var tc = {};
    all.forEach(function(q){ q.links.forEach(function(l){
      if (l.pids.length) l.pids.forEach(function(id){ var t=paperTheme(id,l); tc[t]=(tc[t]||0)+1; }); else tc[l.theme]=(tc[l.theme]||0)+l.n; }); });
    var themeLine = GROUPS.filter(function(g){ return tc[g[0]]; }).map(function(g){ return esc(g[1])+" ("+tc[g[0]]+")"; }).join(", ");
    p.marker.bindPopup("<strong>"+esc(p.name)+"</strong><br><span class='gc-pop-meta'>"+esc(p.inst)+", "+esc(p.city)+", "+esc(p.country)+
      "</span><br>"+p.total+(p.total===1?" shared publication":" shared publications")+" in total"+
      (themeLine ? "<div class='gc-pop-meta'>Themes: "+themeLine+"</div>" : "")+body, {maxWidth:300});
    p.marker.on("mouseover", function(){ if(!focusName) focusOn(p.name); });
    p.marker.on("mouseout",  function(){ if(focusName===p.name && !p.marker.isPopupOpen()) focusOff(); });
    p.marker.on("popupopen", function(){ focusOn(p.name); });
    p.marker.on("popupclose", function(){ focusOff(); });
  });
  DATA.homes.forEach(function(h){
    h.marker = L.marker([h.lat,h.lon], { pane:"gcHomes", title:h.name, keyboard:true,
      icon: L.divIcon({ className:"", html:'<div class="gc-homeicon" style="background:'+HOMECOLOR[h.id]+'"></div>', iconSize:[24,24], iconAnchor:[12,12], popupAnchor:[0,-12] }) });
    h.marker.bindTooltip(SHORT[h.id]||h.id, { permanent:true, direction:"right", offset:[10,0], className:"gc-homelabel", pane:"gcHomes" });
    h.marker.on("mouseover", function(){ focusHomeOn(h.id); });
    h.marker.on("mouseout",  function(){ if (focusHome===h.id && !h.marker.isPopupOpen()) focusOff(); });
    h.marker.on("popupopen", function(){ focusHomeOn(h.id); });
    h.marker.on("popupclose", function(){ focusOff(); });
  });

  var lineLayer = L.layerGroup().addTo(map), personLayer = L.layerGroup().addTo(map), homeLayer = L.layerGroup().addTo(map);
  var pathLayer = L.layerGroup().addTo(map);
  var yFrom = YMIN, yTo = YMAX;

  /* number of a link's papers that match the selected themes and years */
  function linkCount(l){
    if (!l.pids.length){ var a=l.y0||FALLBACK_YEAR, b=l.y1||FALLBACK_YEAR; return (active[l.theme] && a<=yTo && b>=yFrom) ? l.n : 0; }
    var c=0; l.pids.forEach(function(id){ var y=paperYear(id,l)||FALLBACK_YEAR; if(active[paperTheme(id,l)] && y>=yFrom && y<=yTo) c++; });
    return c;
  }
  function linkOn(l){ return linkCount(l) > 0; }
  function personOn(p){ return p.links.some(linkOn); }
  function homeOn(h){ return h.start <= yTo && h.end >= yFrom; }

  function curve(a,b){ // a,b layer points -> array of latlngs
    var mx=(a.x+b.x)/2, my=(a.y+b.y)/2, dx=b.x-a.x, dy=b.y-a.y, d=Math.sqrt(dx*dx+dy*dy);
    var bow = d < 90 ? 0.55 : 0.18, cx=mx - dy*bow, cy=my + dx*bow, pts=[];
    if (d<1) return [map.layerPointToLatLng(a), map.layerPointToLatLng(b)];
    for (var i=0;i<=18;i++){ var t=i/18, u=1-t;
      pts.push(map.layerPointToLatLng(L.point(u*u*a.x+2*u*t*cx+t*t*b.x, u*u*a.y+2*u*t*cy+t*t*b.y))); }
    return pts;
  }

  function layout(){
    lineLayer.clearLayers(); pathLayer.clearLayers();
    var k = scaleFor(map.getZoom()), R = 30*k, C = 12*k, clusters = [];
    if (k!==curScale){ curScale=k; DATA.people.forEach(function(p){ p.marker.setIcon(headIcon(p,k)); }); }
    var homes = DATA.homes.filter(homeOn);
    homes.forEach(function(h){ var pt=map.latLngToLayerPoint([h.lat,h.lon]);
      clusters.push({c:pt, home:h, members:[]}); if(!homeLayer.hasLayer(h.marker)) h.marker.addTo(homeLayer); });
    DATA.homes.forEach(function(h){ if(!homeOn(h) && homeLayer.hasLayer(h.marker)) homeLayer.removeLayer(h.marker); });
    DATA.people.forEach(function(p){ if(!personOn(p) && personLayer.hasLayer(p.marker)){ personLayer.removeLayer(p.marker); p.lines=[]; } });
    var people = DATA.people.filter(personOn).sort(function(a,b){ return b.total-a.total; });
    people.forEach(function(p){
      var pt = map.latLngToLayerPoint([p.lat,p.lon]), best=null, bd=R;
      clusters.forEach(function(c){ var d=c.c.distanceTo(pt); if(d<bd){bd=d; best=c;} });
      if(!best){ best={c:pt, home:null, members:[]}; clusters.push(best); }
      best.members.push(p);
    });
    clusters.forEach(function(c){
      var off = c.home ? 11 : (c.members.length>1 ? 0.6 : 0);
      c.members.forEach(function(p,i){
        var k=i+off, r = (c.members.length===1 && !c.home) ? 0 : C*Math.sqrt(k), a = k*2.39996;
        p.pos = map.layerPointToLatLng(L.point(c.c.x + r*Math.cos(a), c.c.y + r*Math.sin(a)));
        p.marker.setLatLng(p.pos); if(!personLayer.hasLayer(p.marker)) p.marker.addTo(personLayer);
      });
    });
    people.slice().reverse().forEach(function(p){
      p.lines = [];
      p.links.forEach(function(l){
        if(!linkOn(l)) return;
        var h = HOME[l.home], a = map.latLngToLayerPoint([h.lat,h.lon]), b = map.latLngToLayerPoint(p.pos);
        var line = L.polyline(curve(a,b), { pane:"gcLines", who:p.name, home:l.home, color:HOMECOLOR[l.home], weight:width(linkCount(l)),
          opacity:.5, baseOpacity:.5, lineCap:"round", interactive:false });
        line.addTo(lineLayer); p.lines.push(line);
      });
    });
    var path = homes.slice().sort(function(a,b){ return a.order-b.order; }).map(function(h){ return [h.lat,h.lon]; });
    if (path.length>1) L.polyline(path, { pane:"gcLines", color:"#555", weight:2, dashArray:"6 6", opacity:.75, interactive:false }).addTo(pathLayer);
    homes.forEach(function(h){
      var n = people.filter(function(p){ return p.links.some(function(l){ return l.home===h.id && linkOn(l); }); }).length;
      h.marker.unbindPopup(); h.marker.bindPopup("<strong>"+esc(h.name)+"</strong><br><span class='gc-pop-meta'>"+esc(h.city)+", "+esc(h.country)+
        "<br>"+esc(h.period)+"</span><br>"+n+(n===1?" co-author":" co-authors")+" linked here", {maxWidth:260});
    });
    var shown = homes.slice().sort(function(a,b){ return b.order-a.order; }), used = {};
    shown.forEach(function(h){
      if (used[h.id]) return;
      var pt = map.latLngToLayerPoint([h.lat,h.lon]);
      var near = shown.filter(function(o){ return !used[o.id] && map.latLngToLayerPoint([o.lat,o.lon]).distanceTo(pt) < 34; });
      near.forEach(function(o){ used[o.id]=1; if(o!==h) o.marker.closeTooltip(); });
      h.marker.setTooltipContent(near.sort(function(a,b){ return a.order-b.order; }).map(function(o){
        return '<span style="background:'+HOMECOLOR[o.id]+';border-radius:3px;padding:1px 6px;display:inline-block">'+SHORT[o.id]+'</span>'; }).join(" "));
      h.marker.openTooltip();
    });
    if (focusName) focusOn(focusName); else if (focusHome) focusHomeOn(focusHome);
    var names = {}, countries = {};
    people.forEach(function(p){ names[p.name]=1; countries[p.country]=1; });
    document.getElementById("gc-stat").textContent = (function(){ var n=Object.keys(names).length, c=Object.keys(countries).length;
      return "Showing " + n + (n===1?" co-author":" co-authors") + " in " + c + (c===1?" country, ":" countries, "); })() + (yFrom===yTo ? yFrom : yFrom + "–" + yTo) + ".";
  }

  /* legend */
  var legend = document.getElementById("gc-legend");
  GROUPS.forEach(function(g){
    var li=document.createElement("li"), b=document.createElement("button");
    b.type="button"; b.className="gc-chip"; b.setAttribute("aria-pressed","true");
    b.textContent=g[1];
    if (g[3]) { var tip=document.createElement("span"); tip.className="gc-tip"; tip.id="gc-tip-"+legend.children.length; tip.setAttribute("role","tooltip");
      tip.textContent=g[3]; b.appendChild(tip); b.setAttribute("aria-describedby", tip.id); }
    b.addEventListener("click", function(){ active[g[0]]=!active[g[0]]; b.setAttribute("aria-pressed", String(active[g[0]])); map.closePopup(); layout(); });
    li.appendChild(b); legend.appendChild(li);
  });
  var homeList = document.getElementById("gc-homes");
  DATA.homes.slice().sort(function(a,b){ return a.order-b.order; }).forEach(function(h){
    var li=document.createElement("li");
    li.innerHTML='<span class="gc-homeicon" style="width:16px;height:16px;border-width:2px;background:'+HOMECOLOR[h.id]+'" aria-hidden="true"></span>'+esc(h.name);
    li.tabIndex = 0; li.style.cursor = "default";
    li.addEventListener("mouseenter", function(){ focusHomeOn(h.id); });
    li.addEventListener("mouseleave", function(){ focusOff(); });
    li.addEventListener("focus", function(){ focusHomeOn(h.id); });
    li.addEventListener("blur", function(){ focusOff(); });
    homeList.appendChild(li); });
  document.getElementById("gc-headkey").innerHTML = headSVG("#666",18)+"Co-author, coloured by the institution with most shared papers (larger = more)";
  document.getElementById("gc-widthkey").innerHTML = '<svg width="78" height="16" aria-hidden="true">'+
    [1,5,25].map(function(n,i){ return '<line x1="'+(i*27+2)+'" y1="8" x2="'+(i*27+22)+'" y2="8" stroke="currentColor" stroke-linecap="round" stroke-width="'+width(n).toFixed(1)+'"/>'; }).join("")+
    '</svg>Line width: 1, 5, 25 publications';

  /* controls */
  var fromEl = document.getElementById("gc-from"), toEl = document.getElementById("gc-to"),
      fromOut = document.getElementById("gc-fromout"), toOut = document.getElementById("gc-toout"),
      playBtn = document.getElementById("gc-play"), timer=null;
  [fromEl,toEl].forEach(function(el){ el.min=YMIN; el.max=YMAX; });
  var fill = document.getElementById("gc-fill");
  document.getElementById("gc-npubs").textContent = DATA.npapers;
  document.getElementById("gc-span").textContent = YMIN + "–" + YMAX;
  function setRange(a,b){ yFrom=a; yTo=b; fromEl.value=a; toEl.value=b; fromOut.textContent=a; toOut.textContent=b;
    var span = Math.max(1, YMAX-YMIN);
    fill.style.left = ((a-YMIN)/span*100)+"%"; fill.style.right = ((YMAX-b)/span*100)+"%";
    fromEl.style.zIndex = (a > YMIN + span/2) ? 3 : 2; toEl.style.zIndex = (a > YMIN + span/2) ? 2 : 3;
    map.closePopup(); layout(); }
  fromEl.addEventListener("input", function(){ stop(); var a=+fromEl.value; setRange(a, Math.max(a, yTo)); });
  toEl.addEventListener("input", function(){ stop(); var b=+toEl.value; setRange(Math.min(yFrom, b), b); });
  function stop(){ if(timer){ clearInterval(timer); timer=null; playBtn.textContent="Play timeline"; } }
  playBtn.addEventListener("click", function(){
    if(timer){ stop(); return; }
    playBtn.textContent="Pause"; var start = yFrom; setRange(start, start);
    timer = setInterval(function(){ if(yTo>=YMAX){ stop(); return; } setRange(start, yTo+1); }, 750);
  });
  document.getElementById("gc-reset").addEventListener("click", function(){ stop(); setRange(YMIN,YMAX); map.fitBounds(WORLD_VIEW); });

  map.on("zoomend viewreset", layout);
  setRange(YMIN, YMAX);
  setTimeout(function(){ map.invalidateSize(); }, 200);
  } // end start

  Promise.all([ load(CONFIG.coauthorsCsv, EMBED.coauthors), load(CONFIG.homesCsv, EMBED.homes), load(CONFIG.papersCsv, EMBED.papers) ])
    .then(function(t){
      if (!t[0] || !t[1]) throw new Error("CSV files not found");
      start(buildData(parseCSV(t[0]), parseCSV(t[1]), t[2] ? parseCSV(t[2]) : []));
      sendHeight();
    })
    .catch(function(e){ document.getElementById("gc-stat").textContent = "The collaborator map could not load its data files. Check that coauthors.csv, homes.csv and papers.csv are in the resources folder, and view the site through a web server (opening the file directly from disk blocks data loading)."; if(window.console) console.error(e); });

  /* When this page is shown inside an <iframe> on the People page, tell the parent page how tall it is,
     so the frame grows and shrinks with the content (no inner scrollbar). */
  function sendHeight(){
    if (window.parent === window) return;
    var r = document.getElementById("gc-root");
    window.parent.postMessage({ gcMapHeight: Math.ceil(r.getBoundingClientRect().bottom + window.scrollY) + 8 }, "*");
  }
  window.addEventListener("load", sendHeight);
  window.addEventListener("resize", sendHeight);
  if (window.ResizeObserver) new ResizeObserver(sendHeight).observe(document.body);
})();
