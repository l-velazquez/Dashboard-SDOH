# maps/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.sdoh_municipality, name='sdoh_muni'),
    path('puerto_rico/', views.puerto_rico, name='puerto_rico'),  # Puerto Rico specific map
    #path('', views.zipcode_map, name='zipcode'),  # Zipcode map
    path('sdoh/zipcodes', views.sdoh_zip, name='sdoh_zip'),  # SDOH map
    path('sdoh/municipalities', views.sdoh_municipality, name='sdoh_muni'),  # Test page
    path('sdoh/', RedirectView.as_view(url='/sdoh/municipalities', permanent=True), name='sdoh_redirect'),  # Redirect to canonical endpoint
   
]