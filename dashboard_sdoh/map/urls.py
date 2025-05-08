# maps/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),  # Main page for map visualization
    path('puerto_rico/', views.puerto_rico, name='puerto_rico'),  # Puerto Rico specific map
    path('zipcode_map/', views.zipcode_map, name='zipcode'),  # Zipcode map
]