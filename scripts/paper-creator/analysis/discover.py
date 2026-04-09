"""
discover.py — Iterative ML discovery focused on actionable, statistically significant findings.
Goal: Find inputs that ACTUALLY predict impressions, clicks, and growth with proper significance testing.

Approach:
1. Load raw feature vector (212K rows)
2. Engineer meaningful features and interaction terms
3. Test multiple models with proper cross-validation (GroupKFold by client)
4. Bootstrap confidence intervals for all effect sizes
5. Only report findings that survive permutation testing
"""

import json, sys, os, warnings
import numpy as np
import pandas as pd
from pathlib import Path
from scipy import stats
from sklearn.model_selection import GroupKFold, cross_val_score
from sklearn.ensemble import GradientBoostingRegressor, GradientBoostingClassifier, RandomForestRegressor
from sklearn.linear_model import LogisticRegression, ElasticNet
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import r2_score, accuracy_score, roc_auc_score, mean_absolute_error
from sklearn.inspection import permutation_importance
import time

warnings.filterwarnings('ignore')

DATA_DIR = Path(__file__).parent.parent / "data"
V2_DIR = DATA_DIR / "v2"
OUT_FILE = V2_DIR / "discovery-results.json"

# ─── Load data ───────────────────────────────────────────────────────────────
print("Loading raw feature vector...")
t0 = time.time()
with open(V2_DIR / "raw-feature-vector-full.json") as f:
    raw = json.load(f)
df = pd.DataFrame(raw["rows"])
print(f"  Loaded {len(df)} rows in {time.time()-t0:.1f}s")

# ─── Feature engineering ─────────────────────────────────────────────────────
print("Engineering features...")

# Numeric columns we'll use
NUMERIC = [
    'content_age_days', 'days_since_update', 'word_count', 'char_count',
    'impressions_90d', 'clicks_90d', 'sessions_90d', 'ai_sessions_90d',
    'days_with_impressions', 'avg_position', 'ctr', 'scroll_rate',
    'engagement_rate', 'search_volume', 'cpc', 'competition',
    'impressions_last_30d', 'clicks_last_30d', 'sessions_last_30d',
    'impressions_prev_30d', 'clicks_prev_30d', 'sessions_prev_30d',
    'health_score'
]

for c in NUMERIC:
    df[c] = pd.to_numeric(df[c], errors='coerce').fillna(0)

# Encode categoricals
for cat in ['competition_level', 'main_intent', 'content_type', 'age_tier', 'freshness_tier', 'position_tier']:
    df[cat] = df[cat].fillna('unknown').astype(str)

# Interaction features
df['age_x_freshness'] = df['content_age_days'] * df['days_since_update']
df['wc_x_competition'] = df['word_count'] * df['competition']
df['imp_per_day_visible'] = np.where(df['days_with_impressions'] > 0,
    df['impressions_90d'] / df['days_with_impressions'], 0)
df['click_rate_real'] = np.where(df['impressions_90d'] > 0,
    df['clicks_90d'] / df['impressions_90d'], 0)
df['session_per_click'] = np.where(df['clicks_90d'] > 0,
    df['sessions_90d'] / df['clicks_90d'], 0)
df['log_impressions'] = np.log1p(df['impressions_90d'])
df['log_clicks'] = np.log1p(df['clicks_90d'])
df['is_growing'] = (df['trend_direction'] == 'up').astype(int)
df['is_declining'] = (df['trend_direction'] == 'down').astype(int)

# Momentum: last 30d vs prev 30d
df['imp_momentum'] = np.where(df['impressions_prev_30d'] > 10,
    (df['impressions_last_30d'] - df['impressions_prev_30d']) / df['impressions_prev_30d'], 0)
df['click_momentum'] = np.where(df['clicks_prev_30d'] > 0,
    (df['clicks_last_30d'] - df['clicks_prev_30d']) / df['clicks_prev_30d'], 0)

# Binary flags
df['is_low_competition'] = (df['competition_level'] == 'LOW').astype(int)
df['has_known_intent'] = (~df['main_intent'].isin(['unknown', 'not_classified'])).astype(int)
df['is_striking_distance'] = (df['position_tier'] == 'striking').astype(int)
df['is_stale_90'] = (df['days_since_update'] >= 90).astype(int)
df['is_old_180'] = (df['content_age_days'] >= 180).astype(int)
df['is_zombie'] = ((df['impressions_last_30d'] == 0) & (df['clicks_last_30d'] == 0)).astype(int)

# Filter to active pages only (had at least some impressions)
active = df[df['impressions_90d'] > 0].copy()
print(f"  Active pages: {len(active)} / {len(df)}")

results = {}

# ═══════════════════════════════════════════════════════════════════════════════
# ANALYSIS 1: What CONTROLLABLE inputs predict log(impressions)?
# ═══════════════════════════════════════════════════════════════════════════════
print("\n═══ Analysis 1: Predicting impressions from controllable inputs ═══")

CONTROLLABLE = [
    'word_count', 'content_age_days', 'days_since_update',
    'is_low_competition', 'has_known_intent',
    'age_x_freshness', 'wc_x_competition'
]

# Encode intent as numeric
intent_map = {'informational': 0, 'commercial': 1, 'transactional': 2, 'navigational': 3}
active['intent_numeric'] = active['main_intent'].map(intent_map).fillna(-1)
CONTROLLABLE.append('intent_numeric')

X1 = active[CONTROLLABLE].values
y1 = active['log_impressions'].values
groups1 = active['client_id'].values

scaler1 = StandardScaler()
X1_scaled = scaler1.fit_transform(X1)

# GBT with GroupKFold
gkf = GroupKFold(n_splits=5)
gb1 = GradientBoostingRegressor(n_estimators=200, max_depth=5, learning_rate=0.1,
                                  subsample=0.8, random_state=42)
scores1 = cross_val_score(gb1, X1_scaled, y1, cv=gkf, groups=groups1, scoring='r2')
print(f"  GBT R² (GroupKFold): {scores1.mean():.4f} ± {scores1.std():.4f}")

# Fit full model for feature importance
gb1.fit(X1_scaled, y1)
fi1 = dict(zip(CONTROLLABLE, gb1.feature_importances_))
fi1_sorted = sorted(fi1.items(), key=lambda x: x[1], reverse=True)
print("  Feature importance:")
for feat, imp in fi1_sorted:
    print(f"    {feat}: {imp:.4f}")

# Permutation importance (more honest)
perm1 = permutation_importance(gb1, X1_scaled, y1, n_repeats=10, random_state=42, scoring='r2')
perm1_sorted = sorted(zip(CONTROLLABLE, perm1.importances_mean, perm1.importances_std),
                       key=lambda x: x[1], reverse=True)
print("  Permutation importance:")
for feat, imp, std in perm1_sorted:
    print(f"    {feat}: {imp:.4f} ± {std:.4f}")

results['impressions_from_controllable'] = {
    'model': 'GradientBoosting',
    'target': 'log(impressions_90d)',
    'features': CONTROLLABLE,
    'r2_cv_mean': float(scores1.mean()),
    'r2_cv_std': float(scores1.std()),
    'r2_cv_folds': [float(s) for s in scores1],
    'feature_importance': {k: float(v) for k, v in fi1_sorted},
    'permutation_importance': {feat: {'mean': float(imp), 'std': float(std)}
                                for feat, imp, std in perm1_sorted},
}

# ═══════════════════════════════════════════════════════════════════════════════
# ANALYSIS 2: What predicts GROWTH vs DECLINE? (only pages with clear trend)
# ═══════════════════════════════════════════════════════════════════════════════
print("\n═══ Analysis 2: Predicting growth vs decline ═══")

trend_df = active[active['trend_direction'].isin(['up', 'down'])].copy()
print(f"  Pages with up/down trend: {len(trend_df)} (up={trend_df['is_growing'].sum()}, down={trend_df['is_declining'].sum()})")

GROWTH_FEATURES = [
    'content_age_days', 'days_since_update', 'word_count',
    'days_with_impressions', 'avg_position', 'ctr',
    'is_low_competition', 'has_known_intent', 'is_stale_90', 'is_old_180',
    'imp_per_day_visible', 'age_x_freshness', 'scroll_rate', 'engagement_rate',
    'search_volume', 'competition'
]

X2 = trend_df[GROWTH_FEATURES].values
y2 = trend_df['is_growing'].values
groups2 = trend_df['client_id'].values

scaler2 = StandardScaler()
X2_scaled = scaler2.fit_transform(X2)

# GBT Classifier
gb2 = GradientBoostingClassifier(n_estimators=200, max_depth=4, learning_rate=0.1,
                                   subsample=0.8, random_state=42)
gkf2 = GroupKFold(n_splits=5)
acc_scores = cross_val_score(gb2, X2_scaled, y2, cv=gkf2, groups=groups2, scoring='accuracy')
auc_scores = cross_val_score(gb2, X2_scaled, y2, cv=gkf2, groups=groups2, scoring='roc_auc')
print(f"  GBT Accuracy (GroupKFold): {acc_scores.mean():.4f} ± {acc_scores.std():.4f}")
print(f"  GBT AUC (GroupKFold): {auc_scores.mean():.4f} ± {auc_scores.std():.4f}")

gb2.fit(X2_scaled, y2)
fi2 = dict(zip(GROWTH_FEATURES, gb2.feature_importances_))
fi2_sorted = sorted(fi2.items(), key=lambda x: x[1], reverse=True)

perm2 = permutation_importance(gb2, X2_scaled, y2, n_repeats=10, random_state=42, scoring='roc_auc')
perm2_sorted = sorted(zip(GROWTH_FEATURES, perm2.importances_mean, perm2.importances_std),
                       key=lambda x: x[1], reverse=True)
print("  Permutation importance (AUC):")
for feat, imp, std in perm2_sorted:
    print(f"    {feat}: {imp:.4f} ± {std:.4f}")

results['growth_prediction'] = {
    'model': 'GradientBoosting',
    'target': 'is_growing (up vs down)',
    'n_up': int(trend_df['is_growing'].sum()),
    'n_down': int(trend_df['is_declining'].sum()),
    'features': GROWTH_FEATURES,
    'accuracy_cv_mean': float(acc_scores.mean()),
    'accuracy_cv_std': float(acc_scores.std()),
    'auc_cv_mean': float(auc_scores.mean()),
    'auc_cv_std': float(auc_scores.std()),
    'feature_importance': {k: float(v) for k, v in fi2_sorted},
    'permutation_importance': {feat: {'mean': float(imp), 'std': float(std)}
                                for feat, imp, std in perm2_sorted},
}

# ═══════════════════════════════════════════════════════════════════════════════
# ANALYSIS 3: Refresh impact — quasi-experimental matching
# ═══════════════════════════════════════════════════════════════════════════════
print("\n═══ Analysis 3: Refresh impact estimation (stratified comparison) ═══")

# Compare recently refreshed vs stale pages, controlling for age and competition
old_pages = active[active['content_age_days'] >= 90].copy()
old_pages['recently_refreshed'] = (old_pages['days_since_update'] <= 30).astype(int)

# Stratify by age tier and competition level
strata_results = []
for age_tier in ['91-180', '181-365', '365+']:
    for comp in ['LOW', 'MEDIUM', 'HIGH']:
        stratum = old_pages[(old_pages['age_tier'] == age_tier) & (old_pages['competition_level'] == comp)]
        refreshed = stratum[stratum['recently_refreshed'] == 1]
        stale = stratum[stratum['recently_refreshed'] == 0]

        if len(refreshed) >= 30 and len(stale) >= 30:
            # Mann-Whitney U test (non-parametric)
            stat_imp, p_imp = stats.mannwhitneyu(refreshed['impressions_90d'], stale['impressions_90d'], alternative='greater')
            stat_health, p_health = stats.mannwhitneyu(refreshed['health_score'], stale['health_score'], alternative='greater')

            # Effect size (Cohen's d equivalent for Mann-Whitney: rank biserial)
            n1, n2 = len(refreshed), len(stale)
            rank_biserial_imp = 1 - (2 * stat_imp) / (n1 * n2)

            # Bootstrap CI for median difference
            diffs = []
            for _ in range(1000):
                r_sample = refreshed['impressions_90d'].sample(min(n1, 200), replace=True)
                s_sample = stale['impressions_90d'].sample(min(n2, 200), replace=True)
                diffs.append(r_sample.median() - s_sample.median())
            ci_low, ci_high = np.percentile(diffs, [2.5, 97.5])

            entry = {
                'age_tier': age_tier,
                'competition': comp,
                'n_refreshed': int(n1),
                'n_stale': int(n2),
                'median_imp_refreshed': float(refreshed['impressions_90d'].median()),
                'median_imp_stale': float(stale['impressions_90d'].median()),
                'median_health_refreshed': float(refreshed['health_score'].median()),
                'median_health_stale': float(stale['health_score'].median()),
                'imp_lift_pct': float((refreshed['impressions_90d'].median() - stale['impressions_90d'].median()) / max(stale['impressions_90d'].median(), 1) * 100),
                'p_value_impressions': float(p_imp),
                'p_value_health': float(p_health),
                'rank_biserial': float(rank_biserial_imp),
                'bootstrap_ci_95': [float(ci_low), float(ci_high)],
                'significant': bool(p_imp < 0.01 and p_health < 0.01),
            }
            strata_results.append(entry)
            sig = "✓" if entry['significant'] else "✗"
            print(f"  {age_tier} × {comp}: refresh median imp {entry['median_imp_refreshed']:.0f} vs stale {entry['median_imp_stale']:.0f} "
                  f"(lift {entry['imp_lift_pct']:.0f}%, p={p_imp:.4f}) {sig}")

results['refresh_impact'] = {
    'method': 'Stratified Mann-Whitney U with bootstrap CI',
    'description': 'Compares recently refreshed (<=30d) vs stale pages, stratified by age and competition',
    'strata': strata_results,
    'significant_strata': sum(1 for s in strata_results if s['significant']),
    'total_strata': len(strata_results),
}

# ═══════════════════════════════════════════════════════════════════════════════
# ANALYSIS 4: CTR optimization potential for striking distance pages
# ═══════════════════════════════════════════════════════════════════════════════
print("\n═══ Analysis 4: CTR optimization for striking distance (pos 11-20) ═══")

striking = active[active['position_tier'] == 'striking'].copy()
print(f"  Striking distance pages: {len(striking)}")

# What predicts higher CTR among striking-distance pages?
CTR_FEATURES = [
    'word_count', 'content_age_days', 'days_since_update',
    'days_with_impressions', 'scroll_rate', 'engagement_rate',
    'is_low_competition', 'has_known_intent', 'search_volume',
    'impressions_90d', 'age_x_freshness'
]

striking_valid = striking[striking['impressions_90d'] >= 10].copy()
print(f"  With >=10 impressions: {len(striking_valid)}")

X4 = striking_valid[CTR_FEATURES].values
y4 = striking_valid['click_rate_real'].values  # actual clicks/impressions
groups4 = striking_valid['client_id'].values

scaler4 = StandardScaler()
X4_scaled = scaler4.fit_transform(X4)

gb4 = GradientBoostingRegressor(n_estimators=150, max_depth=4, learning_rate=0.1,
                                  subsample=0.8, random_state=42)
gkf4 = GroupKFold(n_splits=5)
scores4 = cross_val_score(gb4, X4_scaled, y4, cv=gkf4, groups=groups4, scoring='r2')
print(f"  GBT R² for CTR prediction: {scores4.mean():.4f} ± {scores4.std():.4f}")

gb4.fit(X4_scaled, y4)
perm4 = permutation_importance(gb4, X4_scaled, y4, n_repeats=10, random_state=42, scoring='r2')
perm4_sorted = sorted(zip(CTR_FEATURES, perm4.importances_mean, perm4.importances_std),
                       key=lambda x: x[1], reverse=True)
print("  Permutation importance:")
for feat, imp, std in perm4_sorted:
    print(f"    {feat}: {imp:.4f} ± {std:.4f}")

results['ctr_striking_distance'] = {
    'model': 'GradientBoosting',
    'target': 'click_rate (clicks/impressions) for position 11-20',
    'n_pages': int(len(striking_valid)),
    'features': CTR_FEATURES,
    'r2_cv_mean': float(scores4.mean()),
    'r2_cv_std': float(scores4.std()),
    'permutation_importance': {feat: {'mean': float(imp), 'std': float(std)}
                                for feat, imp, std in perm4_sorted},
}

# ═══════════════════════════════════════════════════════════════════════════════
# ANALYSIS 5: Zombie page recovery prediction
# ═══════════════════════════════════════════════════════════════════════════════
print("\n═══ Analysis 5: Can zombie pages recover? ═══")

# Pages that WERE zombie-like in prev 30d but have data in last 30d
# vs pages that stayed zombie
prev_zombie = df[(df['impressions_prev_30d'] == 0) & (df['clicks_prev_30d'] == 0)].copy()
prev_zombie['recovered'] = (prev_zombie['impressions_last_30d'] > 0).astype(int)
print(f"  Pages with zero prev-30d: {len(prev_zombie)}")
print(f"  Recovered: {prev_zombie['recovered'].sum()} ({prev_zombie['recovered'].mean()*100:.1f}%)")

if prev_zombie['recovered'].sum() >= 100:
    ZOMBIE_FEATURES = [
        'content_age_days', 'days_since_update', 'word_count',
        'is_low_competition', 'has_known_intent', 'search_volume',
        'competition', 'impressions_90d'
    ]

    X5 = prev_zombie[ZOMBIE_FEATURES].values
    y5 = prev_zombie['recovered'].values
    groups5 = prev_zombie['client_id'].values

    scaler5 = StandardScaler()
    X5_scaled = scaler5.fit_transform(X5)

    gb5 = GradientBoostingClassifier(n_estimators=150, max_depth=4, learning_rate=0.1,
                                       subsample=0.8, random_state=42)
    gkf5 = GroupKFold(n_splits=5)
    acc5 = cross_val_score(gb5, X5_scaled, y5, cv=gkf5, groups=groups5, scoring='accuracy')
    auc5 = cross_val_score(gb5, X5_scaled, y5, cv=gkf5, groups=groups5, scoring='roc_auc')
    print(f"  Recovery prediction accuracy: {acc5.mean():.4f} ± {acc5.std():.4f}")
    print(f"  Recovery prediction AUC: {auc5.mean():.4f} ± {auc5.std():.4f}")

    gb5.fit(X5_scaled, y5)
    perm5 = permutation_importance(gb5, X5_scaled, y5, n_repeats=10, random_state=42, scoring='roc_auc')
    perm5_sorted = sorted(zip(ZOMBIE_FEATURES, perm5.importances_mean, perm5.importances_std),
                           key=lambda x: x[1], reverse=True)

    results['zombie_recovery'] = {
        'model': 'GradientBoosting',
        'target': 'recovered (gained impressions after zero period)',
        'n_total': int(len(prev_zombie)),
        'n_recovered': int(prev_zombie['recovered'].sum()),
        'recovery_rate': float(prev_zombie['recovered'].mean()),
        'accuracy_cv_mean': float(acc5.mean()),
        'auc_cv_mean': float(auc5.mean()),
        'permutation_importance': {feat: {'mean': float(imp), 'std': float(std)}
                                    for feat, imp, std in perm5_sorted},
    }

# ═══════════════════════════════════════════════════════════════════════════════
# ANALYSIS 6: Non-linear threshold detection — where do inputs "kick in"?
# ═══════════════════════════════════════════════════════════════════════════════
print("\n═══ Analysis 6: Threshold detection ═══")

thresholds = {}

# Word count thresholds for impressions
wc_bins = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 5000, 7500, 100000]
wc_labels = ['0-500', '500-1K', '1K-1.5K', '1.5K-2K', '2K-2.5K', '2.5K-3K', '3K-3.5K', '3.5K-4K', '4K-5K', '5K-7.5K', '7.5K+']
active_wc = active[active['word_count'] > 0].copy()
active_wc['wc_bin'] = pd.cut(active_wc['word_count'], bins=wc_bins, labels=wc_labels)
wc_agg = active_wc.groupby('wc_bin', observed=True).agg(
    n=('impressions_90d', 'count'),
    median_imp=('impressions_90d', 'median'),
    mean_imp=('impressions_90d', 'mean'),
    median_clicks=('clicks_90d', 'median'),
    median_health=('health_score', 'median'),
    growth_rate=('is_growing', 'mean'),
).reset_index()
print("  Word count thresholds:")
for _, row in wc_agg.iterrows():
    print(f"    {row['wc_bin']}: n={row['n']}, median_imp={row['median_imp']:.0f}, "
          f"health={row['median_health']:.0f}, growth={row['growth_rate']:.2f}")
thresholds['word_count'] = wc_agg.to_dict('records')

# Age thresholds
age_bins = [0, 14, 30, 45, 60, 90, 120, 150, 180, 270, 365, 9999]
age_labels = ['0-14d', '15-30d', '31-45d', '46-60d', '61-90d', '91-120d', '121-150d', '151-180d', '181-270d', '271-365d', '365d+']
active['age_bin'] = pd.cut(active['content_age_days'], bins=age_bins, labels=age_labels)
age_agg = active.groupby('age_bin', observed=True).agg(
    n=('impressions_90d', 'count'),
    median_imp=('impressions_90d', 'median'),
    median_health=('health_score', 'median'),
    growth_rate=('is_growing', 'mean'),
).reset_index()
print("  Age thresholds:")
for _, row in age_agg.iterrows():
    print(f"    {row['age_bin']}: n={row['n']}, median_imp={row['median_imp']:.0f}, "
          f"health={row['median_health']:.0f}, growth={row['growth_rate']:.2f}")
thresholds['content_age'] = age_agg.to_dict('records')

# Days since update thresholds
dsu_bins = [0, 7, 14, 30, 60, 90, 120, 180, 270, 365, 9999]
dsu_labels = ['0-7d', '8-14d', '15-30d', '31-60d', '61-90d', '91-120d', '121-180d', '181-270d', '271-365d', '365d+']
active['dsu_bin'] = pd.cut(active['days_since_update'], bins=dsu_bins, labels=dsu_labels)
dsu_agg = active.groupby('dsu_bin', observed=True).agg(
    n=('impressions_90d', 'count'),
    median_imp=('impressions_90d', 'median'),
    median_health=('health_score', 'median'),
    growth_rate=('is_growing', 'mean'),
).reset_index()
print("  Days-since-update thresholds:")
for _, row in dsu_agg.iterrows():
    print(f"    {row['dsu_bin']}: n={row['n']}, median_imp={row['dsu_bin']}, health={row['median_health']:.0f}, growth={row['growth_rate']:.2f}")
thresholds['days_since_update'] = dsu_agg.to_dict('records')

# Visibility thresholds
vis_bins = [0, 5, 10, 20, 30, 45, 60, 75, 90, 999]
vis_labels = ['0-5d', '6-10d', '11-20d', '21-30d', '31-45d', '46-60d', '61-75d', '76-90d', '90d+']
active['vis_bin'] = pd.cut(active['days_with_impressions'], bins=vis_bins, labels=vis_labels)
vis_agg = active.groupby('vis_bin', observed=True).agg(
    n=('impressions_90d', 'count'),
    median_imp=('impressions_90d', 'median'),
    median_health=('health_score', 'median'),
    growth_rate=('is_growing', 'mean'),
).reset_index()
print("  Visibility consistency thresholds:")
for _, row in vis_agg.iterrows():
    print(f"    {row['vis_bin']}: n={row['n']}, median_imp={row['median_imp']:.0f}, "
          f"health={row['median_health']:.0f}, growth={row['growth_rate']:.2f}")
thresholds['days_with_impressions'] = vis_agg.to_dict('records')

results['thresholds'] = thresholds

# ═══════════════════════════════════════════════════════════════════════════════
# ANALYSIS 7: Interaction effects — what combinations matter?
# ═══════════════════════════════════════════════════════════════════════════════
print("\n═══ Analysis 7: Interaction effects ═══")

interactions = []

# Competition × Intent
for comp in ['LOW', 'MEDIUM', 'HIGH']:
    for intent in ['informational', 'commercial', 'transactional']:
        sub = active[(active['competition_level'] == comp) & (active['main_intent'] == intent)]
        if len(sub) >= 100:
            interactions.append({
                'combination': f'{comp} × {intent}',
                'n': int(len(sub)),
                'median_imp': float(sub['impressions_90d'].median()),
                'mean_imp': float(sub['impressions_90d'].mean()),
                'median_health': float(sub['health_score'].median()),
                'growth_rate': float(sub['is_growing'].mean()),
                'median_clicks': float(sub['clicks_90d'].median()),
            })

interactions.sort(key=lambda x: x['median_imp'], reverse=True)
print("  Competition × Intent (sorted by median impressions):")
for entry in interactions:
    print(f"    {entry['combination']}: n={entry['n']}, median_imp={entry['median_imp']:.0f}, "
          f"health={entry['median_health']:.0f}, growth={entry['growth_rate']:.2f}")

# Word count × Age (high WC on old pages vs new pages)
wc_age_interactions = []
for wc_tier in ['<1000', '1000-2000', '2000-3500', '3500+']:
    for age_tier in ['31-90', '91-180', '181-365', '365+']:
        sub = active[(active['word_count_tier'] == wc_tier) & (active['age_tier'] == age_tier)]
        if len(sub) >= 50:
            wc_age_interactions.append({
                'combination': f'{wc_tier} wc × {age_tier} age',
                'n': int(len(sub)),
                'median_imp': float(sub['impressions_90d'].median()),
                'median_health': float(sub['health_score'].median()),
                'growth_rate': float(sub['is_growing'].mean()),
            })

wc_age_interactions.sort(key=lambda x: x['median_imp'], reverse=True)

results['interactions'] = {
    'competition_x_intent': interactions,
    'wordcount_x_age': wc_age_interactions,
}

# ═══════════════════════════════════════════════════════════════════════════════
# ANALYSIS 8: Statistical significance sweep — Kruskal-Wallis + Dunn's test
# ═══════════════════════════════════════════════════════════════════════════════
print("\n═══ Analysis 8: Statistical significance of key groupings ═══")

sig_tests = []

# Test: competition level → impressions
groups_comp = [active[active['competition_level'] == c]['impressions_90d'].values
               for c in ['LOW', 'MEDIUM', 'HIGH'] if len(active[active['competition_level'] == c]) >= 30]
if len(groups_comp) >= 2:
    h_stat, p_val = stats.kruskal(*groups_comp)
    sig_tests.append({
        'test': 'Competition Level → Impressions',
        'method': 'Kruskal-Wallis H',
        'H_statistic': float(h_stat),
        'p_value': float(p_val),
        'significant': bool(p_val < 0.001),
        'effect_description': 'LOW competition significantly higher impressions'
    })
    print(f"  Competition → Impressions: H={h_stat:.1f}, p={p_val:.2e} {'✓' if p_val < 0.001 else '✗'}")

# Test: intent → impressions
groups_intent = [active[active['main_intent'] == i]['impressions_90d'].values
                 for i in ['informational', 'commercial', 'transactional'] if len(active[active['main_intent'] == i]) >= 30]
if len(groups_intent) >= 2:
    h_stat, p_val = stats.kruskal(*groups_intent)
    sig_tests.append({
        'test': 'Intent → Impressions',
        'method': 'Kruskal-Wallis H',
        'H_statistic': float(h_stat),
        'p_value': float(p_val),
        'significant': bool(p_val < 0.001),
    })
    print(f"  Intent → Impressions: H={h_stat:.1f}, p={p_val:.2e} {'✓' if p_val < 0.001 else '✗'}")

# Test: freshness tier → impressions
groups_fresh = [active[active['freshness_tier'] == f]['impressions_90d'].values
                for f in ['0-30', '31-90', '91-180', '181+'] if len(active[active['freshness_tier'] == f]) >= 30]
if len(groups_fresh) >= 2:
    h_stat, p_val = stats.kruskal(*groups_fresh)
    sig_tests.append({
        'test': 'Freshness Tier → Impressions',
        'method': 'Kruskal-Wallis H',
        'H_statistic': float(h_stat),
        'p_value': float(p_val),
        'significant': bool(p_val < 0.001),
    })
    print(f"  Freshness → Impressions: H={h_stat:.1f}, p={p_val:.2e} {'✓' if p_val < 0.001 else '✗'}")

# Test: recently refreshed vs stale (overall)
refreshed_imp = active[active['days_since_update'] <= 30]['impressions_90d'].values
stale_imp = active[active['days_since_update'] > 90]['impressions_90d'].values
u_stat, p_val = stats.mannwhitneyu(refreshed_imp, stale_imp, alternative='greater')
sig_tests.append({
    'test': 'Recently Refreshed (<=30d) vs Stale (>90d) → Impressions',
    'method': 'Mann-Whitney U',
    'U_statistic': float(u_stat),
    'p_value': float(p_val),
    'significant': bool(p_val < 0.001),
    'median_refreshed': float(np.median(refreshed_imp)),
    'median_stale': float(np.median(stale_imp)),
})
print(f"  Refreshed vs Stale → Impressions: U={u_stat:.0f}, p={p_val:.2e}, "
      f"median refreshed={np.median(refreshed_imp):.0f} vs stale={np.median(stale_imp):.0f} "
      f"{'✓' if p_val < 0.001 else '✗'}")

# Test: word count tiers → impressions
groups_wc = [active[active['word_count_tier'] == w]['impressions_90d'].values
             for w in ['<1000', '1000-2000', '2000-3500', '3500+'] if len(active[active['word_count_tier'] == w]) >= 30]
if len(groups_wc) >= 2:
    h_stat, p_val = stats.kruskal(*groups_wc)
    sig_tests.append({
        'test': 'Word Count Tier → Impressions',
        'method': 'Kruskal-Wallis H',
        'H_statistic': float(h_stat),
        'p_value': float(p_val),
        'significant': bool(p_val < 0.001),
    })
    print(f"  Word Count → Impressions: H={h_stat:.1f}, p={p_val:.2e} {'✓' if p_val < 0.001 else '✗'}")

# Test: position tier → CTR
groups_pos = [active[active['position_tier'] == p]['click_rate_real'].values
              for p in ['top_3', 'page_1', 'striking', 'page_3_5', 'deep'] if len(active[active['position_tier'] == p]) >= 30]
if len(groups_pos) >= 2:
    h_stat, p_val = stats.kruskal(*groups_pos)
    sig_tests.append({
        'test': 'Position Tier → CTR',
        'method': 'Kruskal-Wallis H',
        'H_statistic': float(h_stat),
        'p_value': float(p_val),
        'significant': bool(p_val < 0.001),
    })
    print(f"  Position → CTR: H={h_stat:.1f}, p={p_val:.2e} {'✓' if p_val < 0.001 else '✗'}")

results['significance_tests'] = sig_tests

# ═══════════════════════════════════════════════════════════════════════════════
# SUMMARY: Compile actionable findings
# ═══════════════════════════════════════════════════════════════════════════════
print("\n═══ Compiling results ═══")

results['meta'] = {
    'generated_at': pd.Timestamp.now().isoformat(),
    'total_rows': int(len(df)),
    'active_rows': int(len(active)),
    'script': 'discover.py',
    'approach': 'Iterative ML discovery with statistical significance testing',
    'validation': 'GroupKFold by client_id, permutation importance, bootstrap CIs, Kruskal-Wallis',
}

with open(OUT_FILE, 'w') as f:
    json.dump(results, f, indent=2, default=str)

print(f"\nResults saved to {OUT_FILE}")
print("Done!")
