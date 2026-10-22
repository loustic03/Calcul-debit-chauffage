/* Moteur de calcul puissance <-> débit d'un circuit d'eau de chauffage.
 * P (kW) = C × qv (m³/h) × ΔT (K)   avec C = ρ·cp / 3,6e6 en kWh/(m³·K)
 * Utilisable dans le navigateur (window.Calc) et sous Node (module.exports).
 */
(function (root) {
  'use strict';

  var FLUIDES = {
    eau:   { label: 'Eau',                                 coef: 1.16,  rho: 1000, cp: 4185 },
    meg30: { label: 'Eau + monoéthylène glycol 30 %',     coef: 1.072, rho: 1037, cp: 3721 },
    mpg30: { label: 'Eau + monopropylène glycol 30 %',    coef: 1.092, rho: 1010, cp: 3892 }
  };

  var REGIMES = [
    { id: '90/70', dep: 90, ret: 70, label: 'Radiateurs haute température (anciennes installations)' },
    { id: '80/60', dep: 80, ret: 60, label: 'Chaudière traditionnelle — régime de référence' },
    { id: '70/50', dep: 70, ret: 50, label: 'Radiateurs sur chaudière à condensation' },
    { id: '60/40', dep: 60, ret: 40, label: 'Condensation basse température' },
    { id: '50/40', dep: 50, ret: 40, label: 'Radiateurs basse température, pompe à chaleur' },
    { id: '45/40', dep: 45, ret: 40, label: 'Pompe à chaleur air/eau' },
    { id: '40/35', dep: 40, ret: 35, label: 'Plancher chauffant hydraulique' },
    { id: '35/28', dep: 35, ret: 28, label: 'Plancher chauffant basse température' }
  ];

  // Facteurs vers m³/h
  var UNITES_DEBIT = { 'm3h': 1, 'lh': 0.001, 'ls': 3.6, 'lmin': 0.06 };
  // Facteurs vers kW
  var UNITES_PUISSANCE = { 'w': 0.001, 'kw': 1 };

  function num(x) {
    if (typeof x === 'string') x = x.replace(',', '.').trim();
    if (x === '' || x === null || x === undefined) return NaN;
    return Number(x);
  }
  function ok(x) { return isFinite(x) && x > 0; }

  /** Débit (m³/h) à partir d'une puissance (kW) et d'un ΔT (K). null si entrées invalides. */
  function debit(pKw, dT, coef) {
    pKw = num(pKw); dT = num(dT); coef = coef === undefined ? 1.16 : num(coef);
    if (!ok(pKw) || !ok(dT) || !ok(coef)) return null;
    return pKw / (coef * dT);
  }

  /** Puissance (kW) à partir d'un débit (m³/h) et d'un ΔT (K). null si entrées invalides. */
  function puissance(qM3h, dT, coef) {
    qM3h = num(qM3h); dT = num(dT); coef = coef === undefined ? 1.16 : num(coef);
    if (!ok(qM3h) || !ok(dT) || !ok(coef)) return null;
    return coef * qM3h * dT;
  }

  /** ΔT (K) à partir d'une puissance (kW) et d'un débit (m³/h). */
  function deltaT(pKw, qM3h, coef) {
    pKw = num(pKw); qM3h = num(qM3h); coef = coef === undefined ? 1.16 : num(coef);
    if (!ok(pKw) || !ok(qM3h) || !ok(coef)) return null;
    return pKw / (coef * qM3h);
  }

  function versM3h(v, unite) { v = num(v); var f = UNITES_DEBIT[unite]; return isFinite(v) && f ? v * f : NaN; }
  function depuisM3h(v, unite) { var f = UNITES_DEBIT[unite]; return f ? v / f : NaN; }
  function versKw(v, unite) { v = num(v); var f = UNITES_PUISSANCE[unite]; return isFinite(v) && f ? v * f : NaN; }

  var api = {
    FLUIDES: FLUIDES, REGIMES: REGIMES, UNITES_DEBIT: UNITES_DEBIT, UNITES_PUISSANCE: UNITES_PUISSANCE,
    debit: debit, puissance: puissance, deltaT: deltaT,
    versM3h: versM3h, depuisM3h: depuisM3h, versKw: versKw, num: num
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Calc = api;
})(this);
