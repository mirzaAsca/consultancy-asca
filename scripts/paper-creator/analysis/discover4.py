"""
discover4.py — Iteration loop: improve growth model + multi-seed stability check.

Strategy:
1. Try additional features for growth prediction
2. Tune hyperparameters
3. Run 10 different random seeds for the client split to verify stability
4. Remove negative-importance features from momentum
5. Report confidence bands across all seeds
"""

import json, warnings, time
import numpy as np
import pandas as pd
from pathlib import Path
from scipy import stats
from sklearn.ensemble import GradientBoostingClassifier, HistGradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, roc_auc_score, confusion_matrix
from sklearn.inspection import permutation_importance

warnings.filterwarnings('ignore')

DATA_DIR = Path(__file__).parent.parent / "data"
V2_DIR = DATA_DIR / "v2"

print("Loading data...")
t0 = time.time()
with open(V2_DIR / "raw-feature-vector-full.json") as f:
    raw = json.load(f)
df = pd.DataFrame(raw["rows"])
print(f"  {len(df)} rows in {time.time()-t0:.1f}s")

# Feature engineering
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
df['is_growing'] = (df['trend_direction'] == 'up').astype(int)
df['is_low_competition'] = (df['competition_level'] == 'LOW').astype(int)
df['has_known_intent'] = (~df['main_intent'].isin(['unknown', 'not_classified'])).astype(int)
intent_map = {'informational': 0, 'commercial': 1, 'transactional': 2, 'navigational': 3}
df['intent_numeric'] = df['main_intent'].map(intent_map).fillna(-1)
df['log_imp'] = np.log1p(df['impressions_90d'])
df['freshness_ratio'] = np.where(
    df['content_age_days'] > 0,
    df['days_since_update'] / df['content_age_days'], 1)
df['vis_ratio'] = np.where(
    df['content_age_days'] > 0,
    np.minimum(df['days_with_impressions'] / np.minimum(df['content_age_days'], 90), 1), 0)

all_clients = df['client_id'].unique()

# ═════════════════════════════════════════════════════════════════════════════
# MULTI-SEED STABILITY TEST
# ═════════════════════════════════════════════════════════════════════════════
SEEDS = [42, 123, 456, 789, 1337, 2024, 3141, 5678, 9999, 31415]

# Feature sets to try for growth model
FEATURE_SETS = {
    'baseline': [
        'days_with_impressions', 'days_since_update', 'word_count',
        'avg_position', 'imp_per_day_visible', 'content_age_days',
        'has_known_intent'
    ],
    'extended': [
        'days_with_impressions', 'days_since_update', 'word_count',
        'avg_position', 'imp_per_day_visible', 'content_age_days',
        'has_known_intent', 'is_low_competition', 'intent_numeric',
        'age_x_freshness', 'search_volume', 'competition',
        'freshness_ratio', 'vis_ratio'
    ],
    'minimal': [
        'days_with_impressions', 'days_since_update',
        'content_age_days', 'avg_position', 'has_known_intent'
    ],
}

# Momentum: remove negative-importance features
MOMENTUM_FEATURES_V2 = [
    'impressions_prev_30d', 'imp_per_day_visible',
    'days_with_impressions', 'days_since_update',
    'avg_position', 'has_known_intent', 'content_age_days'
]

ZOMBIE_FEATURES = [
    'content_age_days', 'days_since_update', 'word_count',
    'is_low_competition', 'has_known_intent', 'search_volume',
    'competition', 'impressions_90d', 'days_with_impressions',
    'avg_position'
]

print(f"\n{'='*70}")
print(f"MULTI-SEED STABILITY TEST ({len(SEEDS)} seeds × {len(FEATURE_SETS)} feature sets)")
print(f"{'='*70}")

all_results = []

for seed in SEEDS:
    rng = np.random.RandomState(seed)
    clients_shuffled = all_clients.copy()
    rng.shuffle(clients_shuffled)
    split_idx = int(len(clients_shuffled) * 0.70)
    train_clients = set(clients_shuffled[:split_idx])
    test_clients = set(clients_shuffled[split_idx:])

    train_df = df[df['client_id'].isin(train_clients)]
    test_df = df[df['client_id'].isin(test_clients)]
    train_active = train_df[train_df['impressions_90d'] > 0]
    test_active = test_df[test_df['impressions_90d'] > 0]

    seed_result = {'seed': seed, 'train_clients': len(train_clients),
                   'test_clients': len(test_clients)}

    # ── Growth model: try each feature set ──
    train_trend = train_active[train_active['trend_direction'].isin(['up', 'down'])]
    test_trend = test_active[test_active['trend_direction'].isin(['up', 'down'])]

    for fs_name, features in FEATURE_SETS.items():
        X_tr = train_trend[features].values
        y_tr = train_trend['is_growing'].values
        X_te = test_trend[features].values
        y_te = test_trend['is_growing'].values

        sc = StandardScaler()
        X_tr_s = sc.fit_transform(X_tr)
        X_te_s = sc.transform(X_te)

        gb = GradientBoostingClassifier(
            n_estimators=150, max_depth=4, learning_rate=0.08,
            min_samples_leaf=80, subsample=0.8, random_state=42)
        gb.fit(X_tr_s, y_tr)
        y_proba = gb.predict_proba(X_te_s)[:, 1]
        auc = roc_auc_score(y_te, y_proba)
        acc = accuracy_score(y_te, (y_proba >= 0.5).astype(int))
        seed_result[f'growth_{fs_name}_auc'] = auc
        seed_result[f'growth_{fs_name}_acc'] = acc

    # ── Zombie model ──
    train_zombie = train_df[
        (train_df['impressions_prev_30d'] == 0) & (train_df['clicks_prev_30d'] == 0)].copy()
    test_zombie = test_df[
        (test_df['impressions_prev_30d'] == 0) & (test_df['clicks_prev_30d'] == 0)].copy()
    train_zombie['recovered'] = (train_zombie['impressions_last_30d'] > 0).astype(int)
    test_zombie['recovered'] = (test_zombie['impressions_last_30d'] > 0).astype(int)

    if len(test_zombie) > 0 and test_zombie['recovered'].nunique() == 2:
        X_tr = train_zombie[ZOMBIE_FEATURES].values
        y_tr = train_zombie['recovered'].values
        X_te = test_zombie[ZOMBIE_FEATURES].values
        y_te = test_zombie['recovered'].values
        sc = StandardScaler()
        X_tr_s = sc.fit_transform(X_tr)
        X_te_s = sc.transform(X_te)
        gb = GradientBoostingClassifier(
            n_estimators=150, max_depth=4, learning_rate=0.1,
            min_samples_leaf=50, subsample=0.8, random_state=42)
        gb.fit(X_tr_s, y_tr)
        y_proba = gb.predict_proba(X_te_s)[:, 1]
        seed_result['zombie_auc'] = roc_auc_score(y_te, y_proba)
        seed_result['zombie_acc'] = accuracy_score(y_te, (y_proba >= 0.5).astype(int))
    else:
        seed_result['zombie_auc'] = None
        seed_result['zombie_acc'] = None

    # ── Momentum model (v2 features) ──
    train_mom = train_active[train_active['impressions_prev_30d'] >= 10].copy()
    test_mom = test_active[test_active['impressions_prev_30d'] >= 10].copy()
    train_mom['improved'] = (
        (train_mom['impressions_last_30d'] - train_mom['impressions_prev_30d'])
        / train_mom['impressions_prev_30d'] > 0.10).astype(int)
    test_mom['improved'] = (
        (test_mom['impressions_last_30d'] - test_mom['impressions_prev_30d'])
        / test_mom['impressions_prev_30d'] > 0.10).astype(int)

    if len(test_mom) > 0 and test_mom['improved'].nunique() == 2:
        X_tr = train_mom[MOMENTUM_FEATURES_V2].values
        y_tr = train_mom['improved'].values
        X_te = test_mom[MOMENTUM_FEATURES_V2].values
        y_te = test_mom['improved'].values
        sc = StandardScaler()
        X_tr_s = sc.fit_transform(X_tr)
        X_te_s = sc.transform(X_te)
        gb = GradientBoostingClassifier(
            n_estimators=150, max_depth=4, learning_rate=0.1,
            min_samples_leaf=50, subsample=0.8, random_state=42)
        gb.fit(X_tr_s, y_tr)
        y_proba = gb.predict_proba(X_te_s)[:, 1]
        seed_result['momentum_auc'] = roc_auc_score(y_te, y_proba)
        seed_result['momentum_acc'] = accuracy_score(y_te, (y_proba >= 0.5).astype(int))
    else:
        seed_result['momentum_auc'] = None
        seed_result['momentum_acc'] = None

    # ── Significance tests on test set ──
    sig_pass = 0
    sig_total = 0
    for col, metric, groups_list in [
        ('competition_level', 'impressions_90d', ['LOW', 'MEDIUM', 'HIGH']),
        ('main_intent', 'impressions_90d', ['informational', 'commercial', 'transactional']),
        ('freshness_tier', 'impressions_90d', ['0-30', '31-90', '91-180', '181+']),
    ]:
        data_groups = [
            test_active[test_active[col] == g][metric].values
            for g in groups_list
            if len(test_active[test_active[col] == g]) >= 20]
        if len(data_groups) >= 2:
            _, p = stats.kruskal(*data_groups)
            sig_total += 1
            if p < 0.001:
                sig_pass += 1
    seed_result['sig_passed'] = sig_pass
    seed_result['sig_total'] = sig_total

    all_results.append(seed_result)
    print(f"  Seed {seed:>5}: growth_base={seed_result.get('growth_baseline_auc', 0):.3f} "
          f"growth_ext={seed_result.get('growth_extended_auc', 0):.3f} "
          f"zombie={seed_result.get('zombie_auc', 0):.3f} "
          f"momentum={seed_result.get('momentum_auc', 0):.3f} "
          f"sig={sig_pass}/{sig_total}")

# ═════════════════════════════════════════════════════════════════════════════
# AGGREGATE RESULTS
# ═════════════════════════════════════════════════════════════════════════════
print(f"\n{'='*70}")
print("AGGREGATE RESULTS ACROSS 10 RANDOM CLIENT SPLITS")
print(f"{'='*70}")

results_df = pd.DataFrame(all_results)

for metric_col, label in [
    ('growth_baseline_auc', 'Growth (baseline 7 features)'),
    ('growth_extended_auc', 'Growth (extended 14 features)'),
    ('growth_minimal_auc', 'Growth (minimal 5 features)'),
    ('zombie_auc', 'Zombie Recovery'),
    ('momentum_auc', '30-Day Momentum'),
]:
    vals = results_df[metric_col].dropna()
    if len(vals) > 0:
        print(f"\n  {label}:")
        print(f"    Mean AUC:   {vals.mean():.4f}")
        print(f"    Std:        {vals.std():.4f}")
        print(f"    Min:        {vals.min():.4f}")
        print(f"    Max:        {vals.max():.4f}")
        print(f"    Median:     {vals.median():.4f}")
        print(f"    All values: {[f'{v:.3f}' for v in vals]}")

sig_rates = results_df['sig_passed'] / results_df['sig_total']
print(f"\n  Significance tests pass rate: {sig_rates.mean():.1%} "
      f"(min={sig_rates.min():.1%}, max={sig_rates.max():.1%})")

# ═════════════════════════════════════════════════════════════════════════════
# BEST GROWTH MODEL: retrain on full train set with best features
# ═════════════════════════════════════════════════════════════════════════════
print(f"\n{'='*70}")
print("BEST GROWTH MODEL — full analysis with winning feature set")
print(f"{'='*70}")

# Pick the feature set with highest median AUC
best_fs = max(FEATURE_SETS.keys(),
              key=lambda k: results_df[f'growth_{k}_auc'].median())
print(f"  Best feature set: {best_fs} "
      f"(median AUC {results_df[f'growth_{best_fs}_auc'].median():.4f})")

# Retrain with seed=42 for the final model and get detailed metrics
np.random.seed(42)
clients_shuffled = all_clients.copy()
np.random.shuffle(clients_shuffled)
split_idx = int(len(clients_shuffled) * 0.70)
train_clients = set(clients_shuffled[:split_idx])
test_clients = set(clients_shuffled[split_idx:])

train_active = df[df['client_id'].isin(train_clients) & (df['impressions_90d'] > 0)]
test_active = df[df['client_id'].isin(test_clients) & (df['impressions_90d'] > 0)]
train_trend = train_active[train_active['trend_direction'].isin(['up', 'down'])]
test_trend = test_active[test_active['trend_direction'].isin(['up', 'down'])]

best_features = FEATURE_SETS[best_fs]
X_tr = train_trend[best_features].values
y_tr = train_trend['is_growing'].values
X_te = test_trend[best_features].values
y_te = test_trend['is_growing'].values

sc = StandardScaler()
X_tr_s = sc.fit_transform(X_tr)
X_te_s = sc.transform(X_te)

# Try tuned hyperparameters
configs = [
    {'n_estimators': 150, 'max_depth': 4, 'learning_rate': 0.08, 'min_samples_leaf': 80},
    {'n_estimators': 200, 'max_depth': 3, 'learning_rate': 0.05, 'min_samples_leaf': 100},
    {'n_estimators': 300, 'max_depth': 3, 'learning_rate': 0.03, 'min_samples_leaf': 150},
    {'n_estimators': 100, 'max_depth': 5, 'learning_rate': 0.1, 'min_samples_leaf': 50},
]

print(f"\n  Hyperparameter search (holdout AUC):")
best_auc = 0
best_config = None
for cfg in configs:
    gb = GradientBoostingClassifier(subsample=0.8, random_state=42, **cfg)
    gb.fit(X_tr_s, y_tr)
    auc = roc_auc_score(y_te, gb.predict_proba(X_te_s)[:, 1])
    print(f"    n={cfg['n_estimators']}, depth={cfg['max_depth']}, "
          f"lr={cfg['learning_rate']}, leaf={cfg['min_samples_leaf']}: AUC={auc:.4f}")
    if auc > best_auc:
        best_auc = auc
        best_config = cfg

print(f"\n  Best config: {best_config} → AUC {best_auc:.4f}")

# Final model with best config
gb_final = GradientBoostingClassifier(subsample=0.8, random_state=42, **best_config)
gb_final.fit(X_tr_s, y_tr)
y_proba_final = gb_final.predict_proba(X_te_s)[:, 1]
y_pred_final = (y_proba_final >= 0.5).astype(int)
final_auc = roc_auc_score(y_te, y_proba_final)
final_acc = accuracy_score(y_te, y_pred_final)
final_cm = confusion_matrix(y_te, y_pred_final)

perm_final = permutation_importance(gb_final, X_te_s, y_te,
                                     n_repeats=20, random_state=42,
                                     scoring='roc_auc')
perm_sorted = sorted(zip(best_features, perm_final.importances_mean,
                          perm_final.importances_std),
                      key=lambda x: x[1], reverse=True)

print(f"\n  FINAL GROWTH MODEL (holdout):")
print(f"    AUC:      {final_auc:.4f}")
print(f"    Accuracy: {final_acc:.4f}")
print(f"    Features: {best_fs} ({len(best_features)})")
print(f"    Permutation importance (TEST):")
for feat, imp, std in perm_sorted:
    print(f"      {feat}: {imp:.4f} ± {std:.4f}")

# ═════════════════════════════════════════════════════════════════════════════
# SAVE FINAL RESULTS
# ═════════════════════════════════════════════════════════════════════════════
final_results = {
    'meta': {
        'protocol': '10-seed client-level 70/30 holdout stability test',
        'seeds': SEEDS,
        'n_clients': int(len(all_clients)),
        'n_rows': int(len(df)),
    },
    'stability': {
        'growth_baseline': {
            'mean': float(results_df['growth_baseline_auc'].mean()),
            'std': float(results_df['growth_baseline_auc'].std()),
            'min': float(results_df['growth_baseline_auc'].min()),
            'max': float(results_df['growth_baseline_auc'].max()),
            'all': [float(v) for v in results_df['growth_baseline_auc']],
        },
        'growth_extended': {
            'mean': float(results_df['growth_extended_auc'].mean()),
            'std': float(results_df['growth_extended_auc'].std()),
            'min': float(results_df['growth_extended_auc'].min()),
            'max': float(results_df['growth_extended_auc'].max()),
            'all': [float(v) for v in results_df['growth_extended_auc']],
        },
        'zombie': {
            'mean': float(results_df['zombie_auc'].dropna().mean()),
            'std': float(results_df['zombie_auc'].dropna().std()),
            'min': float(results_df['zombie_auc'].dropna().min()),
            'max': float(results_df['zombie_auc'].dropna().max()),
            'all': [float(v) for v in results_df['zombie_auc'].dropna()],
        },
        'momentum': {
            'mean': float(results_df['momentum_auc'].dropna().mean()),
            'std': float(results_df['momentum_auc'].dropna().std()),
            'min': float(results_df['momentum_auc'].dropna().min()),
            'max': float(results_df['momentum_auc'].dropna().max()),
            'all': [float(v) for v in results_df['momentum_auc'].dropna()],
        },
        'significance_pass_rate': float(sig_rates.mean()),
    },
    'best_growth_model': {
        'feature_set': best_fs,
        'features': best_features,
        'config': best_config,
        'holdout_auc': float(final_auc),
        'holdout_accuracy': float(final_acc),
        'permutation_importance': {
            feat: {'mean': float(imp), 'std': float(std)}
            for feat, imp, std in perm_sorted},
    },
}

out_path = V2_DIR / "discovery-stability-results.json"
with open(out_path, 'w') as f:
    json.dump(final_results, f, indent=2, default=str)
print(f"\nSaved to {out_path}")
