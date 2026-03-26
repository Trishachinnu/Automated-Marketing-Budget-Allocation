from django.urls import path
from . import views

urlpatterns = [
    # Auth endpoints
    path('auth/signup/',  views.signup,       name='signup'),
    path('auth/login/',   views.login,        name='login'),
    path('auth/logout/',  views.logout,       name='logout'),
    path('auth/profile/', views.get_profile,  name='profile'),
    path('health/',       views.health_check, name='health'),

    # ML and Budget Management
    path('budget/upload-data/',      views.upload_budget_data,        name='upload_data'),
    path('budget/train-model/',      views.train_ml_model,            name='train_model'),
    path('budget/recommendations/',  views.get_budget_recommendations, name='recommendations'),
    path('budget/analytics/',        views.get_analytics,             name='analytics'),
    path('budget/campaigns/',         views.get_campaigns,             name='get_campaigns'),
    path('budget/campaigns/save/',    views.save_campaign,             name='save_campaign'),
    
    # Channel-Specific Model Endpoints
    path('model/train-channel/',     views.train_channel_model,        name='train_channel'),
    path('model/predict-channel/',   views.predict_channel_revenue,    name='predict_channel'),
    path('model/channel-status/',    views.get_channel_model_status,   name='channel_status'),
    path('model/predict-all/',       views.predict_all_channels_roi,   name='predict_all'),
]