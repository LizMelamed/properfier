import { useState } from "react";
import ResultsPage from "./ResultsPage";
import "leaflet/dist/leaflet.css";

export default function App() {
  const [budget, setBudget] = useState("");
  const [area, setArea] = useState("");
  const [page, setPage] = useState("landing");
  const [showAbout, setShowAbout] = useState(false);

  if (page === "results") {
    return <ResultsPage budget={budget} area={area} onBack={() => setPage("landing")} />;
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden font-sans">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/london.avif')" }}
      />
      <div className="absolute inset-0 bg-[#0a1a33]/70" />

      {/* Header */}
      <header className="relative z-20 p-6">
        <div className="text-white text-4xl font-extrabold tracking-wide">
          <span className="text-yellow-400">Pro</span>perfier
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 min-h-[calc(100vh-80px)] flex items-center justify-center px-6">
        <div className="max-w-4xl w-full text-center">
          <h1 className="text-5xl font-bold text-white leading-tight mb-2">
            Find Your Next Profitable <br /> Property Investment.
          </h1>
          <p className="text-2xl text-yellow-400 mb-10">Real Data, Real Returns.</p>

          {/* Gold container */}
          <div className="bg-gradient-to-r from-yellow-300 via-yellow-200 to-yellow-300 p-6 rounded-2xl shadow-2xl">
            <div className="bg-white rounded-xl p-4 flex flex-col sm:flex-row gap-3">
              <input
                type="number"
                placeholder="Budget (in GBP, e.g., £70,000)"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Optional Area (e.g., London)"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={() => setPage("results")}
              className="w-full bg-blue-600 hover:bg-blue-700 transition text-white py-3 rounded-xl text-lg font-semibold"
            >
              FIND HIGH-ROI AREAS
            </button>
          </div>

          <p className="mt-6 text-white/80 text-sm flex items-center justify-center gap-2">
            <span>✓</span> Backed by verified data from Airbnb and real estate sources.
          </p>
        </div>
      </div>

      {/* About button */}
      <button
        onClick={() => setShowAbout(true)}
        className="fixed bottom-6 right-6 z-20 bg-white/90 hover:bg-white text-gray-900 px-5 py-2 rounded-full shadow-lg backdrop-blur-md transition"
      >
        About
      </button>

      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl p-8 max-w-xl w-full relative shadow-xl">
            <button
              onClick={() => setShowAbout(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold mb-4">About Properfier</h2>
            <p className="text-gray-700 text-sm leading-relaxed">
              Properfier is a data-driven property investment discovery tool combining
              rental demand, pricing data, and regional signals to identify high-ROI
              areas.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
