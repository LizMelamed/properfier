from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os

app = FastAPI(title="Property Recommendation API")

csv_path = os.path.join(os.path.dirname(__file__), '..', 'zoopla_recommendations.csv')

@app.get("/")
def health():
    return {"status": "ok"}

@app.get("/recommend")
def recommend(
    budget: float = Query(..., gt=0),
    region: str | None = None,
    top_k: int = 10
):
    try:
        df = pd.read_csv(csv_path)
        
        # Filter by budget if provided
        df = df[df['price_cleaned'] <= budget]
        
        # Filter by region if provided (assuming region matches city)
        if region:
            df = df[df['city'].str.contains(region, case=False, na=False)]
        
        # Group by city and compute averages
        grouped = df.groupby('city').agg({
            'price_cleaned': 'mean',
            'predicted_roi': 'mean'
        }).reset_index()
        
        # Rename columns to match desired output
        grouped = grouped.rename(columns={
            'city': 'area',
            'price_cleaned': 'avg_price',
            'predicted_roi': 'predicted_ROI'
        })
        
        # Estimate avg_revenue (e.g., as avg_price * predicted_ROI)
        grouped['avg_revenue'] = grouped['avg_price'] * grouped['predicted_ROI']
        
        # Sort by predicted_ROI descending and take top_k
        grouped = grouped.sort_values('predicted_ROI', ascending=False).head(top_k)
        
        # Convert to dict
        results = grouped.to_dict('records')
        
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],  # Vite default and fallback
    allow_methods=["*"],
    allow_headers=["*"],
)