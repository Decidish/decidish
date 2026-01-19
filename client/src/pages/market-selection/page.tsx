import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { marketApi } from '@/api/market-selection/marketApi';
import { Market } from '@/types/market';
import * as React from "react";

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Component to handle map view changes
function MapViewController({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, 13);
  return null;
}

export default function MarketSelection() {
  const [postalCode, setPostalCode] = useState('');
  const [showMarkets, setShowMarkets] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.0060]); // Default: New York

  // State for API data
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postalCode.trim()) return;

    setIsLoading(true);
    setError(null);
    setShowMarkets(false);

    try {
      // Call the backend API
      const results = await marketApi.searchMarkets(postalCode);
      if (results.length === 0) {
          setError("No markets found in this area. Try a different postal code.");
      }
      setMarkets(results);
      setShowMarkets(true);
      // Center map on first market
      if (markets.length > 0) {
        setMapCenter([markets[0].address.latitude, markets[0].address.longitude]);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch markets. Is the backend running?");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectMarket = (market: Market) => {
    setSelectedMarket(market);
    setMapCenter([market.address.latitude, market.address.longitude]);
  };

  const handleContinue = () => {
    if (selectedMarket) {
      // Save the REWE ID for the next step (Recipe Generation)
      localStorage.setItem('selectedMarketId', selectedMarket.id.toString());
      window.REACT_APP_NAVIGATE('/recipe-swiper');
    }
  };

  // Create custom icon for selected marker
  const selectedIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const defaultIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <img
                src="https://public.readdy.ai/ai/img_res/b0724f47-0896-45dd-92da-e15712b65265.png"
                alt="Recipe Recommender Logo"
                className="h-16 w-auto mx-auto mb-6"
            />
            <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">Select Your Local Market</h1>
            <p className="text-sm text-gray-600 text-center">Find the nearest store to shop for your ingredients</p>
          </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <form onSubmit={handleSearch} className="mb-6">
            <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-2">
              Enter Your Postal Code
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                id="postalCode"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="flex-1 px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="Enter postal code (e.g. 80331)"
                required
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-colors shadow-md hover:shadow-lg cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </form>

            {showMarkets && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Available Markets Near You</h2>
                    <span className="text-sm text-gray-600">{markets.length} stores found</span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Map Section */}
                    <div className="order-2 lg:order-1">
                      <div className="w-full h-[500px] rounded-lg overflow-hidden border-2 border-gray-200 shadow-md">
                        <MapContainer
                            center={mapCenter}
                            zoom={13}
                            style={{ height: '100%', width: '100%' }}
                            scrollWheelZoom={true}
                        >
                          <MapViewController center={mapCenter} />
                          <TileLayer
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                          {markets.map((market) => (
                              market.address.latitude &&
                              <Marker
                                  key={market.id}
                                  position={[market.address.latitude, market.address.longitude]}
                                  icon={selectedMarket?.id === market.id ? selectedIcon : defaultIcon}
                                  eventHandlers={{
                                    click: () => handleSelectMarket(market)
                                  }}
                              >
                                <Popup>
                                  <div className="p-2">
                                    <h3 className="font-semibold text-gray-900 mb-1">{market.name}</h3>
                                    <p className="text-xs text-gray-600 mb-1">{`${market.address.street}, ${market.address.zipCode}  ${market.address.city}`}</p>
                                    <div className="flex items-center gap-1 mb-1">
                                      <i className="ri-star-fill text-yellow-500 text-xs"></i>
                                      <span className="text-xs font-medium text-gray-700">{market.rating}</span>
                                    </div>
                                    {/*<p className="text-xs text-gray-500">{market.hours}</p>*/}
                                  </div>
                                </Popup>
                              </Marker>
                          ))}
                        </MapContainer>
                      </div>
                    </div>

                    {/* Markets List Section */}
                    <div className="order-1 lg:order-2">
                      <div className="max-h-[500px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                        {markets.map((market) => (
                            <div
                                key={market.id}
                                onClick={() => handleSelectMarket(market)}
                                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                                    selectedMarket?.id === market.id
                                        ? 'border-indigo-600 bg-indigo-50'
                                        : 'border-gray-200 hover:border-indigo-300 bg-white'
                                }`}
                            >
                              <div className="flex items-start justify-between mb-1">
                                <h3 className="text-base font-semibold text-gray-900">{market.name}</h3>
                                <div className="flex items-center gap-1 ml-2">
                                  <i className="ri-star-fill text-yellow-500 text-sm"></i>
                                  <span className="text-sm font-medium text-gray-700">{market.rating}</span>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{`${market.address.street}, ${market.address.zipCode}  ${market.address.city}`}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <i className="ri-map-pin-line"></i>
                                  <span>{market.distance}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <i className="ri-time-line"></i>
                                  <span>{market.hours}</span>
                                </div>
                              </div>
                              {selectedMarket?.id === market.id && (
                                  <div className="mt-3 pt-3 border-t border-indigo-200 flex items-center gap-2 text-indigo-600">
                                    <i className="ri-check-line text-lg"></i>
                                    <span className="text-sm font-medium">Selected</span>
                                  </div>
                              )}
                            </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
            )}
          </div>

          {selectedMarket && (
              <div className="flex justify-end">
                <button
                    onClick={handleContinue}
                    className="px-8 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 transition-colors shadow-md hover:shadow-lg cursor-pointer whitespace-nowrap"
                >
                  Continue to Recipes
                </button>
              </div>
          )}
        </div>

        <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #6366f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4f46e5;
        }
        .leaflet-container {
          font-family: inherit;
        }
      `}</style>
      </div>
  );
}
