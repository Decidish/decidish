import { useState,useEffect } from 'react';
import { productApi, Product } from '@/api/search-product/productApi';
import { userApi } from '@/api/search-product/userApi';

// --- Mock Data ---

export default function SearchProducts() {
  // --- State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); 
  const [priceSort, setPriceSort] = useState('none');
  
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const ITEMS_PER_PAGE = 8;

  // Modals & Cart
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);
  const [showCart, setShowCart] = useState(false);
  
  const [marketId, setMarketId] = useState<number | null>(null);
  const [isMarketLoading, setIsMarketLoading] = useState(true);

  const filterOptions = [
    { value: 'all', label: 'All Products' },
    { value: 'is_organic', label: 'Organic (Bio)' },
    { value: 'is_vegan', label: 'Vegan' },
    { value: 'is_gluten_free', label: 'Gluten Free' },
    { value: 'is_regional', label: 'Regional' },
    { value: 'is_new', label: 'New Arrivals' },
    { value: 'is_lowest_price', label: 'Sale Items' },
  ];

  const formatPrice = (cents: number) => (cents / 100).toFixed(2);
  
  // useEffect(() => {
  //   const fetchMarket = async () => {
  //     const fetchedId = await userApi.getUserMarketId();
      
  //     if (fetchedId) {
  //       setMarketId(fetchedId);
  //     } else {
  //       setError("Please select a market in your profile settings.");
  //       setLoading(false);
  //     }
  //   };

  //   fetchMarket();
  // }, []); // Empty dependency array = runs once on page load

  useEffect(() => {
  const fetchMarket = async () => {
    try {
      const id = await userApi.getUserMarketId();
      if (id) setMarketId(id);
      
      // if (id) handleSearch(1); 
    } catch (err) {
      console.error("Failed to fetch market preference");
    } finally {
      setIsMarketLoading(false);
    }
  };
  fetchMarket();
}, []);

  useEffect(() => {
    if (!marketId) return; // Wait until we have the ID
    setCurrentPage(1);
    handleSearch(1);
  }, [marketId]);

  const handleSearch = async (page: number = 1) => {
    if (!marketId) {
      console.warn("Cannot search: No market selected.");
      return;
    }
    setIsSearching(true);
    setHasSearched(true);
    setCurrentPage(page);
    
    try {
      // Call the API
      // The API file handles the conversion of page 1 -> 0
      const data = await productApi.searchProducts({
        query: searchQuery,
        filter: filterType,
        sort: priceSort,
        page: page,
        marketId: marketId
      });

      // Update Data States
      setSearchResults(data.content);
      setTotalPages(data.totalPages);
      setTotalResults(data.totalElements);

    } catch (error) {
      // TODO Handle UI feedback for error
      // e.g., toast.error("Could not fetch products");
      console.error("Failed to load products"); 
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch(1);
  };

  const addToCart = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setSuccessMessage('Added to cart successfully');
    setShowSuccessToast(true);
    if(showProductModal) setShowProductModal(false);
    setTimeout(() => setShowSuccessToast(false), 2500);
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };
  
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) handleSearch(page);
  };

  const openProductDetails = (product: Product) => {
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    for (let i = 1; i <= totalPages; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handleSearch(i)}
          className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all font-medium cursor-pointer ${
            currentPage === i
              ? 'bg-[#2F855A] text-white shadow-md'
              : 'bg-white border border-gray-200 text-gray-700 hover:border-[#2F855A] hover:text-[#2F855A]'
          }`}
        >
          {i}
        </button>
      );
    }
    return buttons;
  };
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      
      {/* Floating Cart Trigger */}
      <button 
        onClick={() => setShowCart(true)}
        className="fixed bottom-8 right-8 z-40 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white w-16 h-16 rounded-full shadow-2xl hover:scale-105 transition-transform flex items-center justify-center cursor-pointer border-4 border-emerald-50"
      >
        <div className="relative">
          <i className="ri-shopping-cart-2-line text-2xl"></i>
          {cart.length > 0 && (
            <span className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              {cart.reduce((a, b) => a + b.quantity, 0)}
            </span>
          )}
        </div>
      </button>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 relative">
        {/* Search Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Search Products
          </h1>
          <p className="text-lg text-gray-600">
            Browse current inventory and find the best prices
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex gap-3 mb-6">
            <div className="flex-1 relative">
              <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-400"></i>
              <input
                type="text"
                disabled={isMarketLoading}
                placeholder={isMarketLoading ? "Loading market..." : "Search by recipe name, ingredient, or cuisine..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#2F855A] focus:outline-none text-base transition-colors"
              />
            </div>
            <button
              onClick={() => handleSearch(1)}
              disabled={isSearching}
              className="px-8 py-3 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
            >
              {isSearching ? (
                <i className="ri-loader-4-line text-xl animate-spin"></i>
              ) : (
                'Search'
              )}
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category & Dietary
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#2F855A] focus:outline-none text-sm cursor-pointer"
              >
                {filterOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price Sorting
              </label>
              <select
                value={priceSort}
                onChange={(e) => setPriceSort(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#2F855A] focus:outline-none text-sm cursor-pointer"
              >
                <option value="none">Featured</option>
                <option value="low-high">Price: Low to High</option>
                <option value="high-low">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Info */}
        {hasSearched && (
          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-sm font-semibold text-gray-700">
              {totalResults} Results
            </span>
          </div>
        )}

        {/* Grid */}
        {hasSearched && searchResults.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            {searchResults.map((product) => (
              <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all group flex flex-col">
                
                {/* Image & Badges */}
                <div 
                  className="relative aspect-square bg-gray-50 cursor-pointer overflow-hidden"
                  onClick={() => openProductDetails(product)}
                >
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <i className="ri-image-line text-4xl"></i>
                    </div>
                  )}
                  
                  {/* Boolean Flag Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {product.attributes?.isNew && <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">NEW</span>}
                    {product.attributes?.isLowestPrice && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">SALE</span>}
                    {product.attributes?.isOrganic && <span className="bg-[#2F855A] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1"><i className="ri-leaf-line"></i> BIO</span>}
                    {product.attributes?.isAgeRestricted && <span className="bg-gray-800 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">18+</span>}
                  </div>

                  {/* Quick View Overlay (Mobile hidden, Desktop hover) */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-white text-gray-900 px-4 py-2 rounded-full text-sm font-semibold shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform">
                      View Details
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 flex-1 flex flex-col">
                  <h3 
                    className="font-semibold text-gray-900 text-sm md:text-base leading-tight mb-3 cursor-pointer hover:text-[#2F855A] line-clamp-2"
                    onClick={() => openProductDetails(product)}
                  >
                    {product.name}
                  </h3>
                  <div className="text-xs text-gray-500 mb-1 line-clamp-1">{product.grammage}</div>

                  {/* Attributes Icons Row */}
                  <div className="flex items-center gap-2 mb-3 text-gray-400 text-xs">
                     {product.attributes?.isVegan && <span title="Vegan" className="hover:text-green-600"><i className="ri-plant-line"></i> Vegan</span>}
                     {product.attributes?.isGlutenFree && <span title="Gluten Free" className="hover:text-amber-600"><i className="ri-wheat-line"></i> Gluten Free</span>}
                     {product.attributes?.isRegional && <span title="Regional" className="hover:text-blue-600"><i className="ri-map-pin-line"></i> Regional</span>}
                  </div>

                  <div className="mt-auto flex items-end justify-between">
                    <span className="text-lg font-bold text-gray-900">{formatPrice(product.price)}€</span>
                    <button 
                      onClick={() => addToCart(product)}
                      className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-[#2F855A] hover:text-white text-gray-600 flex items-center justify-center transition-colors"
                    >
                      <i className="ri-add-line text-lg"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {hasSearched && totalPages > 1 && (
          <div className="flex justify-center gap-2 mb-10">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
            >
              <i className="ri-arrow-left-s-line"></i>
            </button>
            {renderPaginationButtons()}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
            >
              <i className="ri-arrow-right-s-line"></i>
            </button>
          </div>
        )}
      </div>

      {/* --- Details Modal --- */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
            <div className="md:w-5/12 bg-gray-100 relative min-h-[250px]">
              <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <div className="md:w-7/12 p-6 overflow-y-auto">
              <div className="flex justify-end items-start mb-4">
                <button onClick={() => setShowProductModal(false)} className="text-gray-400 hover:text-gray-600">
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedProduct.name}</h2>
              <div className="text-gray-500 text-sm mb-4">{selectedProduct.grammage}</div>

              <div className="flex flex-wrap gap-2 mb-6">
                 {selectedProduct.attributes?.isOrganic && <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-md font-medium">Organic</span>}
                 {selectedProduct.attributes?.isVegan && <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-md font-medium">Vegan</span>}
                 {selectedProduct.attributes?.isGlutenFree && <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-md font-medium">Gluten Free</span>}
                 {selectedProduct.attributes?.isDairyFree && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md font-medium">Lactose Free</span>}
                 {selectedProduct.attributes?.isRegional && <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-md font-medium">Regional</span>}
                 {selectedProduct.attributes?.isBulkyGood && <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">Bulky Item</span>}
              </div>
              
             <div className="flex flex-col pt-4 border-t border-gray-100">
              <div className="text-4xl font-bold text-[#2F855A] mb-3">
                {formatPrice(selectedProduct.price)}€
              </div>
              <button
                onClick={() => addToCart(selectedProduct)}
                className="w-full py-3 bg-[#2F855A] hover:bg-[#276749] text-white rounded-lg font-semibold transition-colors shadow-lg shadow-emerald-100"
              >
                Add to List
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowCart(false)}></div>
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Current List ({cart.length})</h2>
              <button onClick={() => setShowCart(false)}><i className="ri-close-line text-xl"></i></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map((item, idx) => (
                <div key={idx} className="flex gap-3 items-center text-sm">
                   <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center font-bold text-gray-500">{item.quantity}x</div>
                   <div className="flex-1 font-medium">{item.product.name}</div>
                   <div className="text-gray-500">{formatPrice(item.product.price * item.quantity)}€</div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50">
               <div className="flex justify-between font-bold text-lg">
                 <span>Total</span>
                 <span>{formatPrice(cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0))}€</span>
               </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] animate-slide-down">
           <div className="bg-white rounded-2xl shadow-2xl p-4 flex items-center gap-3 border border-emerald-100">
             <div className="w-10 h-10 bg-[#2F855A] rounded-full flex items-center justify-center text-white shadow-md">
               <i className="ri-check-line text-xl"></i>
             </div>
             <div>
               <p className="font-bold text-gray-900 text-sm">Success!</p>
               <p className="text-xs text-gray-500">{successMessage}</p>
             </div>
           </div>
        </div>
      )}

    </div>
  );
}