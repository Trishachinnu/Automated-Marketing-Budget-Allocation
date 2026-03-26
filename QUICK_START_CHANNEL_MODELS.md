# Channel-Specific Model Training - Quick Start Guide

## What's New?

Your Marketing Budget Allocation app now supports **individual machine learning models for each marketing channel**. Instead of one general model, you can now train dedicated models for:

- 🎯 **Paid Search**
- 📱 **Social Media**  
- 📧 **Email Marketing**
- 🖼️ **Display Ads**
- 📝 **Content & SEO**

## Getting Started

### Step 1: Upload Your Data

1. Go to **Upload Data** page
2. Upload your historical marketing performance data
3. Include data for at least 10 time periods per channel

**Required data format:**
- Date columns
- Channel identification
- Spend/budget information
- Performance metrics (clicks, impressions, conversions, etc.)
- ROI or revenue data

### Step 2: Train Models

Two options:

#### Option A: Train Overall Model (Existing approach)
1. Click **"Train Overall Model"** on Train Model page
2. Wait for training to complete
3. Get budget allocation recommendations

#### Option B: Train Channel-Specific Models (New approach)
1. Go to **Train Model** page
2. Click **"Channel-Specific Models"** tab
3. Click **"Train This Channel"** for each channel you want to optimize
4. System trains dedicated model for each channel

### Step 3: View Model Status

**Check Training Status:**
- Go to Train Model page → Channel-Specific Models tab
- Each channel card shows:
  - ✓ Trained status
  - Model type (Random Forest, Gradient Boosting, etc.)
  - R² Score (model accuracy: 0.0 to 1.0, higher is better)
  - Training date
  - Data points used

**Get Status via API:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/model/channel-status/
```

### Step 4: Make Predictions

**Get Predictions for a Channel:**
```bash
curl -X POST http://localhost:8000/api/model/predict-channel/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "paid_search",
    "features": {
      "spend": 1000,
      "clicks": 150,
      "conversions": 10,
      "ctr": 0.05,
      "cpc": 2.5
    }
  }'
```

**Response:**
```json
{
  "channel": "paid_search",
  "predicted_roi": 3.45,
  "model_confidence": 0.85,
  "model_type": "Random Forest",
  "status": "success"
}
```

### Step 5: Use in Recommendations

The system automatically uses trained channel models when:
- Generating budget recommendations
- Predicting channel performance
- Analyzing channel ROI
- Making allocation decisions

## Channel-Specific Features

Each channel model uses the most relevant metrics:

### Paid Search Model
Predicts ROI based on:
- Total spend, clicks, conversions
- Click-through rate (CTR)
- Cost per click (CPC)

### Social Media Model
Predicts ROI based on:
- Spend, impressions, engagements
- Followers gained
- Engagement rate, conversion rate

### Email Marketing Model
Predicts ROI based on:
- Email spend, subscriber count
- Emails sent, open rate
- Click rate, conversion rate
- Unsubscribe rate

### Display Ads Model
Predicts ROI based on:
- Ad spend, impressions, clicks
- Conversions, CTR, CPC
- Viewability rate

### Content & SEO Model
Predicts ROI based on:
- Content budget, pieces created
- Organic traffic, keyword rankings
- Backlinks gained, conversions
- Time on page

## Important Metrics

### R² Score
- Measures how well the model fits your data
- Range: 0.0 to 1.0
- **0.7+**: Excellent
- **0.5-0.7**: Good
- **<0.5**: Fair (consider more data)

### Model Confidence
- Same as R² Score
- Indicates reliability of predictions
- Lower confidence = less reliable recommendations

### Data Points
- Number of historical records used for training
- More data = better model
- Minimum 10 required, ideally 50+

## Troubleshooting

### Model won't train
**Error: "Insufficient data for training"**
- Solution: Upload at least 10 records for each channel

**Error: "No trained model found"**
- Solution: Click "Train This Channel" button first

### Low accuracy (R² < 0.5)
- Upload more historical data (ideally 100+ records)
- Ensure data quality (no duplicates, outliers)
- Check that all features are populated
- Try retraining after data cleanup

### Predictions seem wrong
- Check model R² score (should be > 0.6)
- Verify input features match expected ranges
- Compare with actual historical performance
- Request more recent training data

## API Reference

### Authentication
All requests require Bearer token:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Endpoints

**Train a Channel Model:**
```
POST /api/model/train-channel/
Body: { "channel": "paid_search" }
```

**Get Channel Model Status:**
```
GET /api/model/channel-status/?channel=paid_search
```

**Get All Channel Statuses:**
```
GET /api/model/channel-status/
```

**Get Channel ROI Prediction:**
```
POST /api/model/predict-channel/
Body: { 
  "channel": "paid_search",
  "features": { "spend": 1000, ... }
}
```

**Get All Channel Predictions:**
```
POST /api/model/predict-all/
Body: { 
  "budget_allocation": {
    "paid_search": 1000,
    "social_media": 800,
    ...
  }
}
```

## Command-Line Training

Train all models at once:

```bash
cd backend
python models/train_all_models.py
```

This creates a training report at:
```
backend/models/training_report_YYYYMMDD_HHMMSS.json
```

## Best Practices

### 1. Data Quality
- Ensure historical data is accurate
- Remove or fix obvious outliers
- Include complete date ranges

### 2. Minimum Data
- **Ideal**: 100+ records per channel
- **Minimum**: 10 records per channel
- **Frequency**: Weekly or daily data preferred

### 3. Feature Completeness
- Fill in all relevant metrics for each channel
- Consistent measurement methodology
- Include ROI/revenue data for target variable

### 4. Regular Retraining
- Retrain models monthly or quarterly
- Especially after campaign changes
- After implementing new tracking
- When ROI suddenly changes

### 5. Model Monitoring
- Check R² score after retraining
- Monitor prediction accuracy vs actual
- Watch for declining model performance

## Example Workflow

```
1. Upload 3 months of historical data
   └─> 12 weeks × 5 channels = 60 records per channel

2. Train models
   └─> Each channel gets its own model
   └─> System selects best performing algorithm

3. Check model quality
   └─> Review R² scores
   └─> Verify all channels trained successfully

4. Use for recommendations
   └─> Get channel-specific ROI predictions
   └─> Optimize budget allocation

5. Monitor performance
   └─> Track actual vs predicted ROI
   └─> Retrain when needed
```

## FAQ

**Q: Can I train models for some channels only?**
A: Yes! Train only the channels you need. Other channels will use default allocations.

**Q: How long does training take?**
A: Usually 5-30 seconds per channel, depending on data size.

**Q: Can I train the same channel multiple times?**
A: Yes. New training overwrites the previous model.

**Q: Will models improve automatically?**
A: No. You need to retrain with new data for more recent performance.

**Q: What if a channel has no data?**
A: System will generate sample data. For best results, upload real historical data.

**Q: Can I see all trained models?**
A: Yes. Check the channel status page or call `/api/model/channel-status/`

**Q: How accurate are predictions?**
A: Accuracy depends on data quality and R² score. R²>0.7 = high confidence.

## Next Steps

1. **Explore Channel Models**: Train models for each channel
2. **Compare Performance**: Check which channels have best models
3. **Use for Decisions**: Rely on predictions for budget allocation
4. **Monitor & Retrain**: Keep models fresh with new data
5. **Optimize Results**: Use predictions to improve ROI

## Support

For detailed technical documentation, see: `CHANNEL_MODELS_README.md`

For more help:
1. Check Training error messages
2. Review Dashboard Analytics
3. Check API response status codes
4. Monitor server logs
