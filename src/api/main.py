"""
Point d'entrée principal de l'API — Assistant IA de Prédiction des Risques et d'Orientation Précoce
HT1 — HealthTech Track, Hackathon TETRA004

Architecture :
  - Chargement des 5 modèles XGBoost au démarrage (lifespan)
  - CORS configurable via .env (origines frontend React)
  - Endpoints de prédiction pour Diabète, Cardio, AVC, IRC et prédiction globale
  - Explainabilité SHAP intégrée à chaque prédiction
  - Moteur de règles cliniques pour recommandations d'examens manquants
  - Documentation Swagger auto-générée sur /docs
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from .clinical_rules import recommend_missing_analyses
from .explainability import compute_shap_factors
from .models_loader import (
    DISPLAY_NAMES,
    FEATURES,
    THRESHOLDS,
    get_load_status,
    get_model,
    load_all_models,
)
from .schemas import (
    AllPatientsInput,
    AllPredictionsResponse,
    CKDInput,
    DiabetesInput,
    HeartInput,
    PredictionResponse,
    StrokeInput,
)

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# Origines CORS autorisées (configurables via .env)
_RAW_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://localhost:5174",
)
ALLOWED_ORIGINS: List[str] = [o.strip() for o in _RAW_ORIGINS.split(",")]


# ─────────────────────────────────────────────────────────────────────────────
# Démarrage / arrêt de l'application (lifespan)
# ─────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Chargement des modèles au démarrage — échec rapide si un modèle est absent."""
    logger.info("═══ Démarrage de l'API TETRA004 ═══")
    logger.info("Origines CORS autorisées : %s", ALLOWED_ORIGINS)
    load_all_models()
    logger.info("═══ Tous les modèles sont prêts ═══")
    yield
    logger.info("═══ Arrêt de l'API TETRA004 ═══")


# ─────────────────────────────────────────────────────────────────────────────
# Application FastAPI
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Assistant IA de Prédiction des Risques et d'Orientation Précoce",
    description=(
        "API de prédiction du risque médical basée sur 5 modèles XGBoost.\n\n"
        "**Maladies couvertes :** Diabète · Maladies Cardiovasculaires · AVC · Insuffisance Rénale Chronique\n\n"
        "**HT1 — HealthTech Track, TETRA004**"
    ),
    version="1.0.0",
    lifespan=lifespan,
    contact={"name": "Équipe TETRA004"},
    license_info={"name": "MIT"},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Utilitaires internes
# ─────────────────────────────────────────────────────────────────────────────

def _build_feature_array(
    model_key: str,
    patient_dict: Dict[str, Any],
) -> pd.DataFrame:
    """
    Construit un DataFrame pandas avec les features dans l'ordre exact
    attendu par le modèle. Les features absentes sont remplies avec NaN.
    XGBoost gère nativement les NaN — pas d'imputation requise.
    """
    features = FEATURES[model_key]
    row = {feat: patient_dict.get(feat, np.nan) for feat in features}
    # Convertir None explicites en NaN
    row = {k: (np.nan if v is None else v) for k, v in row.items()}
    return pd.DataFrame([row], columns=features)


def _compute_niveau_risque(probability: float, threshold: float) -> str:
    """
    Catégorise le niveau de risque en 4 niveaux selon la probabilité
    et le seuil de décision clinique du modèle.

    Logique des seuils :
      - Faible  : prob < threshold × 0.6   (zone de confort, surveillance standard)
      - Moyen   : threshold × 0.6 ≤ prob < threshold  (surveillance renforcée)
      - Élevé   : threshold ≤ prob < threshold × 1.5  (orientation recommandée)
      - Urgent  : prob ≥ threshold × 1.5              (orientation immédiate)
    """
    low_bound  = threshold * 0.6
    high_bound = threshold * 1.5

    if probability < low_bound:
        return "Faible"
    elif probability < threshold:
        return "Moyen"
    elif probability < high_bound:
        return "Élevé"
    else:
        return "Urgent"


def _run_prediction(
    model_key: str,
    patient_dict: Dict[str, Any],
    disease_name: Optional[str] = None,
) -> PredictionResponse:
    """
    Pipeline de prédiction complet pour un modèle donné :
    1. Construction du tableau de features
    2. Prédiction XGBoost (probabilité)
    3. Calcul SHAP
    4. Recommandations d'analyses manquantes (Diabète & IRC uniquement)
    5. Construction de la réponse Pydantic
    """
    model = get_model(model_key)
    threshold = THRESHOLDS[model_key]
    display_name = disease_name or DISPLAY_NAMES[model_key]

    # 1 — Tableau de features
    df = _build_feature_array(model_key, patient_dict)

    # 2 — Prédiction
    prob = float(model.predict_proba(df)[0][1])
    niveau = _compute_niveau_risque(prob, threshold)
    necessite_orientation = prob >= threshold

    # 3 — Explainabilité SHAP
    facteurs, resume = compute_shap_factors(model, df, top_n=5)

    # 4 — Analyses manquantes (Diabète et IRC uniquement)
    if model_key in ("diabetes", "ckd_full", "ckd_early"):
        analyses_manquantes = recommend_missing_analyses(
            disease=model_key,
            patient_data=patient_dict,
        )
    else:
        analyses_manquantes = []

    return PredictionResponse(
        maladie=display_name,
        probabilite_risque=round(prob, 4),
        niveau_risque=niveau,
        seuil_utilise=threshold,
        necessite_orientation=necessite_orientation,
        facteurs_shap=facteurs,
        resume_texte=resume,
        analyses_manquantes_recommandees=analyses_manquantes,
    )


def _has_sufficient_data(model_key: str, patient_dict: Dict[str, Any], min_ratio: float = 0.3) -> bool:
    """
    Vérifie que le patient fournit au moins min_ratio (30%) des features
    requises pour ce modèle. En dessous, le modèle est ignoré dans /all.
    """
    features = FEATURES[model_key]
    provided = sum(
        1 for f in features if patient_dict.get(f) is not None
    )
    return (provided / len(features)) >= min_ratio


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/", include_in_schema=False)
async def root():
    """Redirige vers la documentation Swagger."""
    return RedirectResponse(url="/docs")


@app.get(
    "/api/health",
    summary="État de santé de l'API",
    tags=["Système"],
    response_description="Statut de l'API et des modèles chargés",
)
async def health_check():
    """
    Vérifie que l'API est opérationnelle et que tous les modèles sont chargés.
    Retourne le statut de chaque modèle ainsi que la version de l'API.
    """
    status = get_load_status()
    all_loaded = all(status.values())
    return {
        "statut": "opérationnel" if all_loaded else "dégradé",
        "modeles": {
            DISPLAY_NAMES[k]: "chargé" if v else "non chargé"
            for k, v in status.items()
        },
        "version": "1.0.0",
        "projet": "TETRA004 — HT1 HealthTech Track",
    }


@app.post(
    "/api/predict/diabetes",
    response_model=PredictionResponse,
    summary="Prédiction du risque diabétique",
    tags=["Prédictions"],
    response_description="Probabilité et niveau de risque pour le diabète",
)
async def predict_diabetes(data: DiabetesInput):
    """
    Prédit le risque de diabète à partir des données du patient.

    **Modèle :** XGBoost entraîné sur le Pima Indians Diabetes Dataset.
    **Seuil de décision :** 0.5 (équilibré, AUC 0.83).
    **Features requises (8) :** Pregnancies, Glucose, BloodPressure, SkinThickness,
    Insulin, BMI, DiabetesPedigreeFunction, Age.
    Les champs manquants sont acceptés et gérés par le modèle.
    """
    try:
        return _run_prediction("diabetes", data.model_dump())
    except Exception as exc:
        logger.error("Erreur prédiction diabète : %s", exc)
        raise HTTPException(status_code=500, detail=f"Erreur de prédiction : {exc}") from exc


@app.post(
    "/api/predict/heart",
    response_model=PredictionResponse,
    summary="Prédiction du risque cardiovasculaire",
    tags=["Prédictions"],
    response_description="Probabilité et niveau de risque pour les maladies cardiaques",
)
async def predict_heart(data: HeartInput):
    """
    Prédit le risque de maladie cardiovasculaire à partir des données Framingham.

    **Modèle :** XGBoost, Framingham Heart Study (19 features engineered).
    **Seuil de décision :** 0.3 — favorise le rappel (manquer un risque cardiaque
    est plus coûteux qu'une fausse alarme).
    **Features clés :** age, sysBP, totChol, glucose, currentSmoker, BMI.
    """
    try:
        return _run_prediction("heart", data.model_dump())
    except Exception as exc:
        logger.error("Erreur prédiction cardio : %s", exc)
        raise HTTPException(status_code=500, detail=f"Erreur de prédiction : {exc}") from exc


@app.post(
    "/api/predict/stroke",
    response_model=PredictionResponse,
    summary="Prédiction du risque d'AVC",
    tags=["Prédictions"],
    response_description="Probabilité et niveau de risque pour l'AVC",
)
async def predict_stroke(data: StrokeInput):
    """
    Prédit le risque d'accident vasculaire cérébral (AVC).

    **Modèle :** XGBoost, Stroke Prediction Dataset.
    **Seuil de décision :** 0.15 — déséquilibre sévère de classes (19.5:1).
    Outil de dépistage précoce : privilégie un haut rappel au détriment de la précision.
    **Features clés :** age, avg_glucose_level, bmi, hypertension, heart_disease.
    """
    try:
        return _run_prediction("stroke", data.model_dump())
    except Exception as exc:
        logger.error("Erreur prédiction AVC : %s", exc)
        raise HTTPException(status_code=500, detail=f"Erreur de prédiction : {exc}") from exc


@app.post(
    "/api/predict/ckd",
    response_model=PredictionResponse,
    summary="Prédiction du risque d'insuffisance rénale chronique (IRC)",
    tags=["Prédictions"],
    response_description="Probabilité et niveau de risque pour l'IRC",
)
async def predict_ckd(data: CKDInput):
    """
    Prédit le risque d'insuffisance rénale chronique (IRC).

    **Deux variantes selon le flag `donnees_completes` :**
    - `donnees_completes: false` (défaut) → modèle de **dépistage précoce** (12 features de base,
      sans examens de laboratoire avancés) — idéal en consultation générale.
    - `donnees_completes: true` → modèle **complet** (24 features, incluant hémoglobine,
      créatinine, natrémie…) — pour le bilan rénal complet en spécialité.

    **Seuil de décision :** 0.5 pour les deux variantes.
    """
    try:
        model_key = "ckd_full" if data.donnees_completes else "ckd_early"
        patient = data.model_dump(exclude={"donnees_completes"})
        return _run_prediction(model_key, patient)
    except Exception as exc:
        logger.error("Erreur prédiction IRC : %s", exc)
        raise HTTPException(status_code=500, detail=f"Erreur de prédiction : {exc}") from exc


@app.post(
    "/api/predict/all",
    response_model=AllPredictionsResponse,
    summary="Prédiction globale — tous les modèles applicables",
    tags=["Prédictions"],
    response_description="Résultats agrégés pour toutes les maladies évaluées",
)
async def predict_all(data: AllPatientsInput):
    """
    Exécute tous les modèles de prédiction applicables sur un payload patient combiné.

    **Logique d'activation :** un modèle est exécuté si au moins 30% de ses features
    sont renseignées dans le payload. En dessous de ce seuil, le modèle est ignoré
    et listé dans `modeles_ignores`.

    **Retourne :** une liste de prédictions pour chaque maladie évaluée, avec
    SHAP et recommandations d'analyses pour chaque résultat.

    Endpoint principal appelé par le tableau de bord React.
    """
    patient = data.model_dump(exclude={"donnees_completes"})
    # Normaliser les None → NaN n'est pas nécessaire ici car _build_feature_array le gère

    resultats: List[PredictionResponse] = []
    ignores: List[str] = []

    # Déterminer la variante IRC
    ckd_key = "ckd_full" if data.donnees_completes else "ckd_early"

    model_keys = ["diabetes", "heart", "stroke", ckd_key]

    for key in model_keys:
        if _has_sufficient_data(key, patient):
            try:
                result = _run_prediction(key, patient)
                resultats.append(result)
            except Exception as exc:
                logger.error("Erreur modèle '%s' dans /all : %s", key, exc)
                ignores.append(f"{DISPLAY_NAMES[key]} (erreur: {exc})")
        else:
            ignores.append(DISPLAY_NAMES[key])
            logger.info(
                "Modèle '%s' ignoré — données insuffisantes (< 30%% des features fournies)",
                key,
            )

    return AllPredictionsResponse(
        resultats=resultats,
        modeles_evalues=len(resultats),
        modeles_ignores=ignores,
    )
