import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Navigation() {
  const [showNavDropdown, setShowNavDropdown] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navigationLinks = [
    { path: '/', label: 'Home', icon: 'ri-home-line' },
    { path: '/search', label: 'Search Recipes', icon: 'ri-search-line' },
    { path: '/search-products', label: 'Search Products', icon: 'ri-search-line' },
    { path: '/my-recipes', label: 'My Recipes', icon: 'ri-book-line' },
    { path: '/recipe-swiper', label: 'Recipe Swiper', icon: 'ri-heart-line' },
    { path: '/shopping-list', label: 'Shopping List', icon: 'ri-shopping-cart-line' },
    { path: '/profile', label: 'Profile', icon: 'ri-user-line' },
    { path: '/admin', label: 'Admin Panel', icon: 'ri-admin-line' },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    setShowNavDropdown(false);
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <img
            src="https://public.readdy.ai/ai/img_res/b0724f47-0896-45dd-92da-e15712b65265.png"
            alt="Recipe Recommender Logo"
            className="h-12 w-auto cursor-pointer"
            onClick={() => handleNavigate('/')}
          />

          <div className="flex items-center gap-3">
            {/* Shopping Cart Button */}
            <button
              onClick={() => handleNavigate('/shopping-list')}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
              title="Shopping List"
            >
              <i className="ri-shopping-cart-line text-xl text-gray-700"></i>
            </button>

            {/* Recipe Swiper Button */}
            <button
              onClick={() => handleNavigate('/recipe-swiper')}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
              title="Recipe Swiper"
            >
              <i className="ri-heart-line text-xl text-gray-700"></i>
            </button>

            {/* Profile Button */}
            <button
              onClick={() => handleNavigate('/profile')}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
              title="Profile"
            >
              <i className="ri-user-line text-xl text-gray-700"></i>
            </button>

            {/* Navigation Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNavDropdown(!showNavDropdown)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-[#2F855A] hover:bg-[#276749] transition-colors cursor-pointer"
                title="Navigation Menu"
              >
                <i
                  className={`${
                    showNavDropdown ? 'ri-close-line' : 'ri-menu-line'
                  } text-xl text-white`}
                ></i>
              </button>

              {/* Dropdown Menu */}
              {showNavDropdown && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNavDropdown(false)}
                  ></div>

                  {/* Menu */}
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                    {navigationLinks.map((link, index) => {
                      const isActive = location.pathname === link.path;
                      return (
                        <button
                          key={link.path}
                          onClick={() => handleNavigate(link.path)}
                          className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer text-left ${
                            index !== navigationLinks.length - 1
                              ? 'border-b border-gray-100'
                              : ''
                          } ${isActive ? 'bg-emerald-50' : ''}`}
                        >
                          <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${
                            isActive ? 'bg-[#2F855A]' : 'bg-[#2F855A]/10'
                          }`}>
                            <i className={`${link.icon} ${
                              isActive ? 'text-white' : 'text-[#2F855A]'
                            }`}></i>
                          </div>
                          <span className={`text-sm font-medium ${
                            isActive ? 'text-[#2F855A]' : 'text-gray-700'
                          }`}>{link.label}</span>
                          {isActive && (
                            <i className="ri-check-line text-[#2F855A] ml-auto"></i>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
