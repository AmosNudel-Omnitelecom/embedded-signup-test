const EmbeddedSignup = ({ 
    facebookAppId, 
    facebookConfigId, 
    numbers, 
    showMessage 
}) => {
    const [config, setConfig] = React.useState({
        setup: {
            features: ['whatsapp_business_management', 'whatsapp_business_messaging'],
            sessionInfoVersion: 3,
            preVerifiedPhone: {
                ids: []
            }
        },
        businessName: '',
        businessCategory: '',
        businessDescription: ''
    });

    const [selectedNumbers, setSelectedNumbers] = React.useState([]);

    // Initialize Facebook SDK
    React.useEffect(() => {
        // Load Facebook SDK
        const script = document.createElement('script');
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.async = true;
        script.defer = true;
        script.crossOrigin = 'anonymous';
        document.head.appendChild(script);

        // Initialize SDK when loaded
        window.fbAsyncInit = function() {
            if (window.FB) {
                window.FB.init({
                    appId: facebookAppId || 'YOUR_APP_ID',
                    autoLogAppEvents: true,
                    xfbml: true,
                    version: 'v18.0'
                });
            }
        };

        // Message event listener for embedded signup results
        window.addEventListener('message', (event) => {
            if (!event.origin.endsWith('facebook.com')) return;
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'WA_EMBEDDED_SIGNUP') {
                    console.log('Embedded Signup Result:', data);
                    showMessage('success', `Embedded Signup completed! WABA ID: ${data.data?.waba_id}, Phone ID: ${data.data?.phone_number_id}`);
                }
            } catch (error) {
                console.log('Message event data:', event.data);
            }
        });

        return () => {
            document.head.removeChild(script);
        };
    }, [config.appId]);

    const updateConfig = (field, value) => {
        setConfig(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const addNumberToSignup = (numberId) => {
        if (!selectedNumbers.includes(numberId)) {
            setSelectedNumbers(prev => [...prev, numberId]);
        }
    };

    const removeNumberFromSignup = (numberId) => {
        setSelectedNumbers(prev => prev.filter(id => id !== numberId));
    };

    const launchEmbeddedSignup = () => {
        if (!window.FB) {
            showMessage('error', 'Facebook SDK not loaded. Please refresh the page.');
            return;
        }

        if (!facebookAppId || !facebookConfigId) {
            showMessage('error', 'Facebook App ID and Configuration ID not loaded from environment variables.');
            return;
        }

        const setupConfig = {
            ...config.setup,
            preVerifiedPhone: { ids: selectedNumbers }
        };

        // Response callback
        const fbLoginCallback = (response) => {
            if (response.authResponse) {
                const code = response.authResponse.code;
                console.log('Auth Response Code:', code);
                showMessage('success', 'Authentication successful! Check console for code.');
            } else {
                console.log('Login Response:', response);
                showMessage('info', 'Login flow completed. Check console for details.');
            }
        };

        // Launch embedded signup
        window.FB.login(fbLoginCallback, {
            config_id: facebookConfigId,
            response_type: 'code',
            override_default_response_type: true,
            extras: {
                setup: setupConfig,
                featureType: '', // leave blank for default flow
                sessionInfoVersion: '3'
            }
        });
    };

    const generateEmbeddedSignupCode = () => {
        const setupConfig = {
            ...config.setup,
            preVerifiedPhone: { ids: selectedNumbers }
        };

        return `// Launch method and callback registration
const launchWhatsAppSignup = () => {
  FB.login(fbLoginCallback, {
    config_id: '<CONFIGURATION_ID>', // your configuration ID goes here
    response_type: 'code',
    override_default_response_type: true,
    extras: {
      setup: ${JSON.stringify(setupConfig, null, 2)},
      featureType: '', // leave blank for default flow
      sessionInfoVersion: '3'
    }
  });
}`;
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Business Profile Configuration</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Business Name</label>
                        <input
                            type="text"
                            value={config.businessName}
                            onChange={(e) => updateConfig('businessName', e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Business Category</label>
                        <select
                            value={config.businessCategory}
                            onChange={(e) => updateConfig('businessCategory', e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select category</option>
                            <option value="RETAIL">Retail</option>
                            <option value="TRAVEL">Travel</option>
                            <option value="RESTAURANT">Restaurant</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Business Description</label>
                        <textarea
                            value={config.businessDescription}
                            onChange={(e) => updateConfig('businessDescription', e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Select Numbers for Embedded Signup</h3>
                <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-blue-800">
                            <i className="fas fa-info-circle mr-2"></i>
                            Only verified phone numbers can be included in the embedded signup flow. Click "Add to Signup" to include numbers in your configuration.
                        </p>
                    </div>
                    
                    <div className="space-y-2">
                        <h4 className="font-medium text-gray-700">Available Verified Numbers:</h4>
                        {numbers.filter(n => n.status === 'VERIFIED').map(number => (
                            <div key={number.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                <div>
                                    <span className="font-medium">{number.phone_number}</span>
                                    <div className="text-xs text-gray-500">ID: {number.id}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-green-600 text-sm">
                                        <i className="fas fa-check-circle mr-1"></i>Verified
                                    </span>
                                    {selectedNumbers.includes(number.id) ? (
                                        <button
                                            onClick={() => removeNumberFromSignup(number.id)}
                                            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                                        >
                                            <i className="fas fa-minus mr-1"></i>Remove
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => addNumberToSignup(number.id)}
                                            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                                        >
                                            <i className="fas fa-plus mr-1"></i>Add to Signup
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {numbers.filter(n => n.status === 'VERIFIED').length === 0 && (
                        <p className="text-gray-500 text-center py-4">No verified numbers available</p>
                    )}
                    
                    {selectedNumbers.length > 0 && (
                        <div className="bg-green-50 p-4 rounded-lg mt-4">
                            <h4 className="font-medium text-green-800 mb-2">
                                <i className="fas fa-check-circle mr-2"></i>Selected Numbers for Signup ({selectedNumbers.length})
                            </h4>
                            <div className="space-y-1">
                                {selectedNumbers.map(numberId => {
                                    const number = numbers.find(n => n.id === numberId);
                                    return number ? (
                                        <div key={numberId} className="text-sm text-green-700">
                                            • {number.phone_number} (ID: {numberId})
                                        </div>
                                    ) : null;
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Test Embedded Signup Flow</h3>
                {selectedNumbers.length > 0 ? (
                    <>
                        <div className="bg-green-50 p-3 rounded-lg mb-4">
                            <p className="text-sm text-green-800">
                                <i className="fas fa-info-circle mr-2"></i>
                                Ready to test with {selectedNumbers.length} verified number{selectedNumbers.length > 1 ? 's' : ''}
                            </p>
                        </div>
                        
                        <div className="bg-blue-50 p-4 rounded-lg mb-4">
                            <h4 className="font-medium text-blue-800 mb-2">
                                <i className="fas fa-cog mr-2"></i>Configuration Settings
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">App ID</label>
                                    <div className="px-3 py-2 bg-gray-100 border rounded text-sm">
                                        {facebookAppId ? (
                                            <span className="text-green-600">
                                                <i className="fas fa-check-circle mr-1"></i>
                                                {facebookAppId}
                                            </span>
                                        ) : (
                                            <span className="text-gray-500">
                                                <i className="fas fa-spinner fa-spin mr-1"></i>
                                                Loading from environment...
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Configuration ID</label>
                                    <div className="px-3 py-2 bg-gray-100 border rounded text-sm">
                                        {facebookConfigId ? (
                                            <span className="text-green-600">
                                                <i className="fas fa-check-circle mr-1"></i>
                                                {facebookConfigId}
                                            </span>
                                        ) : (
                                            <span className="text-gray-500">
                                                <i className="fas fa-spinner fa-spin mr-1"></i>
                                                Loading from environment...
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-green-50 p-3 rounded-lg mb-4">
                            <p className="text-sm text-green-800">
                                <i className="fas fa-check-circle mr-2"></i>
                                <strong>Ready:</strong> App ID and Configuration ID loaded from environment variables. Click "Launch Embedded Signup" to test the flow.
                            </p>
                        </div>

                        <div className="text-center">
                            <button
                                onClick={() => launchEmbeddedSignup()}
                                disabled={!facebookAppId || !facebookConfigId || selectedNumbers.length === 0}
                                className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
                            >
                                <i className="fab fa-facebook mr-2"></i>
                                Launch Embedded Signup
                                {!facebookAppId || !facebookConfigId ? ' (Loading...)' : ''}
                            </button>
                        </div>

                        <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium text-gray-800 mb-2">
                                <i className="fas fa-code mr-2"></i>Generated Configuration
                            </h4>
                            <div className="bg-gray-100 p-3 rounded font-mono text-xs overflow-x-auto">
                                <pre>{JSON.stringify({
                                    setup: {
                                        ...config.setup,
                                        preVerifiedPhone: { ids: selectedNumbers }
                                    }
                                }, null, 2)}</pre>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="bg-yellow-50 p-4 rounded-lg">
                        <p className="text-sm text-yellow-800">
                            <i className="fas fa-exclamation-triangle mr-2"></i>
                            No numbers selected for embedded signup. Add verified numbers above to test the flow.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Make component globally accessible
window.EmbeddedSignup = EmbeddedSignup;