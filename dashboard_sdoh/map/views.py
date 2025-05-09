from django.shortcuts import render
from django.conf import settings
from django.http import HttpResponseServerError
import os
import json


def zipcode_map(request):
    # Construct paths to your JSON files within the static directory
    # This assumes your static files are collected or served correctly.
    # For development, Django's staticfiles finders will locate them.
    
    # Path for GeoJSON
    geojson_file_path = os.path.join(settings.BASE_DIR,'static' , 'maps', 'puerto_rico_zcta.geojson')
    # Path for health data JSON
    health_data_file_path = os.path.join(settings.BASE_DIR, 'static', 'data', 'puerto_rico_cardiovascular_risk_by_zip_monthly_avg.json')

    geojson_data_str = "{}"
    health_stats_data_str = "{}"

    try:
        with open(geojson_file_path, 'r') as f:
            # We pass it as a string, JavaScript will parse it
            geojson_data_str = f.read() 
    except FileNotFoundError:
        print(f"Error: GeoJSON file not found at {geojson_file_path}")
        # Handle error appropriately, maybe pass an empty GeoJSON or an error message
    
    try:
        with open(health_data_file_path, 'r') as f:
            # We pass it as a string, JavaScript will parse it
            health_stats_data_str = f.read()
    except FileNotFoundError:
        print(f"Error: Health data file not found at {health_data_file_path}")
        # Handle error appropriately

    context = {
        'geojson_data': geojson_data_str,
        'health_stats_data': health_stats_data_str,
    }
    return render(request, 'maps/zip_code.html', context)

def handle_500(request):
    """
    Custom error handler for 500 Internal Server Error.
    This function renders a custom error page.
    """
    return render(request, 'errors/500.html', status=500)

def handle_404(request, exception):
    """
    Custom error handler for 404 Not Found.
    This function renders a custom error page.
    """
    return render(request, 'errors/404.html', status=404)

def sdoh(request):
    sdoh_json_variable_map = {
    "YEAR": "SDOH file year",
    "COUNTYFIPS": "State-county FIPS Code (5-digit)",
    "COUNTY": "County name",
    "STATE": "State name",
    "lon": "Longitude",
    "lat": "Latitude",
    "ACS_PCT_INC50_ABOVE65": "Percentage of population with income to poverty ratio under 0.50 (ages 65 and over)",
    "ACS_PCT_INC50_BELOW17": "Percentage of children with income to poverty ratio under 0.50 (ages 17 and below)",
    "ACS_PCT_HEALTH_INC_BELOW137": "Percentage of population under 1.37 of the poverty threshold (relevant for health insurance coverage)",
    "ACS_PCT_HEALTH_INC_138_199": "Percentage of population between 1.38 and 1.99 of the poverty threshold (relevant for health insurance coverage)",
    "ACS_PCT_HEALTH_INC_200_399": "Percentage of population between 2.00 and 3.99 of the poverty threshold (relevant for health insurance coverage)",
    "ACS_PCT_HEALTH_INC_ABOVE400": "Percentage of population over 4.00 of the poverty threshold (relevant for health insurance coverage)",
    "ACS_PCT_HH_PUB_ASSIST": "Percentage of households with public assistance income or food stamps/SNAP",
    "ACS_PCT_COLLEGE_ASSOCIATE_DGR": "Percentage of population with some college or associate's degree (ages 25 and over)",
    "ACS_PCT_BACHELOR_DGR": "Percentage of population with a bachelor's degree (ages 25 and over)",
    "ACS_PCT_GRADUATE_DGR": "Percentage of population with a master's or professional school degree or doctorate (ages 25 and over)",
    "ACS_PCT_HS_GRADUATE": "Percentage of population with only high school diploma (ages 25 and over)",
    "ACS_PCT_LT_HS": "Percentage of population with less than high school education (ages 25 and over)",
    "ACS_PCT_POSTHS_ED": "Percentage of population with any postsecondary education (ages 25 and over)",
    "ACS_TOT_CIVIL_EMPLOY_POP": "Total civilian employed population (ages 16 and over)",
    "ACS_PCT_UNINSURED": "Percentage of population with no health insurance coverage",
    "HIFLD_MIN_DIST_UC": "Minimum distance in miles to the nearest urgent care, calculated using population weighted tract centroids in the county",
    "POS_MIN_DIST_ED": "Minimum distance in miles to the nearest emergency department, calculated using population weighted tract centroids in the county",
    "POS_MIN_DIST_ALC": "Minimum distance in miles to the nearest hospital with alcohol and drug abuse inpatient care, calculated using population weighted tract centroids in the county",
    "ACS_PCT_DISABLE": "Percentage of population with a disability",
    "ACS_PCT_NONVET_DISABLE_18_64": "Percentage of nonveterans with a disability (between ages 18 and 64)",
    "ACS_PCT_VET_DISABLE_18_64": "Percentage of civilian veterans with a disability (between ages 18 and 64)"
}
    




def puerto_rico(request):
    return render(request, 'maps/puerto_rico_info.html')