const test = require('node:test');
const assert = require('node:assert');
const C = require('../calc.js');

const close = (a, b, tol = 1e-3) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test('exemple de référence : 20 kW, ΔT 20 K → 0,862 m³/h', () => close(C.debit(20, 20), 0.862));
test('chaudière 24 kW, ΔT 20 K → 1,03 m³/h', () => close(C.debit(24, 20), 1.034));
test('8 kW : 0,34 m³/h en 90/70, 1,38 m³/h en 40/35', () => {
  close(C.debit(8, 20), 0.345); close(C.debit(8, 5), 1.379);
});
test('calcul inverse : radiateur 0,13 m³/h × 8 K → 1,2 kW', () => close(C.puissance(0.13, 8), 1.2064));
test('PAC 8 kW à 1,2 m³/h → ΔT 5,7 K', () => close(C.deltaT(8, 1.2), 5.747));

test('réciprocité P → qv → P', () => {
  for (const p of [0.5, 1.5, 8, 20, 120]) for (const d of [5, 7, 10, 20]) {
    const q = C.debit(p, d); assert.ok(Math.abs(C.puissance(q, d) - p) / p < 1e-12);
  }
});

test('tableau des régimes : ΔT = départ − retour et débit pour 10 kW', () => {
  const attendu = { '90/70': 0.43, '80/60': 0.43, '70/50': 0.43, '60/40': 0.43, '50/40': 0.86, '45/40': 1.72, '40/35': 1.72, '35/28': 1.23 };
  for (const r of C.REGIMES) {
    const [dep, ret] = r.id.split('/').map(Number);
    assert.strictEqual(r.dep - r.ret, dep - ret);
    close(C.debit(10, r.dep - r.ret), attendu[r.id], 0.005);
  }
});

test('fluides glycolés : majoration +8 % MEG, +6 % MPG', () => {
  close(C.debit(10, 10, C.FLUIDES.meg30.coef) / C.debit(10, 10) - 1, 0.082, 0.005);
  close(C.debit(10, 10, C.FLUIDES.mpg30.coef) / C.debit(10, 10) - 1, 0.062, 0.005);
  for (const f of Object.values(C.FLUIDES)) close(f.rho * f.cp / 3.6e6, f.coef, 0.005);
});

test('conversions d’unités', () => {
  close(C.versM3h(862, 'lh'), 0.862);
  close(C.versM3h(0.24, 'ls'), 0.864);
  close(C.depuisM3h(3.6, 'ls'), 1, 1e-12);
  close(C.versKw('1 500'.replace(' ', ''), 'w'), 1.5);
  close(C.versKw('2,5', 'kw'), 2.5);
});

test('entrées dégradées → null, jamais NaN/Infinity', () => {
  for (const bad of ['', null, undefined, 0, -5, 'abc', NaN, Infinity]) {
    assert.strictEqual(C.debit(bad, 20), null);
    assert.strictEqual(C.debit(10, bad), null);
    assert.strictEqual(C.puissance(bad, 20), null);
    assert.strictEqual(C.puissance(1, bad), null);
  }
});
