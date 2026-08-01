"""
Chargement et validation des 5 modèles XGBoost au démarrage de l'API.

Chaque modèle est associé à une liste ordonnée de features correspondant
exactement à l'ordre utilisé lors de l'entraînement — indispensable car
XGBoost interprète les colonnes par position, pas par nom.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Dict, List

import joblib
import numpy as np

logger = logging.getLogger(__name__)

# ── Répertoire des modèles (relatif à la racine du projet) ──────────────────
_BASE_DIR = Path(__file__).resolve().parents[2]
MODELS_DIR = _BASE_DIR / "models_saved"

# ── Listes de features exactes par modèle (ordre d'entraînement) ────────────

FEATURES: Dict[str, List[str]] = {
    # Modèle Diabète — Pima Indians Diabetes Dataset
    "diabetes": [
        "Pregnancies", "Glucose", "BloodPressure", "SkinThickness",
        "Insulin", "BMI", "DiabetesPedigreeFunction", "Age",
    ],
    # Modèle Cardio — Framingham Heart Study (19 features engineered)
    "heart": [
        "male", "age", "education", "currentSmoker", "cigsPerDay",
        "BPMeds", "prevalentStroke", "prevalentHyp", "diabetes",
        "totChol", "sysBP", "diaBP", "BMI", "heartRate", "glucose",
        "pulse_pressure", "map_pressure", "age_glucose_interact",
        "smoker_intensity",
    ],
    # Modèle AVC — Stroke Prediction Dataset
    "stroke": [
        "gender", "age", "hypertension", "heart_disease", "ever_married",
        "work_type", "Residence_type", "avg_glucose_level", "bmi",
        "smoking_status",
    ],
    # Modèle IRC complet — tous les examens de laboratoire
    "ckd_full": [
        "age", "bp", "sg", "al", "su", "rbc", "pc", "pcc", "ba",
        "bgr", "bu", "sc", "sod", "pot", "hemo", "pcv", "wc", "rc",
        "htn", "dm", "cad", "appet", "pe", "ane",
    ],
    # Modèle IRC dépistage précoce — examens de base uniquement
    "ckd_early": [
        "age", "bp", "sg", "al", "su",
        "htn", "dm", "cad", "appet", "pe", "ane",
        "bgr",
    ],
}

# ── Seuils de décision par modèle ────────────────────────────────────────────
# Diabète   : seuil standard (AUC 0.83, équilibré)
# Cardio    : seuil bas (favorise le rappel — manquer un risque cardiaque est plus coûteux)
# AVC       : seuil très bas (déséquilibre sévère 19.5:1 — outil de dépistage précoce)
# IRC       : seuil standard pour les deux variantes
THRESHOLDS: Dict[str, float] = {
    "diabetes": 0.5,
    "heart":    0.3,
    "stroke":   0.15,
    "ckd_full": 0.5,
    "ckd_early": 0.5,
}

# ── Noms affichables (côté utilisateur) ─────────────────────────────────────
DISPLAY_NAMES: Dict[str, str] = {
    "diabetes":  "Diabète",
    "heart":     "Maladies Cardiovasculaires",
    "stroke":    "Accident Vasculaire Cérébral",
    "ckd_full":  "Insuffisance Rénale Chronique",
    "ckd_early": "Insuffisance Rénale Chronique (dépistage précoce)",
}

# ── Registre global des modèles chargés ─────────────────────────────────────
_LOADED_MODELS: Dict[str, object] = {}
_LOAD_STATUS: Dict[str, bool] = {}


def load_all_models() -> None:
    """
    Charge les 5 modèles XGBoost depuis le disque et valide chacun
    avec une prédiction fictive (valeurs NaN — supportées nativement).
    Lève une RuntimeError si un modèle échoue au chargement.
    """
    model_files = {
        "diabetes":  "diabetes_xgb.pkl",
        "heart":     "heart_xgb_v2.pkl",
        "stroke":    "stroke_xgb.pkl",
        "ckd_full":  "ckd_xgb.pkl",
        "ckd_early": "ckd_xgb_early_screening.pkl",
    }

    for key, filename in model_files.items():
        path = MODELS_DIR / filename
        try:
            model = joblib.load(path)
            # Validation : prédire avec des NaN pour vérifier la compatibilité
            n_features = len(FEATURES[key])
            dummy = np.full((1, n_features), np.nan)
            _ = model.predict_proba(dummy)
            _LOADED_MODELS[key] = model
            _LOAD_STATUS[key] = True
            logger.info("✓ Modèle %s chargé avec succès (%d features)", DISPLAY_NAMES[key], n_features)
        except Exception as exc:
            _LOAD_STATUS[key] = False
            raise RuntimeError(
                f"✗ Échec du chargement du modèle '{DISPLAY_NAMES[key]}' "
                f"depuis '{path}': {exc}"
            ) from exc


def get_model(key: str):
    """Retourne le modèle chargé pour la clé donnée."""
    if key not in _LOADED_MODELS:
        raise RuntimeError(f"Modèle '{key}' non chargé. Appelez load_all_models() d'abord.")
    return _LOADED_MODELS[key]


def get_load_status() -> Dict[str, bool]:
    """Retourne le statut de chargement de chaque modèle."""
    return dict(_LOAD_STATUS)
