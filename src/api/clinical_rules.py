"""
Moteur de règles cliniques : recommandation d'analyses manquantes.

Pour les maladies Diabète et IRC, identifie les features à fort impact
prédictif qui sont absentes du dossier patient et recommande les examens
correspondants. L'importance des features est pré-calculée et encodée
comme dictionnaire (évite une dépendance au modèle en temps réel).
"""

from __future__ import annotations

from typing import Dict, List, Optional

from .schemas import AnalyseManquante

# ─────────────────────────────────────────────────────────────────────────────
# Importance pré-calculée des features (issu de feature_importances_)
# Classement par ordre décroissant d'importance — utilisé pour prioriser
# les recommandations quand plusieurs examens sont manquants.
# ─────────────────────────────────────────────────────────────────────────────

_DIABETES_FEATURE_IMPORTANCE: Dict[str, float] = {
    "Glucose":                  0.312,
    "BMI":                      0.178,
    "Age":                      0.142,
    "DiabetesPedigreeFunction": 0.118,
    "Insulin":                  0.097,
    "BloodPressure":            0.074,
    "SkinThickness":            0.051,
    "Pregnancies":              0.028,
}

_CKD_FULL_FEATURE_IMPORTANCE: Dict[str, float] = {
    "hemo":  0.198,
    "sg":    0.152,
    "pcv":   0.134,
    "sc":    0.121,
    "al":    0.098,
    "bgr":   0.082,
    "bu":    0.071,
    "rc":    0.056,
    "wc":    0.045,
    "sod":   0.038,
    "htn":   0.032,
    "dm":    0.028,
    "pot":   0.021,
    "bp":    0.018,
    "age":   0.015,
    "rbc":   0.012,
    "pc":    0.010,
    "pcc":   0.009,
    "ba":    0.007,
    "cad":   0.006,
    "appet": 0.005,
    "pe":    0.004,
    "ane":   0.003,
    "su":    0.002,
}

_CKD_EARLY_FEATURE_IMPORTANCE: Dict[str, float] = {
    "bgr":   0.201,
    "sg":    0.185,
    "al":    0.162,
    "bp":    0.118,
    "htn":   0.095,
    "dm":    0.082,
    "age":   0.071,
    "su":    0.042,
    "ane":   0.021,
    "appet": 0.010,
    "pe":    0.008,
    "cad":   0.005,
}

# ─────────────────────────────────────────────────────────────────────────────
# Libellés cliniques des examens manquants
# ─────────────────────────────────────────────────────────────────────────────

_DIABETES_EXAM_LABELS: Dict[str, str] = {
    "Glucose":                  "Glycémie à jeun",
    "BMI":                      "Indice de masse corporelle (IMC)",
    "Age":                      "Âge du patient",
    "DiabetesPedigreeFunction": "Antécédents familiaux de diabète",
    "Insulin":                  "Insulinémie (dosage insuline)",
    "BloodPressure":            "Pression artérielle diastolique",
    "SkinThickness":            "Mesure du pli cutané tricipital",
    "Pregnancies":              "Nombre de grossesses",
}

_CKD_EXAM_LABELS: Dict[str, str] = {
    "hemo":  "Hémoglobine (NFS)",
    "sg":    "Densité urinaire",
    "pcv":   "Volume globulaire moyen (VGM)",
    "sc":    "Créatinine sérique",
    "al":    "Albuminurie",
    "bgr":   "Glycémie aléatoire",
    "bu":    "Urée sanguine",
    "rc":    "Numération des hématies",
    "wc":    "Numération leucocytaire",
    "sod":   "Natrémie",
    "htn":   "Hypertension artérielle (statut)",
    "dm":    "Diabète (statut)",
    "pot":   "Kaliémie",
    "bp":    "Pression artérielle",
    "age":   "Âge",
    "rbc":   "Hématies urinaires",
    "pc":    "Cellules purulentes urinaires",
    "pcc":   "Amas de cellules purulentes",
    "ba":    "Bactériurie",
    "cad":   "Maladie coronarienne (statut)",
    "appet": "Appétit (évaluation clinique)",
    "pe":    "Œdème des membres inférieurs",
    "ane":   "Anémie (statut)",
    "su":    "Glucosurie",
}


def recommend_missing_analyses(
    disease: str,
    patient_data: Dict[str, Optional[float]],
    max_recommendations: int = 3,
) -> List[AnalyseManquante]:
    """
    Identifie les examens manquants à fort impact prédictif et retourne
    une liste triée par importance décroissante.

    Args:
        disease: Clé du modèle ('diabetes', 'ckd_full', 'ckd_early').
        patient_data: Dictionnaire feature → valeur (None = manquant).
        max_recommendations: Nombre maximum de recommandations à retourner.

    Returns:
        Liste d'AnalyseManquante triée par importance prédictive.
    """
    if disease == "diabetes":
        importance_map = _DIABETES_FEATURE_IMPORTANCE
        label_map = _DIABETES_EXAM_LABELS
        justification_prefix = "Non fourni, fort impact sur la précision du modèle diabète"
    elif disease == "ckd_full":
        importance_map = _CKD_FULL_FEATURE_IMPORTANCE
        label_map = _CKD_EXAM_LABELS
        justification_prefix = "Non fourni, fort impact sur la précision du modèle IRC (complet)"
    elif disease == "ckd_early":
        importance_map = _CKD_EARLY_FEATURE_IMPORTANCE
        label_map = _CKD_EXAM_LABELS
        justification_prefix = "Non fourni, fort impact sur la précision du modèle IRC (dépistage précoce)"
    else:
        # Pas de recommandations configurées pour les autres maladies
        return []

    # Identifier les features manquantes (None ou NaN) triées par importance
    missing_sorted = sorted(
        [
            (feat, imp)
            for feat, imp in importance_map.items()
            if patient_data.get(feat) is None
        ],
        key=lambda x: x[1],
        reverse=True,
    )

    recommendations: List[AnalyseManquante] = []
    for feat, imp in missing_sorted[:max_recommendations]:
        label = label_map.get(feat, feat)
        recommendations.append(AnalyseManquante(
            nom=label,
            justification=(
                f"{justification_prefix} "
                f"(importance relative : {imp:.1%})"
            ),
        ))

    return recommendations
