#!/usr/bin/env python
"""
Script de smoke test — Assistant IA de Prédiction des Risques TETRA004

Lance des requêtes HTTP réelles contre le serveur FastAPI en cours d'exécution
et affiche un rapport pass/fail en français dans le terminal.

Usage :
  1. Démarrer le serveur : uvicorn src.api.main:app --reload
  2. Dans un autre terminal : python scripts/smoke_test.py

Ou avec l'URL du serveur en argument :
  python scripts/smoke_test.py http://localhost:8000
"""

import sys
import time
from typing import Any, Dict, List, Tuple

import httpx

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

BASE_URL = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://localhost:8000"

TIMEOUT = 30  # secondes

# ─────────────────────────────────────────────────────────────────────────────
# Payloads de test
# ─────────────────────────────────────────────────────────────────────────────

PAYLOADS: Dict[str, Any] = {
    "diabetes": {
        "Pregnancies": 2,
        "Glucose": 138,
        "BloodPressure": 72,
        "SkinThickness": 22,
        "Insulin": 0,
        "BMI": 35.1,
        "DiabetesPedigreeFunction": 0.413,
        "Age": 41,
    },
    "heart": {
        "male": 1, "age": 55, "education": 2,
        "currentSmoker": 1, "cigsPerDay": 20, "BPMeds": 0,
        "prevalentStroke": 0, "prevalentHyp": 1, "diabetes": 0,
        "totChol": 235, "sysBP": 145, "diaBP": 90,
        "BMI": 27.8, "heartRate": 75, "glucose": 110,
        "pulse_pressure": 55, "map_pressure": 108.3,
        "age_glucose_interact": 6050, "smoker_intensity": 20,
    },
    "stroke": {
        "gender": 1, "age": 67, "hypertension": 1,
        "heart_disease": 1, "ever_married": 1, "work_type": 2,
        "Residence_type": 1, "avg_glucose_level": 228.69,
        "bmi": 36.6, "smoking_status": 1,
    },
    "ckd": {
        "age": 55, "bp": 90, "sg": 1.015,
        "al": 2, "su": 0, "htn": 1, "dm": 1,
        "cad": 0, "appet": 0, "pe": 1,
        "ane": 1, "bgr": 180, "donnees_completes": False,
    },
    "all": {
        "age": 55, "gender": 1, "bmi": 29.5, "glucose": 130,
        "Pregnancies": 1, "Glucose": 130, "BloodPressure": 78,
        "SkinThickness": 20, "Insulin": 85, "BMI": 29.5,
        "DiabetesPedigreeFunction": 0.5, "Age": 55,
        "male": 1, "education": 2, "currentSmoker": 1, "cigsPerDay": 15,
        "BPMeds": 1, "prevalentStroke": 0, "prevalentHyp": 1, "diabetes": 0,
        "totChol": 240, "sysBP": 150, "diaBP": 95, "heartRate": 80,
        "pulse_pressure": 55, "map_pressure": 113.3,
        "age_glucose_interact": 7150, "smoker_intensity": 15,
        "hypertension": 1, "heart_disease": 0, "ever_married": 1,
        "work_type": 2, "Residence_type": 1,
        "avg_glucose_level": 130, "smoking_status": 1,
        "bp": 85, "sg": 1.018, "al": 1, "su": 0,
        "htn": 1, "dm": 0, "cad": 0, "appet": 1, "pe": 0,
        "ane": 0, "bgr": 130, "donnees_completes": False,
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# Utilitaires
# ─────────────────────────────────────────────────────────────────────────────

VERT  = "\033[92m"
ROUGE = "\033[91m"
JAUNE = "\033[93m"
GRAS  = "\033[1m"
RESET = "\033[0m"

NIVEAUX_VALIDES = {"Faible", "Moyen", "Élevé", "Urgent"}
CHAMPS_REQUIS   = {
    "maladie", "probabilite_risque", "niveau_risque",
    "seuil_utilise", "necessite_orientation",
    "facteurs_shap", "resume_texte",
    "analyses_manquantes_recommandees",
}


def _valider_prediction(data: dict) -> Tuple[bool, str]:
    """Valide la structure d'une réponse de prédiction. Retourne (ok, message)."""
    if not CHAMPS_REQUIS.issubset(data.keys()):
        manquants = CHAMPS_REQUIS - data.keys()
        return False, f"Champs manquants : {manquants}"
    prob = data.get("probabilite_risque", -1)
    if not (0.0 <= prob <= 1.0):
        return False, f"Probabilité hors limites : {prob}"
    if data.get("niveau_risque") not in NIVEAUX_VALIDES:
        return False, f"Niveau invalide : {data.get('niveau_risque')}"
    return True, "OK"


def _attendre_serveur(max_secondes: int = 30) -> bool:
    """Attend que le serveur soit disponible (max_secondes secondes)."""
    print(f"  Connexion à {BASE_URL} ...")
    for _ in range(max_secondes):
        try:
            httpx.get(f"{BASE_URL}/api/health", timeout=2).raise_for_status()
            return True
        except Exception:
            time.sleep(1)
    return False


# ─────────────────────────────────────────────────────────────────────────────
# Tests
# ─────────────────────────────────────────────────────────────────────────────

resultats: List[Tuple[str, bool, str]] = []


def tester(label: str, func):
    """Exécute un test et enregistre le résultat."""
    try:
        ok, detail = func()
        resultats.append((label, ok, detail))
        symbole = f"{VERT}✓{RESET}" if ok else f"{ROUGE}✗{RESET}"
        print(f"  {symbole} {label}: {detail}")
    except Exception as exc:
        resultats.append((label, False, str(exc)))
        print(f"  {ROUGE}✗{RESET} {label}: EXCEPTION — {exc}")


def test_sante():
    with httpx.Client(base_url=BASE_URL, timeout=TIMEOUT) as c:
        r = c.get("/api/health")
    if r.status_code != 200:
        return False, f"HTTP {r.status_code}"
    data = r.json()
    if data.get("statut") != "opérationnel":
        return False, f"Statut : {data.get('statut')}"
    n_charges = sum(1 for v in data["modeles"].values() if v == "chargé")
    if n_charges < 5:
        return False, f"Seulement {n_charges}/5 modèles chargés"
    return True, f"5/5 modèles chargés — statut : {data['statut']}"


def test_diabetes():
    with httpx.Client(base_url=BASE_URL, timeout=TIMEOUT) as c:
        r = c.post("/api/predict/diabetes", json=PAYLOADS["diabetes"])
    if r.status_code != 200:
        return False, f"HTTP {r.status_code}"
    return _valider_prediction(r.json())


def test_heart():
    with httpx.Client(base_url=BASE_URL, timeout=TIMEOUT) as c:
        r = c.post("/api/predict/heart", json=PAYLOADS["heart"])
    if r.status_code != 200:
        return False, f"HTTP {r.status_code}"
    return _valider_prediction(r.json())


def test_stroke():
    with httpx.Client(base_url=BASE_URL, timeout=TIMEOUT) as c:
        r = c.post("/api/predict/stroke", json=PAYLOADS["stroke"])
    if r.status_code != 200:
        return False, f"HTTP {r.status_code}"
    return _valider_prediction(r.json())


def test_ckd():
    with httpx.Client(base_url=BASE_URL, timeout=TIMEOUT) as c:
        r = c.post("/api/predict/ckd", json=PAYLOADS["ckd"])
    if r.status_code != 200:
        return False, f"HTTP {r.status_code}"
    return _valider_prediction(r.json())


def test_all():
    with httpx.Client(base_url=BASE_URL, timeout=TIMEOUT) as c:
        r = c.post("/api/predict/all", json=PAYLOADS["all"])
    if r.status_code != 200:
        return False, f"HTTP {r.status_code}"
    data = r.json()
    if "resultats" not in data:
        return False, "Champ 'resultats' absent"
    n = data["modeles_evalues"]
    for res in data["resultats"]:
        ok, msg = _valider_prediction(res)
        if not ok:
            return False, f"Résultat invalide : {msg}"
    return True, f"{n} modèle(s) évalué(s), tous valides"


def test_resilience_partiel():
    """Vérifie qu'un payload à 30% de données ne fait pas crasher l'API."""
    with httpx.Client(base_url=BASE_URL, timeout=TIMEOUT) as c:
        r = c.post("/api/predict/diabetes", json={"Glucose": 145, "Age": 50})
    if r.status_code != 200:
        return False, f"HTTP {r.status_code} avec données partielles"
    data = r.json()
    prob = data.get("probabilite_risque", -1)
    return (0.0 <= prob <= 1.0), f"Probabilité avec données partielles : {prob:.4f}"


def test_payload_vide():
    """Un payload vide ne doit pas lever une erreur 500."""
    with httpx.Client(base_url=BASE_URL, timeout=TIMEOUT) as c:
        r = c.post("/api/predict/stroke", json={})
    if r.status_code == 500:
        return False, "HTTP 500 sur payload vide"
    return True, f"HTTP {r.status_code} (payload vide accepté)"


def test_redirect_docs():
    """GET / doit rediriger vers /docs."""
    with httpx.Client(base_url=BASE_URL, timeout=TIMEOUT, follow_redirects=False) as c:
        r = c.get("/")
    if r.status_code not in (301, 302, 307, 308):
        return False, f"HTTP {r.status_code} — redirection attendue"
    loc = r.headers.get("location", "")
    if "/docs" not in loc:
        return False, f"Redirection vers '{loc}' — '/docs' attendu"
    return True, f"Redirige vers {loc}"


# ─────────────────────────────────────────────────────────────────────────────
# Point d'entrée
# ─────────────────────────────────────────────────────────────────────────────

def main():
    print(f"\n{GRAS}═══ TETRA004 — Smoke Test API ═══{RESET}")
    print(f"Serveur cible : {JAUNE}{BASE_URL}{RESET}\n")

    print(f"{GRAS}Attente du serveur...{RESET}")
    if not _attendre_serveur(max_secondes=30):
        print(f"\n{ROUGE}✗ Serveur non disponible après 30 secondes. Démarrez-le avec :{RESET}")
        print("  uvicorn src.api.main:app --reload\n")
        sys.exit(1)
    print(f"  {VERT}Serveur disponible.{RESET}\n")

    print(f"{GRAS}Exécution des tests...{RESET}\n")

    tester("Santé de l'API (/api/health)",             test_sante)
    tester("Endpoint diabète (/api/predict/diabetes)", test_diabetes)
    tester("Endpoint cœur (/api/predict/heart)",       test_heart)
    tester("Endpoint AVC (/api/predict/stroke)",       test_stroke)
    tester("Endpoint IRC (/api/predict/ckd)",          test_ckd)
    tester("Endpoint global (/api/predict/all)",       test_all)
    tester("Résilience — données partielles",          test_resilience_partiel)
    tester("Résilience — payload vide",                test_payload_vide)
    tester("Redirection / → /docs",                   test_redirect_docs)

    # ─ Résumé ─
    total    = len(resultats)
    reussis  = sum(1 for _, ok, _ in resultats if ok)
    echoues  = total - reussis

    print(f"\n{GRAS}{'═'*40}{RESET}")
    print(f"  {GRAS}RÉSULTATS : {reussis}/{total} tests réussis{RESET}")
    if echoues == 0:
        print(f"  {VERT}{GRAS}✓ Tous les tests sont passés.{RESET}")
    else:
        print(f"  {ROUGE}✗ {echoues} test(s) échoué(s) :{RESET}")
        for label, ok, detail in resultats:
            if not ok:
                print(f"    — {label} : {detail}")
    print(f"{GRAS}{'═'*40}{RESET}\n")

    sys.exit(0 if echoues == 0 else 1)


if __name__ == "__main__":
    main()
