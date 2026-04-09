"""
discover3.py — Proper holdout validation.

Protocol:
1. Split ALL data upfront: 70% train / 30% test by client_id (no client in both)
2. Train all models on the 70% only
3. Report ALL metrics on the untouched 30% only
4. Calibration computed on the 30% only
5. No information from the test set touches training at any point

This is the gold standard. If the numbers hold here, they're real.
"""

import json, warnings, time
import numpy as np
import pandas as pd
from pathlib import Path
from scipy import stats
from sklearn.model_selection import GroupKFold, cross_val_score
from sklearn.ensemble import GradientBoostingRegressor, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    r2_score, accuracy_score, roc_auc_score,
    confusion_matrix, mean_absolute_error
)
from sklearn.inspection import permutation_importance

warnings.filterwarnings('ignore')
np.random.seed(42)

DATA_DIR = Path(__file__).parent.parent / "data"
V2_DIR = DATA_DIR / "v2"

# ─── Load ────────────────────────────────────────────────────────────────────
print("Loading data...")
t0 = time.time()
with open(V2_DIR / "raw-feature-vector-full.json") as f:
    raw = json.load(f)
df = pd.DataFrame(raw["rows"])
print(f"  {len(df)} rows in {time.time()-t0:.1f}s")

# ─── Feature engineering ─────────────────────────────────────────────────────
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

for cat in ['competition_level', 'main_intent', 'content_type', 'age_tier',
            'freshness_tier', 'position_tier']:
    df[cat] = df[cat].fillna('unknown').astype(str)

df['age_x_freshness'] = df['content_age_days'] * df['days_since_update']
df['imp_per_day_visible'] = np.where(
    df['days_with_impressions'] > 0,
    df['impressions_90d'] / df['days_with_impressions'], 0)
df['log_impressions'] = np.log1p(df['impressions_90d'])
df['is_growing'] = (df['trend_direction'] == 'up').astype(int)
df['is_declining_flag'] = (df['trend_direction'] == 'down').astype(int)
df['is_low_competition'] = (df['competition_level'] == 'LOW').astype(int)
df['has_known_intent'] = (
    ~df['main_intent'].isin(['unknown', 'not_classified'])).astype(int)
df['click_rate_real'] = np.where(
    df['impressions_90d'] > 0,
    df['clicks_90d'] / df['impressions_90d'], 0)

intent_map = {'informational': 0, 'commercial': 1, 'transactional': 2,
              'navigational': 3}
df['intent_numeric'] = df['main_intent'].map(intent_map).fillna(-1)

# ═════════════════════════════════════════════════════════════════════════════
# STEP 1: 70/30 CLIENT-LEVEL HOLDOUT
# ═════════════════════════════════════════════════════════════════════════════
all_clients = df['client_id'].unique()
np.random.shuffle(all_clients)
split_idx = int(len(all_clients) * 0.70)
train_clients = set(all_clients[:split_idx])
test_clients = set(all_clients[split_idx:])

train_df = df[df['client_id'].isin(train_clients)].copy()
test_df = df[df['client_id'].isin(test_clients)].copy()

print(f"\n{'='*70}")
print(f"CLIENT-LEVEL HOLDOUT SPLIT")
print(f"{'='*70}")
print(f"  Train clients: {len(train_clients)} | Test clients: {len(test_clients)}")
print(f"  Train rows: {len(train_df):,} | Test rows: {len(test_df):,}")
print(f"  Split ratio: {len(train_df)/(len(train_df)+len(test_df))*100:.1f}% / "
      f"{len(test_df)/(len(train_df)+len(test_df))*100:.1f}%")
print(f"  Client overlap: {len(train_clients & test_clients)} (must be 0)")

# Active subsets
train_active = train_df[train_df['impressions_90d'] > 0].copy()
test_active = test_df[test_df['impressions_90d'] > 0].copy()
print(f"  Train active: {len(train_active):,} | Test active: {len(test_active):,}")

results = {}

# ═════════════════════════════════════════════════════════════════════════════
# MODEL 1: Growth Prediction (up vs down)
# ═════════════════════════════════════════════════════════════════════════════
print(f"\n{'='*70}")
print("MODEL 1: GROWTH PREDICTION")
print(f"{'='*70}")

GROWTH_FEATURES = [
    'days_with_impressions', 'days_since_update', 'word_count',
    'avg_position', 'imp_per_day_visible', 'content_age_days',
    'has_known_intent'
]

train_trend = train_active[train_active['trend_direction'].isin(['up', 'down'])]
test_trend = test_active[test_active['trend_direction'].isin(['up', 'down'])]

print(f"  Train: {len(train_trend):,} (up={train_trend['is_growing'].sum():,}, "
      f"down={(~train_trend['is_growing'].astype(bool)).sum():,})")
print(f"  Test:  {len(test_trend):,} (up={test_trend['is_growing'].sum():,}, "
      f"down={(~test_trend['is_growing'].astype(bool)).sum():,})")

X_train_g = train_trend[GROWTH_FEATURES].values
y_train_g = train_trend['is_growing'].values
X_test_g = test_trend[GROWTH_FEATURES].values
y_test_g = test_trend['is_growing'].values

scaler_g = StandardScaler()
X_train_g_s = scaler_g.fit_transform(X_train_g)
X_test_g_s = scaler_g.transform(X_test_g)

# Also run CV on train set for comparison
gb_g = GradientBoostingClassifier(
    n_estimators=100, max_depth=3, learning_rate=0.1,
    min_samples_leaf=100, subsample=0.8, random_state=42)

gkf = GroupKFold(n_splits=5)
cv_auc = cross_val_score(gb_g, X_train_g_s, y_train_g,
                          cv=gkf, groups=train_trend['client_id'].values,
                          scoring='roc_auc')
print(f"  CV AUC (train only, 5-fold): {cv_auc.mean():.4f} ± {cv_auc.std():.4f}")

# Train on ALL training data, test on holdout
gb_g.fit(X_train_g_s, y_train_g)
y_pred_g = gb_g.predict(X_test_g_s)
y_proba_g = gb_g.predict_proba(X_test_g_s)[:, 1]

test_acc_g = accuracy_score(y_test_g, y_pred_g)
test_auc_g = roc_auc_score(y_test_g, y_proba_g)
cm_g = confusion_matrix(y_test_g, y_pred_g)

print(f"\n  HOLDOUT RESULTS (unseen clients):")
print(f"    Accuracy: {test_acc_g:.4f}")
print(f"    AUC:      {test_auc_g:.4f}")
print(f"    Confusion matrix:")
print(f"      TN={cm_g[0][0]:,}  FP={cm_g[0][1]:,}")
print(f"      FN={cm_g[1][0]:,}  TP={cm_g[1][1]:,}")

# Permutation importance on TEST set (honest)
perm_g = permutation_importance(gb_g, X_test_g_s, y_test_g,
                                 n_repeats=20, random_state=42,
                                 scoring='roc_auc')
perm_g_sorted = sorted(zip(GROWTH_FEATURES, perm_g.importances_mean,
                            perm_g.importances_std),
                        key=lambda x: x[1], reverse=True)
print(f"  Permutation importance (on TEST set):")
for feat, imp, std in perm_g_sorted:
    print(f"    {feat}: {imp:.4f} ± {std:.4f}")

# Calibration on TEST set
cal_bins = pd.cut(y_proba_g, bins=10)
cal_df = pd.DataFrame({'prob': y_proba_g, 'actual': y_test_g, 'bin': cal_bins})
cal_agg = cal_df.groupby('bin', observed=True).agg(
    mean_prob=('prob', 'mean'),
    actual_rate=('actual', 'mean'),
    n=('actual', 'count')
).reset_index()
print(f"  Calibration (TEST set):")
for _, row in cal_agg.iterrows():
    diff = abs(row['actual_rate'] - row['mean_prob'])
    mark = "✓" if diff < 0.15 else "✗"
    print(f"    predicted {row['mean_prob']:.2f} → actual {row['actual_rate']:.2f} "
          f"(n={row['n']}) {mark}")

results['growth'] = {
    'train_clients': len(train_clients),
    'test_clients': len(test_clients),
    'train_n': int(len(train_trend)),
    'test_n': int(len(test_trend)),
    'cv_auc_mean': float(cv_auc.mean()),
    'cv_auc_std': float(cv_auc.std()),
    'holdout_accuracy': float(test_acc_g),
    'holdout_auc': float(test_auc_g),
    'confusion_matrix': {
        'tn': int(cm_g[0][0]), 'fp': int(cm_g[0][1]),
        'fn': int(cm_g[1][0]), 'tp': int(cm_g[1][1])},
    'permutation_importance_test': {
        feat: {'mean': float(imp), 'std': float(std)}
        for feat, imp, std in perm_g_sorted},
    'calibration_test': cal_agg[['mean_prob', 'actual_rate', 'n']].to_dict('records'),
}

# ═════════════════════════════════════════════════════════════════════════════
# MODEL 2: Zombie Recovery
# ═════════════════════════════════════════════════════════════════════════════
print(f"\n{'='*70}")
print("MODEL 2: ZOMBIE RECOVERY")
print(f"{'='*70}")

ZOMBIE_FEATURES = [
    'content_age_days', 'days_since_update', 'word_count',
    'is_low_competition', 'has_known_intent', 'search_volume',
    'competition', 'impressions_90d', 'days_with_impressions',
    'avg_position'
]

train_zombie = train_df[
    (train_df['impressions_prev_30d'] == 0) &
    (train_df['clicks_prev_30d'] == 0)].copy()
test_zombie = test_df[
    (test_df['impressions_prev_30d'] == 0) &
    (test_df['clicks_prev_30d'] == 0)].copy()
train_zombie['recovered'] = (train_zombie['impressions_last_30d'] > 0).astype(int)
test_zombie['recovered'] = (test_zombie['impressions_last_30d'] > 0).astype(int)

print(f"  Train: {len(train_zombie):,} "
      f"(recovered={train_zombie['recovered'].sum():,}, "
      f"rate={train_zombie['recovered'].mean():.3f})")
print(f"  Test:  {len(test_zombie):,} "
      f"(recovered={test_zombie['recovered'].sum():,}, "
      f"rate={test_zombie['recovered'].mean():.3f})")

X_train_z = train_zombie[ZOMBIE_FEATURES].values
y_train_z = train_zombie['recovered'].values
X_test_z = test_zombie[ZOMBIE_FEATURES].values
y_test_z = test_zombie['recovered'].values

scaler_z = StandardScaler()
X_train_z_s = scaler_z.fit_transform(X_train_z)
X_test_z_s = scaler_z.transform(X_test_z)

gb_z = GradientBoostingClassifier(
    n_estimators=150, max_depth=4, learning_rate=0.1,
    min_samples_leaf=50, subsample=0.8, random_state=42)
gb_z.fit(X_train_z_s, y_train_z)

y_pred_z = gb_z.predict(X_test_z_s)
y_proba_z = gb_z.predict_proba(X_test_z_s)[:, 1]
test_acc_z = accuracy_score(y_test_z, y_pred_z)
test_auc_z = roc_auc_score(y_test_z, y_proba_z)
cm_z = confusion_matrix(y_test_z, y_pred_z)

print(f"\n  HOLDOUT RESULTS:")
print(f"    Accuracy: {test_acc_z:.4f}")
print(f"    AUC:      {test_auc_z:.4f}")

perm_z = permutation_importance(gb_z, X_test_z_s, y_test_z,
                                 n_repeats=20, random_state=42,
                                 scoring='roc_auc')
perm_z_sorted = sorted(zip(ZOMBIE_FEATURES, perm_z.importances_mean,
                            perm_z.importances_std),
                        key=lambda x: x[1], reverse=True)
print(f"  Permutation importance (TEST set):")
for feat, imp, std in perm_z_sorted:
    print(f"    {feat}: {imp:.4f} ± {std:.4f}")

# Profile recoverable vs not on TEST set
test_zombie['recovery_prob'] = y_proba_z
high_prob = test_zombie[test_zombie['recovery_prob'] >= 0.8]
low_prob = test_zombie[test_zombie['recovery_prob'] < 0.2]
print(f"\n  High prob (>=0.8): {len(high_prob)} pages, "
      f"actual recovery: {high_prob['recovered'].mean():.3f}")
print(f"  Low prob (<0.2):  {len(low_prob)} pages, "
      f"actual recovery: {low_prob['recovered'].mean():.3f}")

results['zombie'] = {
    'train_n': int(len(train_zombie)),
    'test_n': int(len(test_zombie)),
    'holdout_accuracy': float(test_acc_z),
    'holdout_auc': float(test_auc_z),
    'permutation_importance_test': {
        feat: {'mean': float(imp), 'std': float(std)}
        for feat, imp, std in perm_z_sorted},
    'high_prob_n': int(len(high_prob)),
    'high_prob_actual_recovery': float(high_prob['recovered'].mean())
        if len(high_prob) > 0 else 0,
    'low_prob_n': int(len(low_prob)),
    'low_prob_actual_recovery': float(low_prob['recovered'].mean())
        if len(low_prob) > 0 else 0,
}

# ═════════════════════════════════════════════════════════════════════════════
# MODEL 3: 30-Day Momentum
# ═════════════════════════════════════════════════════════════════════════════
print(f"\n{'='*70}")
print("MODEL 3: 30-DAY MOMENTUM")
print(f"{'='*70}")

MOM_FEATURES = [
    'content_age_days', 'days_since_update', 'word_count',
    'days_with_impressions', 'avg_position', 'impressions_prev_30d',
    'is_low_competition', 'has_known_intent', 'imp_per_day_visible',
    'scroll_rate', 'engagement_rate'
]

train_mom = train_active[train_active['impressions_prev_30d'] >= 10].copy()
test_mom = test_active[test_active['impressions_prev_30d'] >= 10].copy()
train_mom['improved'] = (
    (train_mom['impressions_last_30d'] - train_mom['impressions_prev_30d'])
    / train_mom['impressions_prev_30d'] > 0.10).astype(int)
test_mom['improved'] = (
    (test_mom['impressions_last_30d'] - test_mom['impressions_prev_30d'])
    / test_mom['impressions_prev_30d'] > 0.10).astype(int)

print(f"  Train: {len(train_mom):,} "
      f"(improved={train_mom['improved'].sum():,}, "
      f"rate={train_mom['improved'].mean():.3f})")
print(f"  Test:  {len(test_mom):,} "
      f"(improved={test_mom['improved'].sum():,}, "
      f"rate={test_mom['improved'].mean():.3f})")

X_train_m = train_mom[MOM_FEATURES].values
y_train_m = train_mom['improved'].values
X_test_m = test_mom[MOM_FEATURES].values
y_test_m = test_mom['improved'].values

scaler_m = StandardScaler()
X_train_m_s = scaler_m.fit_transform(X_train_m)
X_test_m_s = scaler_m.transform(X_test_m)

gb_m = GradientBoostingClassifier(
    n_estimators=150, max_depth=4, learning_rate=0.1,
    min_samples_leaf=50, subsample=0.8, random_state=42)
gb_m.fit(X_train_m_s, y_train_m)

y_pred_m = gb_m.predict(X_test_m_s)
y_proba_m = gb_m.predict_proba(X_test_m_s)[:, 1]
test_acc_m = accuracy_score(y_test_m, y_pred_m)
test_auc_m = roc_auc_score(y_test_m, y_proba_m)

print(f"\n  HOLDOUT RESULTS:")
print(f"    Accuracy: {test_acc_m:.4f}")
print(f"    AUC:      {test_auc_m:.4f}")

perm_m = permutation_importance(gb_m, X_test_m_s, y_test_m,
                                 n_repeats=20, random_state=42,
                                 scoring='roc_auc')
perm_m_sorted = sorted(zip(MOM_FEATURES, perm_m.importances_mean,
                            perm_m.importances_std),
                        key=lambda x: x[1], reverse=True)
print(f"  Permutation importance (TEST set):")
for feat, imp, std in perm_m_sorted:
    print(f"    {feat}: {imp:.4f} ± {std:.4f}")

results['momentum'] = {
    'train_n': int(len(train_mom)),
    'test_n': int(len(test_mom)),
    'holdout_accuracy': float(test_acc_m),
    'holdout_auc': float(test_auc_m),
    'permutation_importance_test': {
        feat: {'mean': float(imp), 'std': float(std)}
        for feat, imp, std in perm_m_sorted},
}

# ═════════════════════════════════════════════════════════════════════════════
# REFRESH IMPACT: Test on holdout clients only
# ═════════════════════════════════════════════════════════════════════════════
print(f"\n{'='*70}")
print("REFRESH IMPACT (on test clients only)")
print(f"{'='*70}")

test_old = test_active[test_active['content_age_days'] >= 90].copy()
test_old['recently_refreshed'] = (test_old['days_since_update'] <= 30).astype(int)

refresh_strata = []
for age_tier in ['91-180', '181-365', '365+']:
    for comp in ['LOW', 'MEDIUM', 'HIGH']:
        stratum = test_old[
            (test_old['age_tier'] == age_tier) &
            (test_old['competition_level'] == comp)]
        refreshed = stratum[stratum['recently_refreshed'] == 1]
        stale = stratum[stratum['recently_refreshed'] == 0]

        if len(refreshed) >= 20 and len(stale) >= 20:
            stat, p = stats.mannwhitneyu(
                refreshed['impressions_90d'], stale['impressions_90d'],
                alternative='greater')
            entry = {
                'age_tier': age_tier, 'competition': comp,
                'n_refreshed': int(len(refreshed)),
                'n_stale': int(len(stale)),
                'median_refreshed': float(refreshed['impressions_90d'].median()),
                'median_stale': float(stale['impressions_90d'].median()),
                'p_value': float(p),
                'significant': bool(p < 0.01),
            }
            if entry['median_stale'] > 0:
                entry['lift_pct'] = float(
                    (entry['median_refreshed'] - entry['median_stale'])
                    / entry['median_stale'] * 100)
            else:
                entry['lift_pct'] = float('inf') if entry['median_refreshed'] > 0 else 0.0
            refresh_strata.append(entry)
            sig = "✓" if entry['significant'] else "✗"
            print(f"  {age_tier} × {comp}: refreshed={entry['median_refreshed']:.0f} "
                  f"vs stale={entry['median_stale']:.0f} "
                  f"(p={p:.4f}) {sig}")

results['refresh_holdout'] = {
    'test_clients': len(test_clients),
    'strata': refresh_strata,
    'significant_count': sum(1 for s in refresh_strata if s['significant']),
    'total_count': len(refresh_strata),
}

# ═════════════════════════════════════════════════════════════════════════════
# SIGNIFICANCE TESTS: on test clients only
# ═════════════════════════════════════════════════════════════════════════════
print(f"\n{'='*70}")
print("SIGNIFICANCE TESTS (on test clients only)")
print(f"{'='*70}")

sig_tests = []

# Competition
for test_name, col, metric, groups_list in [
    ('Competition → Impressions', 'competition_level', 'impressions_90d',
     ['LOW', 'MEDIUM', 'HIGH']),
    ('Intent → Impressions', 'main_intent', 'impressions_90d',
     ['informational', 'commercial', 'transactional']),
    ('Freshness → Impressions', 'freshness_tier', 'impressions_90d',
     ['0-30', '31-90', '91-180', '181+']),
    ('Word Count → Impressions', 'word_count_tier', 'impressions_90d',
     ['<1000', '1000-2000', '2000-3500', '3500+']),
]:
    data_groups = [
        test_active[test_active[col] == g][metric].values
        for g in groups_list
        if len(test_active[test_active[col] == g]) >= 20]
    if len(data_groups) >= 2:
        h, p = stats.kruskal(*data_groups)
        sig_tests.append({
            'test': test_name, 'method': 'Kruskal-Wallis',
            'statistic': float(h), 'p_value': float(p),
            'significant': bool(p < 0.001),
            'dataset': 'test_only',
        })
        print(f"  {test_name}: H={h:.1f}, p={p:.2e} "
              f"{'✓' if p < 0.001 else '✗'}")

# Refreshed vs stale (overall, test only)
ref_imp = test_active[test_active['days_since_update'] <= 30]['impressions_90d']
sta_imp = test_active[test_active['days_since_update'] > 90]['impressions_90d']
if len(ref_imp) >= 20 and len(sta_imp) >= 20:
    u, p = stats.mannwhitneyu(ref_imp, sta_imp, alternative='greater')
    sig_tests.append({
        'test': 'Refreshed vs Stale → Impressions',
        'method': 'Mann-Whitney U',
        'statistic': float(u), 'p_value': float(p),
        'significant': bool(p < 0.001),
        'dataset': 'test_only',
    })
    print(f"  Refreshed vs Stale: U={u:.0f}, p={p:.2e} "
          f"{'✓' if p < 0.001 else '✗'}")

results['significance_holdout'] = sig_tests

# ═════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═════════════════════════════════════════════════════════════════════════════
print(f"\n{'='*70}")
print("SUMMARY: CV vs HOLDOUT comparison")
print(f"{'='*70}")
print(f"  {'Model':<25} {'CV AUC':>10} {'Holdout AUC':>12} {'Delta':>8}")
print(f"  {'-'*55}")
print(f"  {'Growth Prediction':<25} {cv_auc.mean():>10.4f} {test_auc_g:>12.4f} "
      f"{test_auc_g - cv_auc.mean():>+8.4f}")
print(f"  {'Zombie Recovery':<25} {'N/A':>10} {test_auc_z:>12.4f}")
print(f"  {'30-Day Momentum':<25} {'N/A':>10} {test_auc_m:>12.4f}")
print(f"\n  Refresh impact: {results['refresh_holdout']['significant_count']}"
      f"/{results['refresh_holdout']['total_count']} strata significant on holdout")
print(f"  Significance tests: {sum(1 for t in sig_tests if t['significant'])}"
      f"/{len(sig_tests)} passed on holdout")

results['meta'] = {
    'generated_at': pd.Timestamp.now().isoformat(),
    'protocol': 'Client-level 70/30 holdout. Train clients never appear in test.',
    'train_clients': int(len(train_clients)),
    'test_clients': int(len(test_clients)),
    'train_rows': int(len(train_df)),
    'test_rows': int(len(test_df)),
    'random_seed': 42,
}

out_path = V2_DIR / "discovery-holdout-results.json"
with open(out_path, 'w') as f:
    json.dump(results, f, indent=2, default=str)
print(f"\nSaved to {out_path}")
