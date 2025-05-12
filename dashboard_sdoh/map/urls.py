# maps/urls.py
from django.urls import path
from . import views

urlpatterns = [
    #path('', views.index, name='index'),  # Main page for map visualization
    path('puerto_rico/', views.puerto_rico, name='puerto_rico'),  # Puerto Rico specific map
    path('', views.zipcode_map, name='zipcode'),  # Zipcode map
    path('sdoh/', views.sdoh_map, name='sdoh'),  # Test page
]