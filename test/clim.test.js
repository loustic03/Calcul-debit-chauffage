const test = require('node:test');
const assert = require('node:assert');
const K = require('../clim.js');
const close = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);
const P = { isolation: 'rt2000', tbase: -7, zoneEte: 'centre' };

test('chaud : G × V × ΔT', () => {
  // 20 m² × 2,5 m = 50 m³ ; 0,95 × 50 × (20 − (−7)) = 1 282,5 W
  close(K.piece({ surface: 20, hauteur: 2.5, type: 'sejour', expo: 'E', occupants: 0 }, P).chaud, 1282.5);
});
test('froid : V × q × expo × climat + occupants + appareils', () => {
  // 50 × 35 × 1,1 (sud) × 1,15 (sud) + 2 × 100 + 300 (cuisine)
  const r = K.piece({ surface: 20, hauteur: 2.5, type: 'cuisine', expo: 'S', occupants: 2 }, { ...P, zoneEte: 'sud' });
  close(r.froid, 50 * 35 * 1.1 * 1.15 + 200 + 300);
});
test('majorations toiture et baies', () => {
  const a = K.piece({ surface: 10, hauteur: 2.5, type: 'chambre', expo: 'E', occupants: 0 }, P);
  const b = K.piece({ surface: 10, hauteur: 2.5, type: 'chambre', expo: 'E', occupants: 0, toit: true, baies: true }, P);
  close(b.chaud / a.chaud, 1.1 * 1.1); close(b.froid / a.froid, 1.2 * 1.15);
});
test('ratios plausibles (W/m²)', () => {
  for (const iso of Object.keys(K.ISOLATION)) {
    const r = K.piece({ surface: 1, hauteur: 2.5, type: 'chambre', expo: 'E', occupants: 0 }, { ...P, isolation: iso });
    assert.ok(r.chaud > 25 && r.chaud < 130, `chaud ${iso} ${r.chaud}`);
    assert.ok(r.froid > 50 && r.froid < 130, `froid ${iso} ${r.froid}`);
  }
});
test('isolation : plus le logement est isolé, plus le besoin baisse', () => {
  const v = Object.keys(K.ISOLATION).map(i => K.piece({ surface: 20, hauteur: 2.5, type: 'chambre', expo: 'E' }, { ...P, isolation: i }));
  for (let i = 1; i < v.length; i++) { assert.ok(v[i].chaud > v[i-1].chaud); assert.ok(v[i].froid > v[i-1].froid); }
});
test('température de base corrigée de l’altitude', () => {
  assert.strictEqual(K.tBase('E', 0), -8);
  assert.strictEqual(K.tBase('E', 200), -8);
  assert.strictEqual(K.tBase('E', 201), -9);
  assert.strictEqual(K.tBase('E', 600), -10);
  assert.strictEqual(K.tBase('E', ''), -8);
});
test('taille d’unité conseillée', () => {
  assert.strictEqual(K.taille(1900).kw, 2.0);
  assert.strictEqual(K.taille(2001).kw, 2.5);
  assert.strictEqual(K.taille(3500).kw, 3.5);
  assert.strictEqual(K.taille(8000), null);
});
test('entrées invalides → null', () => {
  for (const bad of ['', 0, -3, 'abc', null]) {
    assert.strictEqual(K.piece({ surface: bad, hauteur: 2.5 }, P), null);
    assert.strictEqual(K.piece({ surface: 10, hauteur: bad }, P), null);
  }
});

test('méthode BTU : (V × 100 + 1 000 × fenêtres) / 3 415', () => {
  const r = K.piece({ surface: 30, hauteur: 2.5, type: 'sejour', fenetres: 2 }, { ...P, methode: 'btu', btuM3: 100, btuFen: 1000 });
  close(r.btu, 9500); close(r.froid, 9500 / 3415 * 1000);
  const r2 = K.piece({ surface: 30, hauteur: 2.5, fenetres: 2 }, { ...P, methode: 'btu', btuM3: '120', btuFen: '1500' });
  close(r2.btu, 75 * 120 + 3000);
  const r3 = K.piece({ surface: 30, hauteur: 2.5 }, { ...P, methode: 'btu' });
  close(r3.btu, 7500);
});
