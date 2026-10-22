/* Estimation simplifiée des besoins de chauffage et de climatisation, pièce par pièce.
 *
 * Chaud : P = G × V × (Tint − Tbase) × majorations
 *   G   : coefficient volumique de déperditions (W/(m³·K)), selon l'isolation
 *   Tbase : température extérieure de base (zone climatique + altitude)
 * Froid, méthode « btu » (par défaut) : P (kW) = (V × 100 BTU + 1 000 BTU × fenêtres) / 3 415
 * Froid, méthode « detail » : P = V × q × f_expo × f_toit × f_baies × f_zone + apports internes
 *   q   : charge volumique de référence (W/m³), selon l'isolation
 *
 * Méthode d'avant-projet : elle ne remplace pas une étude thermique (NF EN 12831 / bilan de charges).
 */
(function (root) {
  'use strict';

  var ISOLATION = {
    tbi:   { label: 'Très bien isolé (RE2020, BBC, passif)',          G: 0.55, q: 25 },
    rt2012:{ label: 'Bien isolé (RT 2012, rénovation récente)',        G: 0.75, q: 30 },
    rt2000:{ label: 'Isolation correcte (construit 2000-2012)',        G: 0.95, q: 35 },
    moyen: { label: 'Isolation moyenne (1975-2000)',                   G: 1.2,  q: 40 },
    faible:{ label: 'Peu ou pas isolé (avant 1975)',                   G: 1.6,  q: 45 }
  };

  // Températures extérieures de base hivernales (zones de la carte française, à basse altitude)
  var ZONES_HIVER = {
    A: { tb: -2,  label: 'Zone A — littoral méditerranéen, Corse (−2 °C)' },
    B: { tb: -4,  label: 'Zone B — littoral atlantique sud, Côte d’Azur (−4 °C)' },
    C: { tb: -5,  label: 'Zone C — Bretagne, littoral atlantique (−5 °C)' },
    D: { tb: -7,  label: 'Zone D — Ouest, Sud-Ouest, Normandie (−7 °C)' },
    E: { tb: -8,  label: 'Zone E — Centre-Ouest, Île-de-France (−8 °C)' },
    F: { tb: -9,  label: 'Zone F — Nord, Centre (−9 °C)' },
    G: { tb: -10, label: 'Zone G — Bourgogne, Rhône-Alpes (−10 °C)' },
    H: { tb: -12, label: 'Zone H — Lorraine, Champagne, Massif central (−12 °C)' },
    I: { tb: -15, label: 'Zone I — Alsace, Franche-Comté, Jura (−15 °C)' }
  };

  var ZONES_ETE = {
    nord:   { f: 0.9,  label: 'Été doux — Nord, Bretagne, Normandie, littoral Manche' },
    centre: { f: 1.0,  label: 'Été modéré — Centre, Île-de-France, Ouest, Est' },
    sud:    { f: 1.15, label: 'Été chaud — Sud-Est, Méditerranée, vallée du Rhône, Sud-Ouest intérieur' }
  };

  var EXPOSITIONS = {
    aucune: { f: 0.85, label: 'Aucune / mur intérieur' },
    N:      { f: 0.9,  label: 'Nord' },
    E:      { f: 1.0,  label: 'Est' },
    S:      { f: 1.1,  label: 'Sud' },
    O:      { f: 1.15, label: 'Ouest / Sud-Ouest' }
  };

  var TYPES = {
    sejour:  { label: 'Séjour / salon', tint: 20, apport: 0 },
    chambre: { label: 'Chambre',        tint: 19, apport: 0 },
    cuisine: { label: 'Cuisine',        tint: 19, apport: 300 },
    bureau:  { label: 'Bureau',         tint: 20, apport: 150 },
    sdb:     { label: 'Salle de bain',  tint: 22, apport: 0 },
    autre:   { label: 'Autre',          tint: 19, apport: 0 }
  };

  var BTU_M3 = 100, BTU_FENETRE = 1000, BTU_PAR_KW = 3415;
  var W_PAR_OCCUPANT = 100;          // apport sensible + latent moyen d'une personne au repos
  var F_TOIT_FROID = 1.2, F_TOIT_CHAUD = 1.1;
  var F_BAIES_FROID = 1.15, F_BAIES_CHAUD = 1.1;

  // Puissances frigorifiques nominales courantes des unités intérieures (kW) et équivalent BTU/h commercial
  var TAILLES = [
    { kw: 2.0, btu: 7000 }, { kw: 2.5, btu: 9000 }, { kw: 3.5, btu: 12000 },
    { kw: 4.2, btu: 14000 }, { kw: 5.0, btu: 18000 }, { kw: 6.0, btu: 21000 }, { kw: 7.1, btu: 24000 }
  ];

  function num(x) {
    if (typeof x === 'string') x = x.replace(',', '.').trim();
    if (x === '' || x === null || x === undefined) return NaN;
    return Number(x);
  }

  /** Température de base corrigée de l'altitude : −1 °C par tranche de 200 m au-dessus de 200 m. */
  function tBase(zone, altitude) {
    var z = ZONES_HIVER[zone]; if (!z) return NaN;
    var alt = num(altitude); if (!isFinite(alt) || alt < 0) alt = 0;
    var corr = alt > 200 ? Math.ceil((alt - 200) / 200) : 0;
    return z.tb - corr;
  }

  /**
   * Calcule une pièce. params = { isolation, tbase, zoneEte }
   * piece = { surface, hauteur, type, tint?, expo, toit, baies, occupants }
   * Retourne { volume, chaud, froid } en W, ou null si surface/hauteur invalides.
   */
  function piece(p, params) {
    var S = num(p.surface), H = num(p.hauteur);
    if (!(S > 0) || !(H > 0) || !isFinite(S) || !isFinite(H)) return null;
    var iso = ISOLATION[params.isolation] || ISOLATION.rt2000;
    var type = TYPES[p.type] || TYPES.autre;
    var expo = EXPOSITIONS[p.expo] || EXPOSITIONS.E;
    var ete = ZONES_ETE[params.zoneEte] || ZONES_ETE.centre;
    var tint = isFinite(num(p.tint)) ? num(p.tint) : type.tint;
    var occ = num(p.occupants); if (!(occ >= 0)) occ = 0;
    var V = S * H;

    var dT = tint - num(params.tbase);
    var chaud = dT > 0 ? iso.G * V * dT : 0;
    if (p.toit) chaud *= F_TOIT_CHAUD;
    if (p.baies) chaud *= F_BAIES_CHAUD;

    var froid, btu = null;
    if (params.methode === 'btu') {
      // Méthode « métier » : (V × 100 BTU + 1 000 BTU par fenêtre) / 3 415 = kW
      var kV = num(params.btuM3), kF = num(params.btuFen), nf = num(p.fenetres);
      if (!(kV >= 0)) kV = BTU_M3; if (!(kF >= 0)) kF = BTU_FENETRE; if (!(nf >= 0)) nf = 0;
      btu = V * kV + nf * kF;
      froid = btu / BTU_PAR_KW * 1000;
    } else {
      froid = V * iso.q * expo.f * ete.f;
      if (p.toit) froid *= F_TOIT_FROID;
      if (p.baies) froid *= F_BAIES_FROID;
      froid += occ * W_PAR_OCCUPANT + type.apport;
      btu = froid / 1000 * BTU_PAR_KW;
    }

    return { volume: V, chaud: chaud, froid: froid, btu: btu, tint: tint };
  }

  /** Plus petite taille d'unité intérieure couvrant le besoin froid (W). null si au-delà de la gamme. */
  function taille(froidW) {
    for (var i = 0; i < TAILLES.length; i++) if (TAILLES[i].kw * 1000 >= froidW) return TAILLES[i];
    return null;
  }

  var api = {
    ISOLATION: ISOLATION, ZONES_HIVER: ZONES_HIVER, ZONES_ETE: ZONES_ETE, EXPOSITIONS: EXPOSITIONS,
    TYPES: TYPES, TAILLES: TAILLES, W_PAR_OCCUPANT: W_PAR_OCCUPANT,
    BTU_M3: BTU_M3, BTU_FENETRE: BTU_FENETRE, BTU_PAR_KW: BTU_PAR_KW,
    tBase: tBase, piece: piece, taille: taille, num: num
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Clim = api;
})(this);
