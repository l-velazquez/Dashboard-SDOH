from django.shortcuts import render
from django.conf import settings
import os
import folium
import json

def index(request):
    light_mode = request.GET.get('light_mode', 'true') == 'true'
    mode = 'cartodbpositron' if light_mode else 'cartodbdark_matter'
    
    m = folium.Map(
        location=[18.1208, -66.3901], 
        zoom_start=9, tiles=mode, 
        scrollWheelZoom=False,  # Disable scroll zoom
        dragging=True,         # Disable dragging
        zoomControl=False,       # Disable zoom controls
        font_size=16,
)

    # Load the GeoJSON data from the file
    geojson_path = os.path.join(settings.BASE_DIR, 'static', 'maps', 'municipalities.geojson')
    with open(geojson_path, 'r') as f:
        geo_data = json.load(f)

    # Example data for each municipality (replace this with your actual data)
    data = {
        "Adjuntas": 81654,
        "Aguada": 61455,
        "Aguadilla": 27349,
        "Aguas Buenas": 77729,
        "Aibonito": 62836,
        "Añasco": 41826,
        "Arecibo": 78121,
        "Arroyo": 21838,
        "Barceloneta": 25606,
        "Barranquitas": 49727,
        "Bayamón": 56024,
        "Cabo Rojo": 93342,
        "Caguas": 78914,
        "Camuy": 54370,
        "Canóvanas": 22316,
        "Carolina": 15865,
        "Cataño": 75667,
        "Cayey": 67098,
        "Ceiba": 60655,
        "Ciales": 64371,
        "Cidra": 88986,
        "Coamo": 50670,
        "Comerío": 86765,
        "Corozal": 92524,
        "Culebra": 90514,
        "Dorado": 94728,
        "Fajardo": 31489,
        "Florida": 11546,
        "Guánica": 23230,
        "Guayama": 26523,
        "Guayanilla": 64922,
        "Guaynabo": 92759,
        "Gurabo": 40635,
        "Hatillo": 36074,
        "Hormigueros": 91503,
        "Humacao": 38794,
        "Isabela": 77972,
        "Jayuya": 38779,
        "Juana Díaz": 69731,
        "Juncos": 80779,
        "Lajas": 83380,
        "Lares": 56805,
        "Las Marías": 73438,
        "Las Piedras": 54540,
        "Loíza": 20911,
        "Luquillo": 49778,
        "Manatí": 62986,
        "Maricao": 20461,
        "Maunabo": 91246,
        "Mayagüez": 44336,
        "Moca": 97390,
        "Morovis": 54179,
        "Naguabo": 54468,
        "Naranjito": 74682,
        "Orocovis": 26814,
        "Patillas": 51716,
        "Peñuelas": 92671,
        "Ponce": 44771,
        "Quebradillas": 49718,
        "Rincón": 60882,
        "Río Grande": 38468,
        "Sabana Grande": 86542,
        "Salinas": 46336,
        "San Germán": 97762,
        "San Juan": 93914,
        "San Lorenzo": 61330,
        "San Sebastián": 65571,
        "Santa Isabel": 73397,
        "Toa Alta": 80371,
        "Toa Baja": 79219,
        "Trujillo Alto": 96576,
        "Utuado": 39117,
        "Vega Alta": 85359,
        "Vega Baja": 60770,
        "Vieques": 17490,
        "Villalba": 64842,
        "Yabucoa": 78542,
        "Yauco": 98127
    }

    # Function to style the municipalities based on the data values
    def style_function(feature):
        municipality_name = feature['properties']['NAME']  # Replace 'NAME' with the actual property key if different
        value = data.get(municipality_name, 0)  # Get the data for the municipality
        color = None
        if value > 90000:
            color = '#8B0000'  # Dark Red (Extreme Danger)
        elif value > 80000:
            color = '#FF4500'  # Orange-Red (High Danger)
        elif value > 70000:
            color = '#FF6347'  # Tomato Red (Danger)
        elif value > 60000:
            color = '#FF8C00'  # Dark Orange (Elevated Risk)
        elif value > 50000:
            color = '#FFA500'  # Orange (Warning)
        elif value > 40000:
            color = '#FFD700'  # Golden Yellow (Caution)
        elif value > 30000:
            color = '#FFFF00'  # Bright Yellow (Moderate)
        elif value > 20000:
            color = '#ADFF2F'  # Green-Yellow (Low Risk)
        elif value > 10000:
            color = '#7CFC00'  # Lawn Green (Safe)
        else:
            color = '#32CD32'  # Lime Green (Very Safe)
        return {
            'fillColor': color,
            'color': 'black',
            'weight': 1,
            'fillOpacity': 0.9,
        }

    # Add the GeoJSON layer to the map
    folium.GeoJson(
        geo_data,
        style_function=style_function,
        tooltip=folium.features.GeoJsonTooltip(
            fields=['NAME'],  # Replace 'NAME' with the property for municipality names
            aliases=['Municipality:']
        ),
        popup=folium.GeoJsonPopup(
            fields=['NAME'],
            aliases=['Municipality:'],
            labels=True,
            localize=True,

        )
    ).add_to(m)


    # Get the HTML representation of the map
    map_html = m._repr_html_()

    # Render the map in the template
    return render(request, 'maps/index.html', {'map': map_html, 'light_mode': light_mode})