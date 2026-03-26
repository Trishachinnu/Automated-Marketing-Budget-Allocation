# Channel-Specific Model Training System

This document describes the newly implemented channel-specific machine learning model training system for the Marketing Budget Allocation application.

## Overview

The system has been enhanced to support training individual machine learning models for each marketing channel:
- **Paid Search**
- **Social Media**
- **Email Marketing**
- **Display Ads**
- **Content & SEO**

Each channel gets a dedicated model trained on channel-specific features and metrics, allowing for more accurate budget optimization recommendations.

## Architecture

### Backend Components

#### 1. **Jupyter Notebooks** (`backend/models/notebooks/`)
Five comprehensive Jupyter notebooks for training each channel:
- `01_paid_search_model.ipynb` - Paid Search channel model
- `02_social_media_model.ipynb` - Social Media channel model
- `03_email_marketing_model.ipynb` - Email Marketing channel model
- `04_display_ads_model.ipynb` - Display Ads channel model
- `05_content_seo_model.ipynb` - Content & SEO channel model

Each notebook includes:
- Data loading and preprocessing
- Feature engineering specific to the channel
- Multiple model training (Linear Regression, Random Forest, Gradient Boosting)
- Model evaluation and comparison
- Model persistence (saves to `backend/models/`)

#### 2. **ML Utilities** (`backend/marketingapp/utils/ml_utils.py`)

**New Functions:**
- `train_channel_specific_model(channel, user_id, historical_data)` - Train a model for a specific channel
- `predict_channel_roi(channel, user_id, input_features)` - Predict ROI for a channel
- `predict_all_channels(user_id, budget_allocation)` - Get predictions for all channels
- `get_channel_model_info(channel, user_id)` - Get info about a trained channel model
- `list_trained_channels(user_id)` - List all trained models for a user

**Channel Configuration:**
```python
CHANNEL_CONFIG = {
    'paid_search': {
        'features': ['spend', 'clicks', 'conversions', 'ctr', 'cpc'],
        'target': 'roi'
    },
    'social_media': {
        'features': ['spend', 'impressions', 'engagements', 'followers_gained', 'cpc', 'engagement_rate', 'conversion_rate'],
        'target': 'roi'
    },
    'email_marketing': {
        'features': ['spend', 'subscriber_count', 'emails_sent', 'open_rate', 'click_rate', 'conversion_rate', 'unsubscribe_rate'],
        'target': 'roi'
    },
    'display_ads': {
        'features': ['spend', 'impressions', 'clicks', 'conversions', 'ctr', 'cpc', 'viewability_rate'],
        'target': 'roi'
    },
    'content_seo': {
        'features': ['spend', 'content_pieces', 'organic_traffic', 'keyword_rankings', 'backlinks_gained', 'organic_conversions', 'time_on_page'],
        'target': 'roi'
    }
}
```

#### 3. **API Endpoints** (`backend/marketingapp/views.py`)

**New Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/model/train-channel/` | POST | Train a model for a specific channel |
| `/api/model/predict-channel/` | POST | Get ROI prediction for a channel |
| `/api/model/channel-status/` | GET | Get status of trained channels |
| `/api/model/predict-all/` | POST | Predict ROI for all channels |

**Request/Response Examples:**

**Train Channel Model:**
```bash
POST /api/model/train-channel/
Authorization: Bearer <token>
Content-Type: application/json

{
  "channel": "paid_search"
}

# Response (200)
{
  "message": "Model trained successfully for paid_search",
  "channel": "paid_search",
  "model_id": "507f1f77bcf86cd799439011",
  "model_type": "Random Forest",
  "metrics": {
    "r2_score": 0.8523,
    "mae": 0.1234,
    "rmse": 0.1567
  },
  "data_points": 100
}
```

**Get Channel Status:**
```bash
GET /api/model/channel-status/?channel=paid_search
Authorization: Bearer <token>

# Response (200)
{
  "channel": "paid_search",
  "model_type": "Random Forest",
  "metrics": {
    "r2_score": 0.8523,
    "mae": 0.1234,
    "rmse": 0.1567
  },
  "training_date": "2026-03-08T14:30:00.000Z",
  "data_points": 100,
  "status": "success"
}
```

**Predict Channel ROI:**
```bash
POST /api/model/predict-channel/
Authorization: Bearer <token>
Content-Type: application/json

{
  "channel": "paid_search",
  "features": {
    "spend": 1000,
    "clicks": 150,
    "conversions": 10,
    "ctr": 0.05,
    "cpc": 2.5
  }
}

# Response (200)
{
  "channel": "paid_search",
  "predicted_roi": 3.45,
  "model_confidence": 0.8523,
  "model_type": "Random Forest",
  "status": "success"
}
```

### Frontend Components

#### 1. **Updated API Client** (`frontend/src/utils/api.js`)

**New API Module:**
```javascript
export const channelModelAPI = {
  trainChannel:        (data) => api.post('/model/train-channel/', data),
  predictChannel:      (data) => api.post('/model/predict-channel/', data),
  getChannelStatus:    (channel) => api.get('/model/channel-status/', { params: { channel } }),
  getAllChannelStatus: () => api.get('/model/channel-status/'),
  predictAllChannels:  (data) => api.post('/model/predict-all/', data),
};
```

#### 2. **Enhanced Train Model Page** (`frontend/src/pages/TrainModel.js`)

**Features:**
- Tab-based interface (Overall Model vs Channel-Specific Models)
- Channel cards showing:
  - Channel name and icon
  - Training status
  - Model performance metrics
  - Model type and R² score
  - Training date
  - Data points used
- Individual training buttons for each channel
- Real-time status updates

#### 3. **Updated Styling** (`frontend/src/pages/TrainModel.css`)

New CSS classes for:
- Channel grid layout
- Channel cards with metrics
- Training status badges
- Tab navigation
- Alert messages
- Responsive design for mobile

## Data Storage

### MongoDB Collections

**Models are stored in the existing `ml_models` collection:**

```json
{
  "_id": ObjectId,
  "user_id": "user123",
  "channel": "paid_search",
  "model_type": "Random Forest",
  "model_data": Binary,
  "feature_columns": ["spend", "clicks", "conversions", "ctr", "cpc"],
  "target_column": "roi",
  "metrics": {
    "r2_score": 0.8523,
    "mae": 0.1234,
    "rmse": 0.1567
  },
  "training_date": ISODate,
  "data_points": 100,
  "all_model_scores": {
    "Linear Regression": {...},
    "Random Forest": {...},
    "Gradient Boosting": {...}
  }
}
```

## Training Orchestrator

### Script: `backend/models/train_all_models.py`

A standalone Python script that orchestrates training of all channel models programmatically.

**Usage:**
```bash
cd backend
python models/train_all_models.py
```

**Features:**
- Trains all 5 channel models sequentially
- Generates sample data for each channel if needed
- Produces a JSON training report
- Logs training status and metrics
- Exit code indicates success/failure

**Output:**
```
================================================================================
Channel-Specific Model Training (Programmatic)
================================================================================

[1/5] Training Paid Search...
  ✓ Model trained successfully
    - Model Type: Random Forest
    - R² Score: 0.8523
    - Data Points: 100

[2/5] Training Social Media...
  ✓ Model trained successfully
    - Model Type: Gradient Boosting
    - R² Score: 0.8145
    - Data Points: 100

...

================================================================================
Training Summary
================================================================================

Total Channels: 5
Successful: 5
Failed: 0

Channel Results:
  ✓ Paid Search: success
      R² Score: 0.8523
      MAE: 0.1234
      RMSE: 0.1567
  ✓ Social Media: success
      R² Score: 0.8145
      MAE: 0.1456
      RMSE: 0.1789
  ...

✓ Training Report saved to: backend/models/training_report_20260308_143000.json
```

## Workflow

### 1. **Train Overall Model** (Existing)
User → Upload Data → Train Overall Model → Get Recommendations

### 2. **Train Channel-Specific Models** (New)
User → Upload Data → Train Individual Channel Models → Get Channel-Specific Predictions

### 3. **Make Predictions**
- Get ROI predictions for individual channels
- Get budget allocation recommendations using trained models
- Compare performance across channels

## Integration with Other Pages

### Dashboard
- Display trained channel model status
- Show model performance indicators

### Recommendations
- Use channel-specific models for predictions
- Show channel-specific recommendations
- Display model confidence levels

### Analytics
- Channel model performance metrics
- Model comparison visualizations
- Training history and statistics

### Campaigns
- Link campaigns to trained channel models
- Show predicted performance based on models
- Provide budget recommendations per channel

## Feature Engineering by Channel

### Paid Search
- `spend`: Total spend on paid search
- `clicks`: Number of clicks
- `conversions`: Conversion count
- `ctr`: Click-through rate
- `cpc`: Cost per click

### Social Media
- `spend`: Social media budget
- `impressions`: Ad impressions
- `engagements`: Likes, comments, shares
- `followers_gained`: New followers
- `engagement_rate`: Engagement per follower
- `conversion_rate`: Social to conversion rate

### Email Marketing
- `spend`: Email campaign budget
- `subscriber_count`: Total subscribers
- `emails_sent`: Number of emails sent
- `open_rate`: Email open rate
- `click_rate`: Email click-through rate
- `conversion_rate`: Email to conversion rate
- `unsubscribe_rate`: Rate of unsubscribes

### Display Ads
- `spend`: Display advertising budget
- `impressions`: Ad impressions
- `clicks`: Ad clicks
- `conversions`: Conversions from ads
- `ctr`: Click-through rate
- `cpc`: Cost per click
- `viewability_rate`: Percentage of visible impressions

### Content & SEO
- `spend`: SEO/content budget
- `content_pieces`: Number of content items
- `organic_traffic`: Organic visitors
- `keyword_rankings`: Average keyword ranking
- `backlinks_gained`: New backlinks
- `organic_conversions`: Conversions from organic
- `time_on_page`: Average time on page

## Model Selection Logic

Each channel trains 3 models:
1. **Linear Regression** - Fast, interpretable baseline
2. **Random Forest** - Robust, handles non-linearities
3. **Gradient Boosting** - Often highest accuracy

The best model is selected based on **R² score** on the test set.

## Error Handling

- **Insufficient data**: Minimum 10 data points required per channel
- **Missing features**: Auto-generates sample data for missing features
- **Database errors**: Falls back to programmatic training
- **Model inference**: Returns error message with suggestions

## Performance Metrics

Each model is evaluated on:
- **R² Score**: Coefficient of determination (0-1, higher is better)
- **MAE**: Mean Absolute Error (smaller is better)
- **RMSE**: Root Mean Squared Error (smaller is better)

## Next Steps / Future Enhancements

1. **Notebook Parameters**: Parameterize notebooks via `papermill`
2. **Automated Retraining**: Schedule periodic model retraining
3. **Model Versioning**: Track model versions and performance history
4. **Ensemble Models**: Combine predictions from multiple channels
5. **Real-time Predictions**: Stream predictions to frontend
6. **Model Explainability**: SHAP or LIME for model interpretation
7. **A/B Testing**: Test model recommendations vs actual performance
8. **Custom Features**: Allow users to define custom channel features

## Dependencies

**Backend:**
- scikit-learn
- pandas
- numpy
- joblib
- pymongo

**Frontend:**
- React
- axios
- react-router-dom

**Notebooks:**
- jupyter
- pandas
- numpy
- scikit-learn
- matplotlib
- joblib

## Testing

### Unit Tests
```bash
# Test channel model training
python manage.py test marketingapp.tests.test_channel_models

# Test API endpoints
python manage.py test marketingapp.tests.test_channel_api
```

### Integration Tests
```bash
# Full workflow test
python manage.py test marketingapp.tests.test_full_workflow
```

### Manual Testing
1. Upload sample data via Upload Data page
2. Train overall model
3. Train individual channel models
4. Check model status via API
5. Make predictions and verify outputs

## Troubleshooting

### Models not training
- Check data upload - minimum 10 records per channel
- Verify feature columns match configuration
- Check database connection

### Low R² scores
- Ensure sufficient historical data
- Verify feature quality
- Check for outliers in data
- Try retraining with cleaned data

### API errors
- Verify authenti cation token
- Check channel name is valid
- Ensure data format matches schema

## Support

For issues or questions:
1. Check training logs in `backend/models/training_report_*.json`
2. Review Jupyter notebook outputs
3. Check API response error messages
4. Consult backend logs
