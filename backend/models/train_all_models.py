"""
train_all_models.py — BudgetAI Training Orchestrator v2
========================================================
Trains the global ml_utils engine (Voting Ensemble GBM+RF+ET)
on the real datasets, then exercises all channel-specific
prediction and model-info APIs.

Usage:
    python train_all_models.py

Datasets required (place in same directory or ./data/):
    digital_marketing_campaign_dataset.csv   (8,000 records)
    marketing_campaign_dataset.xlsx          (200,005 records)
"""

import os, sys, json, time
from datetime import datetime

# ── Path setup ────────────────────────────────────────────────────────────────
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from ml_utils import (
    _train_engine, _get_engine,
    train_budget_allocation_model,
    train_channel_specific_model,
    predict_channel_roi,
    predict_all_channels,
    list_trained_channels,
    get_channel_model_info,
    get_model_metrics,
    CHANNELS, CHANNEL_NAMES,
)


def _sep(title="", width=72):
    if title:
        pad = (width - len(title) - 2) // 2
        print("=" * pad + f" {title} " + "=" * pad)
    else:
        print("=" * width)


def train_global_engine():
    """Force-train the global ensemble from scratch."""
    _sep("STEP 1 — Global Engine Training")
    print("Training Voting Ensemble (GBM + RF + ExtraTrees) + Isotonic Calibration")
    print("Dataset: digital_marketing_campaign_dataset.csv (8,000 rows)")
    print("         marketing_campaign_dataset.xlsx (200,005 rows)")
    print()
    t0 = time.time()
    engine = _train_engine()
    elapsed = time.time() - t0

    m = engine['metrics']['conversion_model']
    print(f"\n✓ Global engine trained in {elapsed:.1f}s")
    print(f"  Model type     : {m['model_type']}")
    print(f"  Holdout AUC    : {m['auc']}")
    print(f"  5-Fold CV AUC  : {m['cv_auc_mean']} ± {m['cv_auc_std']}")
    print(f"  Training rows  : {m['training_samples']}")
    print(f"  Feature count  : {m['feature_count']}")
    return engine


def train_all_channels(engine):
    """Call train_channel_specific_model for each channel."""
    _sep("STEP 2 — Per-Channel Model Info")
    USER = "orchestrator"
    results = {}
    for ch in CHANNELS:
        result = train_channel_specific_model(ch, USER, [])
        status = "✓" if result.get('status') == 'success' else "✗"
        m = result.get('metrics', {})
        print(f"  {status} {CHANNEL_NAMES[ch]:<20}"
              f"  AUC={m.get('auc','N/A')}  "
              f"  conv_prob={m.get('conv_prob','N/A')}  "
              f"  CTR={m.get('ctr','N/A')}")
        results[ch] = result
    return results


def run_predictions():
    """Exercise predict_channel_roi and predict_all_channels."""
    _sep("STEP 3 — Channel ROI Predictions")
    USER = "orchestrator"

    budgets = {ch: 2_000_000 for ch in CHANNELS}  # ₹20L per channel
    all_pred = predict_all_channels(USER, budgets)

    print(f"  Budget per channel: ₹{list(budgets.values())[0]:,.0f}")
    print()
    for ch, pred in all_pred.get('predictions', {}).items():
        print(f"  {CHANNEL_NAMES.get(ch, ch):<20}"
              f"  ROI={pred.get('predicted_roi','N/A'):>6.1f}%"
              f"  Conv={pred.get('conv_probability','N/A'):>5.1f}%"
              f"  CTR={pred.get('ctr','N/A'):>5.2f}%"
              f"  CVR={pred.get('cvr','N/A'):>5.2f}%")


def print_feature_importance(engine):
    """Show top-10 features driving the global model."""
    _sep("STEP 4 — Top Feature Importances (Global GBM)")
    fi = engine['metrics']['conversion_model'].get('feature_importance', {})
    sorted_fi = sorted(fi.items(), key=lambda x: x[1], reverse=True)[:10]
    for rank, (feat, imp) in enumerate(sorted_fi, 1):
        bar = "█" * int(imp * 300)
        print(f"  {rank:2}. {feat:<35} {imp:.4f}  {bar}")


def save_report(engine, channel_results):
    """Write a JSON training report."""
    m = engine['metrics']['conversion_model']
    report = {
        'orchestrator_version': 'v2',
        'trained_at':    datetime.utcnow().isoformat(),
        'datasets': {
            'csv':  'digital_marketing_campaign_dataset.csv (8,000 rows)',
            'xlsx': 'marketing_campaign_dataset.xlsx (200,005 rows)',
        },
        'global_model': {
            'type':          m['model_type'],
            'holdout_auc':   m['auc'],
            'cv_auc_mean':   m['cv_auc_mean'],
            'cv_auc_std':    m['cv_auc_std'],
            'training_rows': m['training_samples'],
            'features':      m['feature_count'],
        },
        'channels': {
            ch: res.get('metrics', {}) for ch, res in channel_results.items()
        },
        'channel_profiles': engine['channel_profiles'],
    }
    out = os.path.join(HERE, 'ml_models', f'training_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w') as f:
        json.dump(report, f, indent=2, default=str)
    print(f"\n  ✓ Report saved → {out}")
    return report


if __name__ == '__main__':
    _sep("BudgetAI — Training Orchestrator v2")
    print(f"  Started : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Root    : {HERE}")
    print()

    total_t0 = time.time()

    engine          = train_global_engine()
    channel_results = train_all_channels(engine)
    run_predictions()
    print_feature_importance(engine)
    report          = save_report(engine, channel_results)

    _sep("DONE")
    m = engine['metrics']['conversion_model']
    print(f"  Global model AUC  : {m['auc']}  (5-fold: {m['cv_auc_mean']} ± {m['cv_auc_std']})")
    print(f"  Channels trained  : {len(CHANNELS)}")
    print(f"  Total time        : {time.time()-total_t0:.1f}s")
    _sep()