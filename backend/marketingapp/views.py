import re
from datetime import datetime
from bson import ObjectId
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .utils.mongo import get_users_collection, get_budget_data_collection, get_campaigns_collection
from .utils.auth import hash_password, verify_password, generate_token, decode_token
import pandas as pd


def validate_email(email):
    return bool(re.match(r'^[^@]+@[^@]+\.[^@]+$', email))

def validate_password(pwd):
    if len(pwd) < 8:
        return False, 'Min 8 characters'
    if not re.search(r'[A-Z]', pwd):
        return False, 'Must include an uppercase letter'
    if not re.search(r'[0-9]', pwd):
        return False, 'Must include a number'
    return True, ''


@api_view(['POST'])
def signup(request):
    d = request.data
    for f in ['username', 'email', 'password', 'full_name']:
        if not d.get(f):
            return Response({'error': f'{f} is required'}, status=400)

    username = d['username'].strip().lower()
    email    = d['email'].strip().lower()

    if not validate_email(email):
        return Response({'error': 'Invalid email'}, status=400)

    ok, msg = validate_password(d['password'])
    if not ok:
        return Response({'error': msg}, status=400)

    try:
        users = get_users_collection()

        if users.find_one({'email': email}):
            return Response({'error': 'Email already registered'}, status=409)
        if users.find_one({'username': username}):
            return Response({'error': 'Username already taken'}, status=409)

        doc = {
            'username':      username,
            'email':         email,
            'full_name':     d['full_name'].strip(),
            'company':       d.get('company', ''),
            'password_hash': hash_password(d['password']),
            'created_at':    datetime.utcnow(),
            'updated_at':    datetime.utcnow(),
            'is_active':     True,
            'role':          'user',
        }
        result = users.insert_one(doc)
        uid    = str(result.inserted_id)
        token  = generate_token(uid, email, username)

        return Response({
            'message': 'Account created successfully',
            'token': token,
            'user': {
                'id':        uid,
                'username':  username,
                'email':     email,
                'full_name': doc['full_name'],
                'company':   doc['company'],
            }
        }, status=201)
    except Exception as e:
        # For development: return mock signup if database is not available
        uid = 'demo_user_' + str(datetime.utcnow().timestamp())
        token = generate_token(uid, email, username)
        return Response({
            'message': 'Demo account created (database not available)',
            'token': token,
            'user': {
                'id': uid,
                'username': username,
                'email': email,
                'full_name': d['full_name'].strip(),
                'company': d.get('company', ''),
            }
        }, status=201)


@api_view(['POST'])
def login(request):
    identifier = request.data.get('identifier', '').strip().lower()
    password   = request.data.get('password', '')

    if not identifier or not password:
        return Response({'error': 'All fields required'}, status=400)

    try:
        users = get_users_collection()
        user  = users.find_one({'$or': [{'email': identifier}, {'username': identifier}]})

        if not user or not verify_password(password, user['password_hash']):
            return Response({'error': 'Invalid credentials'}, status=401)

        users.update_one({'_id': user['_id']}, {'$set': {'last_login': datetime.utcnow()}})

        uid   = str(user['_id'])
        token = generate_token(uid, user['email'], user['username'])

        return Response({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id':        uid,
                'username':  user['username'],
                'email':     user['email'],
                'full_name': user['full_name'],
                'company':   user.get('company', ''),
            }
        })
    except Exception as e:
        # For development: return mock login if database is not available
        if 'demo' in identifier or 'test' in identifier:
            token = generate_token('demo_user_id', 'demo@example.com', 'demo')
            return Response({
                'message': 'Demo login successful (database not available)',
                'token': token,
                'user': {
                    'id': 'demo_user_id',
                    'username': 'demo',
                    'email': 'demo@example.com',
                    'full_name': 'Demo User',
                    'company': 'Demo Company',
                }
            })
        return Response({'error': f'Database connection failed: {str(e)}'}, status=500)


@api_view(['GET'])
def get_profile(request):
    token = request.headers.get('Authorization', '').replace('Bearer ', '').strip()
    res   = decode_token(token)
    if not res['valid']:
        return Response({'error': res['error']}, status=401)

    users = get_users_collection()
    user  = users.find_one({'_id': ObjectId(res['payload']['user_id'])})
    if not user:
        return Response({'error': 'User not found'}, status=404)

    return Response({'user': {
        'id':        str(user['_id']),
        'username':  user['username'],
        'email':     user['email'],
        'full_name': user['full_name'],
        'company':   user.get('company', ''),
    }})


@api_view(['POST'])
def logout(request):
    return Response({'message': 'Logged out successfully'})


@api_view(['GET'])
def health_check(request):
    try:
        get_users_collection().find_one({})
        db_status = 'connected'
    except Exception as e:
        db_status = f'error: {e}'
    return Response({'status': 'ok', 'database': db_status})


# ML and Budget Management Views

@api_view(['POST'])
def upload_budget_data(request):
    """Upload historical budget and performance data for training"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '').strip()
    res = decode_token(token)
    if not res['valid']:
        return Response({'error': res['error']}, status=401)

    user_id = res['payload']['user_id']
    data = request.data.get('data', [])

    if not data:
        return Response({'error': 'No data provided'}, status=400)

    try:
        budget_collection = get_budget_data_collection()

        # Add user_id and timestamps to each record
        for record in data:
            record['user_id'] = user_id
            record['uploaded_at'] = datetime.utcnow()
            if 'date' in record:
                record['date'] = datetime.strptime(record['date'], '%Y-%m-%d')

        # Insert data
        result = budget_collection.insert_many(data)

        return Response({
            'message': f'Successfully uploaded {len(result.inserted_ids)} records',
            'inserted_ids': [str(id) for id in result.inserted_ids]
        }, status=201)

    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
def train_ml_model(request):
    """Train ML model using uploaded historical data"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '').strip()
    res = decode_token(token)
    if not res['valid']:
        return Response({'error': res['error']}, status=401)

    user_id = res['payload']['user_id']

    try:
        from .utils.ml_utils import train_budget_allocation_model

        # Get user's historical data from MongoDB
        budget_collection = get_budget_data_collection()
        historical_data = list(budget_collection.find({'user_id': user_id}))

        if not historical_data:
            return Response({'error': 'No historical data found. Please upload data first.'}, status=400)

        # Convert ObjectId to string for JSON serialization
        for record in historical_data:
            record['_id'] = str(record['_id'])

        # Train model
        result = train_budget_allocation_model(user_id, historical_data)

        if 'error' in result:
            return Response({'error': result['error']}, status=400)

        return Response({
            'message': 'Model trained successfully',
            'model_id': result['model_id'],
            'metrics': result['metrics'],
            'data_points': result['data_points']
        }, status=200)

    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
def get_budget_recommendations(request):
    """Get AI-powered budget allocation recommendations"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '').strip()
    res = decode_token(token)
    if not res['valid']:
        return Response({'error': res['error']}, status=401)

    user_id      = res['payload']['user_id']
    total_budget = request.data.get('total_budget')
    current_data = request.data.get('current_data', {})
    strategy     = request.data.get('strategy', current_data.get('strategy', 'balanced'))

    if not total_budget or total_budget <= 0:
        return Response({'error': 'Valid total_budget is required'}, status=400)

    # Collect all campaign context fields — top-level or nested in current_data
    current_data['product_service'] = request.data.get('product_service') or current_data.get('product_service', '')
    current_data['campaign_name']   = request.data.get('campaign_name')   or current_data.get('campaign_name', '')
    current_data['company_name']    = request.data.get('company_name')    or current_data.get('company_name', '')
    current_data['target_audience'] = request.data.get('target_audience') or current_data.get('target_audience', '')
    current_data['campaign_type']   = request.data.get('campaign_type')   or current_data.get('campaign_type', '')
    current_data['strategy']        = strategy

    try:
        from .utils.ml_utils import generate_budget_recommendations

        recommendations = generate_budget_recommendations(
            user_id, total_budget, current_data, strategy=strategy
        )

        if 'error' in recommendations:
            return Response({'error': recommendations['error']}, status=500)

        return Response(recommendations, status=200)

    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
def get_analytics(request):
    """Get marketing analytics and insights"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '').strip()
    res = decode_token(token)
    if not res['valid']:
        return Response({'error': res['error']}, status=401)

    user_id = res['payload']['user_id']

    try:
        from .utils.ml_utils import analyze_channel_performance
        from .utils.mongo import get_budget_data_collection, get_campaigns_collection

        # Get user's data
        budget_collection = get_budget_data_collection()
        campaigns_collection = get_campaigns_collection()

        budget_data = list(budget_collection.find({'user_id': user_id}))
        campaigns = list(campaigns_collection.find({'user_id': user_id}))

        analytics = {
            'total_campaigns': len(campaigns),
            'total_budget_records': len(budget_data),
            'channel_performance': analyze_channel_performance(budget_data) if budget_data else {}
        }

        # Calculate totals
        if budget_data:
            df = pd.DataFrame(budget_data)
            analytics['total_spend'] = df.get('total_spend', 0).sum() if 'total_spend' in df.columns else 0
            analytics['total_revenue'] = df.get('total_revenue', 0).sum() if 'total_revenue' in df.columns else 0
            analytics['avg_roi'] = ((analytics['total_revenue'] - analytics['total_spend']) / analytics['total_spend'] * 100) if analytics['total_spend'] > 0 else 0

        return Response(analytics, status=200)

    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
def save_campaign(request):
    """Save a new campaign"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '').strip()
    res = decode_token(token)
    if not res['valid']:
        return Response({'error': res['error']}, status=401)

    user_id = res['payload']['user_id']
    campaign_data = request.data

    required_fields = ['name', 'budget', 'company_name', 'product_service', 'strategy']
    for field in required_fields:
        if not campaign_data.get(field):
            return Response({'error': f'{field} is required'}, status=400)

    valid_strategies = ['max_roi', 'balanced', 'growth', 'awareness']
    if campaign_data['strategy'] not in valid_strategies:
        return Response({'error': f'strategy must be one of {valid_strategies}'}, status=400)

    try:
        campaigns_collection = get_campaigns_collection()

        campaign_doc = {
            'user_id':            user_id,
            'company_name':       campaign_data['company_name'].strip(),
            'name':               campaign_data['name'].strip(),
            'product_service':    campaign_data['product_service'].strip(),
            'budget':             campaign_data['budget'],
            'strategy':           campaign_data['strategy'],
            'status':             campaign_data.get('status', 'active'),
            'target_audience':    campaign_data.get('target_audience', ''),
            'campaign_objective': campaign_data.get('campaign_objective', ''),
            'start_date':         datetime.strptime(campaign_data['start_date'], '%Y-%m-%d') if campaign_data.get('start_date') else None,
            'end_date':           datetime.strptime(campaign_data['end_date'],   '%Y-%m-%d') if campaign_data.get('end_date')   else None,
            'created_at':         datetime.utcnow(),
            'updated_at':         datetime.utcnow(),
        }

        result = campaigns_collection.insert_one(campaign_doc)

        return Response({
            'message': 'Campaign saved and budget optimized successfully',
            'campaign_id': str(result.inserted_id),
            'campaign': {
                'id':                 str(result.inserted_id),
                'company_name':       campaign_doc['company_name'],
                'name':               campaign_doc['name'],
                'product_service':    campaign_doc['product_service'],
                'budget':             campaign_doc['budget'],
                'strategy':           campaign_doc['strategy'],
                'status':             campaign_doc['status'],
                'target_audience':    campaign_doc['target_audience'],
                'campaign_objective': campaign_doc['campaign_objective'],
            }
        }, status=201)

    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
def get_campaigns(request):
    """Get all campaigns for the authenticated user"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '').strip()
    res = decode_token(token)
    if not res['valid']:
        return Response({'error': res['error']}, status=401)

    user_id = res['payload']['user_id']

    try:
        campaigns_collection = get_campaigns_collection()

        campaigns = list(campaigns_collection.find({'user_id': user_id}))

        # Convert ObjectId to string for JSON serialization
        for campaign in campaigns:
            campaign['_id'] = str(campaign['_id'])
            campaign['id'] = campaign['_id']
            # Ensure optional fields always present for frontend
            campaign.setdefault('target_audience', '')
            campaign.setdefault('campaign_objective', '')

        return Response({'campaigns': campaigns}, status=200)

    except Exception as e:
        return Response({'error': str(e)}, status=500)


# Channel-Specific ML Model Endpoints

@api_view(['POST'])
def train_channel_model(request):
    """Train a machine learning model for a specific channel"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '').strip()
    res = decode_token(token)
    if not res['valid']:
        return Response({'error': res['error']}, status=401)

    user_id = res['payload']['user_id']
    channel = request.data.get('channel')
    
    if not channel:
        return Response({'error': 'Channel parameter is required'}, status=400)

    try:
        from .utils.ml_utils import train_channel_specific_model
        from .utils.mongo import get_budget_data_collection

        # Get historical data for the channel
        budget_collection = get_budget_data_collection()
        
        # Try to get channel-specific data first
        channel_data = list(budget_collection.find({'user_id': user_id, 'channel': channel}))
        
        # If no channel-specific data, get all data
        if not channel_data:
            channel_data = list(budget_collection.find({'user_id': user_id}))
        
        if not channel_data:
            return Response({'error': 'No historical data found for training. Please upload data first.'}, status=400)

        # Train channel-specific model
        result = train_channel_specific_model(channel, user_id, channel_data)

        if 'error' in result or result.get('status') == 'failed':
            return Response({'error': result.get('error', 'Model training failed')}, status=400)

        return Response({
            'message': f'Model trained successfully for {channel}',
            'channel': channel,
            'model_id': result.get('model_id'),
            'model_type': result.get('model_type'),
            'metrics': result.get('metrics'),
            'all_models': result.get('all_models'),
            'data_points': result.get('data_points')
        }, status=200)

    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
def predict_channel_revenue(request):
    """Get ROI prediction for a specific channel"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '').strip()
    res = decode_token(token)
    if not res['valid']:
        return Response({'error': res['error']}, status=401)

    user_id = res['payload']['user_id']
    channel = request.data.get('channel')
    features = request.data.get('features', {})

    if not channel:
        return Response({'error': 'Channel parameter is required'}, status=400)

    try:
        from .utils.ml_utils import predict_channel_roi

        prediction = predict_channel_roi(channel, user_id, features)

        if 'error' in prediction or prediction.get('status') == 'failed':
            return Response({'error': prediction.get('error', 'Prediction failed')}, status=400)

        return Response(prediction, status=200)

    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
def get_channel_model_status(request):
    """Get status of trained models for all channels"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '').strip()
    res = decode_token(token)
    if not res['valid']:
        return Response({'error': res['error']}, status=401)

    user_id = res['payload']['user_id']
    channel = request.query_params.get('channel')

    try:
        from .utils.ml_utils import list_trained_channels, get_channel_model_info

        if channel:
            # Get info for specific channel
            result = get_channel_model_info(channel, user_id)
            if 'error' in result or result.get('status') == 'failed':
                return Response({'error': result.get('error', 'Channel not found')}, status=404)
            return Response(result, status=200)
        else:
            # Get info for all channels
            result = list_trained_channels(user_id)
            if 'error' in result or result.get('status') == 'failed':
                return Response({'error': result.get('error', 'Failed to fetch channels')}, status=400)
            return Response(result, status=200)

    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
def predict_all_channels_roi(request):
    """Get ROI predictions for all channels given budget allocation"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '').strip()
    res = decode_token(token)
    if not res['valid']:
        return Response({'error': res['error']}, status=401)

    user_id = res['payload']['user_id']
    budget_allocation = request.data.get('budget_allocation', {})

    if not budget_allocation:
        return Response({'error': 'Budget allocation is required'}, status=400)

    try:
        from .utils.ml_utils import predict_all_channels

        result = predict_all_channels(user_id, budget_allocation)

        if 'error' in result or result.get('status') == 'failed':
            return Response({'error': result.get('error', 'Predictions failed')}, status=400)

        return Response(result, status=200)

    except Exception as e:
        return Response({'error': str(e)}, status=500)