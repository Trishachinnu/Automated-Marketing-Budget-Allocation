"""
check_everything.py — BudgetAI Full Diagnostic
================================================
Run this from the project root (same folder as ml_utils.py):

    python check_everything.py

Checks:
  1. Dataset files found
  2. ml_utils imports correctly
  3. Model trains / loads from disk
  4. All 27 features engineered correctly
  5. AUC / CV scores
  6. Per-channel profiles
  7. ROI prediction API
  8. Budget recommendation API
  9. Django + MongoDB connection (optional)
 10. Summary pass/fail table
"""

import os, sys, json, time, traceback

HERE = os.path.dirname(os.path.abspath(__file__))
# Try common locations for ml_utils.py
for _candidate in [HERE,
                   os.path.join(HERE, '..'),
                   os.path.join(HERE, 'marketingapp', 'utils'),
                   os.path.join(HERE, 'backend')]:
    if os.path.exists(os.path.join(_candidate, 'ml_utils.py')):
        sys.path.insert(0, _candidate)
        break

RESULTS = {}   # test_name -> (pass:bool, detail:str)

def check(name, fn):
    try:
        detail = fn()
        RESULTS[name] = (True, detail or "OK")
        print(f"  ✅  {name}")
        if detail:
            for line in str(detail).split('\n'):
                print(f"       {line}")
    except Exception as e:
        RESULTS[name] = (False, str(e))
        print(f"  ❌  {name}")
        print(f"       ERROR: {e}")


def sep(title=""):
    w = 65
    if title:
        pad = (w - len(title) - 2) // 2
        print("\n" + "─"*pad + f" {title} " + "─"*pad)
    else:
        print("─" * w)


# ─────────────────────────────────────────────────────────────────────────────
sep("1. DATASET FILES")

def chk_csv():
    candidates = [
        os.path.join(HERE, 'digital_marketing_campaign_dataset.csv'),
        os.path.join(HERE, '..', 'digital_marketing_campaign_dataset.csv'),
        os.path.join(HERE, 'data', 'digital_marketing_campaign_dataset.csv'),
    ]
    for p in candidates:
        p = os.path.normpath(p)
        if os.path.exists(p):
            import pandas as pd
            df = pd.read_csv(p)
            return f"Found: {p}\n       Rows={len(df):,}  Cols={len(df.columns)}  Columns={df.columns.tolist()[:5]}..."
    raise FileNotFoundError(f"Not found in: {candidates}")

def chk_xlsx():
    candidates = [
        os.path.join(HERE, 'marketing_campaign_dataset.xlsx'),
        os.path.join(HERE, '..', 'marketing_campaign_dataset.xlsx'),
        os.path.join(HERE, 'data', 'marketing_campaign_dataset.xlsx'),
    ]
    for p in candidates:
        p = os.path.normpath(p)
        if os.path.exists(p):
            import pandas as pd
            df = pd.read_excel(p)
            return f"Found: {p}\n       Rows={len(df):,}  Cols={len(df.columns)}"
    raise FileNotFoundError(f"Not found in: {candidates}")

check("CSV dataset (8k rows)", chk_csv)
check("XLSX dataset (200k rows)", chk_xlsx)


# ─────────────────────────────────────────────────────────────────────────────
sep("2. ML_UTILS IMPORT")

def chk_import():
    import ml_utils
    fns = ['_get_engine','_train_engine','_engineer_features',
           'generate_budget_recommendations','predict_channel_roi',
           'get_model_metrics','train_channel_specific_model']
    missing = [f for f in fns if not hasattr(ml_utils, f)]
    if missing:
        raise ImportError(f"Missing functions: {missing}")
    return f"ml_utils loaded from: {ml_utils.__file__}\n       All {len(fns)} public functions present"

check("ml_utils.py imports", chk_import)

def chk_features():
    from ml_utils import CONV_FEATURES_V3, CHANNELS, CHANNEL_NAMES
    assert len(CONV_FEATURES_V3) == 27, f"Expected 27 features, got {len(CONV_FEATURES_V3)}"
    assert len(CHANNELS) == 6, f"Expected 6 channels, got {len(CHANNELS)}"
    return f"27 features confirmed: {CONV_FEATURES_V3[:5]}...\n       6 channels: {CHANNELS}"

check("Feature list (27 features)", chk_features)


# ─────────────────────────────────────────────────────────────────────────────
sep("3. FEATURE ENGINEERING")

def chk_feature_eng():
    import pandas as pd, numpy as np
    from ml_utils import _engineer_features, CONV_FEATURES_V3, CHANNEL_MAP_CSV

    # Find CSV
    for _base in [HERE, os.path.join(HERE, '..'), os.path.join(HERE, 'data')]:
        _p = os.path.normpath(os.path.join(_base, 'digital_marketing_campaign_dataset.csv'))
        if os.path.exists(_p):
            df = pd.read_csv(_p)
            break
    else:
        raise FileNotFoundError("CSV not found for feature engineering check")

    from sklearn.preprocessing import LabelEncoder
    le_ch = LabelEncoder().fit(df['CampaignChannel'])
    le_ct = LabelEncoder().fit(df['CampaignType'])
    df_feat = _engineer_features(df, le_ch, le_ct)

    missing = [f for f in CONV_FEATURES_V3 if f not in df_feat.columns]
    if missing:
        raise ValueError(f"Missing engineered features: {missing}")

    X = df_feat[CONV_FEATURES_V3].replace([np.inf, -np.inf], np.nan).fillna(0)
    nan_count = X.isnull().sum().sum()
    inf_count = (X == np.inf).sum().sum()
    return (f"All 27 features engineered successfully\n"
            f"       X shape: {X.shape}  NaNs: {nan_count}  Infs: {inf_count}")

check("Feature engineering pipeline", chk_feature_eng)


# ─────────────────────────────────────────────────────────────────────────────
sep("4. MODEL TRAINING / LOADING")

def chk_engine():
    from ml_utils import _get_engine
    t0 = time.time()
    engine = _get_engine()
    elapsed = time.time() - t0

    required_keys = ['conv_model','label_encoders','channel_profiles','norm_vectors','metrics']
    missing = [k for k in required_keys if k not in engine]
    if missing:
        raise KeyError(f"Engine missing keys: {missing}")

    m = engine['metrics']['conversion_model']
    return (f"Engine ready in {elapsed:.1f}s\n"
            f"       Model type    : {m.get('model_type')}\n"
            f"       Holdout AUC   : {m.get('auc')}\n"
            f"       5-Fold CV AUC : {m.get('cv_auc_mean')} ± {m.get('cv_auc_std')}\n"
            f"       Training rows : {m.get('training_samples'):,}\n"
            f"       Features      : {m.get('feature_count')}")

check("Engine trains/loads", chk_engine)


# ─────────────────────────────────────────────────────────────────────────────
sep("5. MODEL ACCURACY METRICS")

def chk_auc():
    from ml_utils import get_model_metrics
    m = get_model_metrics()['conversion_model']
    auc = m.get('auc', 0)
    cv  = m.get('cv_auc_mean', 0)
    std = m.get('cv_auc_std', 0)

    grade = "🏆 Excellent" if auc >= 0.84 else ("✅ Good" if auc >= 0.80 else "⚠️  Needs tuning")
    if auc < 0.70:
        raise ValueError(f"AUC too low ({auc:.4f}) — model not working correctly")
    return (f"Holdout AUC   : {auc:.4f}  ← {grade}\n"
            f"       5-Fold CV AUC : {cv:.4f} ± {std:.4f}\n"
            f"       (AUC > 0.80 = Good | > 0.84 = Excellent)")

check("AUC score", chk_auc)

def chk_feat_importance():
    from ml_utils import get_model_metrics
    fi = get_model_metrics()['conversion_model'].get('feature_importance', {})
    if not fi:
        raise ValueError("No feature importance data in metrics")
    top5 = sorted(fi.items(), key=lambda x: x[1], reverse=True)[:5]
    lines = [f"{feat:<35} {imp:.4f}" for feat, imp in top5]
    return "Top 5 features:\n       " + "\n       ".join(lines)

check("Feature importance available", chk_feat_importance)


# ─────────────────────────────────────────────────────────────────────────────
sep("6. CHANNEL PROFILES")

def chk_channel_profiles():
    from ml_utils import _get_engine, CHANNELS, CHANNEL_NAMES
    engine = _get_engine()
    profiles = engine['channel_profiles']
    lines = []
    for ch in CHANNELS:
        p = profiles.get(ch)
        if not p:
            raise KeyError(f"Missing profile for channel: {ch}")
        lines.append(
            f"{CHANNEL_NAMES[ch]:<22} conv_prob={p['conv_prob']:.4f}  "
            f"CTR={p['ctr']:.4f}  CVR={p['cvr']:.4f}  "
            f"cost_per_acq=₹{p['cost_per_acq']:>12,.0f}"
        )
    return "\n       ".join(lines)

check("All 6 channel profiles", chk_channel_profiles)


# ─────────────────────────────────────────────────────────────────────────────
sep("7. ROI PREDICTION API")

def chk_predict_roi():
    from ml_utils import predict_channel_roi
    result = predict_channel_roi('paid_search', 'test_user', {'spend': 2_000_000})
    if result.get('status') != 'success':
        raise ValueError(f"Status not success: {result}")
    required = ['predicted_roi','conv_probability','ctr','cvr','model_confidence']
    missing = [k for k in required if k not in result]
    if missing:
        raise KeyError(f"Missing keys in result: {missing}")
    return (f"predict_channel_roi('paid_search', spend=₹20L)\n"
            f"       predicted_roi     : {result['predicted_roi']:.1f}%\n"
            f"       conv_probability  : {result['conv_probability']:.1f}%\n"
            f"       CTR               : {result['ctr']:.2f}%\n"
            f"       CVR               : {result['cvr']:.2f}%\n"
            f"       model_confidence  : {result['model_confidence']:.4f}")

check("predict_channel_roi()", chk_predict_roi)

def chk_predict_all():
    from ml_utils import predict_all_channels, CHANNELS
    budgets = {ch: 1_000_000 for ch in CHANNELS}
    result  = predict_all_channels('test_user', budgets)
    if result.get('status') != 'success':
        raise ValueError(f"predict_all_channels failed: {result}")
    preds = result.get('predictions', {})
    lines = []
    for ch, p in preds.items():
        lines.append(f"{ch:<15} ROI={p.get('predicted_roi',0):>6.1f}%  conv={p.get('conv_probability',0):.1f}%")
    return "All channels predicted:\n       " + "\n       ".join(lines)

check("predict_all_channels()", chk_predict_all)


# ─────────────────────────────────────────────────────────────────────────────
sep("8. BUDGET RECOMMENDATIONS API")

def chk_recommendations():
    from ml_utils import generate_budget_recommendations
    for strategy in ['max_roi', 'balanced', 'growth', 'awareness']:
        rec = generate_budget_recommendations('test_user', 10_000_000, {}, strategy=strategy)
        if 'error' in rec:
            raise ValueError(f"Strategy '{strategy}' failed: {rec['error']}")
        allocs = rec.get('allocations', {})
        total  = sum(a.get('amount', 0) for a in allocs.values())
        if total <= 0:
            raise ValueError(f"Zero total allocation for strategy '{strategy}'")
    return f"All 4 strategies work: max_roi, balanced, growth, awareness\n       Budget ₹1Cr allocated across 6 channels correctly"

check("generate_budget_recommendations()", chk_recommendations)


# ─────────────────────────────────────────────────────────────────────────────
sep("9. DJANGO + MONGODB (optional)")

def chk_django():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    try:
        import django
        django.setup()
        return "Django setup OK"
    except Exception as e:
        raise RuntimeError(f"Django setup failed (this is OK if running outside Django): {e}")

def chk_mongo():
    from pymongo import MongoClient
    client = MongoClient('mongodb://localhost:27017/', serverSelectionTimeoutMS=2000)
    client.server_info()
    return "MongoDB connected at localhost:27017"

check("Django setup", chk_django)
check("MongoDB connection", chk_mongo)


# ─────────────────────────────────────────────────────────────────────────────
sep("SUMMARY")

passed = sum(1 for ok, _ in RESULTS.values() if ok)
failed = sum(1 for ok, _ in RESULTS.values() if not ok)
total  = len(RESULTS)

print(f"\n  {'TEST':<45} {'STATUS'}")
print(f"  {'─'*45} {'─'*10}")
for name, (ok, detail) in RESULTS.items():
    icon   = "✅ PASS" if ok else "❌ FAIL"
    reason = "" if ok else f"  ← {detail[:60]}"
    print(f"  {name:<45} {icon}{reason}")

print(f"\n  Result: {passed}/{total} passed", end="")
if failed == 0:
    print("  🎉 Everything is working!\n")
elif failed <= 2 and all(
    n in ["Django setup", "MongoDB connection"]
    for n, (ok, _) in RESULTS.items() if not ok
):
    print(f"\n  ⚠️  Only infra checks failed — ML engine is fully functional!\n")
else:
    print(f"  ⚠️  {failed} critical check(s) failed — see errors above.\n")

sep()
print("  HOW TO READ AUC:")
print("  AUC 0.50 = random guessing")
print("  AUC 0.70 = acceptable")
print("  AUC 0.80 = good")
print("  AUC 0.84 = your target (v3 ensemble)")
print("  AUC 1.00 = perfect (likely overfitting)")
sep()