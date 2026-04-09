#!/usr/bin/env python3
"""
ML Analysis Pipeline for FlyRank SEO Research Paper.

Reads the feature vector from BigQuery, runs clustering, regression,
feature importance, and PCA. Exports all results as ml-results.json.
"""

import json
import os
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier, export_text

warnings.filterwarnings("ignore")

BASE = Path(__file__).resolve().parent.parent
DATA_V2 = BASE / "data" / "v2"
FEATURE_FILE = DATA_V2 / "raw-feature-vector-full.json"
OUTPUT = DATA_V2 / "ml-results.json"

# ── Load data ─────────────────────────────────────────────────────────────────

print("Loading feature vector...")
with open(FEATURE_FILE) as f:
    raw = json.load(f)

df = pd.DataFrame(raw["rows"])
print(f"  Loaded {len(df)} rows, {len(df.columns)} columns")

# Numeric features for ML
NUMERIC_FEATURES = [
    "health_score", "impressions_90d", "clicks_90d", "sessions_90d",
    "ai_sessions_90d", "scroll_rate", "engagement_rate", "ctr",
    "avg_position", "content_age_days", "days_since_update",
    "word_count", "search_volume", "cpc", "competition",
    "days_with_impressions"
]

# Clean: ensure numeric
for col in NUMERIC_FEATURES:
    df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

# Also clean trend_numeric
df["trend_numeric"] = pd.to_numeric(df["trend_numeric"], errors="coerce").fillna(0)

# Deduplicate (overflow extraction may have created overlaps)
before = len(df)
df = df.drop_duplicates(subset=NUMERIC_FEATURES, keep="first")
print(f"  After dedup: {len(df)} rows ({before - len(df)} duplicates removed)")

X = df[NUMERIC_FEATURES].copy()
print(f"  Feature matrix: {X.shape}")

# ── 1. Correlation Matrix ─────────────────────────────────────────────────────

print("\n1. Computing correlation matrix...")
corr_matrix = X.corr(method="pearson").round(3)
corr_data = {
    "features": NUMERIC_FEATURES,
    "matrix": corr_matrix.values.tolist(),
    "top_positive": [],
    "top_negative": [],
}

# Extract top correlations (excluding self-correlation)
pairs = []
for i, f1 in enumerate(NUMERIC_FEATURES):
    for j, f2 in enumerate(NUMERIC_FEATURES):
        if i < j:
            pairs.append({"f1": f1, "f2": f2, "r": round(corr_matrix.iloc[i, j], 3)})

pairs.sort(key=lambda x: abs(x["r"]), reverse=True)
corr_data["top_positive"] = [p for p in pairs if p["r"] > 0][:10]
corr_data["top_negative"] = [p for p in pairs if p["r"] < 0][:10]
print(f"  Top correlation: {pairs[0]['f1']} × {pairs[0]['f2']} = {pairs[0]['r']}")

# ── 2. K-Means Clustering ────────────────────────────────────────────────────

print("\n2. Running K-Means clustering (k=5)...")
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

kmeans = KMeans(n_clusters=5, random_state=42, n_init=10)
df["cluster"] = kmeans.fit_predict(X_scaled)

# Profile each cluster
cluster_profiles = []
for c in range(5):
    mask = df["cluster"] == c
    n = int(mask.sum())
    profile = {
        "cluster_id": c,
        "n": n,
        "pct": round(n / len(df) * 100, 1),
    }
    for feat in NUMERIC_FEATURES:
        profile[f"avg_{feat}"] = round(float(df.loc[mask, feat].mean()), 2)

    # Dominant categories
    for cat in ["trend_direction", "age_tier", "position_tier", "health_label"]:
        if cat in df.columns:
            mode = df.loc[mask, cat].mode()
            profile[f"mode_{cat}"] = str(mode.iloc[0]) if len(mode) > 0 else "unknown"

    cluster_profiles.append(profile)

# Name clusters based on characteristics
for p in cluster_profiles:
    health = p["avg_health_score"]
    imp = p["avg_impressions_90d"]
    trend = p.get("mode_trend_direction", "unknown")

    if health >= 45 and imp >= 5000:
        p["name"] = "Champions"
        p["description"] = "High health, high visibility, stable or growing"
    elif health >= 30 and trend == "up":
        p["name"] = "Rising Stars"
        p["description"] = "Moderate health but improving trajectory"
    elif health >= 30 and imp < 1000:
        p["name"] = "Hidden Gems"
        p["description"] = "Decent health but low visibility — untapped potential"
    elif health < 20 and imp < 100:
        p["name"] = "Zombie Content"
        p["description"] = "Low health, near-zero visibility, likely needs removal or rewrite"
    else:
        p["name"] = "Middle Ground"
        p["description"] = "Average performance, moderate metrics across the board"

cluster_profiles.sort(key=lambda x: x["avg_health_score"], reverse=True)
names = [f"{p['name']} (n={p['n']})" for p in cluster_profiles]
print(f"  Clusters: {names}")

# ── 3. Feature Importance (Random Forest → health_score) ─────────────────────

print("\n3. Training Random Forest for health_score prediction...")
from sklearn.model_selection import train_test_split

features_for_rf = [f for f in NUMERIC_FEATURES if f != "health_score"]
X_rf = df[features_for_rf]
y_rf = df["health_score"]

# Train/test split for honest evaluation
X_train, X_test, y_train, y_test = train_test_split(X_rf, y_rf, test_size=0.2, random_state=42)

rf = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
rf.fit(X_train, y_train)

r2_train = rf.score(X_train, y_train)
r2_test = rf.score(X_test, y_test)

feature_importance = sorted(
    [{"feature": f, "importance": round(float(imp), 4)}
     for f, imp in zip(features_for_rf, rf.feature_importances_)],
    key=lambda x: x["importance"],
    reverse=True,
)
print(f"  R² train: {r2_train:.3f}, R² test (holdout): {r2_test:.3f}")
print(f"  Top 5: {[(fi['feature'], fi['importance']) for fi in feature_importance[:5]]}")

# ── 4. PCA (2D projection) ───────────────────────────────────────────────────

print("\n4. Running PCA (2 components)...")
pca = PCA(n_components=2)
coords = pca.fit_transform(X_scaled)
explained = [round(float(v), 3) for v in pca.explained_variance_ratio_]

# Sample points for scatter (max 500 for PDF rendering)
sample_idx = np.random.RandomState(42).choice(len(df), min(500, len(df)), replace=False)
pca_points = [
    {
        "x": round(float(coords[i, 0]), 3),
        "y": round(float(coords[i, 1]), 3),
        "cluster": int(df.iloc[i]["cluster"]),
        "health": int(df.iloc[i]["health_score"]),
    }
    for i in sample_idx
]

pca_data = {
    "explained_variance": explained,
    "component_loadings": [
        {"feature": f, "pc1": round(float(pca.components_[0, i]), 3), "pc2": round(float(pca.components_[1, i]), 3)}
        for i, f in enumerate(NUMERIC_FEATURES)
    ],
    "points": pca_points,
}
print(f"  Explained variance: PC1={explained[0]:.1%}, PC2={explained[1]:.1%}")

# ── 5. Logistic Regression (what predicts "growing"?) ────────────────────────

print("\n5. Training Logistic Regression for growth prediction...")
# Binary: up vs down
growth_mask = df["trend_direction"].isin(["up", "down"])
X_lr = df.loc[growth_mask, features_for_rf]
y_lr = (df.loc[growth_mask, "trend_direction"] == "up").astype(int)

# Train/test split for logistic regression too
X_lr_train, X_lr_test, y_lr_train, y_lr_test = train_test_split(X_lr, y_lr, test_size=0.2, random_state=42)
lr_scaler = StandardScaler()
X_lr_train_scaled = lr_scaler.fit_transform(X_lr_train)
X_lr_test_scaled = lr_scaler.transform(X_lr_test)

lr = LogisticRegression(max_iter=1000, random_state=42)
lr.fit(X_lr_train_scaled, y_lr_train)

growth_coefficients = sorted(
    [{"feature": f, "coefficient": round(float(c), 4)}
     for f, c in zip(features_for_rf, lr.coef_[0])],
    key=lambda x: abs(x["coefficient"]),
    reverse=True,
)
lr_acc_train = lr.score(X_lr_train_scaled, y_lr_train)
lr_acc_test = lr.score(X_lr_test_scaled, y_lr_test)
print(f"  Accuracy train: {lr_acc_train:.3f}, test (holdout): {lr_acc_test:.3f}")
print(f"  Top predictors: {[(gc['feature'], gc['coefficient']) for gc in growth_coefficients[:5]]}")

# ── 6. Decision Tree (interpretable rules) ───────────────────────────────────

print("\n6. Training Decision Tree for health classification...")
y_dt = df["health_label"]
X_dt_train, X_dt_test, y_dt_train, y_dt_test = train_test_split(X_rf, y_dt, test_size=0.2, random_state=42)
dt = DecisionTreeClassifier(max_depth=4, random_state=42, min_samples_leaf=50)
dt.fit(X_dt_train, y_dt_train)

tree_rules = export_text(dt, feature_names=features_for_rf, max_depth=4)
dt_acc_train = round(float(dt.score(X_dt_train, y_dt_train)), 3)
dt_acc_test = round(float(dt.score(X_dt_test, y_dt_test)), 3)
print(f"  Accuracy train: {dt_acc_train}, test (holdout): {dt_acc_test}")

# ── 7. Percentile Analysis ───────────────────────────────────────────────────

print("\n7. Computing percentile distributions...")
percentiles = {}
for feat in NUMERIC_FEATURES:
    vals = df[feat]
    percentiles[feat] = {
        "p10": round(float(vals.quantile(0.10)), 2),
        "p25": round(float(vals.quantile(0.25)), 2),
        "p50": round(float(vals.quantile(0.50)), 2),
        "p75": round(float(vals.quantile(0.75)), 2),
        "p90": round(float(vals.quantile(0.90)), 2),
        "mean": round(float(vals.mean()), 2),
        "std": round(float(vals.std()), 2),
    }

# ── Export everything ─────────────────────────────────────────────────────────

results = {
    "meta": {
        "rows_analyzed": len(df),
        "features": NUMERIC_FEATURES,
        "generated_at": pd.Timestamp.now().isoformat(),
    },
    "correlation_matrix": {**corr_data, "meta_rows": len(df)},
    "clusters": cluster_profiles,
    "feature_importance": feature_importance,
    "rf_r2_train": round(float(r2_train), 3),
    "rf_r2_test": round(float(r2_test), 3),
    "pca": pca_data,
    "growth_predictors": {
        "coefficients": growth_coefficients,
        "accuracy_train": round(float(lr_acc_train), 3),
        "accuracy_test": round(float(lr_acc_test), 3),
        "samples_train": int(len(y_lr_train)),
        "samples_test": int(len(y_lr_test)),
    },
    "decision_tree": {
        "rules": tree_rules,
        "accuracy_train": dt_acc_train,
        "accuracy_test": dt_acc_test,
        "classes": list(dt.classes_),
    },
    "percentiles": percentiles,
}

with open(OUTPUT, "w") as f:
    json.dump(results, f, indent=2, default=str)

print(f"\nResults written to {OUTPUT}")
print(f"File size: {os.path.getsize(OUTPUT) / 1024:.1f} KB")
