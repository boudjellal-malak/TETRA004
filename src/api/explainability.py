"""
Explainabilité SHAP pour les modèles XGBoost.

Utilise shap.TreeExplainer (compatible nativement avec XGBoost).
Retourne les top N features par impact absolu avec direction et résumé textuel.
"""

from __future__ import annotations

import logging
from typing import List, Tuple

import numpy as np
import pandas as pd
import shap

from .schemas import FacteurSHAP

logger = logging.getLogger(__name__)


def compute_shap_factors(
    model,
    feature_values: pd.DataFrame,
    top_n: int = 5,
) -> Tuple[List[FacteurSHAP], str]:
    """
    Calcule les valeurs SHAP pour une prédiction et retourne les top_n
    facteurs les plus importants avec leur direction (augmente/diminue).

    Args:
        model: Modèle XGBoost chargé (XGBClassifier).
        feature_values: DataFrame avec une ligne et les colonnes dans le bon ordre.
        top_n: Nombre maximum de facteurs à retourner.

    Returns:
        Tuple (liste de FacteurSHAP, résumé textuel en français).
    """
    try:
        explainer = shap.TreeExplainer(model)
        # check_additivity=False évite les erreurs dues aux NaN
        shap_values = explainer.shap_values(feature_values, check_additivity=False)

        # Pour les classifieurs binaires, shap_values peut être une liste [classe0, classe1]
        if isinstance(shap_values, list):
            # Prendre les valeurs pour la classe positive (indice 1)
            values = shap_values[1][0] if len(shap_values) > 1 else shap_values[0][0]
        else:
            # Format tableau 2D (newer SHAP) ou 1D
            if shap_values.ndim == 2:
                values = shap_values[0]
            else:
                values = shap_values

        feature_names = feature_values.columns.tolist()

        # Trier par valeur absolue décroissante
        sorted_indices = np.argsort(np.abs(values))[::-1]
        top_indices = sorted_indices[:top_n]

        facteurs: List[FacteurSHAP] = []
        for idx in top_indices:
            impact_val = float(values[idx])
            facteurs.append(FacteurSHAP(
                variable=feature_names[idx],
                impact=round(impact_val, 4),
                direction="augmente" if impact_val > 0 else "diminue",
            ))

        # Résumé textuel : top 3 facteurs avec direction
        resume = _build_resume_texte(facteurs[:3])

        return facteurs, resume

    except Exception as exc:
        # Ne pas faire planter la prédiction si SHAP échoue
        logger.warning("Calcul SHAP échoué : %s", exc)
        return [], "Résumé non disponible (calcul SHAP en échec)."


def _build_resume_texte(facteurs: List[FacteurSHAP]) -> str:
    """
    Génère une phrase de résumé en français listant les principaux facteurs.

    Exemples :
      "Ce risque est principalement dû à : Glucose élevé, IMC élevé."
      "Ce risque est principalement influencé par : âge (réduit), sysBP élevé."
    """
    if not facteurs:
        return "Aucun facteur explicatif significatif identifié."

    # Construire les fragments textuels par facteur
    fragments = []
    for f in facteurs:
        if f.direction == "augmente":
            fragments.append(f"{f.variable} élevé")
        else:
            fragments.append(f"{f.variable} faible")

    if len(fragments) == 1:
        return f"Ce risque est principalement dû à : {fragments[0]}."
    elif len(fragments) == 2:
        return f"Ce risque est principalement dû à : {fragments[0]} et {fragments[1]}."
    else:
        listed = ", ".join(fragments[:-1]) + f" et {fragments[-1]}"
        return f"Ce risque est principalement dû à : {listed}."
