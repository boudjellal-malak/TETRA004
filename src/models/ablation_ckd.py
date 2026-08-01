"""
Ablation Study: CKD Early Detection with Limited/Basic Features Only
الهدف: قياس القدرة الحقيقية على "الكشف المبكر" ببيانات أساسية متاحة،
بلا الاعتماد على مختبرات متقدمة (hemo, pcv, rc) اللي تعكس حالة متقدمة فعلاً
"""

import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import roc_auc_score, precision_score, recall_score, f1_score, classification_report
import joblib
import os

RANDOM_STATE = 42
TARGET = "class"

BASIC_FEATURES = [
    "age", "bp", "sg", "al", "su",       # عمر، ضغط، تحليل بول أساسي
    "htn", "dm", "cad", "appet", "pe", "ane",  # تاريخ طبي + فحص سريري بسيط
    "bgr", 

# Features "متقدمة" (المختبر الكامل — نستبعدها فهذا الـ ablation)
ADVANCED_FEATURES = ["hemo", "pcv", "rc", "wc", "rbc", "pc", "pcc", "ba", "bu", "sc", "sod", "pot"]


def load_data():
    df = pd.read_csv("datasets/processed/ckd_clean.csv")
    X = df.drop(columns=[TARGET])
    y = df[TARGET]
    return X, y


def run_ablation():
    X, y = load_data()

    scenarios = {
        "Full features (baseline)": X.columns.tolist(),
        "Basic features only (early screening)": BASIC_FEATURES,
    }

    for name, features in scenarios.items():
        print(f"\n{'='*60}\n{name}\n{'='*60}")
        X_subset = X[features]

        X_train, X_test, y_train, y_test = train_test_split(
            X_subset, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE
        )
        scale_pos_weight = (y_train == 0).sum() / (y_train == 1).sum()

        model = xgb.XGBClassifier(
            n_estimators=100, max_depth=3, learning_rate=0.05,
            min_child_weight=3, subsample=0.8, colsample_bytree=0.8,
            scale_pos_weight=scale_pos_weight, eval_metric="auc",
            random_state=RANDOM_STATE,
        )
        model.fit(X_train, y_train)

        y_pred = model.predict(X_test)
        y_proba = model.predict_proba(X_test)[:, 1]

        print(f"AUC-ROC:   {roc_auc_score(y_test, y_proba):.4f}")
        print(f"Precision: {precision_score(y_test, y_pred):.4f}")
        print(f"Recall:    {recall_score(y_test, y_pred):.4f}")
        print(f"F1:        {f1_score(y_test, y_pred):.4f}")

        cv = StratifiedKFold(n_splits=10, shuffle=True, random_state=RANDOM_STATE)
        cv_scores = cross_val_score(model, X_subset, y, cv=cv, scoring="roc_auc")
        print(f"10-Fold CV AUC-ROC: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

        importances = pd.Series(model.feature_importances_, index=features).sort_values(ascending=False)
        print(f"\nTop features:\n{importances.head(8)}")

        if "Basic" in name:
            os.makedirs("models_saved", exist_ok=True)
            joblib.dump(model, "models_saved/ckd_xgb_early_screening.pkl")
            print("\n✓ Saved early-screening model: models_saved/ckd_xgb_early_screening.pkl")


if __name__ == "__main__":
    run_ablation()
