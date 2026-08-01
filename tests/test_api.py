"""
Tests d'intégration pour l'API de prédiction des risques médicaux.

Couvre :
  - Santé de l'API et chargement des modèles (/api/health)
  - Prédictions complètes pour chaque maladie
  - Résilience aux données partielles (50% de champs manquants)
  - Endpoint agrégé /api/predict/all
  - Cohérence du schéma de réponse Pydantic

Note : le fixture `client` est défini dans conftest.py — il ouvre TestClient
comme context manager pour déclencher le lifespan FastAPI (chargement des modèles).
"""

import math

import pytest

# ─────────────────────────────────────────────────────────────────────────────
# Payloads de test réalistes
# ─────────────────────────────────────────────────────────────────────────────

PAYLOAD_DIABETES_COMPLET = {
    "Pregnancies": 2,
    "Glucose": 138,
    "BloodPressure": 72,
    "SkinThickness": 22,
    "Insulin": 0,
    "BMI": 35.1,
    "DiabetesPedigreeFunction": 0.413,
    "Age": 41,
}

PAYLOAD_DIABETES_PARTIEL = {
    "Glucose": 148,
    "BMI": 33.6,
    "Age": 50,
    # 5 champs manquants sur 8 — test résilience
}

PAYLOAD_HEART_COMPLET = {
    "male": 1,
    "age": 55,
    "education": 2,
    "currentSmoker": 1,
    "cigsPerDay": 20,
    "BPMeds": 0,
    "prevalentStroke": 0,
    "prevalentHyp": 1,
    "diabetes": 0,
    "totChol": 235,
    "sysBP": 145,
    "diaBP": 90,
    "BMI": 27.8,
    "heartRate": 75,
    "glucose": 110,
    "pulse_pressure": 55,
    "map_pressure": 108.3,
    "age_glucose_interact": 6050,
    "smoker_intensity": 20,
}

PAYLOAD_HEART_PARTIEL = {
    "age": 60,
    "sysBP": 155,
    "totChol": 260,
    "BMI": 30.0,
    # 15 champs manquants sur 19 — test résilience
}

PAYLOAD_STROKE_COMPLET = {
    "gender": 1,
    "age": 67,
    "hypertension": 1,
    "heart_disease": 1,
    "ever_married": 1,
    "work_type": 2,
    "Residence_type": 1,
    "avg_glucose_level": 228.69,
    "bmi": 36.6,
    "smoking_status": 1,
}

PAYLOAD_STROKE_PARTIEL = {
    "age": 70,
    "avg_glucose_level": 200,
    "hypertension": 1,
    # 7 champs manquants sur 10 — test résilience
}

PAYLOAD_CKD_COMPLET = {
    "age": 48,
    "bp": 80,
    "sg": 1.020,
    "al": 1,
    "su": 0,
    "rbc": 1,
    "pc": 1,
    "pcc": 0,
    "ba": 0,
    "bgr": 121,
    "bu": 36,
    "sc": 1.2,
    "sod": 137,
    "pot": 4.4,
    "hemo": 15.4,
    "pcv": 44,
    "wc": 7800,
    "rc": 5.2,
    "htn": 1,
    "dm": 0,
    "cad": 0,
    "appet": 1,
    "pe": 0,
    "ane": 0,
    "donnees_completes": True,
}

PAYLOAD_CKD_EARLY = {
    "age": 55,
    "bp": 90,
    "sg": 1.015,
    "al": 2,
    "su": 0,
    "htn": 1,
    "dm": 1,
    "cad": 0,
    "appet": 0,
    "pe": 1,
    "ane": 1,
    "bgr": 180,
    "donnees_completes": False,
}

PAYLOAD_CKD_PARTIEL = {
    "age": 60,
    "bp": 85,
    "htn": 1,
    # 9 champs manquants sur 12 (early) — test résilience
}

PAYLOAD_ALL_COMPLET = {
    # Données communes
    "age": 55,
    "gender": 1,
    "bmi": 29.5,
    "glucose": 130,
    # Diabète
    "Pregnancies": 1,
    "Glucose": 130,
    "BloodPressure": 78,
    "SkinThickness": 20,
    "Insulin": 85,
    "BMI": 29.5,
    "DiabetesPedigreeFunction": 0.5,
    "Age": 55,
    # Cardio
    "male": 1,
    "education": 2,
    "currentSmoker": 1,
    "cigsPerDay": 15,
    "BPMeds": 1,
    "prevalentStroke": 0,
    "prevalentHyp": 1,
    "diabetes": 0,
    "totChol": 240,
    "sysBP": 150,
    "diaBP": 95,
    "heartRate": 80,
    "pulse_pressure": 55,
    "map_pressure": 113.3,
    "age_glucose_interact": 7150,
    "smoker_intensity": 15,
    # AVC
    "hypertension": 1,
    "heart_disease": 0,
    "ever_married": 1,
    "work_type": 2,
    "Residence_type": 1,
    "avg_glucose_level": 130,
    "smoking_status": 1,
    # IRC
    "bp": 85,
    "sg": 1.018,
    "al": 1,
    "su": 0,
    "htn": 1,
    "dm": 0,
    "cad": 0,
    "appet": 1,
    "pe": 0,
    "ane": 0,
    "bgr": 130,
    "donnees_completes": False,
}

# ─────────────────────────────────────────────────────────────────────────────
# Constantes de validation
# ─────────────────────────────────────────────────────────────────────────────

NIVEAUX_VALIDES = {"Faible", "Moyen", "Élevé", "Urgent"}
CHAMPS_REQUIS_REPONSE = {
    "maladie",
    "probabilite_risque",
    "niveau_risque",
    "seuil_utilise",
    "necessite_orientation",
    "facteurs_shap",
    "resume_texte",
    "analyses_manquantes_recommandees",
}


def _assert_valid_prediction(data: dict, expected_maladie_prefix: str = ""):
    """Vérifie la structure et les contraintes de toute réponse de prédiction."""
    # Tous les champs requis présents
    assert CHAMPS_REQUIS_REPONSE.issubset(data.keys()), (
        f"Champs manquants : {CHAMPS_REQUIS_REPONSE - data.keys()}"
    )
    # Probabilité dans [0, 1]
    prob = data["probabilite_risque"]
    assert 0.0 <= prob <= 1.0, f"Probabilité hors limites : {prob}"
    assert not math.isnan(prob), "Probabilité est NaN"
    # Niveau valide
    assert data["niveau_risque"] in NIVEAUX_VALIDES, (
        f"Niveau invalide : {data['niveau_risque']}"
    )
    # Cohérence orientation
    assert isinstance(data["necessite_orientation"], bool)
    # Seuil valide
    assert 0.0 < data["seuil_utilise"] <= 1.0
    # Résumé non vide
    assert isinstance(data["resume_texte"], str) and len(data["resume_texte"]) > 0
    # Vérification du nom de la maladie
    if expected_maladie_prefix:
        assert expected_maladie_prefix.lower() in data["maladie"].lower(), (
            f"Maladie attendue '{expected_maladie_prefix}' mais reçu '{data['maladie']}'"
        )


# ─────────────────────────────────────────────────────────────────────────────
# TESTS — Santé de l'API
# ─────────────────────────────────────────────────────────────────────────────

class TestHealth:
    def test_health_returns_200(self, client):
        """L'endpoint /api/health doit retourner HTTP 200."""
        r = client.get("/api/health")
        assert r.status_code == 200

    def test_health_tous_modeles_charges(self, client):
        """Tous les 5 modèles doivent être signalés comme 'chargé'."""
        r = client.get("/api/health")
        data = r.json()
        assert data["statut"] == "opérationnel"
        modeles = data["modeles"]
        assert len(modeles) == 5, f"Attendu 5 modèles, reçu {len(modeles)}"
        for nom, statut in modeles.items():
            assert statut == "chargé", f"Modèle '{nom}' non chargé : {statut}"

    def test_root_redirige_vers_docs(self, client):
        """GET / doit rediriger vers /docs."""
        r = client.get("/", follow_redirects=False)
        assert r.status_code in (301, 302, 307, 308)
        assert "/docs" in r.headers.get("location", "")


# ─────────────────────────────────────────────────────────────────────────────
# TESTS — Diabète
# ─────────────────────────────────────────────────────────────────────────────

class TestDiabetes:
    def test_prediction_complete(self, client):
        """Prédiction diabète avec payload complet."""
        r = client.post("/api/predict/diabetes", json=PAYLOAD_DIABETES_COMPLET)
        assert r.status_code == 200
        _assert_valid_prediction(r.json(), "Diabète")

    def test_prediction_partielle_ne_plante_pas(self, client):
        """Payload avec 50%+ de champs manquants — ne doit pas crasher."""
        r = client.post("/api/predict/diabetes", json=PAYLOAD_DIABETES_PARTIEL)
        assert r.status_code == 200
        _assert_valid_prediction(r.json(), "Diabète")

    def test_payload_vide_ne_plante_pas(self, client):
        """Payload totalement vide — le modèle doit répondre avec des NaN."""
        r = client.post("/api/predict/diabetes", json={})
        assert r.status_code == 200
        data = r.json()
        assert 0.0 <= data["probabilite_risque"] <= 1.0

    def test_seuil_diabetes(self, client):
        """Vérifie que le seuil renvoyé est bien 0.5."""
        r = client.post("/api/predict/diabetes", json=PAYLOAD_DIABETES_COMPLET)
        assert r.json()["seuil_utilise"] == 0.5

    def test_facteurs_shap_presents(self, client):
        """Au moins un facteur SHAP doit être présent."""
        r = client.post("/api/predict/diabetes", json=PAYLOAD_DIABETES_COMPLET)
        facteurs = r.json()["facteurs_shap"]
        assert len(facteurs) >= 1
        for f in facteurs:
            assert "variable" in f
            assert "impact" in f
            assert f["direction"] in ("augmente", "diminue")

    def test_analyses_manquantes_detectees(self, client):
        """Avec payload partiel, des analyses manquantes doivent être recommandées."""
        r = client.post("/api/predict/diabetes", json=PAYLOAD_DIABETES_PARTIEL)
        analyses = r.json()["analyses_manquantes_recommandees"]
        assert len(analyses) > 0
        for a in analyses:
            assert "nom" in a and "justification" in a


# ─────────────────────────────────────────────────────────────────────────────
# TESTS — Cardio
# ─────────────────────────────────────────────────────────────────────────────

class TestHeart:
    def test_prediction_complete(self, client):
        """Prédiction cardio avec payload complet."""
        r = client.post("/api/predict/heart", json=PAYLOAD_HEART_COMPLET)
        assert r.status_code == 200
        _assert_valid_prediction(r.json(), "Cardiovasculaires")

    def test_prediction_partielle_ne_plante_pas(self, client):
        """Payload avec ~80% de champs manquants — doit fonctionner."""
        r = client.post("/api/predict/heart", json=PAYLOAD_HEART_PARTIEL)
        assert r.status_code == 200
        _assert_valid_prediction(r.json())

    def test_seuil_heart(self, client):
        """Seuil cardio doit être 0.3 (recall-oriented)."""
        r = client.post("/api/predict/heart", json=PAYLOAD_HEART_COMPLET)
        assert r.json()["seuil_utilise"] == 0.3


# ─────────────────────────────────────────────────────────────────────────────
# TESTS — AVC
# ─────────────────────────────────────────────────────────────────────────────

class TestStroke:
    def test_prediction_complete(self, client):
        """Prédiction AVC avec payload complet."""
        r = client.post("/api/predict/stroke", json=PAYLOAD_STROKE_COMPLET)
        assert r.status_code == 200
        _assert_valid_prediction(r.json(), "Cérébral")

    def test_prediction_partielle_ne_plante_pas(self, client):
        """Payload avec 70%+ de champs manquants — doit fonctionner."""
        r = client.post("/api/predict/stroke", json=PAYLOAD_STROKE_PARTIEL)
        assert r.status_code == 200
        _assert_valid_prediction(r.json())

    def test_seuil_stroke(self, client):
        """Seuil AVC doit être 0.15 (haute sensibilité)."""
        r = client.post("/api/predict/stroke", json=PAYLOAD_STROKE_COMPLET)
        assert r.json()["seuil_utilise"] == 0.15


# ─────────────────────────────────────────────────────────────────────────────
# TESTS — IRC
# ─────────────────────────────────────────────────────────────────────────────

class TestCKD:
    def test_prediction_complete_full_model(self, client):
        """Prédiction IRC avec le modèle complet (donnees_completes=True)."""
        r = client.post("/api/predict/ckd", json=PAYLOAD_CKD_COMPLET)
        assert r.status_code == 200
        data = r.json()
        _assert_valid_prediction(data, "Rénale")
        assert "complet" in data["maladie"].lower() or "Insuffisance" in data["maladie"]

    def test_prediction_early_screening(self, client):
        """Prédiction IRC avec le modèle de dépistage précoce."""
        r = client.post("/api/predict/ckd", json=PAYLOAD_CKD_EARLY)
        assert r.status_code == 200
        _assert_valid_prediction(r.json(), "Rénale")

    def test_prediction_partielle_ne_plante_pas(self, client):
        """Payload CKD avec 75%+ de champs manquants."""
        r = client.post("/api/predict/ckd", json=PAYLOAD_CKD_PARTIEL)
        assert r.status_code == 200
        _assert_valid_prediction(r.json())

    def test_seuil_ckd(self, client):
        """Seuil IRC doit être 0.5."""
        r = client.post("/api/predict/ckd", json=PAYLOAD_CKD_EARLY)
        assert r.json()["seuil_utilise"] == 0.5

    def test_analyses_manquantes_ckd(self, client):
        """Des analyses manquantes doivent être recommandées avec données partielles."""
        r = client.post("/api/predict/ckd", json=PAYLOAD_CKD_PARTIEL)
        analyses = r.json()["analyses_manquantes_recommandees"]
        assert len(analyses) > 0


# ─────────────────────────────────────────────────────────────────────────────
# TESTS — Prédiction globale /all
# ─────────────────────────────────────────────────────────────────────────────

class TestPredictAll:
    def test_payload_complet_evalue_tous_modeles(self, client):
        """Payload complet — les 4 modèles doivent être évalués."""
        r = client.post("/api/predict/all", json=PAYLOAD_ALL_COMPLET)
        assert r.status_code == 200
        data = r.json()
        assert "resultats" in data
        assert "modeles_evalues" in data
        assert data["modeles_evalues"] >= 1
        for res in data["resultats"]:
            _assert_valid_prediction(res)

    def test_payload_minimal_ne_plante_pas(self, client):
        """Payload très minimal — les modèles sans données suffisantes sont ignorés."""
        r = client.post("/api/predict/all", json={"age": 45, "BMI": 28.0, "Glucose": 110})
        assert r.status_code == 200
        data = r.json()
        assert "resultats" in data
        # Les modèles ignorés sont documentés
        assert "modeles_ignores" in data

    def test_payload_vide_ne_plante_pas(self, client):
        """Payload totalement vide — tous les modèles ignorés ou résultats partiels."""
        r = client.post("/api/predict/all", json={})
        assert r.status_code == 200

    def test_structure_reponse_all(self, client):
        """Structure de la réponse /all correctement formée."""
        r = client.post("/api/predict/all", json=PAYLOAD_ALL_COMPLET)
        data = r.json()
        assert isinstance(data["resultats"], list)
        assert isinstance(data["modeles_evalues"], int)
        assert isinstance(data["modeles_ignores"], list)
