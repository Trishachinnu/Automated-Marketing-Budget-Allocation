from pymongo import MongoClient
from django.conf import settings

_client = None
_db = None

def get_db():
    global _client, _db
    if _db is None:
        _client = MongoClient(settings.MONGODB_URI)
        _db = _client[settings.MONGODB_DB_NAME]
        _db.users.create_index('email', unique=True)
        _db.users.create_index('username', unique=True)
        # Indexes for ML collections
        _db.campaigns.create_index('user_id')
        _db.campaigns.create_index('created_at')
        _db.budget_data.create_index('user_id')
        _db.budget_data.create_index('date')
        _db.ml_models.create_index('user_id')
        _db.ml_models.create_index('model_type')
        _db.historical_performance.create_index('user_id')
        _db.historical_performance.create_index('campaign_id')
    return _db

def get_users_collection():
    return get_db()['users']

def get_campaigns_collection():
    return get_db()['campaigns']

def get_budget_data_collection():
    return get_db()['budget_data']

def get_ml_models_collection():
    return get_db()['ml_models']

def get_historical_performance_collection():
    return get_db()['historical_performance']
