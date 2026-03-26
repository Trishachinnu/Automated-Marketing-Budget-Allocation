#!/usr/bin/env python
import os
import sys
import django
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, '/d/marketing-budget-app/backend')
django.setup()

from marketingapp.utils.mongo import get_users_collection, get_budget_data_collection
from marketingapp.utils.auth import hash_password
from datetime import datetime

# Get MongoDB collections
users_collection = get_users_collection()
budget_collection = get_budget_data_collection()

# Create a test user if it doesn't exist
test_user_email = 'test@example.com'
existing_user = users_collection.find_one({'email': test_user_email})

if not existing_user:
    user_doc = {
        'username': 'testuser',
        'email': test_user_email,
        'full_name': 'Test User',
        'password': hash_password('testpassword123'),
        'created_at': datetime.utcnow()
    }
    result = users_collection.insert_one(user_doc)
    user_id = str(result.inserted_id)
    print(f"Test user created: {test_user_email} (ID: {user_id})")
else:
    user_id = str(existing_user['_id'])
    print(f"Test user already exists: {test_user_email} (ID: {user_id})")

# Create some test budget data
test_data = [
    {
        'date': datetime(2024, 1, 1),
        'channel': 'paid_search',
        'spend': 5000,
        'impressions': 100000,
        'clicks': 2000,
        'conversions': 50,
        'revenue': 25000,
        'roi': 5.0
    },
    {
        'date': datetime(2024, 1, 1),
        'channel': 'social_media',
        'spend': 3000,
        'impressions': 80000,
        'clicks': 1600,
        'conversions': 32,
        'revenue': 16000,
        'roi': 5.33
    }
]

# Clear existing data for this user
budget_collection.delete_many({'user_id': user_id})

# Create budget records
inserted_count = 0
for item in test_data:
    budget_doc = {
        'user_id': user_id,
        **item
    }
    budget_collection.insert_one(budget_doc)
    inserted_count += 1

# Verify
count = budget_collection.count_documents({'user_id': user_id})
print(f"Created {count} budget records")

records = list(budget_collection.find({'user_id': user_id}))
for record in records:
    print(f"  - {record['date']}: {record['channel']} - ${record['spend']}")

print("Test data created successfully!")
