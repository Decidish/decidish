import { useState, useEffect } from 'react';
import { adminApi } from '@/api/admin/adminApi';
import apiClient from '@/api/client';

interface RecipeImport {
  id: string;
  name: string;
  url: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  createdAt: string;
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
  const [importHistory, setImportHistory] = useState<RecipeImport[]>([]);
  const [reweJobs, setReweJobs] = useState<ReweJob[]>([]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [stats, setStats] = useState({ total: 0, today: 0, users: 0 });
  
  const activeReweJobs = reweJobs.filter(job => job.status === 'running' || job.status === 'queued');
  const historyReweJobs = reweJobs.filter(job => job.status === 'completed' || job.status === 'failed');
  
  const fetchHistory = async () => {
    try {
      // Fetch URL History
      const urlData = await adminApi.getImportHistory();
      console.log("Raw URL History from Backend:", urlData);
      const mappedUrlHistory = urlData.map((item: any) => ({
        id: item.id.toString(),
        name: item.name || 'Untitle Recipe',     // Map 'identifier' from DB to 'name'
        source: (item.source || 'url') as 'url' | 'file', // FALLBACK
        status: item.status === 'failed' ? 'error' : item.status, // normalize status
        createdAt: item.created_at,
        url: item.url || ''
      }));
      setImportHistory(mappedUrlHistory);

      // Fetch Rewe Job History
      const reweData = await adminApi.getReweJobHistory();
      const mappedReweHistory = reweData.map((job: any) => {
        // Calculate progress logic if needed, or default to 100/0 based on status
        let uiStatus: ReweJob['status'] = 'queued';
        if(job.status === 'running' || job.status === 'processing') uiStatus = 'running';
        if(job.status === 'completed' || job.status === 'success') uiStatus = 'completed';
        if(job.status === 'failed' || job.status === 'error') uiStatus = 'failed';

        return {
          id: job.id.toString(),
          status: uiStatus,
          startTime: job.created_at,
          // If DB doesn't track end time explicitly, we might leave undefined or use updated_at
          endTime: uiStatus === 'completed' ? job.updated_at : undefined, 
          recipesImported: job.processed_items || 0,
          totalRecipes: job.total_items || 0,
          progress: job.total_items > 0 ? Math.floor((job.processed_items / job.total_items) * 100) : 0
        };
      });
      setReweJobs(mappedReweHistory);

    } catch (error) {
      console.error("Failed to load history:", error);
    }
  };
  
  const loadStats = async () => {
    try {
      const data = await adminApi.getStats();
      setStats({
        total: data.total_recipes,
        today: data.imported_today,
        users: data.active_users
      });
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  };
  
  useEffect(() => {
  const refreshAll = () => {
    loadStats();     
    fetchHistory();  
  };

  refreshAll();

  const interval = setInterval(refreshAll, 5000);

  return () => clearInterval(interval);
}, []);
  
  
  const handleUrlImport = async () => {
    if (!recipeUrl.trim()) {
      alert('Please enter a recipe URL');
      return;
    }

    setIsImporting(true);
    
    try {
      await adminApi.addRecipe(recipeUrl);

      setRecipeUrl('');
      setSuccessMessage('Recipe imported successfully!');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);

      await loadStats();
      await fetchHistory();
    } catch (error) {
      console.error("URL Import Failed", error);
      alert("Failed to import recipe. Check console for details.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleReweImport = async () => {
    try {
      // Trigger the Background Job
      const response = await adminApi.addReweRecipes();
      const realJobId = response.job_id.toString();

      // Add 'Queued' Job to UI List
      const newJob: ReweJob = {
        id: realJobId,
        status: 'queued',
        startTime: new Date().toISOString(),
        recipesImported: 0,
        totalRecipes: 0, // We don't know this yet, next poll will update it
        progress: 0
      };

      setReweJobs(prev => [newJob, ...prev]);
      setSuccessMessage('Rewe import job started! ⏳');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);

      // Start Polling Every 2 Seconds
      const pollInterval = setInterval(async () => {
        try {
          const statusData = await adminApi.getJobStatus(realJobId);

          // Calculate Percentage
          const percent = statusData.total_items > 0 
            ? Math.floor((statusData.processed_items / statusData.total_items) * 100) 
            : 0;

          // Map Backend Status ('success'/'error') to Frontend UI Status ('completed'/'failed')
          // let uiStatus: 'queued' | 'running' | 'completed' | 'failed' = 'running';
          let uiStatus: ReweJob['status'] = 'running';
          
          if (statusData.status === 'success') uiStatus = 'completed';
          else if (statusData.status === 'error') uiStatus = 'failed';
          else if (statusData.status === 'pending') uiStatus = 'queued';

          // Update the specific job in state
          setReweJobs(prev => prev.map(job => 
            job.id === realJobId 
              ? { 
                  ...job, 
                  status: uiStatus,
                  progress: percent,
                  recipesImported: statusData.processed_items,
                  totalRecipes: statusData.total_items,
                  error: statusData.error_message,
                  // Only set endTime if finished
                  endTime: (uiStatus === 'completed' || uiStatus === 'failed') 
                    ? new Date().toISOString() 
                    : undefined 
                }
              : job
          ));

          // Stop Polling if Finished
          if (uiStatus === 'completed' || uiStatus === 'failed') {
            clearInterval(pollInterval);
            
            await loadStats();
            await fetchHistory();
            
            if (uiStatus === 'completed') {
              setSuccessMessage('Rewe import completed successfully! 🎉');
              setShowSuccessToast(true);
              setTimeout(() => setShowSuccessToast(false), 3000);
            }
          }

        } catch (pollError) {
          console.error("Error polling job:", pollError);
          //? maybe clear interval on 404 or critical errors to prevent infinite loops
        }
      }, 2000);

    } catch (error) {
      console.error("Failed to start job", error);
      setSuccessMessage('Failed to trigger import service.');
      setShowSuccessToast(true);
    }
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-emerald-50 rounded-xl">
                <i className="ri-restaurant-2-line text-xl sm:text-2xl text-[#2F855A]"></i>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.total}</div>
                <p className="text-xs sm:text-sm text-gray-600">Total Recipes</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-teal-50 rounded-xl">
                <i className="ri-upload-cloud-line text-xl sm:text-2xl text-teal-600"></i>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.today}</div>
                <p className="text-xs sm:text-sm text-gray-600">Imported Today</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-amber-50 rounded-xl">
                <i className="ri-user-heart-line text-xl sm:text-2xl text-amber-600"></i>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.users}</div>
                <p className="text-xs sm:text-sm text-gray-600">Active Users</p>
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
                className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-1 sm:gap-2 ${
                  activeTab === 'url'
                    ? 'text-[#2F855A] border-b-2 border-[#2F855A] bg-emerald-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <i className="ri-link text-base sm:text-lg"></i>
                <span className="hidden xs:inline">Import from</span> URL
              </button>
              <button
                onClick={() => setActiveTab('rewe')}
                className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-1 sm:gap-2 ${
                  activeTab === 'rewe'
                    ? 'text-[#2F855A] border-b-2 border-[#2F855A] bg-emerald-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <i className="ri-shopping-cart-line text-base sm:text-lg"></i>
                <span className="hidden xs:inline">Import from</span> Rewe
              </button>
            </div>
          </div>

          {/* URL Import Tab */}
          {activeTab === 'url' && (
            <div className="p-4 sm:p-8">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Import Recipe from URL</h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
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
                  {/* {reweJobs.some(job => job.status === 'running' || job.status === 'queued') && ( */}
                  {activeReweJobs.length > 0 && (
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
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-1">{item.url}</h4>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <i className="ri-time-line"></i>
                            {new Date(item.createdAt).toLocaleString()}
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
              {historyReweJobs.map((job) => (
                <div key={job.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div className="flex items-center gap-3 sm:gap-4 flex-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl bg-emerald-50 flex-shrink-0">
                        <i className="ri-shopping-cart-line text-xl sm:text-2xl text-[#2F855A]"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">Rewe Recipe Import</h4>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-[10px] sm:text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <i className="ri-time-line"></i>
                            {new Date(job.startTime).toLocaleString()}
                          </span>
                          {job.endTime && (
                            <span className="flex items-center gap-1">
                              <i className="ri-timer-line"></i>
                              {formatDuration(job.startTime, job.endTime)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 self-start sm:self-auto ${getJobStatusColor(job.status)}`}>
                      <i className={getJobStatusIcon(job.status)}></i>
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                        <div
                          className="bg-[#2F855A] h-1.5 sm:h-2 rounded-full transition-all duration-500"
                          style={{ width: `${job.progress}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {job.recipesImported}/{job.totalRecipes}
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
