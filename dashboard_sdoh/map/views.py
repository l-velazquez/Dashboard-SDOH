from django.shortcuts import render
from django.conf import settings
import os
import folium
import json

def index(request):
    light_mode = request.GET.get('light_mode', 'true') == 'true'
    mode = 'cartodbpositronnolabels' if light_mode else 'cartodbdark_matter_nolabels'
    
    m = folium.Map(
        location=[18.1208, -66.2601], 
        zoom_start=9, 
        tiles=mode, 
        scrollWheelZoom=False,  # Disable scroll zoom
        dragging=True,         # Disable dragging
        zoomControl=False,       # Disable zoom controls
        font_size=16,
)

    # Load the GeoJSON data from the file
    geojson_path = os.path.join(settings.BASE_DIR, 'static', 'maps', 'municipalities.geojson')
    with open(geojson_path, 'r') as f:
        geo_data = json.load(f)
    
    # Load data for each municipality
    data_path = os.path.join(settings.BASE_DIR, 'static', 'data', 'random_values.json')
    with open(data_path, 'r') as f:
        data = json.load(f)
    
   
    # Function to style the municipalities based on the data values
    def style_function(feature):
        municipality_name = feature['properties']['NAME'] # Normalize name
        value = data.get(municipality_name, 0)  # Direct value
        color = '#32CD32'  # Default color
        if value > 90000:
            color = '#8B0000'
        elif value > 80000:
            color = '#FF4500'
        elif value > 70000:
            color = '#FF6347'
        elif value > 60000:
            color = '#FF8C00'
        elif value > 50000:
            color = '#FFA500'
        elif value > 40000:
            color = '#FFD700'
        elif value > 30000:
            color = '#FFFF00'
        elif value > 20000:
            color = '#ADFF2F'
        elif value > 10000:
            color = '#7CFC00'
        
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
            fields=['NAME'],
            aliases=['Municipality:']
        ),
        popup=folium.GeoJsonPopup(
            fields=['NAME'],
            aliases=['Municipality:'],
            labels=False,
            localize=True,
        )
    ).add_to(m)

    # Get the HTML representation of the map
    map_html = m._repr_html_()

    # Render the map in the template
    return render(request, 'maps/index.html', {'map': map_html, 'light_mode': light_mode})