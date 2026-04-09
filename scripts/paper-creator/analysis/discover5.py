"""
discover5.py — Definitive validation: 80/20 splits, both cross-client AND within-client.

Protocol:
1. Cross-client 80/20: 80% of clients train, 20% test (no client in both)
2. Within-client 80/20: every client split internally, 80% pages train, 20% test
3. 10 seeds each for stability
4. All 3 models: Growth, Zombie Recovery, Momentum
5. Significance tests on test sets
6. Final combined results for PDF
"""

import json, warnings, time
import numpy as np
import pandas as pd
from pathlib import Path
from scipy import stats
from sklearn.ensemble import GradientBoostingClassifier
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
df['is_growing'] = (df['trend_direction'] == 'up').astype(int)
df['is_declining_flag'] = (df['trend_direction'] == 'down').astype(int)
df['is_low_competition'] = (df['competition_level'] == 'LOW').astype(int)
df['has_known_intent'] = (~df['main_intent'].isin(['unknown', 'not_classified'])).astype(int)

# ─── Feature sets ────────────────────────────────────────────────────────────
GROWTH_FEATURES = [
    'days_with_impressions', 'days_since_update', 'word_count',
    'avg_position', 'imp_per_day_visible', 'content_age_days',
    'has_known_intent'
]
ZOMBIE_FEATURES = [
    'content_age_days', 'days_since_update', 'word_count',
    'is_low_competition', 'has_known_intent', 'search_volume',
    'competition', 'impressions_90d', 'days_with_impressions',
    'avg_position'
]
MOMENTUM_FEATURES = [
    'impressions_prev_30d', 'imp_per_day_visible',
    'days_with_impressions', 'days_since_update',
    'avg_position', 'has_known_intent', 'content_age_days'
]

GROWTH_CFG = dict(n_estimators=100, max_depth=3, learning_rate=0.1,
                   min_samples_leaf=100, subsample=0.8, random_state=42)
ZOMBIE_CFG = dict(n_estimators=150, max_depth=4, learning_rate=0.1,
                   min_samples_leaf=50, subsample=0.8, random_state=42)
MOMENTUM_CFG = dict(n_estimators=150, max_depth=4, learning_rate=0.1,
                     min_samples_leaf=50, subsample=0.8, random_state=42)

SEEDS = [42, 123, 456, 789, 1337, 2024, 3141, 5678, 9999, 31415]
all_clients = df['client_id'].unique()

def run_model(X_train, y_train, X_test, y_test, cfg):
    """Train GBT, return metrics dict."""
    sc = StandardScaler()
    X_tr = sc.fit_transform(X_train)
    X_te = sc.transform(X_test)
    gb = GradientBoostingClassifier(**cfg)
    gb.fit(X_tr, y_train)
    y_proba = gb.predict_proba(X_te)[:, 1]
    y_pred = (y_proba >= 0.5).astype(int)
    auc = roc_auc_score(y_test, y_proba)
    acc = accuracy_score(y_test, y_pred)
    cm = confusion_matrix(y_test, y_pred)
    return {
        'auc': float(auc), 'accuracy': float(acc),
        'cm': {'tn': int(cm[0][0]), 'fp': int(cm[0][1]),
               'fn': int(cm[1][0]), 'tp': int(cm[1][1])},
        'n_train': int(len(y_train)), 'n_test': int(len(y_test)),
        'model': gb, 'scaler': sc, 'X_te': X_te, 'y_te': y_test,
    }

def prepare_growth(data):
    active = data[data['impressions_90d'] > 0]
    trend = active[active['trend_direction'].isin(['up', 'down'])]
    if len(trend) < 50:
        return None, None
    return trend[GROWTH_FEATURES].values, trend['is_growing'].values

def prepare_zombie(data):
    z = data[(data['impressions_prev_30d'] == 0) & (data['clicks_prev_30d'] == 0)].copy()
    z['recovered'] = (z['impressions_last_30d'] > 0).astype(int)
    if len(z) < 50 or z['recovered'].nunique() < 2:
        return None, None
    return z[ZOMBIE_FEATURES].values, z['recovered'].values

def prepare_momentum(data):
    active = data[data['impressions_90d'] > 0]
    m = active[active['impressions_prev_30d'] >= 10].copy()
    m['improved'] = ((m['impressions_last_30d'] - m['impressions_prev_30d'])
                     / m['impressions_prev_30d'] > 0.10).astype(int)
    if len(m) < 50 or m['improved'].nunique() < 2:
        return None, None
    return m[MOMENTUM_FEATURES].values, m['improved'].values

# ═════════════════════════════════════════════════════════════════════════════
# TEST A: CROSS-CLIENT 80/20
# ═════════════════════════════════════════════════════════════════════════════
print(f"\n{'='*70}")
print("TEST A: CROSS-CLIENT 80/20 (10 seeds)")
print(f"{'='*70}")

cross_results = {'growth': [], 'zombie': [], 'momentum': []}

for seed in SEEDS:
    rng = np.random.RandomState(seed)
    shuffled = all_clients.copy()
    rng.shuffle(shuffled)
    split = int(len(shuffled) * 0.80)
    train_ids = set(shuffled[:split])
    test_ids = set(shuffled[split:])

    train_data = df[df['client_id'].isin(train_ids)]
    test_data = df[df['client_id'].isin(test_ids)]

    # Growth
    X_tr, y_tr = prepare_growth(train_data)
    X_te, y_te = prepare_growth(test_data)
    if X_tr is not None and X_te is not None:
        r = run_model(X_tr, y_tr, X_te, y_te, GROWTH_CFG)
        cross_results['growth'].append(r['auc'])
    else:
        cross_results['growth'].append(None)

    # Zombie
    X_tr, y_tr = prepare_zombie(train_data)
    X_te, y_te = prepare_zombie(test_data)
    if X_tr is not None and X_te is not None:
        r = run_model(X_tr, y_tr, X_te, y_te, ZOMBIE_CFG)
        cross_results['zombie'].append(r['auc'])
    else:
        cross_results['zombie'].append(None)

    # Momentum
    X_tr, y_tr = prepare_momentum(train_data)
    X_te, y_te = prepare_momentum(test_data)
    if X_tr is not None and X_te is not None:
        r = run_model(X_tr, y_tr, X_te, y_te, MOMENTUM_CFG)
        cross_results['momentum'].append(r['auc'])
    else:
        cross_results['momentum'].append(None)

    g = cross_results['growth'][-1] or 0
    z = cross_results['zombie'][-1] or 0
    m = cross_results['momentum'][-1] or 0
    print(f"  Seed {seed:>5}: growth={g:.3f}  zombie={z:.3f}  momentum={m:.3f}  "
          f"clients train={len(train_ids)} test={len(test_ids)}")

# ═════════════════════════════════════════════════════════════════════════════
# TEST B: WITHIN-CLIENT 80/20
# ═════════════════════════════════════════════════════════════════════════════
print(f"\n{'='*70}")
print("TEST B: WITHIN-CLIENT 80/20 (10 seeds)")
print(f"{'='*70}")

within_results = {'growth': [], 'zombie': [], 'momentum': []}

for seed in SEEDS:
    rng = np.random.RandomState(seed)
    train_idx = []
    test_idx = []

    for cid in all_clients:
        client_rows = df[df['client_id'] == cid].index.values.copy()
        rng.shuffle(client_rows)
        split = int(len(client_rows) * 0.80)
        train_idx.extend(client_rows[:split])
        test_idx.extend(client_rows[split:])

    train_data = df.loc[train_idx]
    test_data = df.loc[test_idx]

    # Growth
    X_tr, y_tr = prepare_growth(train_data)
    X_te, y_te = prepare_growth(test_data)
    if X_tr is not None and X_te is not None:
        r = run_model(X_tr, y_tr, X_te, y_te, GROWTH_CFG)
        within_results['growth'].append(r['auc'])
    else:
        within_results['growth'].append(None)

    # Zombie
    X_tr, y_tr = prepare_zombie(train_data)
    X_te, y_te = prepare_zombie(test_data)
    if X_tr is not None and X_te is not None:
        r = run_model(X_tr, y_tr, X_te, y_te, ZOMBIE_CFG)
        within_results['zombie'].append(r['auc'])
    else:
        within_results['zombie'].append(None)

    # Momentum
    X_tr, y_tr = prepare_momentum(train_data)
    X_te, y_te = prepare_momentum(test_data)
    if X_tr is not None and X_te is not None:
        r = run_model(X_tr, y_tr, X_te, y_te, MOMENTUM_CFG)
        within_results['momentum'].append(r['auc'])
    else:
        within_results['momentum'].append(None)

    g = within_results['growth'][-1] or 0
    z = within_results['zombie'][-1] or 0
    m = within_results['momentum'][-1] or 0
    print(f"  Seed {seed:>5}: growth={g:.3f}  zombie={z:.3f}  momentum={m:.3f}  "
          f"train={len(train_data):,} test={len(test_data):,}")

# ═════════════════════════════════════════════════════════════════════════════
# FINAL MODEL: train on 80% (seed=42), full metrics on 20% holdout
# ═════════════════════════════════════════════════════════════════════════════
print(f"\n{'='*70}")
print("FINAL MODELS: seed=42, within-client 80/20, full detail")
print(f"{'='*70}")

rng = np.random.RandomState(42)
train_idx_final = []
test_idx_final = []
for cid in all_clients:
    rows = df[df['client_id'] == cid].index.values.copy()
    rng.shuffle(rows)
    s = int(len(rows) * 0.80)
    train_idx_final.extend(rows[:s])
    test_idx_final.extend(rows[s:])

train_final = df.loc[train_idx_final]
test_final = df.loc[test_idx_final]
print(f"  Train: {len(train_final):,}  Test: {len(test_final):,}")

final_detail = {}

for model_name, features, cfg, prep_fn in [
    ('growth', GROWTH_FEATURES, GROWTH_CFG, prepare_growth),
    ('zombie', ZOMBIE_FEATURES, ZOMBIE_CFG, prepare_zombie),
    ('momentum', MOMENTUM_FEATURES, MOMENTUM_CFG, prepare_momentum),
]:
    X_tr, y_tr = prep_fn(train_final)
    X_te, y_te = prep_fn(test_final)
    if X_tr is None or X_te is None:
        print(f"\n  {model_name}: insufficient data, skipping")
        continue

    r = run_model(X_tr, y_tr, X_te, y_te, cfg)
    print(f"\n  {model_name.upper()}:")
    print(f"    Train: {r['n_train']:,}  Test: {r['n_test']:,}")
    print(f"    AUC:      {r['auc']:.4f}")
    print(f"    Accuracy: {r['accuracy']:.4f}")
    print(f"    CM: TN={r['cm']['tn']:,} FP={r['cm']['fp']:,} "
          f"FN={r['cm']['fn']:,} TP={r['cm']['tp']:,}")

    # Permutation importance on test set
    perm = permutation_importance(r['model'], r['X_te'], r['y_te'],
                                   n_repeats=20, random_state=42,
                                   scoring='roc_auc')
    perm_sorted = sorted(zip(features, perm.importances_mean,
                              perm.importances_std),
                          key=lambda x: x[1], reverse=True)
    print(f"    Permutation importance (TEST):")
    for feat, imp, std in perm_sorted:
        print(f"      {feat}: {imp:.4f} ± {std:.4f}")

    # Calibration on test set
    y_proba = r['model'].predict_proba(r['X_te'])[:, 1]
    cal_bins = pd.cut(y_proba, bins=10)
    cal_df = pd.DataFrame({'prob': y_proba, 'actual': r['y_te'], 'bin': cal_bins})
    cal_agg = cal_df.groupby('bin', observed=True).agg(
        mean_prob=('prob', 'mean'),
        actual_rate=('actual', 'mean'),
        n=('actual', 'count')
    ).reset_index()

    final_detail[model_name] = {
        'auc': r['auc'],
        'accuracy': r['accuracy'],
        'n_train': r['n_train'],
        'n_test': r['n_test'],
        'confusion_matrix': r['cm'],
        'permutation_importance': {
            feat: {'mean': float(imp), 'std': float(std)}
            for feat, imp, std in perm_sorted},
        'calibration': cal_agg[['mean_prob', 'actual_rate', 'n']].to_dict('records'),
        'features': features,
    }

# ═════════════════════════════════════════════════════════════════════════════
# SIGNIFICANCE TESTS on within-client test set
# ═════════════════════════════════════════════════════════════════════════════
print(f"\n{'='*70}")
print("SIGNIFICANCE TESTS (within-client test set)")
print(f"{'='*70}")

test_active_final = test_final[test_final['impressions_90d'] > 0]
sig_tests = []

for name, col, metric, groups in [
    ('Competition → Impressions', 'competition_level', 'impressions_90d',
     ['LOW', 'MEDIUM', 'HIGH']),
    ('Intent → Impressions', 'main_intent', 'impressions_90d',
     ['informational', 'commercial', 'transactional']),
    ('Freshness → Impressions', 'freshness_tier', 'impressions_90d',
     ['0-30', '31-90', '91-180', '181+']),
    ('Word Count → Impressions', 'word_count_tier', 'impressions_90d',
     ['<1000', '1000-2000', '2000-3500', '3500+']),
]:
    data_groups = [test_active_final[test_active_final[col] == g][metric].values
                   for g in groups if len(test_active_final[test_active_final[col] == g]) >= 20]
    if len(data_groups) >= 2:
        h, p = stats.kruskal(*data_groups)
        sig_tests.append({
            'test': name, 'method': 'Kruskal-Wallis',
            'statistic': float(h), 'p_value': float(p),
            'significant': bool(p < 0.001),
        })
        print(f"  {name}: H={h:.1f}, p={p:.2e} {'✓' if p < 0.001 else '✗'}")

ref = test_active_final[test_active_final['days_since_update'] <= 30]['impressions_90d']
sta = test_active_final[test_active_final['days_since_update'] > 90]['impressions_90d']
if len(ref) >= 20 and len(sta) >= 20:
    u, p = stats.mannwhitneyu(ref, sta, alternative='greater')
    sig_tests.append({
        'test': 'Refreshed vs Stale → Impressions', 'method': 'Mann-Whitney U',
        'statistic': float(u), 'p_value': float(p),
        'significant': bool(p < 0.001),
    })
    print(f"  Refreshed vs Stale: U={u:.0f}, p={p:.2e} {'✓' if p < 0.001 else '✗'}")

pos_groups = [test_active_final[test_active_final['position_tier'] == p]
              ['ctr'].values for p in ['top_3', 'page_1', 'striking', 'page_3_5', 'deep']
              if len(test_active_final[test_active_final['position_tier'] == p]) >= 20]
if len(pos_groups) >= 2:
    h, p = stats.kruskal(*pos_groups)
    sig_tests.append({
        'test': 'Position Tier → CTR', 'method': 'Kruskal-Wallis',
        'statistic': float(h), 'p_value': float(p),
        'significant': bool(p < 0.001),
    })
    print(f"  Position → CTR: H={h:.1f}, p={p:.2e} {'✓' if p < 0.001 else '✗'}")

# ═════════════════════════════════════════════════════════════════════════════
# REFRESH IMPACT on within-client test set
# ═════════════════════════════════════════════════════════════════════════════
print(f"\n{'='*70}")
print("REFRESH IMPACT (within-client test set)")
print(f"{'='*70}")

test_old = test_active_final[test_active_final['content_age_days'] >= 90].copy()
test_old['recently_refreshed'] = (test_old['days_since_update'] <= 30).astype(int)

refresh_strata = []
for age_tier in ['91-180', '181-365', '365+']:
    for comp in ['LOW', 'MEDIUM', 'HIGH']:
        stratum = test_old[(test_old['age_tier'] == age_tier) &
                           (test_old['competition_level'] == comp)]
        refreshed = stratum[stratum['recently_refreshed'] == 1]
        stale = stratum[stratum['recently_refreshed'] == 0]
        if len(refreshed) >= 15 and len(stale) >= 15:
            u, p = stats.mannwhitneyu(refreshed['impressions_90d'],
                                       stale['impressions_90d'],
                                       alternative='greater')
            med_r = float(refreshed['impressions_90d'].median())
            med_s = float(stale['impressions_90d'].median())
            lift = ((med_r - med_s) / max(med_s, 1)) * 100 if med_s > 0 else (
                float('inf') if med_r > 0 else 0)
            entry = {
                'age_tier': age_tier, 'competition': comp,
                'n_refreshed': int(len(refreshed)), 'n_stale': int(len(stale)),
                'median_refreshed': med_r, 'median_stale': med_s,
                'imp_lift_pct': float(lift), 'p_value': float(p),
                'significant': bool(p < 0.01),
            }
            refresh_strata.append(entry)
            sig = "✓" if entry['significant'] else "✗"
            print(f"  {age_tier} × {comp}: {med_r:.0f} vs {med_s:.0f} "
                  f"(+{lift:.0f}%, p={p:.4f}) {sig}")

# ═════════════════════════════════════════════════════════════════════════════
# BOOTSTRAP EFFECT SIZES on within-client test set
# ═════════════════════════════════════════════════════════════════════════════
print(f"\n{'='*70}")
print("BOOTSTRAP EFFECT SIZES (within-client test set)")
print(f"{'='*70}")

def bootstrap_median_diff(a, b, n_boot=2000):
    diffs = []
    sa, sb = min(len(a), 5000), min(len(b), 5000)
    for _ in range(n_boot):
        diffs.append(np.median(np.random.choice(a, sa, True)) -
                     np.median(np.random.choice(b, sb, True)))
    return float(np.median(diffs)), float(np.percentile(diffs, 2.5)), float(np.percentile(diffs, 97.5))

effects = []
comparisons = [
    ('Competition = LOW', 'LOW vs HIGH competition',
     test_active_final[test_active_final['competition_level'] == 'LOW']['impressions_90d'].values,
     test_active_final[test_active_final['competition_level'] == 'HIGH']['impressions_90d'].values),
    ('Intent clear', 'Known vs unknown intent',
     test_active_final[test_active_final['has_known_intent'] == 1]['impressions_90d'].values,
     test_active_final[test_active_final['has_known_intent'] == 0]['impressions_90d'].values),
    ('Word count 5K+', '5K+ vs 2K-3.5K words',
     test_active_final[test_active_final['word_count'] >= 5000]['impressions_90d'].values,
     test_active_final[(test_active_final['word_count'] >= 2000) &
                        (test_active_final['word_count'] < 3500)]['impressions_90d'].values),
    ('Refresh old pages', 'Refreshed vs stale for 180+ day pages',
     test_active_final[(test_active_final['content_age_days'] >= 180) &
                        (test_active_final['days_since_update'] <= 30)]['impressions_90d'].values,
     test_active_final[(test_active_final['content_age_days'] >= 180) &
                        (test_active_final['days_since_update'] > 90)]['impressions_90d'].values),
]

for node, comparison, a, b in comparisons:
    if len(a) >= 20 and len(b) >= 20:
        diff, ci_lo, ci_hi = bootstrap_median_diff(a, b)
        effects.append({
            'node': node, 'comparison': comparison,
            'metric': 'impressions_90d (median diff)',
            'effect': diff, 'ci_95_low': ci_lo, 'ci_95_high': ci_hi,
            'n_treatment': int(len(a)), 'n_control': int(len(b)),
        })
        print(f"  {node}: +{diff:.0f} [{ci_lo:.0f}, {ci_hi:.0f}]")

# ═════════════════════════════════════════════════════════════════════════════
# AGGREGATE & SAVE
# ═════════════════════════════════════════════════════════════════════════════
def agg_stats(vals):
    clean = [v for v in vals if v is not None]
    if not clean:
        return {}
    return {
        'mean': float(np.mean(clean)), 'std': float(np.std(clean)),
        'min': float(np.min(clean)), 'max': float(np.max(clean)),
        'median': float(np.median(clean)),
        'all': [float(v) for v in clean],
    }

print(f"\n{'='*70}")
print("COMBINED RESULTS")
print(f"{'='*70}")

combined = {
    'meta': {
        'generated_at': pd.Timestamp.now().isoformat(),
        'protocol': '80/20 split, 10 seeds, both cross-client and within-client',
        'n_clients': int(len(all_clients)),
        'n_rows': int(len(df)),
        'split_ratio': '80/20',
        'seeds': SEEDS,
    },
    'cross_client': {
        'growth': agg_stats(cross_results['growth']),
        'zombie': agg_stats(cross_results['zombie']),
        'momentum': agg_stats(cross_results['momentum']),
    },
    'within_client': {
        'growth': agg_stats(within_results['growth']),
        'zombie': agg_stats(within_results['zombie']),
        'momentum': agg_stats(within_results['momentum']),
    },
    'final_models': final_detail,
    'significance_tests': sig_tests,
    'refresh_impact': {
        'strata': refresh_strata,
        'significantStrata': sum(1 for s in refresh_strata if s['significant']),
        'totalStrata': len(refresh_strata),
    },
    'flowchart_effects': effects,
}

for model in ['growth', 'zombie', 'momentum']:
    cc = combined['cross_client'][model]
    wc = combined['within_client'][model]
    if cc and wc:
        print(f"\n  {model.upper()}:")
        print(f"    Cross-client: {cc['median']:.3f} AUC "
              f"(range {cc['min']:.3f}-{cc['max']:.3f})")
        print(f"    Within-client: {wc['median']:.3f} AUC "
              f"(range {wc['min']:.3f}-{wc['max']:.3f})")

print(f"\n  Significance: {sum(1 for t in sig_tests if t['significant'])}/{len(sig_tests)} passed")
print(f"  Refresh: {combined['refresh_impact']['significantStrata']}/{combined['refresh_impact']['totalStrata']} strata significant")

out_path = V2_DIR / "discovery-final-results.json"
with open(out_path, 'w') as f:
    json.dump(combined, f, indent=2, default=str)
print(f"\nSaved to {out_path}")
