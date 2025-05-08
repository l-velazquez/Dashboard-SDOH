from django.shortcuts import render
from django.conf import settings
from django.http import HttpResponseServerError
import os
import json

def index(request):
    light_mode = request.GET.get('light_mode', 'true') == 'true'

    shapes_path = os.path.join(settings.BASE_DIR, 'static', 'maps', 'municipalities.geojson')
    with open(shapes_path, 'r') as f:
        muni_shapes = json.load(f)

    data_path = os.path.join(settings.BASE_DIR, 'static', 'data', 'cardio_risk.json')
    with open(data_path, 'r') as f:
        risk_map = json.load(f)

    first_muni_data = next(iter(risk_map.values()), {})
    
    # --- Define Metric Display Information (Key, Display Name, Description) ---
    # The order here will be the order in the dropdown.
    # Ensure 'key' matches the keys in your cardio_risk.json
    metric_display_info = [
        {
            "key": "composite_score",
            "display_name": "Composite Score",
            "description": "An overall score combining multiple lipid values to assess cardiovascular risk."
        },
        {
            "key": "ct_hdl_ratio",
            "display_name": "CT/HDL Ratio",
            "description": "Ratio of Total Cholesterol to HDL Cholesterol. Indicates coronary heart disease risk."
        },
        {
            "key": "ldl_hdl_ratio",
            "display_name": "LDL/HDL Ratio",
            "description": "Ratio of LDL Cholesterol to HDL Cholesterol. Assesses risk of heart attack or atherosclerosis."
        },
        {
            "key": "non_hdl",
            "display_name": "Non-HDL Cholesterol",
            "description": "Total Cholesterol minus HDL. Represents all atherogenic cholesterol; assesses arterial obstruction risk."
        },
        {
            "key": "cholesterol",
            "display_name": "Total Cholesterol",
            "description": "Total amount of cholesterol in your blood, including LDL and HDL."
        },
        {
            "key": "hdl",
            "display_name": "HDL Cholesterol",
            "description": "'Good' cholesterol; helps remove other forms of cholesterol from your bloodstream."
        },
        {
            "key": "ldl",
            "display_name": "LDL Cholesterol",
            "description": "'Bad' cholesterol; high levels can lead to plaque buildup in arteries."
        },
        {
            "key": "triglycerides",
            "display_name": "Triglycerides",
            "description": "A type of fat found in your blood. High levels can contribute to artery hardening."
        }
    ]

    # Filter this list to only include metrics actually present in the first municipality's data
    # This ensures we don't offer options for which there's no data.
    available_metrics_for_dropdown = [
        item for item in metric_display_info if item["key"] in first_muni_data and isinstance(first_muni_data[item["key"]], (int, float))
    ]
    
    # If any numeric keys in first_muni_data are NOT in metric_display_info, add them with default naming
    # This is a fallback if your JSON has new metrics not yet defined in metric_display_info
    defined_keys = {item["key"] for item in metric_display_info}
    for key, val in first_muni_data.items():
        if isinstance(val, (int, float)) and key not in defined_keys:
            available_metrics_for_dropdown.append({
                "key": key,
                "display_name": key.replace("_", " ").title(), # Default display name
                "description": "No specific description available for this metric."
            })


    # --- Hardcoded Cardiovascular Risk Formula Details ---
    formula_details = {
        "ct_hdl_ratio": {"friendly_name": "Riesgo de Enfermedad Coronaria", "math_formula": "Colesterol Total / HDL", "risk_type": "Dislipidemia Aterogénica", "threshold": "< 4.0", "interpretation": "Riesgo bajo"},
        "ldl_hdl_ratio": {"friendly_name": "Riesgo de Infarto o Ateroesclerosis", "math_formula": "LDL / HDL", "risk_type": "Dislipidemia Aterogénica", "threshold": "< 2.5", "interpretation": "Riesgo bajo"},
        "non_hdl": {"friendly_name": "Riesgo de Obstrucción Arterial", "math_formula": "Colesterol Total - HDL", "risk_type": "Riesgo Residual de Colesterol Aterogénico", "threshold": "< 130 mg/dL", "interpretation": "Riesgo bajo"},
        "composite_score": {"friendly_name": "Riesgo Global Cardiovascular", "math_formula": "(0.5*LDL)+(0.3*CT)-(0.7*HDL)", "risk_type": "Riesgo Compuesto", "threshold": "< 100", "interpretation": "Riesgo bajo"},
        "cholesterol": {"friendly_name": "Colesterol Total", "math_formula": "N/A (Medido)", "risk_type": "General", "threshold": "< 200 mg/dL", "interpretation": "Deseable"},
        "hdl": {"friendly_name": "Colesterol HDL", "math_formula": "N/A (Medido)", "risk_type": "Protector", "threshold": "> 40 mg/dL", "interpretation": "Deseable alto"},
        "ldl": {"friendly_name": "Colesterol LDL", "math_formula": "N/A (Medido)", "risk_type": "Aterogénico", "threshold": "< 100 mg/dL", "interpretation": "Deseable bajo"},
        "triglycerides": {"friendly_name": "Triglicéridos", "math_formula": "N/A (Medido)", "risk_type": "Grasa en sangre", "threshold": "< 150 mg/dL", "interpretation": "Normal"}
    }

    return render(request, 'maps/index.html', {
        'light_mode': light_mode,
        'muni_geojson': json.dumps(muni_shapes),
        'risk_map': json.dumps(risk_map),
        'metrics_for_dropdown': available_metrics_for_dropdown, # Use this new variable
        'formula_details': json.dumps(formula_details)
    })

def puerto_rico(request):
    return render(request, 'maps/puerto_rico_info.html')

def zipcode_map(request):
    # Construct paths to your JSON files within the static directory
    # This assumes your static files are collected or served correctly.
    # For development, Django's staticfiles finders will locate them.
    
    # Path for GeoJSON
    geojson_file_path = os.path.join(settings.BASE_DIR,'static' , 'maps', 'puerto_rico_zcta.geojson')
    # Path for health data JSON
    health_data_file_path = os.path.join(settings.BASE_DIR, 'static', 'data', 'cardio_risk_by_zipcodes.json')

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