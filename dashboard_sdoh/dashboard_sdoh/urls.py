from django.urls import path, include

urlpatterns = [
    path('', include('map.urls')),  # Include URLs from the maps app)
]