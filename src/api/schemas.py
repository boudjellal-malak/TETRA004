"""
Schémas Pydantic pour la validation des requêtes et réponses de l'API.

Tous les champs d'entrée sont Optional (données partielles acceptées).
Les modèles XGBoost gèrent nativement les NaN — pas d'imputation côté API.
"""

from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────────────────
# Schémas de RÉPONSE (partagés)
# ─────────────────────────────────────────────────────────────────────────────

class FacteurSHAP(BaseModel):
    """Contribution d'une variable au résultat de prédiction."""
    variable: str = Field(..., description="Nom de la variable explicative")
    impact: float = Field(..., description="Valeur SHAP (positive = augmente le risque)")
    direction: Literal["augmente", "diminue"] = Field(..., description="Sens de l'impact")


class AnalyseManquante(BaseModel):
    """Examen de laboratoire recommandé mais absent du dossier patient."""
    nom: str = Field(..., description="Nom de l'examen recommandé")
    justification: str = Field(..., description="Raison clinique de la recommandation")


class PredictionResponse(BaseModel):
    """Réponse standard pour tous les endpoints de prédiction."""
    maladie: str = Field(..., description="Nom de la maladie évaluée")
    probabilite_risque: float = Field(..., ge=0.0, le=1.0, description="Probabilité de risque [0–1]")
    niveau_risque: Literal["Faible", "Moyen", "Élevé", "Urgent"] = Field(
        ..., description="Niveau de risque catégoriel"
    )
    seuil_utilise: float = Field(..., description="Seuil de décision clinique appliqué")
    necessite_orientation: bool = Field(..., description="Orientation médicale recommandée")
    facteurs_shap: List[FacteurSHAP] = Field(
        default_factory=list, description="Principaux facteurs contribuant au risque"
    )
    resume_texte: str = Field(..., description="Résumé textuel en français des facteurs de risque")
    analyses_manquantes_recommandees: List[AnalyseManquante] = Field(
        default_factory=list, description="Examens complémentaires recommandés"
    )


class AllPredictionsResponse(BaseModel):
    """Réponse agrégée pour /api/predict/all — tous les modèles applicables."""
    resultats: List[PredictionResponse] = Field(
        ..., description="Liste des résultats de prédiction pour chaque maladie évaluée"
    )
    modeles_evalues: int = Field(..., description="Nombre de modèles ayant pu être évalués")
    modeles_ignores: List[str] = Field(
        default_factory=list,
        description="Modèles ignorés faute de données suffisantes"
    )


# ─────────────────────────────────────────────────────────────────────────────
# Schémas d'ENTRÉE — un par maladie
# ─────────────────────────────────────────────────────────────────────────────

class DiabetesInput(BaseModel):
    """
    Données patient pour la prédiction du risque diabétique.
    Source : Pima Indians Diabetes Dataset.
    """
    Pregnancies: Optional[float] = Field(None, description="Nombre de grossesses")
    Glucose: Optional[float] = Field(None, description="Glycémie plasmatique à jeun (mg/dL)")
    BloodPressure: Optional[float] = Field(None, description="Pression artérielle diastolique (mmHg)")
    SkinThickness: Optional[float] = Field(None, description="Épaisseur du pli cutané tricipital (mm)")
    Insulin: Optional[float] = Field(None, description="Insuline sérique 2h post-charge (µU/mL)")
    BMI: Optional[float] = Field(None, description="Indice de masse corporelle (kg/m²)")
    DiabetesPedigreeFunction: Optional[float] = Field(None, description="Fonction d'hérédité diabétique")
    Age: Optional[float] = Field(None, description="Âge (années)")


class HeartInput(BaseModel):
    """
    Données patient pour la prédiction du risque cardiovasculaire.
    Source : Framingham Heart Study (features engineered).
    """
    male: Optional[float] = Field(None, description="Sexe masculin (1=Homme, 0=Femme)")
    age: Optional[float] = Field(None, description="Âge (années)")
    education: Optional[float] = Field(None, description="Niveau d'éducation (1–4)")
    currentSmoker: Optional[float] = Field(None, description="Fumeur actuel (1=Oui)")
    cigsPerDay: Optional[float] = Field(None, description="Cigarettes par jour")
    BPMeds: Optional[float] = Field(None, description="Traitement antihypertenseur (1=Oui)")
    prevalentStroke: Optional[float] = Field(None, description="ATCD d'AVC (1=Oui)")
    prevalentHyp: Optional[float] = Field(None, description="Hypertension connue (1=Oui)")
    diabetes: Optional[float] = Field(None, description="Diabète connu (1=Oui)")
    totChol: Optional[float] = Field(None, description="Cholestérol total (mg/dL)")
    sysBP: Optional[float] = Field(None, description="Pression artérielle systolique (mmHg)")
    diaBP: Optional[float] = Field(None, description="Pression artérielle diastolique (mmHg)")
    BMI: Optional[float] = Field(None, description="Indice de masse corporelle (kg/m²)")
    heartRate: Optional[float] = Field(None, description="Fréquence cardiaque (bpm)")
    glucose: Optional[float] = Field(None, description="Glycémie (mg/dL)")
    pulse_pressure: Optional[float] = Field(None, description="Pression pulsée = sysBP − diaBP")
    map_pressure: Optional[float] = Field(None, description="Pression artérielle moyenne = diaBP + (sysBP−diaBP)/3")
    age_glucose_interact: Optional[float] = Field(None, description="Interaction âge × glycémie")
    smoker_intensity: Optional[float] = Field(None, description="Intensité tabagique = currentSmoker × cigsPerDay")


class StrokeInput(BaseModel):
    """
    Données patient pour la prédiction du risque d'AVC.
    Déséquilibre de classes sévère (19.5:1) — seuil de décision abaissé à 0.15.
    """
    gender: Optional[float] = Field(None, description="Sexe (encodé : Male=1, Female=0, Other=2)")
    age: Optional[float] = Field(None, description="Âge (années)")
    hypertension: Optional[float] = Field(None, description="Hypertension (1=Oui)")
    heart_disease: Optional[float] = Field(None, description="Maladie cardiaque (1=Oui)")
    ever_married: Optional[float] = Field(None, description="Marié(e) (1=Oui, 0=Non)")
    work_type: Optional[float] = Field(None, description="Type d'activité professionnelle (encodé)")
    Residence_type: Optional[float] = Field(None, description="Milieu de résidence (Urban=1, Rural=0)")
    avg_glucose_level: Optional[float] = Field(None, description="Glycémie moyenne (mg/dL)")
    bmi: Optional[float] = Field(None, description="Indice de masse corporelle (kg/m²)")
    smoking_status: Optional[float] = Field(None, description="Statut tabagique (encodé)")


class CKDInput(BaseModel):
    """
    Données patient pour la prédiction de l'insuffisance rénale chronique.
    Deux variantes : complète (24 features) ou dépistage précoce (12 features de base).
    """
    # Démographie et signes vitaux
    age: Optional[float] = Field(None, description="Âge (années)")
    bp: Optional[float] = Field(None, description="Pression artérielle (mmHg)")
    # Analyse d'urine de base
    sg: Optional[float] = Field(None, description="Densité urinaire (gravité spécifique)")
    al: Optional[float] = Field(None, description="Albumine urinaire (0–5)")
    su: Optional[float] = Field(None, description="Sucre urinaire (0–5)")
    # Antécédents médicaux (dépistage précoce)
    htn: Optional[float] = Field(None, description="Hypertension (1=Oui)")
    dm: Optional[float] = Field(None, description="Diabète (1=Oui)")
    cad: Optional[float] = Field(None, description="Maladie coronarienne (1=Oui)")
    appet: Optional[float] = Field(None, description="Appétit (1=Bon, 0=Mauvais)")
    pe: Optional[float] = Field(None, description="Oedème des membres inférieurs (1=Oui)")
    ane: Optional[float] = Field(None, description="Anémie (1=Oui)")
    bgr: Optional[float] = Field(None, description="Glycémie aléatoire (mg/dL)")
    # Examens biologiques avancés (modèle complet uniquement)
    rbc: Optional[float] = Field(None, description="Globules rouges dans l'urine (1=Normal)")
    pc: Optional[float] = Field(None, description="Cellules purulentes (1=Normal)")
    pcc: Optional[float] = Field(None, description="Amas de cellules purulentes (1=Présent)")
    ba: Optional[float] = Field(None, description="Bactéries (1=Présent)")
    bu: Optional[float] = Field(None, description="Urée sanguine (mg/dL)")
    sc: Optional[float] = Field(None, description="Créatinine sérique (mg/dL)")
    sod: Optional[float] = Field(None, description="Sodium sérique (mEq/L)")
    pot: Optional[float] = Field(None, description="Potassium sérique (mEq/L)")
    hemo: Optional[float] = Field(None, description="Hémoglobine (g/dL)")
    pcv: Optional[float] = Field(None, description="Volume globulaire moyen (%)")
    wc: Optional[float] = Field(None, description="Nombre de globules blancs (cellules/µL)")
    rc: Optional[float] = Field(None, description="Nombre de globules rouges (millions/µL)")
    # Paramètre de routage
    donnees_completes: bool = Field(
        False,
        description="True = utiliser le modèle complet (24 features), False = dépistage précoce (12 features)"
    )


class AllPatientsInput(BaseModel):
    """
    Payload combiné pour /api/predict/all.
    Fusion de toutes les features des 4 maladies en un seul objet.
    Les modèles sans suffisamment de données seront ignorés automatiquement.
    """
    # ─ Diabète ─
    Pregnancies: Optional[float] = None
    Glucose: Optional[float] = None
    BloodPressure: Optional[float] = None
    SkinThickness: Optional[float] = None
    Insulin: Optional[float] = None
    BMI: Optional[float] = None
    DiabetesPedigreeFunction: Optional[float] = None
    # ─ Cardio ─
    male: Optional[float] = None
    education: Optional[float] = None
    currentSmoker: Optional[float] = None
    cigsPerDay: Optional[float] = None
    BPMeds: Optional[float] = None
    prevalentStroke: Optional[float] = None
    prevalentHyp: Optional[float] = None
    totChol: Optional[float] = None
    sysBP: Optional[float] = None
    diaBP: Optional[float] = None
    heartRate: Optional[float] = None
    pulse_pressure: Optional[float] = None
    map_pressure: Optional[float] = None
    age_glucose_interact: Optional[float] = None
    smoker_intensity: Optional[float] = None
    # ─ AVC ─
    hypertension: Optional[float] = None
    heart_disease: Optional[float] = None
    ever_married: Optional[float] = None
    work_type: Optional[float] = None
    Residence_type: Optional[float] = None
    avg_glucose_level: Optional[float] = None
    smoking_status: Optional[float] = None
    # ─ Commun multi-maladies ─
    age: Optional[float] = None
    gender: Optional[float] = None
    diabetes: Optional[float] = None
    bmi: Optional[float] = None
    glucose: Optional[float] = None
    # ─ IRC ─
    bp: Optional[float] = None
    sg: Optional[float] = None
    al: Optional[float] = None
    su: Optional[float] = None
    htn: Optional[float] = None
    dm: Optional[float] = None
    cad: Optional[float] = None
    appet: Optional[float] = None
    pe: Optional[float] = None
    ane: Optional[float] = None
    bgr: Optional[float] = None
    rbc: Optional[float] = None
    pc: Optional[float] = None
    pcc: Optional[float] = None
    ba: Optional[float] = None
    bu: Optional[float] = None
    sc: Optional[float] = None
    sod: Optional[float] = None
    pot: Optional[float] = None
    hemo: Optional[float] = None
    pcv: Optional[float] = None
    wc: Optional[float] = None
    rc: Optional[float] = None
    # ─ Paramètre IRC ─
    donnees_completes: bool = False
