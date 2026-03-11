import { useState, useEffect } from "react";
import MiniMapLeaflet from "./MiniMapLeaflet";

export default function ResultsPage({ budget, area, onBack }) {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const params = new URLSearchParams();
        if (budget) params.append('budget', budget);
        if (area) params.append('region', area);
        params.append('top_k', '10');

        const response = await fetch(`http://localhost:8000/recommend?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch recommendations');
        }
        const data = await response.json();
        setResults(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [budget, area]);

  if (loading) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden font-sans">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/london.avif')" }} />
        <div className="absolute inset-0 bg-[#0a1a33]/80" />
        <div className="relative z-10 px-6 py-10 text-white flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl mb-4">Loading recommendations...</div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden font-sans">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/london.avif')" }} />
        <div className="absolute inset-0 bg-[#0a1a33]/80" />
        <div className="relative z-10 px-6 py-10 text-white flex items-center justify-center">
          <div className="text-center">
            <div className="text-xl mb-4">Error loading recommendations</div>
            <div className="text-red-400">{error}</div>
            <button onClick={onBack} className="mt-4 text-yellow-400 hover:underline">
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden font-sans">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/london.avif')" }} />
      <div className="absolute inset-0 bg-[#0a1a33]/80" />

      <div className="relative z-10 px-6 py-10 text-white">
        <div className="max-w-4xl mx-auto">
          <button onClick={onBack} className="text-yellow-400 hover:underline mb-6">
            ← Back
          </button>

          <h1 className="text-3xl font-bold mb-2 text-yellow-400">
            Your budget — up to £{budget || "—"}
          </h1>

          {area && <p className="text-white/70 mb-8">Filtered by area: {area}</p>}

          <div className="space-y-6">
            {results.map((r, i) => {
              const isExpanded = expandedIndex === i;
              const isHidden = expandedIndex !== null && expandedIndex !== i;

              if (isHidden) return null;

              // Simple city to coordinates mapping (you can expand this)
              const cityCoords = {
                'Moray': { lat: 57.6498, lng: -3.3165 },
                'Torquay': { lat: 50.4619, lng: -3.5253 },
                'South Ayrshire': { lat: 55.4586, lng: -4.6292 },
                'Inverclyde': { lat: 55.9456, lng: -4.7569 },
                'Inverness': { lat: 57.4778, lng: -4.2247 },
              };

              const coords = cityCoords[r.city] || { lat: 54.7024, lng: -3.2765 }; // Default to UK center

              return (
                <div
                  key={r.id || i}
                  className={`bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-xl p-6 transition-all ${
                    isExpanded ? "min-h-[80vh]" : ""
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-semibold">{r.city} area</h2>

                      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-white/80">
                        <span>Price:</span>
                        <span>£{r.price_cleaned.toLocaleString()}</span>
                        <span>Avg Price:</span>
                        <span>£{Math.round(r.avg_price).toLocaleString()}</span>  
                        <span>Avg Revenue:</span>
                        <span>£{Math.round(r.avg_revenue).toLocaleString()}</span>                                              
                        <span>Predicted ROI:</span>
                        <span>{(r.predicted_roi * 100).toFixed(2)}%</span>
                        <span>Yield:</span>
                        <span>{(r.predicted_ROI * 100).toFixed(2)}%</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <MiniMapLeaflet lat={coords.lat} lng={coords.lng} />

                      <a
                        href={`https://www.zoopla.co.uk/for-sale/property/${r.city.toLowerCase()}/`}
                        target="_blank"
                        className="bg-blue-600 hover:bg-blue-700 transition text-white px-4 py-2 rounded-lg text-sm"
                      >
                        See on Zoopla
                      </a>
                    </div>
                  </div>

                  <div className="mt-4">
                    {!isExpanded ? (
                      <button
                        onClick={() => setExpandedIndex(i)}
                        className="text-yellow-400 hover:underline text-sm"
                      >
                        Read more →
                      </button>
                    ) : (
                      <button
                        onClick={() => setExpandedIndex(null)}
                        className="text-yellow-400 hover:underline text-sm"
                      >
                        ← See less
                      </button>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-6">
                      <h3 className="text-lg font-semibold mb-3">Mini Dashboard</h3>
                      <div className="h-48 border border-dashed border-white/30 flex items-center justify-center text-white/50">
                        Graphs & analytics coming soon 📊
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
