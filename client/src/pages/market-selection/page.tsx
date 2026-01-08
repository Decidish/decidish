import { useState } from 'react';

interface Market {
  id: number;
  name: string;
  address: string;
  distance: string;
  hours: string;
  rating: number;
  image: string;
}

export default function MarketSelection() {
  const [postalCode, setPostalCode] = useState('');
  const [showMarkets, setShowMarkets] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);

  const markets: Market[] = [
    {
      id: 1,
      name: 'Fresh Valley Market',
      address: '123 Main Street, Downtown',
      distance: '0.8 miles',
      hours: '7:00 AM - 10:00 PM',
      rating: 4.8,
      image: 'https://readdy.ai/api/search-image?query=modern%20bright%20grocery%20store%20interior%20with%20fresh%20produce%20section%20featuring%20colorful%20fruits%20and%20vegetables%20neatly%20arranged%20on%20wooden%20displays%20under%20warm%20lighting%20creating%20an%20inviting%20shopping%20atmosphere&width=400&height=300&seq=market1&orientation=landscape'
    },
    {
      id: 2,
      name: 'Green Harvest Grocery',
      address: '456 Oak Avenue, Midtown',
      distance: '1.2 miles',
      hours: '6:00 AM - 11:00 PM',
      rating: 4.6,
      image: 'https://readdy.ai/api/search-image?query=clean%20contemporary%20supermarket%20with%20organic%20produce%20section%20showing%20fresh%20vegetables%20and%20fruits%20displayed%20on%20rustic%20wooden%20shelves%20with%20natural%20lighting%20and%20minimalist%20design%20elements&width=400&height=300&seq=market2&orientation=landscape'
    },
    {
      id: 3,
      name: 'Organic Oasis',
      address: '789 Pine Road, Westside',
      distance: '1.5 miles',
      hours: '8:00 AM - 9:00 PM',
      rating: 4.9,
      image: 'https://readdy.ai/api/search-image?query=upscale%20organic%20grocery%20store%20interior%20with%20premium%20fresh%20produce%20displayed%20on%20elegant%20wooden%20counters%20surrounded%20by%20plants%20and%20natural%20materials%20creating%20a%20sophisticated%20shopping%20environment&width=400&height=300&seq=market3&orientation=landscape'
    },
    {
      id: 4,
      name: 'City Fresh Foods',
      address: '321 Elm Street, Eastside',
      distance: '2.1 miles',
      hours: '7:00 AM - 10:00 PM',
      rating: 4.5,
      image: 'https://readdy.ai/api/search-image?query=spacious%20modern%20grocery%20store%20with%20wide%20aisles%20and%20fresh%20produce%20section%20featuring%20colorful%20fruits%20and%20vegetables%20on%20clean%20white%20displays%20with%20bright%20overhead%20lighting&width=400&height=300&seq=market4&orientation=landscape'
    },
    {
      id: 5,
      name: 'Farmers Choice Market',
      address: '654 Maple Drive, Northside',
      distance: '2.4 miles',
      hours: '6:30 AM - 9:30 PM',
      rating: 4.7,
      image: 'https://readdy.ai/api/search-image?query=rustic%20farmers%20market%20style%20grocery%20store%20interior%20with%20fresh%20organic%20produce%20displayed%20in%20wooden%20crates%20and%20baskets%20creating%20a%20warm%20authentic%20shopping%20atmosphere&width=400&height=300&seq=market5&orientation=landscape'
    },
    {
      id: 6,
      name: 'Neighborhood Grocers',
      address: '987 Cedar Lane, Southside',
      distance: '2.8 miles',
      hours: '7:00 AM - 11:00 PM',
      rating: 4.4,
      image: 'https://readdy.ai/api/search-image?query=friendly%20neighborhood%20grocery%20store%20with%20fresh%20produce%20section%20showing%20vibrant%20fruits%20and%20vegetables%20arranged%20on%20traditional%20wooden%20displays%20with%20cozy%20warm%20lighting&width=400&height=300&seq=market6&orientation=landscape'
    }
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (postalCode.trim()) {
      setShowMarkets(true);
    }
  };

  const handleSelectMarket = (market: Market) => {
    setSelectedMarket(market);
  };

  const handleContinue = () => {
    if (selectedMarket) {
      window.REACT_APP_NAVIGATE('/recipe-swiper');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
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
                placeholder="Enter postal code"
                required
              />
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-colors shadow-md hover:shadow-lg cursor-pointer whitespace-nowrap"
              >
                Search
              </button>
            </div>
          </form>

          {showMarkets && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Available Markets Near You</h2>
                <span className="text-sm text-gray-600">{markets.length} stores found</span>
              </div>

              <div className="max-h-[500px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                {markets.map((market) => (
                  <div
                    key={market.id}
                    onClick={() => handleSelectMarket(market)}
                    className={`flex gap-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      selectedMarket?.id === market.id
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300 bg-white'
                    }`}
                  >
                    <div className="w-32 h-24 flex-shrink-0">
                      <img
                        src={market.image}
                        alt={market.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="text-base font-semibold text-gray-900">{market.name}</h3>
                        <div className="flex items-center gap-1 ml-2">
                          <i className="ri-star-fill text-yellow-500 text-sm"></i>
                          <span className="text-sm font-medium text-gray-700">{market.rating}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{market.address}</p>
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
                    </div>
                    {selectedMarket?.id === market.id && (
                      <div className="flex items-center justify-center w-6 h-6 flex-shrink-0">
                        <i className="ri-check-line text-indigo-600 text-xl"></i>
                      </div>
                    )}
                  </div>
                ))}
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
      `}</style>
    </div>
  );
}
