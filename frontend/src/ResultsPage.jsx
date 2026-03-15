import { useState, useEffect } from "react";
import MiniMapLeaflet from "./MiniMapLeaflet";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";

export default function ResultsPage({ budget, area, onBack }) {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const makeHistogram = (arr, bins = 10) => {
    if (!arr || arr.length === 0) return [];
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    if (min === max) {
      return [{ bin: min, count: arr.length }];
    }
    const step = (max - min) / bins;
    const counts = Array(bins).fill(0);
    arr.forEach((v) => {
      let idx = Math.floor((v - min) / step);
      if (idx >= bins) idx = bins - 1;
      counts[idx]++;
    });
    return counts.map((count, i) => ({ bin: min + step * i, count }));
  };

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const params = new URLSearchParams();
        if (budget) params.append('budget', budget);
        if (area) params.append('region', area);
        params.append('top_k', '10');

        // const response = await fetch(`/api/recommend?${params}`);
        const response = await fetch('https://properfier-7bq3nx5e2-netasilams-projects.vercel.app/api/recommend?' + params);
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
            Your budget - up to {budget || "—"}£
          </h1>

          {area && <p className="text-white/70 mb-8">Filtered by area: {area}</p>}

          <div className="space-y-6">
            {results.map((r, i) => {
              const isExpanded = expandedIndex === i;
              const isHidden = expandedIndex !== null && expandedIndex !== i;

              if (isHidden) return null;

              // coordinates now provided by the API
              const coords = { lat: r.lat ?? 54.7024, lng: r.lng ?? -3.2765 }; // fallback to UK centre if missing

              return (
                <div
                  key={r.id || i}
                  className={`bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-xl p-6 transition-all ${
                    isExpanded ? "min-h-[80vh]" : ""
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-semibold">{r.area} area</h2>

                      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-white/80">
                        <span>Avg Price:</span>
                        <span>{Math.round(r.avg_price).toLocaleString()}£</span>  
                        <span>Avg Revenue:</span>
                        <span>{Math.round(r.avg_revenue).toLocaleString()}£</span>                                              
                        <span>Predicted ROI:</span>
                        <span>{(r.predicted_ROI * 100).toFixed(2)}%</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <MiniMapLeaflet lat={coords.lat} lng={coords.lng} />

                      <a
                        href={`https://www.zoopla.co.uk/for-sale/property/${r.area.toLowerCase()}/`}
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="h-48">
                          {/** choose appropriate dataset and title */}
                          {(() => {
                            const data = r.price_dist;
                            const title = 'Price distribution within 80 km';
                            return (
                              <>
                                <div className="text-sm text-white/80 mb-1">{title}</div>
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={makeHistogram(data, 15)}>
                                    <XAxis
                                      type="number"
                                      dataKey="bin"
                                      domain={[
                                        (dataMin) => Math.min(dataMin, r.avg_price),
                                        (dataMax) => Math.max(dataMax, r.avg_price)
                                      ]}
                                      tickFormatter={(v) => `£${Math.round(v).toLocaleString()}`}
                                    />
                                    <YAxis
                                      domain={["auto", "auto"]}
                                      label={{ value: 'count', angle: -90, position: 'insideLeft' }}
                                    />
                                    <Tooltip
                                      formatter={(val) => [val, 'count']}
                                      labelFormatter={(label) => `£${Math.round(label).toLocaleString()}`}
                                    />
                                    {/** mark area mean with a vertical line */}
                                    <ReferenceLine
                                      x={r.avg_price}
                                      stroke="red"
                                      strokeWidth={2}
                                      strokeDasharray="6 6"
                                      ifOverflow="extendDomain"
                                      label={{ position: "top", value: "area avg", fill: "red", fontSize: 10 }}
                                    />
                                    <Line
                                      type="monotone"
                                      dataKey="count"
                                      stroke="#8884d8"
                                      strokeWidth={2}
                                      dot={false}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </>
                            );
                          })()}
                        </div>
                        <div className="h-48">
                          {(() => {
                            const data = r.roi_dist;
                            const title = `ROI distribution within 80 km`;
                            return (
                              <>
                                <div className="text-sm text-white/80 mb-1">{title}</div>
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={makeHistogram(data, 15)}>
                                    <XAxis
                                      type="number"
                                      dataKey="bin"
                                      domain={[
                                        (dataMin) => Math.min(dataMin, r.predicted_ROI),
                                        (dataMax) => Math.max(dataMax, r.predicted_ROI)
                                      ]}
                                      tickFormatter={(v) => `${(v*100).toFixed(0)}%`}
                                    />
                                    <YAxis
                                      domain={["auto", "auto"]}
                                      label={{ value: 'count', angle: -90, position: 'insideLeft' }}
                                    />
                                    <Tooltip
                                      formatter={(val) => [val, 'count']}
                                      labelFormatter={(label) => `${(label*100).toFixed(1)}%`}
                                    />
                                    <ReferenceLine
                                      x={r.predicted_ROI}
                                      stroke="red"
                                      strokeWidth={2}
                                      strokeDasharray="6 6"
                                      ifOverflow="extendDomain"
                                      label={{ position: "top", value: "area avg", fill: "red", fontSize: 10 }}
                                    />
                                    <Line
                                      type="monotone"
                                      dataKey="count"
                                      stroke="#82ca9d"
                                      strokeWidth={2}
                                      dot={false}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </>
                            );
                          })()}
                        </div>
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
