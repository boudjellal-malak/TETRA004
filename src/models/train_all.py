"""
Entraîne et sauvegarde les 5 modèles XGBoost attendus par src/api/models_loader.py
Doit être lancé depuis la RACINE du projet : python src/models/train_all.py
"""
import os
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
import joblib

RANDOM_STATE = 42
OUT_DIR = "models_saved"
os.makedirs(OUT_DIR, exist_ok=True)


def train_xgb(X, y, **kwargs):
    scale_pos_weight = (y == 0).sum() / max((y == 1).sum(), 1)
    model = xgb.XGBClassifier(
        n_estimators=200, max_depth=4, learning_rate=0.05,
        min_child_weight=3, subsample=0.8, colsample_bytree=0.8,
        scale_pos_weight=scale_pos_weight, eval_metric="auc",
        random_state=RANDOM_STATE, **kwargs,
    )
    model.fit(X, y)
    return model


# ── 1. Diabète ───────────────────────────────────────────────────────────
def train_diabetes():
    df = pd.read_csv("datasets/processed/diabetes_clean.csv")
    features = ["Pregnancies", "Glucose", "BloodPressure", "SkinThickness",
                "Insulin", "BMI", "DiabetesPedigreeFunction", "Age"]
    X, y = df[features], df["Outcome"]
    model = train_xgb(X, y)
    joblib.dump(model, f"{OUT_DIR}/diabetes_xgb.pkl")
    print("[OK] diabetes_xgb.pkl")


# ── 2. Coeur (avec features engineered attendues par models_loader.py) ──
def train_heart():
    df = pd.read_csv("datasets/processed/heart_clean.csv")
    df["pulse_pressure"] = df["sysBP"] - df["diaBP"]
    df["map_pressure"] = df["diaBP"] + (df["sysBP"] - df["diaBP"]) / 3
    df["age_glucose_interact"] = df["age"] * df["glucose"]
    df["smoker_intensity"] = df["currentSmoker"] * df["cigsPerDay"].fillna(0)

    features = ["male", "age", "education", "currentSmoker", "cigsPerDay",
                "BPMeds", "prevalentStroke", "prevalentHyp", "diabetes",
                "totChol", "sysBP", "diaBP", "BMI", "heartRate", "glucose",
                "pulse_pressure", "map_pressure", "age_glucose_interact", "smoker_intensity"]
    X, y = df[features], df["TenYearCHD"]
    model = train_xgb(X, y)
    joblib.dump(model, f"{OUT_DIR}/heart_xgb_v2.pkl")
    print("[OK] heart_xgb_v2.pkl")


# ── 3. AVC ────────────────────────────────────────────────────────────────
def train_stroke():
    df = pd.read_csv("datasets/processed/stroke_clean.csv")
    features = ["gender", "age", "hypertension", "heart_disease", "ever_married",
                "work_type", "Residence_type", "avg_glucose_level", "bmi", "smoking_status"]
    X, y = df[features], df["stroke"]
    model = train_xgb(X, y)
    joblib.dump(model, f"{OUT_DIR}/stroke_xgb.pkl")
    print("[OK] stroke_xgb.pkl")


# ── 4. IRC complet + 5. IRC dépistage précoce ───────────────────────────
def train_ckd():
    df = pd.read_csv("datasets/processed/ckd_clean.csv")
    full_features = ["age", "bp", "sg", "al", "su", "rbc", "pc", "pcc", "ba",
                      "bgr", "bu", "sc", "sod", "pot", "hemo", "pcv", "wc", "rc",
                      "htn", "dm", "cad", "appet", "pe", "ane"]
    early_features = ["age", "bp", "sg", "al", "su", "htn", "dm", "cad", "appet", "pe", "ane", "bgr"]

    y = df["class"]

    model_full = train_xgb(df[full_features], y)
    joblib.dump(model_full, f"{OUT_DIR}/ckd_xgb.pkl")
    print("[OK] ckd_xgb.pkl")

    model_early = train_xgb(df[early_features], y)
    joblib.dump(model_early, f"{OUT_DIR}/ckd_xgb_early_screening.pkl")
    print("[OK] ckd_xgb_early_screening.pkl")


if __name__ == "__main__":
    print("Entrainement des 5 modeles... (environ 30-60 secondes)")
    train_diabetes()
    train_heart()
    train_stroke()
    train_ckd()
    print("\nTermine. Verifie le dossier models_saved/ :")
    print(os.listdir(OUT_DIR))
