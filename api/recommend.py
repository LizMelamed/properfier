from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import urlparse, parse_qs
from supabase import create_client
import pandas as pd
import numpy as np
import os

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    return 2 * R * np.arcsin(np.sqrt(a))

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)

            budget = float(params.get('budget', [None])[0])
            region = params.get('region', [None])[0]
            top_k = int(params.get('top_k', [10])[0])
            radius_km = float(params.get('radius_km', [80.0])[0])

            url = os.environ["SUPABASE_URL"]
            key = os.environ["SUPABASE_KEY"]
            supabase = create_client(url, key)

            query = supabase.table("zoopla_recommendations")\
                .select("city, price_cleaned, predicted_roi, lat, long")\
                .lte("price_cleaned", int(budget))

            if region:
                query = query.ilike("city", f"%{region}%")

            response = query.execute()
            df = pd.DataFrame(response.data)

            grouped = df.groupby('city').agg({
                'price_cleaned': 'mean',
                'predicted_roi': 'mean',
                'lat': 'mean',
                'long': 'mean'
            }).reset_index()

            grouped = grouped.rename(columns={
                'city': 'area',
                'price_cleaned': 'avg_price',
                'predicted_roi': 'predicted_ROI',
                'long': 'lng'
            })
            grouped['avg_revenue'] = grouped['avg_price'] * grouped['predicted_ROI']

            price_lists = []
            roi_lists = []

            for _, row in grouped.iterrows():
                distances = haversine(row['lat'], row['lng'], df['lat'], df['long'])
                nearby = df[distances <= radius_km]
                price_lists.append(nearby['price_cleaned'].tolist())
                roi_lists.append(nearby['predicted_roi'].tolist())

            grouped['price_dist'] = price_lists
            grouped['roi_dist'] = roi_lists
            grouped = grouped.sort_values('predicted_ROI', ascending=False).head(top_k)

            top_areas = grouped['area'].tolist()
            overall_df = df[df['city'].isin(top_areas)]
            results = grouped.to_dict('records')
            for rec in results:
                rec['overall_price_dist'] = overall_df['price_cleaned'].tolist()
                rec['overall_roi_dist'] = overall_df['predicted_roi'].tolist()

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(results).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
