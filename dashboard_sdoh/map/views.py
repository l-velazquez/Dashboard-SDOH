from django.shortcuts import render
from django.conf import settings
from django.http import HttpResponseServerError
import os
import json
# Provided SDoH Variable Map
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

# Provided Zipcode to Municipality Map
zipcode_to_municipality_map = {
    "00601": "Adjuntas", "00602": "Aguada", "00603": "Aguadilla", "00604": "Aguadilla",
    "00605": "Aguadilla", "00606": "Maricao", "00610": "Añasco", "00611": "Utuado",
    "00612": "Arecibo", "00613": "Arecibo", "00614": "Arecibo", "00616": "Arecibo",
    "00617": "Barceloneta", "00622": "Cabo Rojo", "00623": "Cabo Rojo", "00624": "Peñuelas",
    "00627": "Camuy", "00631": "Lares", "00636": "San Germán", "00637": "Sabana Grande",
    "00638": "Ciales", "00641": "Utuado", "00646": "Dorado", "00647": "Guánica",
    "00650": "Florida", "00652": "Arecibo", "00653": "Guánica", "00656": "Guayanilla",
    "00659": "Hatillo", "00660": "Hormigueros", "00662": "Isabela", "00664": "Jayuya",
    "00667": "Lajas", "00669": "Lares", "00670": "Las Marías", "00674": "Manatí",
    "00676": "Moca", "00677": "Rincón", "00678": "Quebradillas", "00680": "Mayagüez",
    "00681": "Mayagüez", "00682": "Mayagüez", "00683": "San Germán", "00685": "San Sebastián",
    "00687": "Morovis", "00688": "Arecibo", "00690": "Aguadilla", "00692": "Vega Alta",
    "00693": "Vega Baja", "00694": "Vega Baja", "00698": "Yauco", "00703": "Aguas Buenas",
    "00704": "Salinas", "00705": "Aibonito", "00707": "Maunabo", "00714": "Arroyo",
    "00715": "Ponce", "00716": "Ponce", "00717": "Ponce", "00718": "Naguabo",
    "00719": "Naranjito", "00720": "Orocovis", "00721": "Rio Grande", "00723": "Patillas",
    "00725": "Caguas", "00726": "Caguas", "00727": "Caguas", "00728": "Ponce",
    "00729": "Canóvanas", "00730": "Ponce", "00731": "Ponce", "00732": "Ponce",
    "00733": "Ponce", "00734": "Ponce", "00735": "Ceiba", "00736": "Cayey",
    "00737": "Cayey", "00738": "Fajardo", "00739": "Cidra", "00740": "Fajardo",
    "00741": "Humacao", "00742": "Ceiba", "00744": "Humacao", "00745": "Río Grande",
    "00746": None, "00748": None, "00751": "Salinas", "00754": "San Lorenzo",
    "00757": "Santa Isabel", "00765": "Vieques", "00766": "Villalba", "00767": "Yabucoa",
    "00769": "Coamo", "00771": "Las Piedras", "00772": "Loíza", "00773": "Luquillo",
    "00774": None, "00775": "Culebra", "00777": "Juncos", "00778": "Gurabo",
    "00780": "Ponce", "00782": "Comerío", "00783": "Corozal", "00784": "Guayama",
    "00785": None, "00786": "Aibonito", "00791": "Humacao", "00792": None,
    "00794": "Barranquitas", "00795": "Juana Díaz", "00797": None, "00901": "San Juan",
    "00902": None, "00906": "San Juan", "00907": "San Juan", "00908": None,
    "00909": "San Juan", "00910": None, "00911": "San Juan", "00912": "San Juan",
    "00913": "San Juan", "00914": None, "00915": "San Juan", "00916": None,
    "00917": "San Juan", "00918": "San Juan", "00919": None, "00920": "San Juan",
    "00921": "San Juan", "00922": None, "00923": "San Juan", "00924": "San Juan",
    "00925": "San Juan", "00926": "San Juan", "00927": "San Juan", "00928": "San Juan",
    "00929": "San Juan", "00930": None, "00931": "San Juan", "00933": "San Juan",
    "00934": "Guaynabo", "00935": "San Juan", "00936": "San Juan", "00937": "San Juan",
    "00939": "San Juan", "00940": "San Juan", "00949": "Toa Baja", "00950": "Dorado",
    "00951": "Toa Baja", "00952": "Toa Baja", "00953": "Toa Alta", "00954": "Toa Alta",
    "00955": "San Juan", "00956": "Bayamón", "00957": "Bayamón", "00958": "Bayamón",
    "00959": "Bayamón", "00960": "Bayamón", "00961": "Bayamón", "00962": "Cataño",
    "00963": "Cataño", "00964": None, "00965": "Guaynabo", "00966": "Guaynabo",
    "00968": "Guaynabo", "00969": "Guaynabo", "00970": "Guaynabo", "00971": "Guaynabo",
    "00972": None, "00975": "San Juan", "00976": "Trujillo Alto", "00977": "Trujillo Alto",
    "00978": "San Juan", "00979": "Carolina", "00981": "Carolina", "00982": "Carolina",
    "00983": "Carolina", "00984": "Carolina", "00985": "Carolina", "00986": "Carolina",
    "00987": "Carolina", "00988": "Carolina"
}

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

def puerto_rico(request):
    return render(request, 'maps/puerto_rico_info.html')



# --- NEW VIEW for combined map ---
def sdoh_map(request):
    # Paths for existing data
    geojson_file_path = os.path.join(settings.BASE_DIR, 'static', 'maps', 'puerto_rico_zcta.geojson')
    health_data_file_path = os.path.join(settings.BASE_DIR, 'static', 'data', 'puerto_rico_cardiovascular_risk_by_zip_monthly_avg.json')
    # Path for SDoH data
    sdoh_data_file_path = os.path.join(settings.BASE_DIR, 'static', 'data', 'sdoh_by_municipality.json')

    geojson_data_str = "{}"
    health_stats_data_str = "[]" # Default to empty array
    sdoh_data_str = "[]" # Default to empty array

    # Load GeoJSON
    try:
        with open(geojson_file_path, 'r', encoding='utf-8') as f:
            geojson_data_str = f.read()
    except FileNotFoundError:
        print(f"Error: GeoJSON file not found at {geojson_file_path}")
        return HttpResponseServerError("Required map boundary file is missing.")
    except Exception as e:
        print(f"Error reading GeoJSON file: {e}")
        return HttpResponseServerError("Error processing map boundary file.")

    # Load Health Data
    try:
        with open(health_data_file_path, 'r', encoding='utf-8') as f:
            health_stats_data_str = f.read()
    except FileNotFoundError:
        print(f"Warning: Health data file not found at {health_data_file_path}. Map may lack health details.")
        # Allow continuation but maybe log this or show a message later
    except Exception as e:
        print(f"Error reading health data file: {e}")
        # Decide if this is critical or allow continuation

    # Load SDoH Data
    try:
        with open(sdoh_data_file_path, 'r', encoding='utf-8') as f:
            sdoh_data_str = f.read()
    except FileNotFoundError:
        print(f"Error: SDoH data file not found at {sdoh_data_file_path}")
        return HttpResponseServerError("Required SDoH data file is missing.")
    except Exception as e:
        print(f"Error reading SDoH data file: {e}")
        return HttpResponseServerError("Error processing SDoH data file.")

    # Convert Python dicts to JSON strings for the template context
    try:
        sdoh_variable_map_json = json.dumps(sdoh_json_variable_map)
        zip_to_muni_map_json = json.dumps(zipcode_to_municipality_map)
    except Exception as e:
        print(f"Error converting map dictionaries to JSON: {e}")
        return HttpResponseServerError("Internal configuration error.")


    context = {
        'geojson_data': geojson_data_str,
        'health_stats_data': health_stats_data_str,
        'sdoh_data': sdoh_data_str,                   # Pass SDoH data as string
        'sdoh_variable_map_json': sdoh_variable_map_json, # Pass SDoH descriptions as JSON string
        'zip_to_muni_map_json': zip_to_muni_map_json      # Pass Zip to Muni map as JSON string
    }
    # Make sure you have a template named 'zip_code_sdoh.html' or similar
    # Using the name provided in the user prompt 'zip_code_2.html'
    return render(request, 'maps/sdoh.html', context)