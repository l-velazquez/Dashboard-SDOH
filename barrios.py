import folium
import json

# Load the GeoJSON data (replace with your actual file path if needed)
with open('dashboard_sdoh/static/maps/extra/barrios+isla+pueblos.json') as f:
    geojson_data = json.load(f)

# Create a map centered on Puerto Rico
m = folium.Map(location=[18.22, -66.59], zoom_start=9)  # Centered on PR

# Style functions (customize as needed)
def style_barrio(feature):
    return {
        'fillColor': '#3186cc',  # Light blue fill
        'color': '#0000FF',  # Dark blue outline 
        'weight': 1,
        'fillOpacity': 0.5  
    }

def style_pueblo(feature):
    return {
        'fillColor': '#FF5733', # Orange fill
        'color': '#FF0000',  # Red outline
        'weight': 2,
        'fillOpacity': 0.7
    }

# Add barrios to the map
folium.GeoJson(
    geojson_data['barrios'],
    name='Barrios',
    style_function=style_barrio,
    tooltip=folium.GeoJsonTooltip(fields=['NAME'], aliases=['Barrio:']), # Tooltip with barrio name
).add_to(m)

# Add pueblos to the map
folium.GeoJson(
    geojson_data['pueblos'],
    name='Pueblos',
    style_function=style_pueblo,
    tooltip=folium.GeoJsonTooltip(fields=['NAME'], aliases=['Pueblo:']), # Tooltip with pueblo name
).add_to(m)

# Add the island outline (optional, for context)
folium.GeoJson(
    geojson_data['isla'],
    name='Island Outline',
    style_function=lambda x: {'color': 'green', 'weight': 3},
).add_to(m)


# Add layer control (allows turning layers on/off)
folium.LayerControl().add_to(m)

# Save the map (replace with your desired file path)
m.save('puerto_rico_map.html')