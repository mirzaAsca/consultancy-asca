#!/usr/bin/env python3
"""
Standalone bottom-appendix optimizer for the research PDF.

This script is additive: it does not replace any legacy health-score logic.
It builds a new score family, runs local-only ML/statistical analysis,
and exports optimization-results.json for a final appendix.
"""

from __future__ import annotations

import json
import math
import warnings
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

import numpy as np
import pandas as pd
from scipy.stats import kruskal, spearmanr
from sklearn import set_config
from sklearn.cluster import KMeans
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.inspection import permutation_importance
from sklearn.linear_model import ElasticNetCV, LogisticRegression
from sklearn.metrics import accuracy_score, r2_score
from sklearn.model_selection import GroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

warnings.filterwarnings("ignore")
set_config(enable_metadata_routing=True)

BASE = Path(__file__).resolve().parent.parent
DATA = BASE / "data"
V2 = DATA / "v2"
RECENT = V2 / "raw-feature-vector-full.json"
QUERY_BY_CONTENT = DATA / "query-relevance-by-content.json"
QUERY_SUMMARY = DATA / "query-relevance-summary.json"
FULL_HISTORY = DATA / "full-history-derived.json"
LEGACY_ML = V2 / "ml-results.json"
OUTPUT = V2 / "optimization-results.json"

RANDOM_SEED = 42
MIN_LEVEL_FREQ = 1000
MIN_TOTAL_N = 1000
MIN_CELL_N = 250
BOOTSTRAPS = 500
OUTER_FOLDS = 5
MAX_MODEL_ROWS = 120_000
MAX_RF_ROWS = 60_000
MAX_KMEANS_ROWS = 50_000

DISPLAY_LABELS = {
    "word_count": "Word Count",
    "char_count": "Character Count",
    "content_type": "Content Type",
    "main_intent": "Main Intent",
    "provider_used": "Provider Used",
    "model_used": "Model Used",
    "publish_month": "Publish Month",
    "publish_quarter": "Publish Quarter",
    "days_since_update": "Days Since Update",
    "freshness_tier": "Freshness Tier",
    "content_age_days": "Content Age",
    "age_freshness_interaction": "Age x Freshness",
    "age_freshness_numeric": "Age x Freshness (Numeric)",
    "update_recency_bucket": "Update Recency",
    "search_volume": "Search Volume",
    "cpc": "CPC",
    "competition": "Competition",
    "competition_level": "Competition Level",
    "core_quality_score": "Core Quality Score",
    "relevance_adjusted_quality_score": "Relevance-Adjusted Quality Score",
    "opportunity_score": "Opportunity Score",
    "trend_up_vs_down": "Trend: Up vs Down",
    "impressions_90d": "Impressions",
    "clicks_90d": "Clicks",
    "sessions_90d": "Sessions",
    "ctr": "CTR",
    "engagement_rate": "Engagement Rate",
    "scroll_rate": "Scroll Rate",
    "ai_sessions_90d": "AI Sessions",
    "ai_traffic_pct": "AI Traffic %",
    "avg_position": "Average Position",
}

CREATION_CONTROLLABLE = [
    "word_count",
    "char_count",
    "content_type",
    "main_intent",
    "provider_used",
    "model_used",
    "publish_month",
    "publish_quarter",
]
REFRESH_CONTROLLABLE = [
    "days_since_update",
    "freshness_tier",
    "content_age_days",
    "age_freshness_interaction",
    "age_freshness_numeric",
    "update_recency_bucket",
]
CONTEXT_CONFOUNDERS = [
    "client_id",
    "search_volume",
    "cpc",
    "competition",
    "competition_level",
]
PRIMARY_OUTPUTS = [
    "core_quality_score",
    "relevance_adjusted_quality_score",
    "opportunity_score",
    "trend_up_vs_down",
]
SECONDARY_OUTPUTS = [
    "impressions_90d",
    "clicks_90d",
    "sessions_90d",
    "ctr",
    "engagement_rate",
    "scroll_rate",
    "ai_sessions_90d",
    "ai_traffic_pct",
    "avg_position",
]
EXCLUDED_LEAKY = [
    "health_score",
    "health_label",
    "needs_indexing",
    "is_quick_win",
    "needs_ctr_fix",
    "needs_engagement_fix",
    "ai_opportunity",
    "is_underperformer",
    "is_declining",
    "is_initial_refresh_candidate",
]


def load_rows(path: Path) -> List[Dict[str, Any]]:
    with open(path) as f:
        raw = json.load(f)
    if isinstance(raw, dict):
        if isinstance(raw.get("rows"), list):
            return raw["rows"]
        return []
    if isinstance(raw, list):
        return raw
    return []


def load_json(path: Path) -> Dict[str, Any]:
    with open(path) as f:
        return json.load(f)


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def roundf(value: float, digits: int = 4) -> float:
    return round(float(value), digits)


def pct_rank(series: pd.Series) -> pd.Series:
    return series.rank(method="average", pct=True) * 100


def winsorize_series(series: pd.Series, low_q: float = 0.01, high_q: float = 0.99) -> pd.Series:
    if series.empty:
        return series
    lo = series.quantile(low_q)
    hi = series.quantile(high_q)
    return series.clip(lo, hi)


def collapse_rare_levels(series: pd.Series, min_count: int = MIN_LEVEL_FREQ) -> pd.Series:
    counts = series.value_counts(dropna=False)
    allowed = set(counts[counts >= min_count].index.tolist())
    return series.apply(lambda value: value if value in allowed else "other")


def feature_label(feature: str) -> str:
    return DISPLAY_LABELS.get(feature, feature.replace("_", " ").title())


def feature_family(feature: str) -> str:
    if feature in CREATION_CONTROLLABLE:
        return "creation_controllable"
    if feature in REFRESH_CONTROLLABLE:
        return "refresh_controllable"
    if feature in CONTEXT_CONFOUNDERS:
        return "context_confounder"
    if feature in EXCLUDED_LEAKY:
        return "excluded_or_leaky"
    return "diagnostic_or_other"


def benjamini_hochberg(p_values: List[float]) -> List[float]:
    if not p_values:
        return []
    n = len(p_values)
    indexed = sorted(enumerate(p_values), key=lambda item: item[1])
    adjusted = [0.0] * n
    running = 1.0
    for rank, (idx, p_value) in enumerate(reversed(indexed), start=1):
        true_rank = n - rank + 1
        candidate = min(running, p_value * n / true_rank)
        adjusted[idx] = candidate
        running = candidate
    return adjusted


def parse_dates(df: pd.DataFrame) -> pd.DataFrame:
    created = pd.to_datetime(df["content_created_at"], errors="coerce", utc=True)
    updated = pd.to_datetime(df["content_updated_at"], errors="coerce", utc=True)
    df["publish_month"] = created.dt.strftime("%Y-%m").fillna("unknown")
    df["publish_quarter"] = created.dt.to_period("Q").astype(str).fillna("unknown")
    df["update_recency_bucket"] = pd.cut(
        df["days_since_update"].fillna(0),
        bins=[-np.inf, 30, 90, 180, np.inf],
        labels=["0-30", "31-90", "91-180", "181+"],
    ).astype(str)
    df["age_freshness_interaction"] = (
        df["age_tier"].fillna("unknown").astype(str) + " x " + df["freshness_tier"].fillna("unknown").astype(str)
    )
    df["age_freshness_numeric"] = df["content_age_days"].fillna(0) * (df["days_since_update"].fillna(0) + 1)
    return df


def prepare_dataframe() -> Tuple[pd.DataFrame, Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    recent_rows = load_rows(RECENT)
    query_rows = load_rows(QUERY_BY_CONTENT)
    query_summary = load_json(QUERY_SUMMARY)
    full_history = load_json(FULL_HISTORY)
    legacy_ml = load_json(LEGACY_ML)

    df = pd.DataFrame(recent_rows)
    qr = pd.DataFrame(query_rows)

    df["client_id"] = df["client_id"].astype(str)
    df["content_id"] = df["content_id"].astype(str)
    qr["client_id"] = qr["client_id"].astype(str)
    qr["content_id"] = qr["content_id"].astype(str)

    qr = qr[
        [
            "client_id",
            "content_id",
            "query_count",
            "exact_match_impression_share",
            "close_match_impression_share",
            "off_target_impression_share",
            "top_query_bucket",
        ]
    ].copy()
    qr["has_query_coverage"] = 1

    df = df.merge(qr, on=["client_id", "content_id"], how="left")
    df["has_query_coverage"] = df["has_query_coverage"].fillna(0).astype(int)

    numeric_cols = [
        "word_count",
        "char_count",
        "impressions_90d",
        "clicks_90d",
        "sessions_90d",
        "ai_sessions_90d",
        "days_with_impressions",
        "days_since_update",
        "content_age_days",
        "impressions_last_30d",
        "impressions_prev_30d",
        "engagement_rate",
        "scroll_rate",
        "ctr",
        "search_volume",
        "cpc",
        "competition",
        "avg_position",
        "health_score",
        "query_count",
        "exact_match_impression_share",
        "close_match_impression_share",
        "off_target_impression_share",
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    categorical_cols = [
        "content_type",
        "main_intent",
        "provider_used",
        "model_used",
        "freshness_tier",
        "age_tier",
        "competition_level",
        "top_query_bucket",
    ]
    for col in categorical_cols:
        if col in df.columns:
            df[col] = df[col].fillna("unknown").astype(str)

    df = parse_dates(df)
    df["momentum_ratio"] = ((df["impressions_last_30d"] + 1) / (df["impressions_prev_30d"] + 1)).clip(0.25, 4.0)

    for col in [
        "content_type",
        "main_intent",
        "provider_used",
        "model_used",
        "publish_month",
        "publish_quarter",
        "freshness_tier",
        "competition_level",
        "update_recency_bucket",
        "age_freshness_interaction",
    ]:
        df[col] = collapse_rare_levels(df[col].fillna("unknown").astype(str))

    for col in [
        "impressions_90d",
        "clicks_90d",
        "sessions_90d",
        "days_with_impressions",
        "days_since_update",
        "word_count",
        "char_count",
        "search_volume",
        "cpc",
        "competition",
        "content_age_days",
        "age_freshness_numeric",
        "momentum_ratio",
        "engagement_rate",
        "scroll_rate",
        "ctr",
        "avg_position",
    ]:
        df[col] = winsorize_series(df[col])

    return df, query_summary, full_history, legacy_ml


def build_scores(df: pd.DataFrame) -> pd.DataFrame:
    demand = pd.concat(
        [
            pct_rank(np.log1p(df["impressions_90d"])),
            pct_rank(np.log1p(df["clicks_90d"])),
            pct_rank(np.log1p(df["sessions_90d"])),
        ],
        axis=1,
    ).mean(axis=1)
    engagement = pd.concat(
        [pct_rank(df["engagement_rate"]), pct_rank(df["scroll_rate"])],
        axis=1,
    ).mean(axis=1)
    consistency = pd.concat(
        [pct_rank(np.log1p(df["days_with_impressions"])), pct_rank(df["momentum_ratio"])],
        axis=1,
    ).mean(axis=1)
    efficiency = pct_rank(df["ctr"])

    df["core_quality_score"] = (
        demand * 0.40 + engagement * 0.20 + consistency * 0.25 + efficiency * 0.15
    ).clip(0, 100)

    exact = (df["exact_match_impression_share"] / 100).clip(0, 1)
    close = (df["close_match_impression_share"] / 100).clip(0, 1)
    off = (df["off_target_impression_share"] / 100).clip(0, 1)
    top_adjustment = df["top_query_bucket"].map(
        {"exact_match": 0.05, "close_match": 0.02, "off_target": -0.08}
    ).fillna(0.0)
    relevance_multiplier = (0.75 + 0.50 * exact + 0.20 * close - 0.25 * off + top_adjustment).clip(0.65, 1.15)
    relevance_score = ((relevance_multiplier - 0.65) / 0.50 * 100).clip(0, 100)
    df["query_relevance_score"] = np.where(df["has_query_coverage"] == 1, relevance_score, 50.0)
    df["relevance_multiplier"] = np.where(df["has_query_coverage"] == 1, relevance_multiplier, 1.0)
    df["relevance_adjusted_quality_score"] = (
        df["core_quality_score"] * df["relevance_multiplier"]
    ).clip(0, 100)

    confidence = (
        pct_rank(np.log1p(df["days_with_impressions"])) * 0.45
        + pct_rank(np.log1p(df["impressions_90d"])) * 0.35
        + (df["has_query_coverage"] * 100) * 0.20
    )
    df["score_confidence"] = confidence.clip(0, 100)
    df["score_confidence_bucket"] = pd.cut(
        df["score_confidence"],
        bins=[-np.inf, 33, 66, np.inf],
        labels=["low", "medium", "high"],
    ).astype(str)

    exposure = pct_rank(np.log1p(df["impressions_90d"]))
    under_capture = 100 - pct_rank(df["ctr"])
    staleness = pct_rank(np.log1p(df["days_since_update"]))
    decline_risk = 100 - pct_rank(df["momentum_ratio"])
    relevance_support = np.where(df["has_query_coverage"] == 1, df["query_relevance_score"], 50.0)
    df["opportunity_score"] = (
        exposure * 0.30
        + under_capture * 0.25
        + staleness * 0.20
        + decline_risk * 0.15
        + relevance_support * 0.10
    ).clip(0, 100)

    df["trend_up_vs_down"] = df["trend_direction"].map({"up": 1, "down": 0})
    return df


def base_feature_name(transformed_name: str, categorical_features: Iterable[str]) -> str:
    if "__" in transformed_name:
        rest = transformed_name.split("__", 1)[1]
    else:
        rest = transformed_name
    if transformed_name.startswith("num__"):
        return rest
    for col in sorted(categorical_features, key=len, reverse=True):
        prefix = f"{col}_"
        if rest == col or rest.startswith(prefix):
            return col
    return rest


def sample_frame(df: pd.DataFrame, max_rows: int, seed: int = RANDOM_SEED) -> pd.DataFrame:
    if len(df) <= max_rows:
        return df.copy()
    return df.sample(n=max_rows, random_state=seed).copy()


def build_preprocessor(numeric_features: List[str], categorical_features: List[str]) -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numeric_features),
            (
                "cat",
                OneHotEncoder(drop="first", handle_unknown="ignore", sparse_output=False),
                categorical_features,
            ),
        ]
    )


def client_bootstrap_continuous(df: pd.DataFrame, feature: str, target: str) -> Dict[str, Any]:
    client_means = df.groupby("client_id")[[feature, target]].mean().dropna()
    if len(client_means) < 5:
        return {"stability": 0.0, "ci_low": 0.0, "ci_high": 0.0}
    rng = np.random.default_rng(RANDOM_SEED)
    groups = client_means.index.to_numpy()
    effects = []
    for _ in range(BOOTSTRAPS):
        sampled = rng.choice(groups, size=len(groups), replace=True)
        boot = client_means.loc[sampled]
        rho, _ = spearmanr(boot[feature], boot[target])
        effects.append(0.0 if pd.isna(rho) else float(rho))
    pos = sum(1 for value in effects if value > 0) / len(effects)
    neg = sum(1 for value in effects if value < 0) / len(effects)
    return {
        "stability": roundf(max(pos, neg), 4),
        "ci_low": roundf(np.quantile(effects, 0.025), 4),
        "ci_high": roundf(np.quantile(effects, 0.975), 4),
    }


def client_bootstrap_categorical(df: pd.DataFrame, feature: str, target: str) -> Dict[str, Any]:
    grouped = (
        df.groupby(["client_id", feature])[target]
        .agg(["mean", "count"])
        .reset_index()
        .rename(columns={"mean": "target_mean", "count": "n"})
    )
    if grouped.empty:
        return {"stability": 0.0, "ci_low": 0.0, "ci_high": 0.0, "best_level": None, "worst_level": None}

    full_levels = (
        grouped.groupby(feature)
        .apply(lambda rows: np.average(rows["target_mean"], weights=rows["n"]))
        .sort_values(ascending=False)
    )
    if len(full_levels) < 2:
        return {"stability": 0.0, "ci_low": 0.0, "ci_high": 0.0, "best_level": None, "worst_level": None}

    full_best = str(full_levels.index[0])
    full_worst = str(full_levels.index[-1])
    clients = grouped["client_id"].unique()
    by_client: Dict[str, pd.DataFrame] = {cid: rows.copy() for cid, rows in grouped.groupby("client_id")}
    rng = np.random.default_rng(RANDOM_SEED)
    best_hits = 0
    worst_hits = 0
    contrasts = []
    for _ in range(BOOTSTRAPS):
        sampled = rng.choice(clients, size=len(clients), replace=True)
        boot = pd.concat([by_client[cid] for cid in sampled], ignore_index=True)
        summary = (
            boot.groupby(feature)
            .apply(lambda rows: np.average(rows["target_mean"], weights=rows["n"]))
            .sort_values(ascending=False)
        )
        if len(summary) < 2:
            continue
        best = str(summary.index[0])
        worst = str(summary.index[-1])
        best_hits += int(best == full_best)
        worst_hits += int(worst == full_worst)
        contrasts.append(float(summary.iloc[0] - summary.iloc[-1]))

    if not contrasts:
        return {"stability": 0.0, "ci_low": 0.0, "ci_high": 0.0, "best_level": full_best, "worst_level": full_worst}
    return {
        "stability": roundf(((best_hits / len(contrasts)) + (worst_hits / len(contrasts))) / 2, 4),
        "ci_low": roundf(np.quantile(contrasts, 0.025), 4),
        "ci_high": roundf(np.quantile(contrasts, 0.975), 4),
        "best_level": full_best,
        "worst_level": full_worst,
    }


def univariate_screen(df: pd.DataFrame, features: List[str], target: str) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for feature in features:
        series = df[feature]
        if pd.api.types.is_numeric_dtype(series):
            valid = df[[feature, target]].replace([np.inf, -np.inf], np.nan).dropna()
            if len(valid) < MIN_TOTAL_N:
                continue
            rho, p_value = spearmanr(valid[feature], valid[target])
            if pd.isna(rho) or pd.isna(p_value):
                continue
            bootstrap = client_bootstrap_continuous(valid.assign(client_id=df.loc[valid.index, "client_id"]), feature, target)
            rows.append(
                {
                    "feature": feature,
                    "feature_label": feature_label(feature),
                    "kind": "continuous",
                    "n_total": int(len(valid)),
                    "min_cell_n": int(len(valid)),
                    "p_value": float(p_value),
                    "effect_size": float(rho),
                    "direction": "positive" if rho >= 0 else "negative",
                    "ci_low": bootstrap["ci_low"],
                    "ci_high": bootstrap["ci_high"],
                    "bootstrap_stability": bootstrap["stability"],
                }
            )
            continue

        counts = series.value_counts()
        eligible_levels = counts[counts >= MIN_CELL_N].index.tolist()
        if len(eligible_levels) < 2:
            continue
        eligible = df[df[feature].isin(eligible_levels)].copy()
        if len(eligible) < MIN_TOTAL_N:
            continue
        grouped = [group[target].to_numpy() for _, group in eligible.groupby(feature) if len(group) >= MIN_CELL_N]
        if len(grouped) < 2:
            continue
        stat, p_value = kruskal(*grouped)
        level_means = eligible.groupby(feature)[target].mean().sort_values(ascending=False)
        best_level = str(level_means.index[0])
        worst_level = str(level_means.index[-1])
        effect = float(level_means.iloc[0] - level_means.iloc[-1])
        bootstrap = client_bootstrap_categorical(eligible, feature, target)
        rows.append(
            {
                "feature": feature,
                "feature_label": feature_label(feature),
                "kind": "categorical",
                "n_total": int(len(eligible)),
                "min_cell_n": int(counts.loc[eligible_levels].min()),
                "p_value": float(p_value),
                "effect_size": effect,
                "direction": f"{best_level} > {worst_level}",
                "best_level": best_level,
                "worst_level": worst_level,
                "ci_low": bootstrap["ci_low"],
                "ci_high": bootstrap["ci_high"],
                "bootstrap_stability": bootstrap["stability"],
            }
        )

    if not rows:
        return rows
    q_values = benjamini_hochberg([row["p_value"] for row in rows])
    for row, q_value in zip(rows, q_values):
        row["q_value"] = float(q_value)
    return rows


def aggregate_feature_values(
    values: np.ndarray,
    transformed_names: List[str],
    categorical_features: List[str],
) -> Dict[str, float]:
    grouped: Dict[str, float] = defaultdict(float)
    for name, value in zip(transformed_names, values):
        feature = base_feature_name(name, categorical_features)
        grouped[feature] += float(value)
    return grouped


def run_regression_models(
    df: pd.DataFrame,
    features: List[str],
    target: str,
    scenario_name: str,
) -> Dict[str, Any]:
    model_df = df[features + [target, "client_id"]].dropna().copy()
    model_df = sample_frame(model_df, MAX_MODEL_ROWS)
    groups = model_df["client_id"].astype(str).to_numpy()
    y = model_df[target].to_numpy()

    numeric_features = [feature for feature in features if pd.api.types.is_numeric_dtype(model_df[feature])]
    categorical_features = [feature for feature in features if feature not in numeric_features]
    outer = GroupKFold(n_splits=OUTER_FOLDS)

    elastic_support = defaultdict(int)
    rf_support = defaultdict(int)
    elastic_strength = defaultdict(list)
    rf_strength = defaultdict(list)
    r2_elastic: List[float] = []
    r2_rf: List[float] = []

    for fold_index, (train_idx, test_idx) in enumerate(outer.split(model_df, y, groups), start=1):
        train = model_df.iloc[train_idx]
        test = model_df.iloc[test_idx]
        preprocessor = build_preprocessor(numeric_features, categorical_features)
        X_train = preprocessor.fit_transform(train[features])
        X_test = preprocessor.transform(test[features])
        transformed_names = list(preprocessor.get_feature_names_out())

        inner_groups = train["client_id"].astype(str).to_numpy()
        n_inner_splits = min(3, len(np.unique(inner_groups)))
        if n_inner_splits < 2:
            continue
        elastic = ElasticNetCV(
            l1_ratio=[0.1, 0.5, 0.9, 1.0],
            alphas=np.logspace(-3, 1, 20),
            cv=GroupKFold(n_splits=n_inner_splits),
            random_state=RANDOM_SEED,
            max_iter=5000,
        )
        elastic.fit(X_train, train[target].to_numpy(), groups=inner_groups)
        elastic_pred = elastic.predict(X_test)
        r2_elastic.append(float(r2_score(test[target].to_numpy(), elastic_pred)))

        elastic_weights = aggregate_feature_values(np.abs(elastic.coef_), transformed_names, categorical_features)
        for feature, value in elastic_weights.items():
            if value > 1e-6:
                elastic_support[feature] += 1
            elastic_strength[feature].append(float(value))

        rf_train = sample_frame(train, MAX_RF_ROWS, seed=RANDOM_SEED + fold_index)
        rf_test = sample_frame(test, min(len(test), MAX_RF_ROWS // 2), seed=RANDOM_SEED + fold_index * 2)
        rf_pre = build_preprocessor(numeric_features, categorical_features)
        X_rf_train = rf_pre.fit_transform(rf_train[features])
        X_rf_test = rf_pre.transform(rf_test[features])
        rf_names = list(rf_pre.get_feature_names_out())

        rf = RandomForestRegressor(
            n_estimators=120,
            max_depth=12,
            min_samples_leaf=20,
            random_state=RANDOM_SEED + fold_index,
            n_jobs=-1,
        )
        rf.fit(X_rf_train, rf_train[target].to_numpy())
        rf_pred = rf.predict(X_rf_test)
        r2_rf.append(float(r2_score(rf_test[target].to_numpy(), rf_pred)))

        perm = permutation_importance(
            rf,
            X_rf_test,
            rf_test[target].to_numpy(),
            n_repeats=5,
            random_state=RANDOM_SEED + fold_index,
            n_jobs=-1,
            scoring="r2",
        )
        rf_weights = aggregate_feature_values(perm.importances_mean, rf_names, categorical_features)
        for feature, value in rf_weights.items():
            if value > 0:
                rf_support[feature] += 1
            rf_strength[feature].append(float(value))

    feature_rows = []
    for feature in features:
        feature_rows.append(
            {
                "feature": feature,
                "feature_label": feature_label(feature),
                "feature_family": feature_family(feature),
                "elastic_nonzero_folds": int(elastic_support.get(feature, 0)),
                "rf_positive_folds": int(rf_support.get(feature, 0)),
                "elastic_strength_mean": roundf(np.mean(elastic_strength.get(feature, [0.0])), 6),
                "rf_importance_mean": roundf(np.mean(rf_strength.get(feature, [0.0])), 6),
            }
        )

    return {
        "scenario_name": scenario_name,
        "target": target,
        "kind": "regression",
        "rows_modeled": int(len(model_df)),
        "folds": OUTER_FOLDS,
        "metrics": {
            "elastic_r2_mean": roundf(np.mean(r2_elastic) if r2_elastic else 0.0, 4),
            "rf_r2_mean": roundf(np.mean(r2_rf) if r2_rf else 0.0, 4),
        },
        "feature_support": feature_rows,
    }


def run_growth_model(df: pd.DataFrame, features: List[str], target: str) -> Dict[str, Any]:
    model_df = df[df[target].isin([0, 1])][features + [target, "client_id"]].dropna().copy()
    model_df = sample_frame(model_df, MAX_MODEL_ROWS)
    groups = model_df["client_id"].astype(str).to_numpy()
    y = model_df[target].to_numpy()
    numeric_features = [feature for feature in features if pd.api.types.is_numeric_dtype(model_df[feature])]
    categorical_features = [feature for feature in features if feature not in numeric_features]
    outer = GroupKFold(n_splits=OUTER_FOLDS)

    coef_support = defaultdict(int)
    coef_strength = defaultdict(list)
    accuracy_scores: List[float] = []

    for fold_index, (train_idx, test_idx) in enumerate(outer.split(model_df, y, groups), start=1):
        train = model_df.iloc[train_idx]
        test = model_df.iloc[test_idx]
        pipeline = Pipeline(
            steps=[
                ("pre", build_preprocessor(numeric_features, categorical_features)),
                ("model", LogisticRegression(max_iter=1000, solver="liblinear", random_state=RANDOM_SEED + fold_index)),
            ]
        )
        pipeline.fit(train[features], train[target].to_numpy())
        pred = pipeline.predict(test[features])
        accuracy_scores.append(float(accuracy_score(test[target].to_numpy(), pred)))

        pre = pipeline.named_steps["pre"]
        transformed_names = list(pre.get_feature_names_out())
        coefs = np.abs(pipeline.named_steps["model"].coef_[0])
        grouped = aggregate_feature_values(coefs, transformed_names, categorical_features)
        for feature, value in grouped.items():
            if value > 1e-6:
                coef_support[feature] += 1
            coef_strength[feature].append(float(value))

    feature_rows = []
    for feature in features:
        feature_rows.append(
            {
                "feature": feature,
                "feature_label": feature_label(feature),
                "feature_family": feature_family(feature),
                "logistic_nonzero_folds": int(coef_support.get(feature, 0)),
                "logistic_strength_mean": roundf(np.mean(coef_strength.get(feature, [0.0])), 6),
            }
        )

    return {
        "scenario_name": "growth",
        "target": target,
        "kind": "classification",
        "rows_modeled": int(len(model_df)),
        "folds": OUTER_FOLDS,
        "metrics": {
            "accuracy_mean": roundf(np.mean(accuracy_scores) if accuracy_scores else 0.0, 4),
        },
        "feature_support": feature_rows,
    }


def attach_model_support(
    screen_rows: List[Dict[str, Any]],
    model_result: Dict[str, Any],
    support_key_a: str,
    support_key_b: str | None = None,
) -> List[Dict[str, Any]]:
    support_map = {row["feature"]: row for row in model_result["feature_support"]}
    enriched = []
    for row in screen_rows:
        support = support_map.get(row["feature"], {})
        row = {**row}
        row[support_key_a] = int(support.get(support_key_a, 0))
        if support_key_b:
            row[support_key_b] = int(support.get(support_key_b, 0))
        row["method_support_count"] = int(
            (1 if row["q_value"] < 0.05 else 0)
            + (1 if row.get(support_key_a, 0) >= 4 else 0)
            + (1 if support_key_b and row.get(support_key_b, 0) >= 4 else 0)
            + (1 if row.get("bootstrap_stability", 0.0) >= 0.90 else 0)
        )
        enriched.append(row)
    return enriched


def build_signal_lists(screen_rows: List[Dict[str, Any]], target: str, scenario_group: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    stable = []
    directional = []
    for row in screen_rows:
        base = {
            "scenario_group": scenario_group,
            "target": target,
            "target_label": feature_label(target),
            "feature": row["feature"],
            "feature_label": row["feature_label"],
            "feature_family": feature_family(row["feature"]),
            "kind": row["kind"],
            "n_total": row["n_total"],
            "min_cell_n": row["min_cell_n"],
            "effect_size": roundf(row["effect_size"], 4),
            "direction": row["direction"],
            "p_value": roundf(row["p_value"], 6),
            "q_value": roundf(row["q_value"], 6),
            "ci_low": row["ci_low"],
            "ci_high": row["ci_high"],
            "bootstrap_stability": row["bootstrap_stability"],
            "method_support_count": row["method_support_count"],
        }
        if "best_level" in row:
            base["best_level"] = row["best_level"]
            base["worst_level"] = row["worst_level"]

        passed = (
            row["n_total"] >= MIN_TOTAL_N
            and row["min_cell_n"] >= MIN_CELL_N
            and row["q_value"] < 0.05
            and row.get("bootstrap_stability", 0.0) >= 0.90
        )
        linear_ok = row.get("elastic_nonzero_folds", row.get("logistic_nonzero_folds", 0)) >= 4
        nonlinear_ok = row.get("rf_positive_folds", 4) >= 4

        if row["kind"] == "continuous":
            practical_ok = abs(row["effect_size"]) >= 0.03
        else:
            practical_ok = abs(row["effect_size"]) >= 1.0

        if passed and linear_ok and nonlinear_ok and practical_ok:
            stable.append(base)
        elif row["q_value"] < 0.05:
            directional.append(base)

    stable.sort(key=lambda item: abs(item["effect_size"]), reverse=True)
    directional.sort(key=lambda item: abs(item["effect_size"]), reverse=True)
    return stable, directional


def build_archetypes(df: pd.DataFrame) -> List[Dict[str, Any]]:
    sample = sample_frame(
        df[
            [
                "core_quality_score",
                "relevance_adjusted_quality_score",
                "opportunity_score",
                "score_confidence",
                "word_count",
                "char_count",
                "days_since_update",
                "content_age_days",
                "search_volume",
                "competition",
                "ctr",
                "engagement_rate",
                "scroll_rate",
                "content_type",
                "main_intent",
                "model_used",
            ]
        ].copy(),
        MAX_KMEANS_ROWS,
    )
    numeric_cols = [
        "core_quality_score",
        "relevance_adjusted_quality_score",
        "opportunity_score",
        "score_confidence",
        "word_count",
        "char_count",
        "days_since_update",
        "content_age_days",
        "search_volume",
        "competition",
        "ctr",
        "engagement_rate",
        "scroll_rate",
    ]
    categorical_cols = ["content_type", "main_intent", "model_used"]
    pre = build_preprocessor(numeric_cols, categorical_cols)
    X = pre.fit_transform(sample[numeric_cols + categorical_cols])
    clusters = KMeans(n_clusters=6, n_init=10, random_state=RANDOM_SEED).fit_predict(X)
    sample["cluster"] = clusters

    results = []
    for cluster_id, cluster_rows in sample.groupby("cluster"):
        level_counts = {
            "content_type": cluster_rows["content_type"].mode().iloc[0],
            "main_intent": cluster_rows["main_intent"].mode().iloc[0],
            "model_used": cluster_rows["model_used"].mode().iloc[0],
        }
        results.append(
            {
                "cluster_id": int(cluster_id),
                "n": int(len(cluster_rows)),
                "pct": roundf(len(cluster_rows) / len(sample) * 100, 2),
                "avg_core_quality_score": roundf(cluster_rows["core_quality_score"].mean(), 2),
                "avg_relevance_adjusted_quality_score": roundf(cluster_rows["relevance_adjusted_quality_score"].mean(), 2),
                "avg_opportunity_score": roundf(cluster_rows["opportunity_score"].mean(), 2),
                "avg_score_confidence": roundf(cluster_rows["score_confidence"].mean(), 2),
                "avg_word_count": roundf(cluster_rows["word_count"].mean(), 1),
                "avg_days_since_update": roundf(cluster_rows["days_since_update"].mean(), 1),
                "mode_content_type": level_counts["content_type"],
                "mode_main_intent": level_counts["main_intent"],
                "mode_model_used": level_counts["model_used"],
            }
        )
    results.sort(key=lambda row: row["avg_relevance_adjusted_quality_score"], reverse=True)
    return results


def decile_overlap(a: pd.Series, b: pd.Series, top: bool = True) -> float:
    if top:
        a_ids = set(a.nlargest(max(1, len(a) // 10)).index.tolist())
        b_ids = set(b.nlargest(max(1, len(b) // 10)).index.tolist())
    else:
        a_ids = set(a.nsmallest(max(1, len(a) // 10)).index.tolist())
        b_ids = set(b.nsmallest(max(1, len(b) // 10)).index.tolist())
    if not a_ids:
        return 0.0
    return roundf(len(a_ids & b_ids) / len(a_ids) * 100, 2)


def legacy_comparison(df: pd.DataFrame, legacy_ml: Dict[str, Any]) -> Dict[str, Any]:
    scored = df[["health_score", "core_quality_score", "relevance_adjusted_quality_score", "opportunity_score", "has_query_coverage", "off_target_impression_share"]].copy()
    corr_core = scored["health_score"].corr(scored["core_quality_score"])
    corr_rel = scored["health_score"].corr(scored["relevance_adjusted_quality_score"])
    corr_opp = scored["health_score"].corr(scored["opportunity_score"])

    top_overlap = decile_overlap(scored["health_score"], scored["relevance_adjusted_quality_score"], top=True)
    bottom_overlap = decile_overlap(scored["health_score"], scored["relevance_adjusted_quality_score"], top=False)

    disagreement_gap = (scored["relevance_adjusted_quality_score"] - scored["health_score"]).abs()
    disagreement_cut = disagreement_gap.quantile(0.90)
    disagreement = scored[disagreement_gap >= disagreement_cut]

    return {
        "legacy_ml_rows_analyzed": int(legacy_ml.get("meta", {}).get("rows_analyzed", 0)),
        "correlation_health_to_core_quality": roundf(corr_core if pd.notna(corr_core) else 0.0, 4),
        "correlation_health_to_relevance_adjusted": roundf(corr_rel if pd.notna(corr_rel) else 0.0, 4),
        "correlation_health_to_opportunity": roundf(corr_opp if pd.notna(corr_opp) else 0.0, 4),
        "top_decile_overlap_pct": top_overlap,
        "bottom_decile_overlap_pct": bottom_overlap,
        "disagreement_cohort_size": int(len(disagreement)),
        "query_covered_disagreement_pct": roundf(disagreement["has_query_coverage"].mean() * 100 if len(disagreement) else 0.0, 2),
        "avg_off_target_share_in_disagreement": roundf(disagreement["off_target_impression_share"].mean() if len(disagreement) else 0.0, 2),
    }


def summarize_scores(df: pd.DataFrame) -> Dict[str, Any]:
    def distribution(series: pd.Series) -> Dict[str, float]:
        return {
            "p10": roundf(series.quantile(0.10), 2),
            "p25": roundf(series.quantile(0.25), 2),
            "p50": roundf(series.quantile(0.50), 2),
            "p75": roundf(series.quantile(0.75), 2),
            "p90": roundf(series.quantile(0.90), 2),
            "mean": roundf(series.mean(), 2),
        }

    return {
        "weights": {
            "demand_capture": 0.40,
            "engagement_realization": 0.20,
            "consistency": 0.25,
            "efficiency": 0.15,
        },
        "coverage": {
            "total_pages": int(len(df)),
            "query_covered_pages": int(df["has_query_coverage"].sum()),
            "query_covered_pct": roundf(df["has_query_coverage"].mean() * 100, 2),
        },
        "distributions": {
            "core_quality_score": distribution(df["core_quality_score"]),
            "relevance_adjusted_quality_score": distribution(df["relevance_adjusted_quality_score"]),
            "score_confidence": distribution(df["score_confidence"]),
            "opportunity_score": distribution(df["opportunity_score"]),
        },
    }


def signal_summary(signals: List[Dict[str, Any]], scenario_group: str) -> List[Dict[str, Any]]:
    return [signal for signal in signals if signal["scenario_group"] == scenario_group][:12]


def main() -> None:
    print("Loading local data...")
    df, query_summary, full_history, legacy_ml = prepare_dataframe()
    print(f"  Recent rows: {len(df):,}")
    print(f"  Query-covered rows: {int(df['has_query_coverage'].sum()):,}")

    print("Building new scores...")
    df = build_scores(df)

    creation_features = CREATION_CONTROLLABLE + ["search_volume", "cpc", "competition", "competition_level"]
    refresh_features = REFRESH_CONTROLLABLE + [
        "word_count",
        "char_count",
        "content_type",
        "main_intent",
        "provider_used",
        "model_used",
        "search_volume",
        "cpc",
        "competition",
        "competition_level",
    ]
    growth_features = sorted(set(creation_features + refresh_features))

    print("Running creation-track models...")
    creation_core_screen = univariate_screen(df, creation_features, "core_quality_score")
    creation_core_model = run_regression_models(df, creation_features, "core_quality_score", "creation_core_quality")
    creation_core_screen = attach_model_support(creation_core_screen, creation_core_model, "elastic_nonzero_folds", "rf_positive_folds")
    creation_core_stable, creation_core_directional = build_signal_lists(creation_core_screen, "core_quality_score", "creation")

    creation_rel_df = df[df["has_query_coverage"] == 1].copy()
    creation_rel_screen = univariate_screen(creation_rel_df, creation_features, "relevance_adjusted_quality_score")
    creation_rel_model = run_regression_models(
        creation_rel_df,
        creation_features,
        "relevance_adjusted_quality_score",
        "creation_relevance_adjusted_quality",
    )
    creation_rel_screen = attach_model_support(creation_rel_screen, creation_rel_model, "elastic_nonzero_folds", "rf_positive_folds")
    creation_rel_stable, creation_rel_directional = build_signal_lists(
        creation_rel_screen, "relevance_adjusted_quality_score", "creation"
    )

    print("Running refresh-track models...")
    refresh_core_screen = univariate_screen(df, refresh_features, "core_quality_score")
    refresh_core_model = run_regression_models(df, refresh_features, "core_quality_score", "refresh_core_quality")
    refresh_core_screen = attach_model_support(refresh_core_screen, refresh_core_model, "elastic_nonzero_folds", "rf_positive_folds")
    refresh_core_stable, refresh_core_directional = build_signal_lists(refresh_core_screen, "core_quality_score", "refresh")

    refresh_rel_screen = univariate_screen(creation_rel_df, refresh_features, "relevance_adjusted_quality_score")
    refresh_rel_model = run_regression_models(
        creation_rel_df,
        refresh_features,
        "relevance_adjusted_quality_score",
        "refresh_relevance_adjusted_quality",
    )
    refresh_rel_screen = attach_model_support(refresh_rel_screen, refresh_rel_model, "elastic_nonzero_folds", "rf_positive_folds")
    refresh_rel_stable, refresh_rel_directional = build_signal_lists(
        refresh_rel_screen, "relevance_adjusted_quality_score", "refresh"
    )

    refresh_opportunity_screen = univariate_screen(df, refresh_features, "opportunity_score")
    refresh_opportunity_model = run_regression_models(df, refresh_features, "opportunity_score", "refresh_opportunity")
    refresh_opportunity_screen = attach_model_support(
        refresh_opportunity_screen, refresh_opportunity_model, "elastic_nonzero_folds", "rf_positive_folds"
    )
    refresh_opportunity_stable, refresh_opportunity_directional = build_signal_lists(
        refresh_opportunity_screen, "opportunity_score", "refresh"
    )

    print("Running growth classifier...")
    growth_screen = univariate_screen(df[df["trend_up_vs_down"].isin([0, 1])], growth_features, "trend_up_vs_down")
    growth_model = run_growth_model(df, growth_features, "trend_up_vs_down")
    growth_screen = attach_model_support(growth_screen, growth_model, "logistic_nonzero_folds")
    growth_stable, growth_directional = build_signal_lists(growth_screen, "trend_up_vs_down", "growth")

    print("Building archetypes and comparisons...")
    archetypes = build_archetypes(df)
    comparison = legacy_comparison(df, legacy_ml)

    excluded_rows = [
        {
            "feature": feature,
            "feature_label": feature_label(feature),
            "feature_family": "excluded_or_leaky",
            "reason": "Explicitly excluded from new-score optimization modeling.",
        }
        for feature in EXCLUDED_LEAKY
    ]

    results = {
        "meta": {
            "generated_at": pd.Timestamp.now().isoformat(),
            "random_seed": RANDOM_SEED,
            "source_files": [
                str(RECENT.relative_to(BASE)),
                str(QUERY_BY_CONTENT.relative_to(BASE)),
                str(QUERY_SUMMARY.relative_to(BASE)),
                str(FULL_HISTORY.relative_to(BASE)),
                str(LEGACY_ML.relative_to(BASE)),
            ],
            "model_sampling": {
                "max_model_rows": MAX_MODEL_ROWS,
                "max_rf_rows": MAX_RF_ROWS,
                "max_kmeans_rows": MAX_KMEANS_ROWS,
            },
        },
        "coverage": {
            "recent_rows": int(len(df)),
            "query_covered_rows": int(df["has_query_coverage"].sum()),
            "query_covered_pct": roundf(df["has_query_coverage"].mean() * 100, 2),
            "query_summary": query_summary.get("overall", {}),
            "full_history_window": full_history.get("pageHistoryWindow", {}),
        },
        "input_taxonomy": {
            "creation_time_controllable_inputs": CREATION_CONTROLLABLE,
            "refresh_time_controllable_inputs": REFRESH_CONTROLLABLE,
            "context_confounders": CONTEXT_CONFOUNDERS,
            "excluded_or_leaky_inputs": EXCLUDED_LEAKY,
        },
        "output_taxonomy": {
            "primary_outputs_to_optimize": PRIMARY_OUTPUTS,
            "secondary_diagnostics": SECONDARY_OUTPUTS,
        },
        "new_scoring": summarize_scores(df),
        "opportunity_definition": {
            "weights": {
                "exposure": 0.30,
                "under_capture": 0.25,
                "staleness": 0.20,
                "decline_risk": 0.15,
                "relevance_support": 0.10,
            }
        },
        "creation_models": {
            "core_quality_score": creation_core_model,
            "relevance_adjusted_quality_score": creation_rel_model,
        },
        "refresh_models": {
            "core_quality_score": refresh_core_model,
            "relevance_adjusted_quality_score": refresh_rel_model,
            "opportunity_score": refresh_opportunity_model,
        },
        "growth_models": {
            "trend_up_vs_down": growth_model,
        },
        "significant_stable_inputs": (
            creation_core_stable
            + creation_rel_stable
            + refresh_core_stable
            + refresh_rel_stable
            + refresh_opportunity_stable
            + growth_stable
        ),
        "directional_only_inputs": (
            creation_core_directional
            + creation_rel_directional
            + refresh_core_directional
            + refresh_rel_directional
            + refresh_opportunity_directional
            + growth_directional
        ),
        "excluded_or_leaky_inputs": excluded_rows,
        "content_archetypes": archetypes,
        "legacy_vs_new_comparison": comparison,
        "appendix_views": {
            "top_creation_signals": signal_summary(creation_core_stable + creation_rel_stable, "creation"),
            "top_refresh_signals": signal_summary(
                refresh_core_stable + refresh_rel_stable + refresh_opportunity_stable, "refresh"
            ),
            "top_growth_signals": signal_summary(growth_stable, "growth"),
        },
    }

    with open(OUTPUT, "w") as f:
        json.dump(results, f, indent=2, default=str)

    print(f"optimization-results.json written: {OUTPUT}")
    print(f"  Stable signals: {len(results['significant_stable_inputs'])}")
    print(f"  Directional signals: {len(results['directional_only_inputs'])}")
    print(f"  Archetypes: {len(results['content_archetypes'])}")


if __name__ == "__main__":
    main()
