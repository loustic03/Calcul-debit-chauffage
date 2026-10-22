# Calculateurs chauffage & climatisation

Deux outils web autonomes, en ligne sur https://loustic03.github.io/Calcul-debit-chauffage/

- **Débit chauffage** (`index.html`) : puissance ⇄ débit d'un circuit d'eau selon le ΔT
- **Puissance clim & chauffage par pièce** (`clim.html`) : besoins chaud/froid pièce par pièce et taille de climatiseur conseillée

## Débit de chauffage (puissance ⇄ débit, ΔT)

Calculateur web autonome pour dimensionner le débit d'eau d'un radiateur, d'une boucle de plancher chauffant ou d'un générateur — et, en sens inverse, retrouver la puissance transportée par un débit mesuré.

**Utilisation en ligne :** activez GitHub Pages (Settings → Pages → *Deploy from a branch* → `main` / `root`), puis ouvrez `https://<utilisateur>.github.io/calcul-debit-chauffage/`.
En local : ouvrez simplement `index.html` dans un navigateur.

## Fonctions

- **Deux sens de calcul** : Puissance → Débit et Débit → Puissance
- **8 régimes d'eau usuels** (90/70 … 35/28) ou températures départ/retour libres, ΔT saisissable directement
- **Fluides** : eau (1,16), MEG 30 % (1,072), MPG 30 % (1,092) ou coefficient personnalisé
- Résultats en **m³/h, L/h, L/min, L/s** (W / kW pour la puissance), avec la formule chiffrée
- **Tableau comparatif** du débit selon le régime (cliquable)
- **Cumul de plusieurs émetteurs** pour le débit d'un tronçon ou d'un circulateur
- Lien partageable (l'état est dans l'URL), impression, thème clair/sombre, responsive

## Formule

```
qv (m³/h) = P (kW) / (1,16 × ΔT)        P (kW) = 1,16 × qv (m³/h) × ΔT
```

1,16 kWh/(m³·K) = chaleur volumique de l'eau (1 000 kg/m³ × 4 185 J/(kg·K) / 3,6·10⁶).

## Puissance clim & chauffage par pièce

Saisie pièce par pièce (type, surface, hauteur, exposition, occupants, sous toiture, grandes baies) avec paramètres du logement (isolation, zone climatique hiver A–I + altitude, climat estival).

- Chaud : `P = G × V × (Tint − Tbase)`, G de 0,55 à 1,6 W/(m³·K) selon l'isolation, Tbase abaissée de 1 °C par 200 m au-dessus de 200 m
- Froid, méthode par défaut : `P (kW) = (V × 100 BTU + 1 000 BTU × fenêtres) / 3 415`, coefficients modifiables
- Froid, méthode détaillée : `P = V × q × f_expo × f_climat + 100 W/occupant + appareils`, q de 25 à 45 W/m³
- Unité conseillée par pièce (2,0 à 7,1 kW / 7 000 à 24 000 BTU), total logement et groupe extérieur avec simultanéité

Méthode d'avant-projet par ratios : ne remplace pas un calcul NF EN 12831 ni un bilan de charges.

## Structure

| Fichier | Rôle |
|---|---|
| `index.html` | Interface (HTML/CSS/JS sans dépendance) |
| `calc.js` | Moteur de calcul, utilisable navigateur et Node |
| `clim.html` / `clim.js` | Calculateur clim & chauffage par pièce |
| `style.css` | Styles communs |
| `test/*.test.js` | Tests (`npm test`, Node ≥ 18) |

## Limites

Coefficient de l'eau vers 20 °C (débit réel ≈ +2 % à 70 °C, +3 % à 90 °C) ; puissance des émetteurs reprise telle quelle (pas de correction NF EN 442-2) ; surviscosité du glycol non prise en compte. Résultats indicatifs.

Inspiré de [CalculPro — Débit chauffage & radiateur](https://calculpro.fr/outils/chauffage/puissance-debit).
