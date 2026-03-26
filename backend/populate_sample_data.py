#!/usr/bin/env python
"""
Script to populate MongoDB with sample marketing budget data for ML training
"""
import os
import sys
import django
from datetime import datetime, timedelta
import random

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

django.setup()

from marketingapp.utils.mongo import get_budget_data_collection, get_campaigns_collection
from marketingapp.utils.auth import hash_password

def create_sample_user():
    """Create a sample user for testing"""
    users_collection = get_budget_data_collection().database.users
    sample_user = {
        'username': 'testuser',
        'email': 'test@example.com',
        'password_hash': hash_password('password123'),
        'full_name': 'Test User',
        'company': 'Test Company',
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow(),
        'is_active': True,
        'role': 'user'
    }
    # Check if user exists
    if not users_collection.find_one({'email': sample_user['email']}):
        result = users_collection.insert_one(sample_user)
        print(f"Created sample user with ID: {result.inserted_id}")
        return str(result.inserted_id)
    else:
        existing = users_collection.find_one({'email': sample_user['email']})
        return str(existing['_id'])

def generate_sample_budget_data(user_id, num_records=50):
    """Generate sample budget and performance data"""
    budget_collection = get_budget_data_collection()

    channels = ['paid_search', 'social_media', 'email_marketing', 'display_ads', 'content_seo']
    data = []

    base_date = datetime.utcnow() - timedelta(days=365)

    for i in range(num_records):
        record_date = base_date + timedelta(days=i*7)  # Weekly data

        # Generate realistic spend and revenue data
        total_spend = random.randint(50000, 200000)

        # Allocate budget across channels
        allocations = {}
        remaining = total_spend
        for j, channel in enumerate(channels[:-1]):
            if j == len(channels) - 2:
                allocations[channel] = remaining
            else:
                alloc = random.randint(int(remaining * 0.1), int(remaining * 0.4))
                allocations[channel] = alloc
                remaining -= alloc
        allocations[channels[-1]] = remaining

        # Generate revenue based on channel performance (with some randomness)
        channel_performance = {
            'paid_search': {'roi': random.uniform(1.5, 3.0), 'efficiency': 0.8},
            'social_media': {'roi': random.uniform(1.2, 2.5), 'efficiency': 0.7},
            'email_marketing': {'roi': random.uniform(2.0, 4.0), 'efficiency': 0.9},
            'display_ads': {'roi': random.uniform(0.8, 2.0), 'efficiency': 0.6},
            'content_seo': {'roi': random.uniform(1.8, 3.5), 'efficiency': 0.85}
        }

        total_revenue = 0
        channel_data = {}

        for channel in channels:
            spend = allocations[channel]
            perf = channel_performance[channel]
            revenue = spend * perf['roi'] * perf['efficiency'] * random.uniform(0.8, 1.2)
            channel_data[f'{channel}_spend'] = spend
            channel_data[f'{channel}_revenue'] = revenue
            total_revenue += revenue

        record = {
            'user_id': user_id,
            'date': record_date,
            'total_spend': total_spend,
            'total_revenue': total_revenue,
            'month': record_date.month,
            'year': record_date.year,
            'previous_spend': total_spend * random.uniform(0.8, 1.2),
            'previous_roi': (total_revenue / total_spend) * random.uniform(0.9, 1.1),
            'channel_performance': random.uniform(0.5, 1.0),
            **channel_data
        }

        data.append(record)

    # Insert data
    if data:
        result = budget_collection.insert_many(data)
        print(f"Inserted {len(result.inserted_ids)} budget records")

    return data

def generate_sample_campaigns(user_id):
    """Generate sample campaigns"""
    campaigns_collection = get_campaigns_collection()

    campaigns = [
        {
            'name': 'Q1 Digital Push',
            'budget': 150000,
            'channels': {
                'paid_search': 35,
                'social_media': 25,
                'email_marketing': 20,
                'display_ads': 10,
                'content_seo': 10
            },
            'status': 'completed',
            'start_date': datetime.utcnow() - timedelta(days=120),
            'end_date': datetime.utcnow() - timedelta(days=30),
        },
        {
            'name': 'Brand Awareness Campaign',
            'budget': 200000,
            'channels': {
                'paid_search': 20,
                'social_media': 40,
                'email_marketing': 15,
                'display_ads': 15,
                'content_seo': 10
            },
            'status': 'active',
            'start_date': datetime.utcnow() - timedelta(days=30),
            'end_date': datetime.utcnow() + timedelta(days=60),
        },
        {
            'name': 'Holiday Season Boost',
            'budget': 300000,
            'channels': {
                'paid_search': 30,
                'social_media': 20,
                'email_marketing': 30,
                'display_ads': 10,
                'content_seo': 10
            },
            'status': 'planned',
            'start_date': datetime.utcnow() + timedelta(days=30),
            'end_date': datetime.utcnow() + timedelta(days=90),
        }
    ]

    for campaign in campaigns:
        campaign['user_id'] = user_id
        campaign['created_at'] = datetime.utcnow()
        campaign['updated_at'] = datetime.utcnow()

    result = campaigns_collection.insert_many(campaigns)
    print(f"Inserted {len(result.inserted_ids)} campaigns")

def main():
    print("Populating MongoDB with sample data...")

    # Create sample user
    user_id = create_sample_user()

    # Generate sample data
    generate_sample_budget_data(user_id, 52)  # 52 weeks of data
    generate_sample_campaigns(user_id)

    print("Sample data population complete!")
    print(f"Sample user credentials: test@example.com / password123")

if __name__ == '__main__':
    main()