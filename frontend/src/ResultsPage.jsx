import { useState, useEffect } from "react";
import MiniMapLeaflet from "./MiniMapLeaflet";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ScatterChart,
  Scatter,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";

export default function ResultsPage({ budget, area, onBack }) {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [results, setResults] = useState([]);
  const [insightsByIndex, setInsightsByIndex] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [radiusKm, setRadiusKm] = useState(80);

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

  const makeScatterData = (prices = [], rois = []) => {
    const size = Math.min(prices.length, rois.length);
    return Array.from({ length: size }, (_, index) => ({
      price: Number(prices[index]),
      roi: Number(rois[index]),
    })).filter((point) => Number.isFinite(point.price) && Number.isFinite(point.roi));
  };

  const average = (values = []) => {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
  };

  const makeComparisonData = (record) => {
    const nearbyPrice = average(record.price_dist);
    const nearbyRoi = average(record.roi_dist);
    const nearbyRevenue = nearbyPrice * nearbyRoi;

    return [
      {
        metric: "Price (£k)",
        selected: Number(((record.avg_price || 0) / 1000).toFixed(1)),
        nearby: Number((nearbyPrice / 1000).toFixed(1)),
      },
      {
        metric: "Revenue (£k)",
        selected: Number(((record.avg_revenue || 0) / 1000).toFixed(1)),
        nearby: Number((nearbyRevenue / 1000).toFixed(1)),
      },
      {
        metric: "ROI (%)",
        selected: Number((((record.predicted_ROI || 0) * 100)).toFixed(1)),
        nearby: Number(((nearbyRoi * 100)).toFixed(1)),
      },
    ];
  };

  const generateInsight = async (index, record, force = false) => {
    const currentState = insightsByIndex[index];
    if (!record) return;
    if (currentState?.loading) return;
    if (!force && currentState?.text) return;

    setInsightsByIndex((prev) => ({
      ...prev,
      [index]: {
        loading: true,
        text: force ? prev[index]?.text || "" : "",
        source: null,
        error: null,
      },
    }));

    try {
      const response = await fetch("/api/insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          area: record.area,
          avg_price: record.avg_price,
          avg_revenue: record.avg_revenue,
          predicted_roi: record.predicted_ROI,
          budget,
          radius_km: radiusKm,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch area insights");
      }

      const data = await response.json();
      setInsightsByIndex((prev) => ({
        ...prev,
        [index]: { loading: false, text: data.insights, source: "llm", error: null },
      }));
    } catch (fetchError) {
      setInsightsByIndex((prev) => ({
        ...prev,
        [index]: {
          loading: false,
          text: "",
          source: null,
          error: fetchError.message || "Failed to generate area insight.",
        },
      }));
    }
  };

  useEffect(() => {
    const fetchResults = async () => {
      const initialLoad = results.length === 0;

      try {
        setError(null);
        if (initialLoad) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        const params = new URLSearchParams();
        if (budget) params.append('budget', budget);
        if (area) params.append('region', area);
        params.append('top_k', '10');
        params.append('radius_km', String(radiusKm));

        const response = await fetch('/api/recommend?' + params);
        if (!response.ok) {
          throw new Error('Failed to fetch recommendations');
        }
        const data = await response.json();
        setResults(data);
      } catch (err) {
        console.error('Full error:', err);
        setResults([]);
        setError(err.message || "Failed to fetch recommendations.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchResults();
  }, [budget, area, radiusKm]);

  useEffect(() => {
    if (expandedIndex === null) return;
    const record = results[expandedIndex];
    if (!record) return;
    generateInsight(expandedIndex, record, true);
  }, [expandedIndex, radiusKm, results]);

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
            Your budget - up to £{budget || "—"}
          </h1>

          {area && <p className="text-white/70 mb-8">Filtered by area: {area}</p>}

          {error && (
            <div className="mb-6 rounded-2xl border border-red-300/30 bg-red-200/10 px-4 py-3 text-red-100">
              <div className="font-semibold">Error loading recommendations</div>
              <div className="text-sm text-red-200">{error}</div>
            </div>
          )}
          
          {results.length === 0 ? (
            <div className="text-center text-white/70 mt-12">
              <p className="text-xl">No properties found for this budget.</p>
              <p className="text-sm mt-2">Try increasing your budget or removing the area filter.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {results.map((r, i) => {
                const isExpanded = expandedIndex === i;
                const isHidden = expandedIndex !== null && expandedIndex !== i;

                if (isHidden) return null;

                // coordinates now provided by the API
                const coords = { lat: r.lat ?? 54.7024, lng: r.lng ?? -3.2765 }; // fallback to UK centre if missing
                const scatterData = makeScatterData(r.price_dist, r.roi_dist);
                const comparisonData = makeComparisonData(r);
                const insightState = insightsByIndex[i] || {
                  loading: false,
                  text: "",
                  source: null,
                  error: null,
                };

                return (
                  <div
                    key={r.id || i}
                    className={`bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-xl p-6 transition-all ${
                      isExpanded ? "min-h-[80vh]" : ""
                    }`}
                  >
                    <div className="flex flex-col gap-5 md:flex-row md:justify-between md:items-start">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-semibold">{r.area} area</h2>

                        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-white/80">
                          <span>Avg Price:</span>
                          <span>£{Math.round(r.avg_price).toLocaleString()}</span>  
                          <span>Avg Revenue:</span>
                          <span>£{Math.round(r.avg_revenue).toLocaleString()}</span>                                              
                          <span>Predicted ROI:</span>
                          <span>{(r.predicted_ROI * 100).toFixed(2)}%</span>
                        </div>
                      </div>

                      <div className="flex w-full flex-col gap-3 md:w-[340px] md:items-end">
                        <MiniMapLeaflet
                          lat={coords.lat}
                          lng={coords.lng}
                          className="h-[260px] w-full overflow-hidden rounded-2xl md:h-[280px]"
                        />

                        <a
                          href={`https://www.zoopla.co.uk/for-sale/property/${r.area.toLowerCase()}/`}
                          target="_blank"
                          rel="noreferrer"
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
                        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">Mini Dashboard</h3>
                            <p className="text-sm text-white/60">
                              Compare nearby listings within a {radiusKm} km radius.
                            </p>
                          </div>
                          <div className="w-full md:w-72">
                            <div className="mb-2 flex items-center justify-between text-sm text-white/70">
                              <span>Radius</span>
                              <span>{radiusKm} km</span>
                            </div>
                            <input
                              type="range"
                              min="20"
                              max="200"
                              step="10"
                              value={radiusKm}
                              onChange={(event) => setRadiusKm(Number(event.target.value))}
                              className="w-full accent-yellow-400"
                            />
                          </div>
                        </div>
                        <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <h4 className="text-base font-semibold">AI Area Recommendation</h4>
                              <p className="text-sm text-white/60">
                                Practical Airbnb explanation for {r.area}.
                              </p>
                            </div>
                            <button
                              onClick={() => generateInsight(i, r, true)}
                              className="rounded-lg bg-yellow-400 px-3 py-2 text-sm font-medium text-[#1f2937] transition hover:bg-yellow-300"
                            >
                              Refresh insight
                            </button>
                          </div>

                          {insightState.loading && (
                            <p className="text-sm text-white/70">Generating recommendation...</p>
                          )}

                          {!insightState.loading && insightState.text && (
                            <div>
                              <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-white/90">
                                {insightState.text}
                              </pre>
                            </div>
                          )}

                          {!insightState.loading && insightState.error && (
                            <p className="text-sm text-red-200">{insightState.error}</p>
                          )}

                          {!insightState.loading && !insightState.text && !insightState.error && (
                            <p className="text-sm text-white/60">
                              Preparing an explanation of the area and Airbnb opportunity profile.
                            </p>
                          )}
                        </div>
                        {refreshing && (
                          <p className="mb-3 text-sm text-white/60">Updating graphs for {radiusKm} km...</p>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="h-48">
                            {/** choose appropriate dataset and title */}
                            {(() => {
                              const data = r.price_dist;
                              const title = `Price distribution within ${radiusKm} km`;
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
                              const title = `ROI distribution within ${radiusKm} km`;
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
                          <div className="h-52">
                            <div className="text-sm text-white/80 mb-1">
                              Nearby opportunities within {radiusKm} km
                            </div>
                            <ResponsiveContainer width="100%" height="100%">
                              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                                <CartesianGrid stroke="rgba(255,255,255,0.12)" />
                                <XAxis
                                  type="number"
                                  dataKey="price"
                                  tickFormatter={(value) => `£${Math.round(value / 1000)}k`}
                                  stroke="rgba(255,255,255,0.65)"
                                />
                                <YAxis
                                  type="number"
                                  dataKey="roi"
                                  tickFormatter={(value) => `${(value * 100).toFixed(1)}%`}
                                  stroke="rgba(255,255,255,0.65)"
                                />
                                <Tooltip
                                  formatter={(value, name) => {
                                    if (name === "roi") {
                                      return [`${(Number(value) * 100).toFixed(2)}%`, "ROI"];
                                    }
                                    return [`£${Math.round(Number(value)).toLocaleString()}`, "Price"];
                                  }}
                                />
                                <Scatter data={scatterData} fill="#6ee7b7" />
                                <Scatter
                                  data={[{ price: r.avg_price, roi: r.predicted_ROI }]}
                                  fill="#facc15"
                                />
                              </ScatterChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="h-52">
                            <div className="text-sm text-white/80 mb-1">
                              Selected area vs nearby average
                            </div>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={comparisonData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="metric" stroke="rgba(255,255,255,0.65)" />
                                <YAxis stroke="rgba(255,255,255,0.65)" />
                                <Tooltip />
                                <Bar dataKey="selected" radius={[4, 4, 0, 0]}>
                                  {comparisonData.map((entry) => (
                                    <Cell key={`selected-${entry.metric}`} fill="#facc15" />
                                  ))}
                                </Bar>
                                <Bar dataKey="nearby" radius={[4, 4, 0, 0]}>
                                  {comparisonData.map((entry) => (
                                    <Cell key={`nearby-${entry.metric}`} fill="#60a5fa" />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}          
        </div>
      </div>
    </div>
  );
}
