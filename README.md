# Marketing Budget Allocation Data Science Project

An AI-powered marketing budget allocation system with automated ML model training and optimization recommendations.

## Features

### ✅ Implemented Features

1. **User Authentication**
   - Signup/Login with JWT tokens
   - Profile management
   - Secure password hashing

2. **ML-Powered Budget Optimization**
   - Automated budget allocation across 5 marketing channels:
     - Paid Search
     - Social Media
     - Email Marketing
     - Display Ads
     - Content/SEO
   - Machine learning model training using historical data
   - Real-time budget recommendations based on performance data

3. **Data Management**
   - Upload historical marketing performance data
   - Store campaign information
   - Analytics dashboard with key metrics

4. **Database Integration**
   - MongoDB for all data storage
   - Collections for users, campaigns, budget data, and ML models
   - Model persistence in database

### 🏗️ Architecture

- **Backend**: Django REST Framework with MongoDB
- **Frontend**: React.js with modern UI
- **ML Engine**: Scikit-learn with Random Forest regression
- **Database**: MongoDB with optimized collections

## API Endpoints

### Authentication
- `POST /api/auth/signup/` - User registration
- `POST /api/auth/login/` - User login
- `GET /api/auth/profile/` - Get user profile
- `POST /api/auth/logout/` - User logout

### Budget Management
- `POST /api/budget/upload-data/` - Upload historical data
- `POST /api/budget/train-model/` - Train ML model
- `POST /api/budget/recommendations/` - Get budget recommendations
- `GET /api/budget/analytics/` - Get analytics data
- `GET /api/budget/campaigns/` - Get user campaigns
- `POST /api/budget/campaigns/save/` - Save new campaign

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 16+
- MongoDB
- Conda (recommended for ML packages)

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   conda install scikit-learn pandas numpy matplotlib joblib -y
   conda run -n base pip install Django djangorestframework django-cors-headers pymongo python-dotenv
   ```

3. Set up environment variables in `.env`:
   ```
   DJANGO_SECRET_KEY=your-secret-key
   DEBUG=True
   MONGODB_URI=mongodb://localhost:27017/
   MONGODB_DB_NAME=marketing_budget_db
   JWT_SECRET_KEY=jwt-secret-key
   ```

4. Populate sample data:
   ```bash
   conda run -n base python populate_sample_data.py
   ```

5. Run the server:
   ```bash
   conda run -n base python manage.py runserver 8000
   ```

### Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## Sample Data

The system includes sample data for testing:

- **Test User**: test@example.com / password123
- **Sample Campaigns**: 3 campaigns with different budgets and channels
- **Historical Data**: 52 weeks of marketing performance data

## ML Model Details

### Training Data Requirements
- Minimum 10 data points for training
- Features: month, year, previous spend, previous ROI, channel performance
- Target: Optimal allocation percentages for each channel

### Model Performance
- Algorithm: Random Forest Regressor
- Evaluation metrics: MAE, MSE, R² Score
- Model persistence: Stored as binary in MongoDB

### Recommendation Engine
- ML-based recommendations when sufficient data available
- Rule-based fallback for new users
- Confidence scoring (High/Medium/Low)

## Usage

1. **Login** with test credentials
2. **Upload Data** (optional - sample data already exists)
3. **Train Model** to create personalized ML model
4. **View Dashboard** with AI-powered recommendations
5. **Create Campaigns** with optimized budget allocations

## Future Enhancements

- [ ] Advanced ML models (Neural Networks, Time Series)
- [ ] Real-time performance tracking
- [ ] A/B testing integration
- [ ] Multi-channel attribution modeling
- [ ] Predictive analytics dashboard
- [ ] Automated campaign optimization

## Contributing

1. Maintain existing authentication functionality
2. Store all data in MongoDB
3. Use RESTful API design
4. Follow React best practices for frontend
5. Document new features and API endpoints