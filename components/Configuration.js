const Configuration = ({ 
    businessPortfolioId, 
    setBusinessPortfolioId, 
    accessToken, 
    setAccessToken, 
    loading, 
    setLoading, 
    showMessage, 
    loadConfig, 
    loadExistingNumbers 
}) => {
    return (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Configuration</h2>
                <div className="flex gap-2">
                    <button
                        onClick={loadConfig}
                        disabled={loading}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                    >
                        <i className="fas fa-download mr-2"></i>Load Config
                    </button>
                    <button
                        onClick={loadExistingNumbers}
                        disabled={loading || !businessPortfolioId || !accessToken}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                    >
                        <i className="fas fa-sync mr-2"></i>Refresh Numbers
                    </button>
                </div>
            </div>
            
            {businessPortfolioId && accessToken ? (
                <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                        <i className="fas fa-check-circle text-green-600 mr-2"></i>
                        <span className="text-green-800 font-medium">Credentials loaded successfully</span>
                    </div>
                    <div className="text-sm text-green-700 mt-1">
                        Business Portfolio ID: {businessPortfolioId.substring(0, 8)}...
                    </div>
                </div>
            ) : (
                <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="flex items-center">
                        <i className="fas fa-exclamation-triangle text-yellow-600 mr-2"></i>
                        <span className="text-yellow-800 font-medium">Credentials not found</span>
                    </div>
                    <div className="text-sm text-yellow-700 mt-1">
                        Please enter your Business Portfolio ID and Access Token below.
                    </div>
                </div>
            )}
            
            <div className="mt-4">
                <details className="text-sm text-gray-600">
                    <summary className="cursor-pointer hover:text-gray-800">Manual Override (Optional)</summary>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Business Portfolio ID</label>
                            <input
                                type="text"
                                placeholder="Enter your business portfolio ID"
                                value={businessPortfolioId}
                                onChange={(e) => setBusinessPortfolioId(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Access Token</label>
                            <input
                                type="password"
                                placeholder="Enter your access token"
                                value={accessToken}
                                onChange={(e) => setAccessToken(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </details>
            </div>
        </div>
    );
};

// Make component globally accessible
window.Configuration = Configuration;