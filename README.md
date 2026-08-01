# Assistant IA de Prédiction des Risques et d'Orientation Précoce

**HT1 — Tetrathon Track A : HealthTech · Équipe TETRA004**

> Système d'aide à la décision clinique basé sur 5 modèles XGBoost entraînés, exposés via une API FastAPI et visualisés dans une interface React.

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Modèles de prédiction](#modèles-de-prédiction)
4. [Installation & Démarrage](#installation--démarrage)
5. [Endpoints API](#endpoints-api)
6. [Structure du projet](#structure-du-projet)
7. [Tests](#tests)

---

## Vue d'ensemble

L'application prédit le risque individuel pour **4 pathologies** à partir des données cliniques du patient :

| Pathologie | Modèle | Seuil | AUC |
|---|---|---|---|
| Diabète | XGBoost — Pima Indians | 0.50 | 0.83 |
| Maladies Cardiovasculaires | XGBoost — Framingham (19 features) | 0.30 | ~0.79 |
| AVC | XGBoost — Stroke Dataset | 0.15 | ~0.85 |
| Insuffisance Rénale Chronique | XGBoost (24 features) + variante dépistage (12 features) | 0.50 | ~0.99 |

**Points forts :**
- Les champs manquants sont acceptés nativement (XGBoost + NaN) — pas d'imputation requise
- Explainabilité SHAP à chaque prédiction (top 5 facteurs + résumé textuel)
- Recommandations d'examens manquants basées sur l'importance des features
- Interface React dark-theme avec graphiques SHAP interactifs (Recharts)
- Mode dégradé automatique si le backend est hors ligne (prédictions mock)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Interface React (Vite, port 5173)                      │
│  FormulairePatient → usePrediction → POST /api/predict/all │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP (proxy Vite → :8000)
┌────────────────────▼────────────────────────────────────┐
│  API FastAPI (uvicorn, port 8000)                       │
│  main.py → models_loader → explainability → clinical_rules │
└────────────────────┬────────────────────────────────────┘
                     │ joblib.load()
┌────────────────────▼────────────────────────────────────┐
│  models_saved/  (5 fichiers .pkl XGBoost)               │
└─────────────────────────────────────────────────────────┘
```

---

## Modèles de prédiction

Les modèles sont entraînés dans `src/models/` et sauvegardés dans `models_saved/` :

| Fichier | Description |
|---|---|
| `diabetes_xgb.pkl` | Diabète — 8 features |
| `heart_xgb_v2.pkl` | Cardio Framingham — 19 features (engineered) |
| `stroke_xgb.pkl` | AVC — 10 features |
| `ckd_xgb.pkl` | IRC complet — 24 features lab |
| `ckd_xgb_early_screening.pkl` | IRC dépistage précoce — 12 features de base |

Les courbes ROC et les graphiques SHAP d'entraînement sont dans `reports/figures/`.

---

## Installation & Démarrage

### Prérequis
- Python 3.10+ (testé sur 3.14)
- Node.js 18+

### Backend (FastAPI)

```bash
# 1. Créer et activer l'environnement virtuel
python -m venv venv
source venv/bin/activate          # Linux/macOS
# venv\Scripts\activate           # Windows

# 2. Installer les dépendances
pip install -r requirements.txt

# 3. Démarrer le serveur
uvicorn src.api.main:app --reload
# → API disponible sur http://localhost:8000
# → Documentation Swagger sur http://localhost:8000/docs
```

### Frontend (React + Vite)

```bash
cd src/frontend
npm install
npm run dev
# → Interface disponible sur http://localhost:5173
```

### Lancer les deux en même temps

```bash
# Terminal 1 — Backend
source venv/bin/activate && uvicorn src.api.main:app --reload

# Terminal 2 — Frontend
cd src/frontend && npm run dev
```

---

## Endpoints API

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/` | Redirige vers `/docs` |
| `GET` | `/api/health` | État de l'API + statut des 5 modèles |
| `POST` | `/api/predict/diabetes` | Prédiction diabète |
| `POST` | `/api/predict/heart` | Prédiction cardio |
| `POST` | `/api/predict/stroke` | Prédiction AVC |
| `POST` | `/api/predict/ckd` | Prédiction IRC (flag `donnees_completes`) |
| `POST` | `/api/predict/all` | **Endpoint principal** — tous les modèles |

Documentation interactive complète : **http://localhost:8000/docs**

### Exemple de réponse `/api/predict/all`

```json
{
  "resultats": [
    {
      "maladie": "Diabète",
      "probabilite_risque": 0.73,
      "niveau_risque": "Élevé",
      "seuil_utilise": 0.5,
      "necessite_orientation": true,
      "facteurs_shap": [
        { "variable": "Glucose", "impact": 0.21, "direction": "augmente" },
        { "variable": "BMI",     "impact": 0.14, "direction": "augmente" }
      ],
      "resume_texte": "Ce risque est principalement dû à : Glucose élevé, BMI élevé.",
      "analyses_manquantes_recommandees": [
        { "nom": "Insulinémie (dosage insuline)", "justification": "Non fourni, fort impact sur la précision du modèle diabète (importance relative : 9.7%)" }
      ]
    }
  ],
  "modeles_evalues": 4,
  "modeles_ignores": []
}
```

---

## Structure du projet

```
TETRA004/
├── models_saved/               ← 5 modèles XGBoost (.pkl)
├── datasets/                   ← Données sources (CSV)
│   └── processed/              ← Données nettoyées
├── reports/figures/            ← Courbes ROC + graphiques SHAP
├── requirements.txt            ← Dépendances Python (pinned)
├── src/
│   ├── api/                    ← Backend FastAPI
│   │   ├── main.py             ← App + 6 endpoints
│   │   ├── models_loader.py    ← Chargement + validation des modèles
│   │   ├── schemas.py          ← Schémas Pydantic (input/output)
│   │   ├── explainability.py   ← SHAP TreeExplainer
│   │   └── clinical_rules.py   ← Recommandations d'examens manquants
│   ├── models/                 ← Scripts d'entraînement
│   │   ├── train_diabetes.py
│   │   ├── train_heart_v2.py
│   │   ├── train_stroke.py
│   │   ├── train_ckd.py
│   │   └── ablation_ckd.py     ← Étude ablation IRC (dépistage précoce)
│   ├── data/                   ← Scripts de prétraitement
│   └── frontend/               ← Interface React
│       ├── src/
│       │   ├── components/     ← Dashboard, CarteRisque, SHAP, Orientation…
│       │   ├── hooks/          ← usePrediction (appel API + fallback mock)
│       │   ├── data/domaine.js ← Features labels, tests recommandés
│       │   └── theme/theme.js  ← Design tokens (dark theme médical)
│       ├── package.json
│       └── vite.config.js      ← Proxy /api → :8000
├── tests/
│   ├── conftest.py             ← Fixture pytest (lifespan FastAPI)
│   └── test_api.py             ← 24 tests d'intégration
└── scripts/
    └── smoke_test.py           ← Test bout-en-bout contre serveur live
```

---

## Tests

```bash
# Tests d'intégration (24 tests)
source venv/bin/activate
python -m pytest tests/test_api.py -v

# Smoke test (serveur doit être démarré)
python scripts/smoke_test.py
```

**Résultat attendu :** `24 passed` — tous les endpoints, résilience aux données partielles, cohérence des schémas.

---

*TETRA004 · Tetrathon 2025 · HT1 HealthTech Track*
