
import { useEffect, useState } from 'react';

interface FoodItem {
  id: number;
  icon: string;
  x: number;
  y: number;
  rotation: number;
  duration: number;
  delay: number;
}

export default function Landing() {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);

  const foodIcons = [
    '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍒', '🍑',
    '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🥕', '🌽', '🥦', '🥬',
    '🥒', '🫑', '🧄', '🧅', '🥔', '🍠', '🥐', '🥖', '🥨', '🧀',
    '🥚', '🍗', '🥩', '🍤', '🐟', '🥓', '🌮', '🌯', '🥗', '🍝'
  ];

  useEffect(() => {
    const items: FoodItem[] = [];
    for (let i = 0; i < 20; i++) {
      items.push({
        id: i,
        icon: foodIcons[Math.floor(Math.random() * foodIcons.length)],
        x: Math.random() * 100,
        y: 100,
        rotation: Math.random() * 360,
        duration: 3 + Math.random() * 2,
        delay: Math.random() * 5
      });
    }
    setFoodItems(items);
  }, []);

  const handleGetStarted = () => {
    window.REACT_APP_NAVIGATE('/auth');
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      {/* Animated Food Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {foodItems.map((item) => (
          <div
            key={item.id}
            className="absolute text-4xl animate-food-fall opacity-70"
            style={{
              left: `${item.x}%`,
              animationDuration: `${item.duration}s`,
              animationDelay: `${item.delay}s`,
              transform: `rotate(${item.rotation}deg)`
            }}
          >
            {item.icon}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Hero Section */}
        <div className="flex-1 flex items-center justify-center px-6 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8 inline-block">
              <span className="px-4 py-2 bg-[#2F855A]/10 text-[#2F855A] rounded-full text-sm font-medium border border-[#2F855A]/20">
                AI-Powered Recipe Discovery
              </span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Your Personal
              <span className="block bg-gradient-to-r from-[#2F855A] via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Recipe Companion
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-700 mb-12 max-w-2xl mx-auto leading-relaxed">
              Discover personalized recipes tailored to your taste, dietary needs, and budget. Shop smart with automated ingredient lists from your local markets.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={handleGetStarted}
                className="px-8 py-4 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer whitespace-nowrap text-lg"
              >
                Get Started Free
              </button>
              <button
                className="px-8 py-4 bg-white text-[#2F855A] rounded-xl font-semibold hover:bg-gray-50 transition-all border-2 border-[#2F855A]/20 cursor-pointer whitespace-nowrap text-lg"
              >
                Watch Demo
              </button>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-[#2F855A]/10 hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-[#2F855A]/10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <i className="ri-restaurant-line text-2xl text-[#2F855A]"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Matching</h3>
                <p className="text-sm text-gray-600">Swipe through recipes that match your preferences and dietary requirements</p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-[#2F855A]/10 hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <i className="ri-shopping-cart-line text-2xl text-emerald-600"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Auto Shopping Lists</h3>
                <p className="text-sm text-gray-600">Generate ingredient lists instantly from your local markets</p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-[#2F855A]/10 hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <i className="ri-heart-line text-2xl text-teal-600"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Save Favorites</h3>
                <p className="text-sm text-gray-600">Build your personal recipe collection and track your cooking journey</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-6 text-center">
          <p className="text-sm text-gray-600">
            © 2024 Recipe Recommender. All rights reserved.
          </p>
        </footer>
      </div>

      <style>{`
        @keyframes foodFall {
          0% {
            transform: translateY(-100px) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.7;
          }
          90% {
            opacity: 0.7;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-food-fall {
          animation: foodFall infinite ease-in;
        }
      `}</style>
    </div>
  );
}
