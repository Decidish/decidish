
import { useState } from 'react';

interface RecipeImport {
  id: string;
  name: string;
  source: 'url' | 'file' | 'rewe';
  status: 'pending' | 'processing' | 'success' | 'error';
  timestamp: string;
  error?: string;
  progress?: number;
}

interface ReweJob {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  recipesImported: number;
  totalRecipes: number;
  progress: number;
  error?: string;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'url' | 'rewe'>('url');
  const [recipeUrl, setRecipeUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importHistory, setImportHistory] = useState<RecipeImport[]>([
    {
      id: '1',
      name: 'Mediterranean Grilled Chicken',
      source: 'url',
      status: 'success',
      timestamp: '2024-01-20 14:30:00'
    },
    {
      id: '2',
      name: 'Creamy Mushroom Pasta',
      source: 'file',
      status: 'success',
      timestamp: '2024-01-20 13:15:00'
    },
    {
      id: '3',
      name: 'Asian Salmon Bowl',
      source: 'url',
      status: 'success',
      timestamp: '2024-01-19 16:45:00'
    }
  ]);
  const [reweJobs, setReweJobs] = useState<ReweJob[]>([
    {
      id: '1',
      status: 'completed',
      startTime: '2024-01-20 10:00:00',
      endTime: '2024-01-20 10:02:15',
      recipesImported: 45,
      totalRecipes: 45,
      progress: 100
    },
    {
      id: '2',
      status: 'completed',
      startTime: '2024-01-19 15:30:00',
      endTime: '2024-01-19 15:32:30',
      recipesImported: 38,
      totalRecipes: 38,
      progress: 100
    }
  ]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleUrlImport = async () => {
    if (!recipeUrl.trim()) {
      alert('Please enter a recipe URL');
      return;
    }

    setIsImporting(true);

    // Simulate API call to your backend
    setTimeout(() => {
      const newImport: RecipeImport = {
        id: Date.now().toString(),
        name: 'Imported Recipe from URL',
        source: 'url',
        status: 'success',
        timestamp: new Date().toISOString()
      };

      setImportHistory([newImport, ...importHistory]);
      setRecipeUrl('');
      setIsImporting(false);
      
      setSuccessMessage('Recipe imported successfully from URL! 🎉');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    }, 2000);
  };

  const handleReweImport = async () => {
    const newJob: ReweJob = {
      id: Date.now().toString(),
      status: 'queued',
      startTime: new Date().toISOString(),
      recipesImported: 0,
      totalRecipes: 50,
      progress: 0
    };

    setReweJobs([newJob, ...reweJobs]);
    
    setSuccessMessage('Rewe import job started! This will take about 2 minutes. ⏳');
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);

    // Simulate async job progress
    setTimeout(() => {
      setReweJobs(prev => prev.map(job => 
        job.id === newJob.id 
          ? { ...job, status: 'running', progress: 10 }
          : job
      ));
    }, 1000);

    setTimeout(() => {
      setReweJobs(prev => prev.map(job => 
        job.id === newJob.id 
          ? { ...job, progress: 35, recipesImported: 15 }
          : job
      ));
    }, 30000);

    setTimeout(() => {
      setReweJobs(prev => prev.map(job => 
        job.id === newJob.id 
          ? { ...job, progress: 65, recipesImported: 30 }
          : job
      ));
    }, 60000);

    setTimeout(() => {
      setReweJobs(prev => prev.map(job => 
        job.id === newJob.id 
          ? { 
              ...job, 
              status: 'completed', 
              progress: 100, 
              recipesImported: 50,
              endTime: new Date().toISOString()
            }
          : job
      ));
      
      setSuccessMessage('Rewe import completed! 50 recipes imported successfully! 🎉');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    }, 120000);
  };

  const getStatusColor = (status: RecipeImport['status']) => {
    switch (status) {
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'processing':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: RecipeImport['status']) => {
    switch (status) {
      case 'success':
        return 'ri-check-circle-line';
      case 'error':
        return 'ri-error-warning-line';
      case 'processing':
        return 'ri-loader-4-line animate-spin';
      default:
        return 'ri-time-line';
    }
  };

  const getJobStatusColor = (status: ReweJob['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'running':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const getJobStatusIcon = (status: ReweJob['status']) => {
    switch (status) {
      case 'completed':
        return 'ri-check-circle-line';
      case 'failed':
        return 'ri-error-warning-line';
      case 'running':
        return 'ri-loader-4-line animate-spin';
      default:
        return 'ri-time-line';
    }
  };

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const duration = Math.floor((endTime - startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => window.REACT_APP_NAVIGATE('/')}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <i className="ri-arrow-left-line text-xl text-gray-700"></i>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-[#2F855A] rounded-lg">
                <i className="ri-admin-line text-xl text-white"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
                <p className="text-xs text-gray-600">Recipe Management</p>
              </div>
            </div>
            <div className="w-10"></div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 flex items-center justify-center bg-emerald-50 rounded-xl">
                <i className="ri-restaurant-2-line text-2xl text-[#2F855A]"></i>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">247</div>
                <p className="text-sm text-gray-600">Total Recipes</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 flex items-center justify-center bg-teal-50 rounded-xl">
                <i className="ri-upload-cloud-line text-2xl text-teal-600"></i>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">12</div>
                <p className="text-sm text-gray-600">Imported Today</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 flex items-center justify-center bg-amber-50 rounded-xl">
                <i className="ri-user-heart-line text-2xl text-amber-600"></i>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">1,543</div>
                <p className="text-sm text-gray-600">Active Users</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('url')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 ${
                  activeTab === 'url'
                    ? 'text-[#2F855A] border-b-2 border-[#2F855A] bg-emerald-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <i className="ri-link text-lg"></i>
                Import from URL
              </button>
              <button
                onClick={() => setActiveTab('rewe')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 ${
                  activeTab === 'rewe'
                    ? 'text-[#2F855A] border-b-2 border-[#2F855A] bg-emerald-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <i className="ri-shopping-cart-line text-lg"></i>
                Import from Rewe
              </button>
            </div>
          </div>

          {/* URL Import Tab */}
          {activeTab === 'url' && (
            <div className="p-8">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Import Recipe from URL</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Enter a recipe URL from popular cooking websites. We'll automatically extract the recipe details.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Recipe URL
                    </label>
                    <input
                      type="url"
                      value={recipeUrl}
                      onChange={(e) => setRecipeUrl(e.target.value)}
                      placeholder="https://example.com/recipe/delicious-pasta"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#2F855A] focus:outline-none transition-colors text-sm"
                      disabled={isImporting}
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex gap-3">
                      <i className="ri-information-line text-xl text-blue-600 flex-shrink-0"></i>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-blue-900 mb-1">Supported Websites</h4>
                        <p className="text-xs text-blue-700 mb-2">
                          AllRecipes, Food Network, Bon Appétit, Serious Eats, NYT Cooking, and more
                        </p>
                        <a
                          href="https://docs.recipe-scrapers.com/getting-started/supported-sites/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-800 hover:text-blue-900 hover:underline cursor-pointer"
                        >
                          <i className="ri-external-link-line"></i>
                          <span>View All Supported Websites</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleUrlImport}
                    disabled={isImporting || !recipeUrl.trim()}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 ${
                      isImporting || !recipeUrl.trim()
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white hover:from-[#276749] hover:to-emerald-700 shadow-lg'
                    }`}
                  >
                    {isImporting ? (
                      <>
                        <i className="ri-loader-4-line text-2xl animate-spin"></i>
                        <span>Importing Recipe...</span>
                      </>
                    ) : (
                      <>
                        <i className="ri-download-cloud-line text-2xl"></i>
                        <span>Import Recipe</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Rewe Import Tab */}
          {activeTab === 'rewe' && (
            <div className="p-8">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Import Recipes from Rewe</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Start an async job to import all available recipes from Rewe. This process takes approximately 2 minutes.
                </p>

                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex gap-3">
                      <i className="ri-time-line text-xl text-amber-600 flex-shrink-0"></i>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-amber-900 mb-1">Async Job Process</h4>
                        <p className="text-xs text-amber-700 mb-2">
                          This import runs in the background and takes about 2 minutes to complete. You can monitor the progress below.
                        </p>
                        <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                          <li>Job will be queued immediately</li>
                          <li>Progress updates every 30 seconds</li>
                          <li>You'll be notified when complete</li>
                          <li>You can leave this page during import</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleReweImport}
                    className="w-full py-4 rounded-xl font-bold text-lg transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white hover:from-[#276749] hover:to-emerald-700 shadow-lg"
                  >
                    <i className="ri-shopping-cart-line text-2xl"></i>
                    <span>Start Rewe Import Job</span>
                  </button>

                  {/* Active Jobs */}
                  {reweJobs.some(job => job.status === 'running' || job.status === 'queued') && (
                    <div className="mt-6 space-y-3">
                      <h4 className="text-sm font-semibold text-gray-900">Active Jobs</h4>
                      {reweJobs
                        .filter(job => job.status === 'running' || job.status === 'queued')
                        .map(job => (
                          <div key={job.id} className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <i className={`${getJobStatusIcon(job.status)} text-lg text-blue-600`}></i>
                                <span className="text-sm font-semibold text-blue-900">
                                  {job.status === 'queued' ? 'Queued' : 'Running'}
                                </span>
                              </div>
                              <span className="text-xs text-blue-700">
                                {job.recipesImported} / {job.totalRecipes} recipes
                              </span>
                            </div>
                            <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${job.progress}%` }}
                              ></div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-blue-700">
                              <span>Started: {new Date(job.startTime).toLocaleTimeString()}</span>
                              <span>{job.progress}% complete</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Import History / Job History */}
        {activeTab === 'url' ? (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Import History</h3>
                  <p className="text-sm text-gray-600 mt-1">Recent recipe imports and their status</p>
                </div>
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap">
                  <i className="ri-filter-3-line mr-2"></i>
                  Filter
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {importHistory.map((item) => (
                <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-12 h-12 flex items-center justify-center rounded-xl ${
                        item.source === 'url' ? 'bg-blue-50' : 'bg-purple-50'
                      }`}>
                        <i className={`text-2xl ${
                          item.source === 'url' 
                            ? 'ri-link text-blue-600' 
                            : 'ri-file-text-line text-purple-600'
                        }`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-1">{item.name}</h4>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <i className="ri-time-line"></i>
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <i className={item.source === 'url' ? 'ri-link' : 'ri-file-line'}></i>
                            {item.source.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className={`px-4 py-2 rounded-lg border text-sm font-semibold flex items-center gap-2 ${getStatusColor(item.status)}`}>
                      <i className={getStatusIcon(item.status)}></i>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Rewe Import Jobs</h3>
                  <p className="text-sm text-gray-600 mt-1">History of all Rewe import jobs</p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {reweJobs.map((job) => (
                <div key={job.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-emerald-50">
                        <i className="ri-shopping-cart-line text-2xl text-[#2F855A]"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-1">Rewe Recipe Import</h4>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <i className="ri-time-line"></i>
                            Started: {new Date(job.startTime).toLocaleString()}
                          </span>
                          {job.endTime && (
                            <span className="flex items-center gap-1">
                              <i className="ri-timer-line"></i>
                              Duration: {formatDuration(job.startTime, job.endTime)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`px-4 py-2 rounded-lg border text-sm font-semibold flex items-center gap-2 ${getJobStatusColor(job.status)}`}>
                      <i className={getJobStatusIcon(job.status)}></i>
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#2F855A] h-2 rounded-full transition-all duration-500"
                          style={{ width: `${job.progress}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {job.recipesImported} / {job.totalRecipes} recipes
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
          <div className="bg-white rounded-2xl shadow-2xl p-4 flex items-center gap-3 border-2 border-[#2F855A] min-w-[320px]">
            <div className="w-12 h-12 flex items-center justify-center bg-[#2F855A] rounded-full flex-shrink-0">
              <i className="ri-check-line text-2xl text-white"></i>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">{successMessage}</p>
              <p className="text-xs text-gray-600 mt-0.5">Check job status below</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
