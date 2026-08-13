// ==========================================================
// GEO ENGINE — carrega geometria REAL (GeoJSON/TopoJSON) para mapas
// do tipo 'geo' (Brasil, EUA) e projeta as formas verdadeiras dos
// territórios pro canvas do jogo, em vez de aproximar tudo por Voronoi.
//
// Filosofia: só o VISUAL depende do fetch. O jogo em si (contagem de
// territórios, ids, posição aproximada pra cálculo de distância e
// sorteio de capital) já funciona com os nx,ny "fallback" que cada
// mapa 'geo' também traz prontos — exatamente como os outros mapas do
// jogo (mesmo formato, mesma ordem que o servidor espera). Se o fetch
// falhar (sem internet, CDN fora do ar), o jogo cai pro Voronoi de
// sempre com esses pontos fallback e continua jogável.
// ==========================================================
(function () {
  const httpCache = {};

  function loadJson(url) {
    if (httpCache[url]) return httpCache[url];
    httpCache[url] = fetch(url).then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
    return httpCache[url];
  }

  // Funde vários "features" do GeoJSON num único MultiPolygon — usado
  // pelos territórios agrupados (ex.: "NE" = SE+AL+PE+PB+RN).
  function mergeFeatures(features) {
    const coords = [];
    features.forEach(f => {
      const g = f && f.geometry;
      if (!g) return;
      if (g.type === 'Polygon') coords.push(g.coordinates);
      else if (g.type === 'MultiPolygon') g.coordinates.forEach(c => coords.push(c));
    });
    return { type: 'Feature', geometry: { type: 'MultiPolygon', coordinates: coords }, properties: {} };
  }

  // Carrega e organiza os territórios de um mapa 'geo' na MESMA ordem
  // que mapDef.territories define (que é a mesma ordem que o servidor
  // usa nos ids) — casando cada entrada com 1+ features reais.
  function loadGeoMap(mapDef) {
    if (mapDef._loading) return mapDef._loading;

    mapDef._loading = (async () => {
      const src = mapDef.geoSource;
      const featuresByKey = {};

      if (src.format === 'topojson') {
        const topo = await loadJson(src.url);
        const geo = topojson.feature(topo, topo.objects[src.objectName]);
        geo.features.forEach(f => { featuresByKey[String(Number(f.id))] = f; });
      } else {
        const geo = await loadJson(src.url);
        geo.features.forEach(f => {
          const key = f.properties && f.properties[src.siglaProperty];
          if (key) featuresByKey[key] = f;
        });
      }

      const merged = mapDef.territories.map(def => {
        const feats = def.match.map(k => featuresByKey[k]).filter(Boolean);
        if (!feats.length) return null;
        return feats.length === 1 ? feats[0] : mergeFeatures(feats);
      });

      // Só aceita o carregamento se TODOS os territórios bateram — um
      // mapa "pela metade" (alguns estados reais, outros voronoi) seria
      // mais confuso visualmente do que simplesmente cair pro fallback
      // inteiro.
      if (merged.some(f => !f)) {
        console.warn('[GeoMap] Algum território de "' + mapDef.name + '" não bateu com a geometria real — usando fallback (Voronoi).');
        mapDef._features = null;
        return null;
      }

      mapDef._features = merged;
      return merged;
    })().catch(err => {
      console.warn('[GeoMap] Falha ao carregar geometria real de "' + mapDef.name + '":', err);
      mapDef._features = null;
      return null;
    });

    return mapDef._loading;
  }

  window.GeoEngine = { loadGeoMap };
})();
