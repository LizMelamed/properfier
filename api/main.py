from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum 
import pandas as pd
import os
import numpy as np

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius km
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    return 2 * R * np.arcsin(np.sqrt(a))

app = FastAPI(title="Property Recommendation API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'zoopla_recommendations.csv')

@app.get("/")
def health():
    return {"status": "ok"}

@app.get("/api/recommend")
def recommend(
    budget: float = Query(..., gt=0),
    region: str | None = None,
    top_k: int = 10,
    radius_km: float = Query(80.0, gt=0)  # search radius around area center
):
    try:
        df = pd.read_csv(csv_path)
        
        # Filter by budget if provided
        df = df[df['price_cleaned'] <= budget]
        
        # Filter by region if provided (assuming region matches city)
        if region:
            df = df[df['city'].str.contains(region, case=False, na=False)]
        
        # first compute a summary row per city and center coordinates
        grouped = df.groupby('city').agg({
            'price_cleaned': 'mean',
            'predicted_roi': 'mean',
            'lat': 'mean',   # centroid of listings in the city
            'long': 'mean'
        }).reset_index()

        grouped = grouped.rename(columns={
            'city': 'area',
            'price_cleaned': 'avg_price',
            'predicted_roi': 'predicted_ROI',
            'long': 'lng'
        })
        grouped['avg_revenue'] = grouped['avg_price'] * grouped['predicted_ROI']

        # for distribution charts we simply take all listings belonging to the area
        price_lists = []
        roi_lists = []

        for _, row in grouped.iterrows():
            center_lat = row['lat']
            center_lng = row['lng']

            # calculate distance of every property from the area center
            distances = haversine(center_lat, center_lng, df['lat'], df['long'])

            nearby = df[distances <= radius_km]

            price_lists.append(nearby['price_cleaned'].tolist())
            roi_lists.append(nearby['predicted_roi'].tolist())

        grouped['price_dist'] = price_lists
        grouped['roi_dist'] = roi_lists

        grouped = grouped.sort_values('predicted_ROI', ascending=False).head(top_k)

        # compute overall distributions across the selected top_k areas
        top_areas = grouped['area'].tolist()
        overall_df = df[df['city'].isin(top_areas)]
        overall_price = overall_df['price_cleaned'].tolist()
        overall_roi = overall_df['predicted_roi'].tolist()

        results = grouped.to_dict('records')
        # add overall lists to each record for frontend convenience
        for rec in results:
            rec['overall_price_dist'] = overall_price
            rec['overall_roi_dist'] = overall_roi
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


handler = Mangum(app)
