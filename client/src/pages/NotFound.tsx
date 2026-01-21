import { useLocation, Link } from "react-router-dom";

export default function NotFound() {
    const location = useLocation();

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center px-4 py-12">
            <div className="max-w-2xl w-full text-center">
                {/* Animated 404 Illustration */}
                <div className="relative mb-8">
                    <div className="inline-block relative">
                        <h1 className="text-[180px] md:text-[220px] font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-500 leading-none select-none">
                            404
                        </h1>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 flex items-center justify-center">
                            <i className="ri-emotion-sad-line text-7xl text-teal-600 opacity-70"></i>
                        </div>
                    </div>
                </div>

                {/* Main Message */}
                <div className="mb-8">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                        Oops! Recipe Not Found
                    </h2>
                    <p className="text-lg text-gray-600 mb-2">
                        The page you're looking for seems to have gone off the menu.
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm font-mono text-gray-500 mb-6">
                        <i className="ri-links-line"></i>
                        <span>{location.pathname}</span>
                    </div>
                </div>

                {/* Suggestions */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-8">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center justify-center gap-2">
                        <i className="ri-lightbulb-line text-teal-600"></i>
                        <span>Here's what you can do:</span>
                    </h3>
                    <div className="grid gap-4 text-left">
                        <div className="flex items-start gap-3 p-4 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors">
                            <div className="w-8 h-8 flex items-center justify-center bg-teal-500 text-white rounded-lg flex-shrink-0 mt-0.5">
                                <i className="ri-search-line"></i>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-800 mb-1">Search for Recipes</h4>
                                <p className="text-sm text-gray-600">Try our search page to find your favorite recipes</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors">
                            <div className="w-8 h-8 flex items-center justify-center bg-emerald-500 text-white rounded-lg flex-shrink-0 mt-0.5">
                                <i className="ri-home-smile-line"></i>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-800 mb-1">Go Back Home</h4>
                                <p className="text-sm text-gray-600">Start fresh from our homepage</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors">
                            <div className="w-8 h-8 flex items-center justify-center bg-amber-500 text-white rounded-lg flex-shrink-0 mt-0.5">
                                <i className="ri-arrow-go-back-line"></i>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-800 mb-1">Use Browser Back</h4>
                                <p className="text-sm text-gray-600">Return to the previous page</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        to="/"
                        className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-teal-600 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl whitespace-nowrap flex items-center justify-center gap-2"
                    >
                        <i className="ri-home-4-line text-lg"></i>
                        <span>Back to Home</span>
                    </Link>

                    <Link
                        to="/search"
                        className="w-full sm:w-auto px-8 py-3.5 bg-white text-teal-600 font-semibold rounded-xl hover:bg-gray-50 transition-all border-2 border-teal-500 whitespace-nowrap flex items-center justify-center gap-2"
                    >
                        <i className="ri-search-line text-lg"></i>
                        <span>Search Recipes</span>
                    </Link>
                </div>

                {/* Help Text */}
                <p className="mt-8 text-sm text-gray-500">
                    Need help? Contact our support team or check out our{" "}
                    <Link to="/admin" className="text-teal-600 hover:text-teal-700 font-medium underline">
                        admin panel
                    </Link>
                </p>
            </div>
        </div>
    );
}