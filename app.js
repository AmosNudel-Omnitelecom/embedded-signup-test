const { useState, useEffect } = React;

const App = () => {
    const [activeTab, setActiveTab] = useState('numbers');
    const [numbers, setNumbers] = useState([]);
    const [businessPortfolioId, setBusinessPortfolioId] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [facebookAppId, setFacebookAppId] = useState('');
    const [facebookConfigId, setFacebookConfigId] = useState('');

    const showMessage = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    };

    const deletePhoneNumber = async (numberId) => {
        if (!confirm('Are you sure you want to delete this pre-verified phone number? This action cannot be undone.')) {
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`https://graph.facebook.com/v18.0/${numberId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            const data = await response.json();
            if (data.success) {
                showMessage('success', 'Phone number deleted successfully');
                // Remove the number from the local state
                setNumbers(numbers.filter(num => num.id !== numberId));
            } else {
                showMessage('error', data.error?.message || 'Failed to delete phone number');
            }
        } catch (error) {
            showMessage('error', 'Network error: ' + error.message);
        }
        setLoading(false);
    };

    const registerPhoneNumber = async (wabaPhoneNumberId, pin) => {
        try {
            setLoading(true);
            
            const requestBody = {
                messaging_product: 'whatsapp',
                pin: pin
            };
            console.log('📤 Registration request body:', requestBody);
            
            const registerResponse = await fetch(`https://graph.facebook.com/v18.0/${wabaPhoneNumberId}/register`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const registerData = await registerResponse.json();
            
            if (registerData.success) {
                showMessage('success', 'Phone number registered successfully!');
            } else {
                showMessage('error', registerData.error?.error_user_msg || registerData.error?.message || 'Registration failed');
            }
            
        } catch (error) {
            showMessage('error', 'Registration failed: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Phone number validation and formatting functions
    const validateAndFormatPhoneNumber = (phoneNumber) => {
        // Remove all non-digit characters except +
        let cleaned = phoneNumber.replace(/[^\d+]/g, '');
        
        // Ensure it starts with +
        if (!cleaned.startsWith('+')) {
            cleaned = '+' + cleaned;
        }
        
        // Remove any extra + signs
        cleaned = cleaned.replace(/\+/g, '');
        cleaned = '+' + cleaned;
        
        // Check if it's a valid international format
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        
        if (!phoneRegex.test(cleaned)) {
            return { isValid: false, formatted: cleaned, error: 'Invalid phone number format. Must be in international format (e.g., +1234567890)' };
        }
        
        // Check minimum length (country code + number)
        if (cleaned.length < 8) {
            return { isValid: false, formatted: cleaned, error: 'Phone number too short. Must include country code and number.' };
        }
        
        // Check maximum length (E.164 standard)
        if (cleaned.length > 16) {
            return { isValid: false, formatted: cleaned, error: 'Phone number too long. Maximum 15 digits after country code.' };
        }
        
        return { isValid: true, formatted: cleaned, error: null };
    };

    const loadExistingNumbers = async () => {
        if (!businessPortfolioId || !accessToken) return;
        
        setLoading(true);
        try {
            // Query pre-verified numbers from the Business Account
            const response = await fetch(`https://graph.facebook.com/v18.0/${businessPortfolioId}/preverified_numbers?fields=id,phone_number,code_verification_status,verification_expiry_time`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            const data = await response.json();
            console.log('Pre-verified numbers response:', data);
            
            // Check for rate limiting error
            if (data.error && data.error.code === 80008) {
                const waitTime = response.headers.get('X-Business-Use-Case-Usage') || 
                               response.headers.get('x-business-use-case-usage') ||
                               'unknown';
                console.log('⏱️ Rate limit headers:', waitTime);
                
                // Try to parse the wait time from the header
                let estimatedWaitSeconds = 3600; // Default 1 hour
                try {
                    const usageData = JSON.parse(waitTime);
                    if (usageData && usageData.estimated_time_to_regain_access) {
                        estimatedWaitSeconds = usageData.estimated_time_to_regain_access;
                    }
                } catch (e) {
                    console.log('Could not parse rate limit header:', waitTime);
                }
                
                const waitMinutes = Math.ceil(estimatedWaitSeconds / 60);
                showMessage('error', `Rate limit exceeded. Please wait ${waitMinutes} minutes before trying again.`);
                return;
            }
            
            if (data.error) {
                showMessage('error', data.error.message || 'Failed to load phone numbers');
                return;
            }
            
            if (data.data) {
                setNumbers(data.data.map(num => ({
                    id: num.id,
                    phone_number: num.phone_number,
                    status: num.code_verification_status || 'unknown',
                    verification_expiry_time: num.verification_expiry_time,
                    created_at: new Date().toISOString(),
                    is_preverified: true
                })));
            }
        } catch (error) {
            console.error('Error loading numbers:', error);
            showMessage('error', 'Failed to load phone numbers');
        }
        setLoading(false);
    };

    // Manual config loading - no automatic loading
        const loadConfig = async () => {
            try {
                // Load credentials from localStorage first
                const savedPortfolioId = localStorage.getItem('businessPortfolioId');
                const savedAccessToken = localStorage.getItem('accessToken');
                
                // Try to load from server environment variables
                const response = await fetch('/api/config');
                if (response.ok) {
                    const config = await response.json();
                    
                    // Use environment variables if available, otherwise use saved values or defaults
                    const portfolioId = config.businessPortfolioId || savedPortfolioId || '';
                    const accessToken = config.accessToken || savedAccessToken || '';
                    
                    setBusinessPortfolioId(portfolioId);
                    setAccessToken(accessToken);
                    
                    // Load Facebook App ID and Config ID from environment variables
                    if (config.facebookAppId) {
                        setFacebookAppId(config.facebookAppId);
                    }
                    if (config.facebookConfigId) {
                        setFacebookConfigId(config.facebookConfigId);
                    }
                    
                    showMessage('success', 'Configuration loaded successfully');
                } else {
                    // Fallback to saved values or empty strings
                    const portfolioId = savedPortfolioId || '';
                    const accessToken = savedAccessToken || '';
                    
                    setBusinessPortfolioId(portfolioId);
                    setAccessToken(accessToken);
                    
                    showMessage('info', 'Using saved configuration');
                }
            } catch (error) {
                console.error('Error loading config:', error);
                // Fallback to saved values or empty strings
                const savedPortfolioId = localStorage.getItem('businessPortfolioId') || '';
                const savedAccessToken = localStorage.getItem('accessToken') || '';
                
                setBusinessPortfolioId(savedPortfolioId);
                setAccessToken(savedAccessToken);
                
                showMessage('error', 'Failed to load configuration');
            }
        };

    // Manual localStorage saving - no automatic saving
    const saveToLocalStorage = () => {
        if (businessPortfolioId) {
            localStorage.setItem('businessPortfolioId', businessPortfolioId);
        }
        if (accessToken) {
            localStorage.setItem('accessToken', accessToken);
        }
    };

    const PhoneNumberManagement = () => {
        const [phoneNumber, setPhoneNumber] = useState('');
        const [selectedNumber, setSelectedNumber] = useState(null);
        const [verificationCode, setVerificationCode] = useState('');
        const [codeMethod, setCodeMethod] = useState('SMS');
        const [phoneNumberError, setPhoneNumberError] = useState('');

        const handlePhoneNumberChange = (value) => {
            setPhoneNumber(value);
            setPhoneNumberError('');
            
            if (value) {
                const validation = validateAndFormatPhoneNumber(value);
                if (!validation.isValid) {
                    setPhoneNumberError(validation.error);
                }
            }
        };

        const addPhoneNumber = async () => {
            if (!businessPortfolioId || !accessToken || !phoneNumber) {
                showMessage('error', 'Please fill in all required fields');
                return;
            }

            // Validate phone number before sending
            const validation = validateAndFormatPhoneNumber(phoneNumber);
            if (!validation.isValid) {
                showMessage('error', validation.error);
                return;
            }

            setLoading(true);
            try {
                console.log('📞 Sending phone number:', validation.formatted);
                console.log('📞 Request body:', { phone_number: validation.formatted });
                
                const response = await fetch(`https://graph.facebook.com/v18.0/${businessPortfolioId}/add_phone_numbers`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ phone_number: validation.formatted })
                });

                const data = await response.json();
                console.log('Add Phone Number API Response:', data); // Log the full response
                
                if (data.id) {
                    console.log('✅ Successfully added phone number with ID:', data.id);
                    setNumbers([...numbers, {
                        id: data.id,
                        phone_number: validation.formatted,
                        status: 'unverified',
                        created_at: new Date().toISOString()
                    }]);
                    setPhoneNumber('');
                    setPhoneNumberError('');
                    showMessage('success', `Phone number added successfully! ID: ${data.id}`);
                } else {
                    console.log('❌ Failed to add phone number:', data);
                    console.log('❌ Error details:', {
                        code: data.error?.code,
                        message: data.error?.message,
                        type: data.error?.type,
                        fbtrace_id: data.error?.fbtrace_id
                    });
                    showMessage('error', `Failed to add phone number: ${data.error?.message || 'Unknown error'}`);
                }
            } catch (error) {
                showMessage('error', 'Network error: ' + error.message);
            }
            setLoading(false);
        };

        const requestVerificationCode = async (numberId) => {
            setLoading(true);
            try {
                console.log('🔐 Requesting verification code for number ID:', numberId);
                
                const response = await fetch(`https://graph.facebook.com/v18.0/${numberId}/request_code?code_method=SMS&language=en_US`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();
                console.log('📱 Verification code request response:', data);
                console.log('📱 Response success:', data.success);
                console.log('📱 Response error:', data.error);
                
                if (data.success) {
                    showMessage('success', '✅ Verification code sent via SMS! Check your phone for: "WhatsApp code 123-456"');
                    console.log('🔐 Setting selectedNumber to:', numberId);
                    setSelectedNumber(numberId);
                    console.log('🔐 selectedNumber should now be:', numberId);
                    // Auto-refresh the numbers list to get updated status
                    setTimeout(() => {
                        console.log('🔄 About to call loadExistingNumbers, selectedNumber is:', selectedNumber);
                        loadExistingNumbers();
                        console.log('🔄 After loadExistingNumbers, selectedNumber is:', selectedNumber);
                    }, 2000);
                } else {
                    console.log('❌ Verification code request failed:', data);
                    
                    // Handle specific error codes
                    if (data.error?.code === 136024) {
                        showMessage('error', '⚠️ Rate limit reached. Please wait 10-15 minutes before requesting another code. This is a WhatsApp security measure.');
                    } else if (data.error?.code === 136021) {
                        showMessage('error', '❌ Invalid phone number format. Please check the number and try again.');
                    } else {
                        showMessage('error', data.error?.message || 'Failed to send verification code');
                    }
                }
            } catch (error) {
                console.log('❌ Network error requesting verification code:', error);
                showMessage('error', 'Network error: ' + error.message);
            }
            setLoading(false);
        };

        const verifyPhoneNumber = async () => {
            if (!selectedNumber || !verificationCode) {
                showMessage('error', 'Please enter verification code');
                return;
            }

            setLoading(true);
            try {
                console.log('🔐 Verifying code for number ID:', selectedNumber);
                console.log('🔐 Code being verified:', verificationCode);
                
                const response = await fetch(`https://graph.facebook.com/v18.0/${selectedNumber}/verify_code?code=${verificationCode}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();
                console.log('✅ Verification response:', data);
                
                if (data.success) {
                    showMessage('success', 'Phone number verified successfully! Number is now ready for use.');
                    setSelectedNumber(null);
                    setVerificationCode('');
                    // Refresh the numbers list to get updated status and expiry
                    setTimeout(() => {
                        loadExistingNumbers();
                    }, 2000);
                } else {
                    console.log('❌ Verification failed:', data);
                    showMessage('error', data.error?.message || 'Invalid verification code');
                }
            } catch (error) {
                console.log('❌ Network error during verification:', error);
                showMessage('error', 'Network error: ' + error.message);
            }
            setLoading(false);
        };

        return (
            <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold mb-4">Add Pre-Verified Phone Number</h3>
                    <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="font-medium text-blue-800 mb-2">
                                <i className="fas fa-info-circle mr-2"></i>Phone Number Requirements
                            </h4>
                            <ul className="text-sm text-blue-700 space-y-1">
                                <li>• Must be in international format (e.g., +1234567890)</li>
                                <li>• Must include country code (e.g., +1 for US, +44 for UK)</li>
                                <li>• Must be a real, active phone number you can receive SMS/calls on</li>
                                <li>• Cannot be a landline number (must be mobile)</li>
                                <li>• Must not already be registered with WhatsApp Business</li>
                            </ul>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <input
                                    type="text"
                                    placeholder="Phone number (e.g., +1234567890)"
                                    value={phoneNumber}
                                    onChange={(e) => handlePhoneNumberChange(e.target.value)}
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        phoneNumberError ? 'border-red-500' : ''
                                    }`}
                                />
                                {phoneNumberError && (
                                    <p className="text-red-500 text-sm mt-2">{phoneNumberError}</p>
                                )}
                            </div>
                            <button
                                onClick={addPhoneNumber}
                                disabled={loading || !!phoneNumberError}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? 'Adding...' : 'Add Phone Number'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Standalone Manual Verification Section - Always Visible */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold mb-4">Manual Verification (Always Available)</h3>
                    <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="font-medium text-blue-800 mb-2">
                                <i className="fas fa-terminal mr-2"></i>Manual Verification
                            </h4>
                            <p className="text-sm text-blue-700">
                                Use this section to verify any number manually. Enter the number ID and SMS verification code below.
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Number ID
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter the number ID (e.g., 30949605761305423)"
                                    value={selectedNumber || ''}
                                    onChange={(e) => setSelectedNumber(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    SMS Verification Code
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter the 6-digit code from SMS"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    maxLength="6"
                                />
                            </div>
                        </div>
                        
                        <div className="flex gap-4">
                            <button
                                onClick={verifyPhoneNumber}
                                disabled={loading || !selectedNumber || !verificationCode}
                                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                {loading ? 'Verifying...' : 'Verify Code'}
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedNumber('');
                                    setVerificationCode('');
                                }}
                                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                            >
                                Clear
                            </button>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium text-gray-800 mb-2">
                                <i className="fas fa-info-circle mr-2"></i>How to Use
                            </h4>
                            <ol className="text-sm text-gray-700 space-y-1">
                                <li>1. Click "Request Code" on any number in the table below</li>
                                <li>2. Wait for the SMS: "WhatsApp code 123-456"</li>
                                <li>3. Copy the number ID from the table</li>
                                <li>4. Enter the ID and code in the fields above</li>
                                <li>5. Click "Verify Code"</li>
                            </ol>
                        </div>
                    </div>
                </div>

                {/* Verification Code Section */}
                {console.log('🔍 Rendering - selectedNumber is:', selectedNumber)}
                <div className="bg-gray-100 p-2 mb-4 text-xs">
                    Debug: selectedNumber = "{selectedNumber}" (type: {typeof selectedNumber})
                    <button 
                        onClick={() => {
                            console.log('🧪 Test button clicked');
                            setSelectedNumber('TEST123');
                            console.log('🧪 Set selectedNumber to TEST123');
                        }}
                        className="ml-2 bg-blue-500 text-white px-2 py-1 rounded text-xs"
                    >
                        Test Set State
                    </button>
                </div>
                {selectedNumber && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold mb-4">Enter Verification Code</h3>
                        <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                            <h4 className="font-medium text-yellow-800 mb-2">
                                <i className="fas fa-info-circle mr-2"></i>Verification Required
                            </h4>
                            <p className="text-sm text-yellow-700">
                                Check your phone for an SMS with the verification code. Enter it below to complete the verification.
                            </p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg mb-4">
                            <h4 className="font-medium text-blue-800 mb-2">
                                <i className="fas fa-clock mr-2"></i>Rate Limiting Info
                            </h4>
                            <ul className="text-sm text-blue-700 space-y-1">
                                <li>• WhatsApp limits SMS verification requests to prevent abuse</li>
                                <li>• If you get a rate limit error, wait 10-15 minutes before trying again</li>
                                <li>• You can only request codes for the same number once every 10-15 minutes</li>
                                <li>• The SMS format will be: "WhatsApp code 123-456"</li>
                            </ul>
                        </div>
                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Verification Code
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter the 6-digit code from SMS"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    maxLength="6"
                                />
                            </div>
                            <button
                                onClick={verifyPhoneNumber}
                                disabled={loading || !verificationCode}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                {loading ? 'Verifying...' : 'Verify Code'}
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedNumber(null);
                                    setVerificationCode('');
                                }}
                                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold mb-4">Pre-Verified Phone Numbers</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2">Phone Number</th>
                                    <th className="text-left py-2">Status</th>
                                    <th className="text-left py-2">Expiry Date</th>
                                    <th className="text-left py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {numbers.map((number) => {
                                    const isExpired = number.verification_expiry_time && new Date(number.verification_expiry_time) < new Date();
                                    const isExpiringSoon = number.verification_expiry_time && new Date(number.verification_expiry_time) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
                                    
                                    return (
                                        <tr key={number.id} className="border-b">
                                            <td className="py-2">
                                                <div className="font-medium">{number.phone_number}</div>
                                                <div className="text-xs text-gray-500">ID: {number.id}</div>
                                            </td>
                                            <td className="py-2">
                                                <span className={`px-2 py-1 rounded text-sm ${
                                                    number.status === 'VERIFIED' 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : number.status === 'NOT_VERIFIED'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {number.status}
                                                </span>
                                                {isExpired && (
                                                    <div className="text-xs text-red-600 mt-1">Expired</div>
                                                )}
                                                {isExpiringSoon && !isExpired && (
                                                    <div className="text-xs text-orange-600 mt-1">Expiring Soon</div>
                                                )}
                                            </td>
                                            <td className="py-2">
                                                {number.verification_expiry_time && new Date(number.verification_expiry_time).getFullYear() > 1970 ? (
                                                    <div>
                                                        <div>{new Date(number.verification_expiry_time).toLocaleDateString()}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {new Date(number.verification_expiry_time).toLocaleTimeString()}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">No expiry set</span>
                                                )}
                                            </td>
                                            <td className="py-2">
                                                <div className="flex gap-2">
                                                    {number.status === 'NOT_VERIFIED' && (
                                                        <button
                                                            onClick={() => requestVerificationCode(number.id)}
                                                            className="text-blue-600 hover:underline text-sm"
                                                        >
                                                            Request Code
                                                        </button>
                                                    )}
                                                    {number.status === 'VERIFIED' && !isExpired && (
                                                        <span className="text-green-600 text-sm">Ready for use</span>
                                                    )}
                                                    {isExpired && (
                                                        <button
                                                            onClick={() => requestVerificationCode(number.id)}
                                                            className="text-orange-600 hover:underline text-sm"
                                                        >
                                                            Re-verify
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => registerPhoneNumber(number.id)}
                                                        disabled={loading}
                                                        className="text-green-600 hover:underline text-sm disabled:opacity-50"
                                                        title="Register for Cloud API"
                                                    >
                                                        <i className="fas fa-cog mr-1"></i>Register
                                                    </button>
                                                    <button
                                                        onClick={() => deletePhoneNumber(number.id)}
                                                        className="text-red-600 hover:underline text-sm"
                                                        title="Delete phone number"
                                                    >
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {selectedNumber && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold mb-4">Verify Pre-Verified Phone Number</h3>
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <h4 className="font-medium text-blue-800 mb-2">
                                    <i className="fas fa-info-circle mr-2"></i>Verification Process
                                </h4>
                                <p className="text-sm text-blue-700 mb-3">
                                    This will send a verification code to the phone number. Once verified, the number will be available for 90 days for use in Embedded Signup.
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={numbers.find(n => n.id === selectedNumber)?.phone_number || ''}
                                        readOnly
                                        className="flex-1 px-3 py-2 bg-white border rounded text-sm"
                                        placeholder="Phone number"
                                    />
                                    <button
                                        onClick={() => requestVerificationCode(selectedNumber)}
                                        disabled={loading}
                                        className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        <i className="fas fa-sms mr-1"></i>Send Code
                                    </button>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-2">Verification Method</label>
                                <select
                                    value={codeMethod}
                                    onChange={(e) => setCodeMethod(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="SMS">SMS</option>
                                    <option value="VOICE">Voice Call</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-2">Verification Code</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Enter verification code"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value)}
                                        className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                        onClick={verifyPhoneNumber}
                                        disabled={loading}
                                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                                    >
                                        Verify
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
                );
    };

    const MultiWabaRegistration = () => {
        const [wabas, setWabas] = useState([]);
        const [selectedWaba, setSelectedWaba] = useState(null);
        const [wabaPhoneNumbers, setWabaPhoneNumbers] = useState([]);
        const [selectedPhoneNumber, setSelectedPhoneNumber] = useState(null);
        const [pin, setPin] = useState('');

        // Load WABAs from Business Manager
        const loadWabas = async () => {
            try {
                setLoading(true);
                
                // Get owned WABAs (WABAs owned by your business)
                const ownedResponse = await fetch(`https://graph.facebook.com/v18.0/${businessPortfolioId}/owned_whatsapp_business_accounts?access_token=${accessToken}`);
                const ownedData = await ownedResponse.json();
                console.log('📱 Owned WABAs response:', ownedData);
                
                // Check for rate limiting error and get wait time from headers
                if (ownedData.error && ownedData.error.code === 80008) {
                    const waitTime = ownedResponse.headers.get('X-Business-Use-Case-Usage') || 
                                   ownedResponse.headers.get('x-business-use-case-usage') ||
                                   'unknown';
                    console.log('⏱️ Rate limit headers:', waitTime);
                    
                    // Try to parse the wait time from the header
                    let estimatedWaitSeconds = 3600; // Default 1 hour
                    try {
                        const usageData = JSON.parse(waitTime);
                        if (usageData && usageData.estimated_time_to_regain_access) {
                            estimatedWaitSeconds = usageData.estimated_time_to_regain_access;
                        }
                    } catch (e) {
                        console.log('Could not parse rate limit header:', waitTime);
                    }
                    
                    const waitMinutes = Math.ceil(estimatedWaitSeconds / 60);
                    showMessage('error', `Rate limit exceeded. Please wait ${waitMinutes} minutes before trying again.`);
                    setWabas([]);
                    return;
                }
                
                // Get client WABAs (WABAs shared with you by clients)
                const clientResponse = await fetch(`https://graph.facebook.com/v18.0/${businessPortfolioId}/client_whatsapp_business_accounts?filtering=[{"field":"partners","operator":"ALL","value":["${businessPortfolioId}"]}]&access_token=${accessToken}`);
                const clientData = await clientResponse.json();
                console.log('📱 Client WABAs response:', clientData);
                
                // Check for rate limiting error in client response
                if (clientData.error && clientData.error.code === 80008) {
                    const waitTime = clientResponse.headers.get('X-Business-Use-Case-Usage') || 
                                   clientResponse.headers.get('x-business-use-case-usage') ||
                                   'unknown';
                    console.log('⏱️ Rate limit headers:', waitTime);
                    
                    // Try to parse the wait time from the header
                    let estimatedWaitSeconds = 3600; // Default 1 hour
                    try {
                        const usageData = JSON.parse(waitTime);
                        if (usageData && usageData.estimated_time_to_regain_access) {
                            estimatedWaitSeconds = usageData.estimated_time_to_regain_access;
                        }
                    } catch (e) {
                        console.log('Could not parse rate limit header:', waitTime);
                    }
                    
                    const waitMinutes = Math.ceil(estimatedWaitSeconds / 60);
                    showMessage('error', `Rate limit exceeded. Please wait ${waitMinutes} minutes before trying again.`);
                    setWabas([]);
                    return;
                }
                
                // Combine both lists
                const allWabas = [
                    ...(ownedData.data || []).map(waba => ({ ...waba, type: 'owned' })),
                    ...(clientData.data || []).map(waba => ({ ...waba, type: 'client' }))
                ];
                
                setWabas(allWabas);
                
            } catch (error) {
                console.error('Error loading WABAs:', error);
                showMessage('error', 'Failed to load WABAs: ' + error.message);
                setWabas([]);
            } finally {
                setLoading(false);
            }
        };

        // Load phone numbers for selected WABA
        const loadWabaPhoneNumbers = async (wabaId) => {
            try {
                setLoading(true);
                const response = await fetch(`https://graph.facebook.com/v18.0/${wabaId}/phone_numbers?access_token=${accessToken}`);
                const data = await response.json();
                console.log('📱 WABA phone numbers response:', data);
                
                // Check for rate limiting error
                if (data.error && data.error.code === 80008) {
                    const waitTime = response.headers.get('X-Business-Use-Case-Usage') || 
                                   response.headers.get('x-business-use-case-usage') ||
                                   'unknown';
                    console.log('⏱️ Rate limit headers:', waitTime);
                    
                    // Try to parse the wait time from the header
                    let estimatedWaitSeconds = 3600; // Default 1 hour
                    try {
                        const usageData = JSON.parse(waitTime);
                        if (usageData && usageData.estimated_time_to_regain_access) {
                            estimatedWaitSeconds = usageData.estimated_time_to_regain_access;
                        }
                    } catch (e) {
                        console.log('Could not parse rate limit header:', waitTime);
                    }
                    
                    const waitMinutes = Math.ceil(estimatedWaitSeconds / 60);
                    showMessage('error', `Rate limit exceeded. Please wait ${waitMinutes} minutes before trying again.`);
                    setWabaPhoneNumbers([]);
                    return;
                }
                
                setWabaPhoneNumbers(data.data || []);
            } catch (error) {
                console.error('Error loading WABA phone numbers:', error);
                showMessage('error', 'Failed to load WABA phone numbers');
            } finally {
                setLoading(false);
            }
        };

        // No automatic loading - only manual refresh

        // Manual phone number loading - no automatic loading

        return (
            <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold mb-4">Multi-WABA Phone Number Registration</h3>
                    
                    {/* WABA Selection */}
                    <div className="mb-6">
                        <h4 className="font-medium mb-3">Select WABA</h4>
                        
                        {/* WABA Dropdown */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Choose WABA:</label>
                            <select
                                value={selectedWaba?.id || ''}
                                onChange={(e) => {
                                    const selectedId = e.target.value;
                                    if (selectedId) {
                                        const waba = wabas.find(w => w.id === selectedId);
                                        setSelectedWaba(waba);
                                    } else {
                                        setSelectedWaba(null);
                                    }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select a WABA...</option>
                                {wabas.map(waba => (
                                    <option key={waba.id} value={waba.id}>
                                        {waba.name} ({waba.id}) - {waba.type === 'owned' ? 'Owned' : 'Client'}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        {/* Manual WABA Input */}
                        <div className="mb-4 p-4 border border-gray-200 rounded-lg">
                            <label className="block text-sm font-medium mb-2">Or enter WABA ID manually:</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Enter WABA ID"
                                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && e.target.value.trim()) {
                                            setSelectedWaba({
                                                id: e.target.value.trim(),
                                                name: `WABA ${e.target.value.trim()}`,
                                                verification_status: 'Unknown',
                                                type: 'manual'
                                            });
                                        }
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        const input = document.querySelector('input[placeholder="Enter WABA ID"]');
                                        if (input && input.value.trim()) {
                                            setSelectedWaba({
                                                id: input.value.trim(),
                                                name: `WABA ${input.value.trim()}`,
                                                verification_status: 'Unknown',
                                                type: 'manual'
                                            });
                                        }
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Load
                                </button>
                            </div>
                        </div>
                        
                        {wabas.length === 0 && (
                            <div className="text-center py-4">
                                <p className="text-gray-500 mb-2">Click the button below to load your WABAs</p>
                                <button
                                    onClick={loadWabas}
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {loading ? 'Loading...' : 'Load WABAs'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Phone Numbers for Selected WABA */}
                    {selectedWaba && (
                        <div className="mb-6">
                            <h4 className="font-medium mb-3">Phone Numbers in {selectedWaba.name || selectedWaba.id}</h4>
                            
                            {/* Load Phone Numbers Button */}
                            {wabaPhoneNumbers.length === 0 && (
                                <div className="text-center py-4">
                                    <button
                                        onClick={() => loadWabaPhoneNumbers(selectedWaba.id)}
                                        disabled={loading}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {loading ? 'Loading...' : 'Load Phone Numbers'}
                                    </button>
                                </div>
                            )}
                            
                            <div className="space-y-2">
                                {wabaPhoneNumbers.map(phone => (
                                    <div
                                        key={phone.id}
                                        onClick={() => setSelectedPhoneNumber(phone)}
                                        className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                                            selectedPhoneNumber?.id === phone.id ? 'border-green-500 bg-green-50' : 'border-gray-200'
                                        }`}
                                    >
                                        <div className="font-medium">{phone.display_phone_number}</div>
                                        <div className="text-sm text-gray-500">ID: {phone.id}</div>
                                        <div className="text-sm text-gray-500">Status: {phone.code_verification_status}</div>
                                    </div>
                                ))}
                            </div>
                            {wabaPhoneNumbers.length === 0 && !loading && (
                                <p className="text-gray-500 text-center py-4">Click "Load Phone Numbers" to see phone numbers in this WABA</p>
                            )}
                        </div>
                    )}

                    {/* Registration Form */}
                    {selectedPhoneNumber && (
                        <div className="border-t pt-6">
                            <h4 className="font-medium mb-3">Register {selectedPhoneNumber.display_phone_number}</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">6-Digit PIN</label>
                                    <input
                                        type="text"
                                        placeholder="Enter 6-digit PIN"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        maxLength="6"
                                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => registerPhoneNumber(selectedPhoneNumber.id, pin)}
                                        disabled={loading || pin.length !== 6}
                                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {loading ? 'Registering...' : 'Register Phone Number'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedPhoneNumber(null);
                                            setPin('');
                                        }}
                                        className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const EmbeddedSignupConfig = ({ facebookAppId, facebookConfigId }) => {
        const [config, setConfig] = useState({
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

        const [selectedNumbers, setSelectedNumbers] = useState([]);

        // Initialize Facebook SDK
        useEffect(() => {
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

    const StatusMonitoring = () => {
            const calculateDaysUntilExpiry = (expiryTime) => {
        if (!expiryTime) return null;
        const expiry = new Date(expiryTime);
        
        // Check if it's a valid date (not 1970 epoch)
        if (expiry.getFullYear() <= 1970) return null;
        
        const now = new Date();
        const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        return daysLeft;
    };

        return (
            <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold mb-4">Pre-Verified Phone Number Status Overview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-blue-600">{numbers.length}</div>
                            <div className="text-sm text-gray-600">Total Numbers</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-green-600">
                                {numbers.filter(n => n.status === 'VERIFIED').length}
                            </div>
                            <div className="text-sm text-gray-600">Verified</div>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-yellow-600">
                                {numbers.filter(n => n.status === 'NOT_VERIFIED').length}
                            </div>
                            <div className="text-sm text-gray-600">Not Verified</div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-red-600">
                                {numbers.filter(n => {
                                    const daysLeft = calculateDaysUntilExpiry(n.verification_expiry_time);
                                    return daysLeft !== null && daysLeft <= 0;
                                }).length}
                            </div>
                            <div className="text-sm text-gray-600">Expired</div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-medium">Verification & Expiration Status</h4>
                        {numbers.map(number => {
                            const daysLeft = calculateDaysUntilExpiry(number.verification_expiry_time);
                            const isExpired = daysLeft !== null && daysLeft <= 0;
                            const isExpiringSoon = daysLeft !== null && daysLeft <= 30 && daysLeft > 0;

                            return (
                                <div key={number.id} className="border rounded-lg p-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="font-medium">{number.phone_number}</div>
                                            <div className="text-sm text-gray-500">
                                                ID: {number.id}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="mb-1">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                    number.status === 'VERIFIED' 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {number.status}
                                                </span>
                                            </div>
                                            {daysLeft !== null ? (
                                                isExpired ? (
                                                    <span className="text-red-600 font-medium text-sm">
                                                        <i className="fas fa-exclamation-circle mr-1"></i>Expired
                                                    </span>
                                                ) : isExpiringSoon ? (
                                                    <span className="text-yellow-600 font-medium text-sm">
                                                        <i className="fas fa-clock mr-1"></i>{daysLeft} days left
                                                    </span>
                                                ) : (
                                                    <span className="text-green-600 text-sm">
                                                        <i className="fas fa-check-circle mr-1"></i>{daysLeft} days left
                                                    </span>
                                                )
                                            ) : (
                                                <span className="text-gray-500 text-sm">No expiry set</span>
                                            )}
                                        </div>
                                    </div>
                                    {number.status === 'NOT_VERIFIED' && !isExpired && (
                                        <div className="mt-2 text-sm text-amber-600">
                                            <i className="fas fa-warning mr-1"></i>
                                            This number needs to be verified before it can be used in Embedded Signup
                                        </div>
                                    )}
                                    {isExpired && (
                                        <div className="mt-2 text-sm text-red-600">
                                            <i className="fas fa-exclamation-triangle mr-1"></i>
                                            This number has expired and needs to be re-verified
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow-sm">
                <div className="container mx-auto px-4 py-4">
                    <h1 className="text-2xl font-bold text-gray-800">
                        <i className="fab fa-whatsapp text-green-500 mr-2"></i>
                        WhatsApp Pre-Verified Numbers Management
                    </h1>
                </div>
            </header>

            <div className="container mx-auto px-4 py-6">
                {message.text && (
                    <div className={`mb-4 p-4 rounded-lg ${
                        message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                        <i className={`fas ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2`}></i>
                        {message.text}
                    </div>
                )}

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

                <div className="bg-white rounded-lg shadow-md mb-6">
                    <div className="flex border-b">
                        <button
                            className={`px-6 py-3 font-medium ${
                                activeTab === 'numbers' 
                                    ? 'border-b-2 border-blue-600 text-blue-600' 
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                            onClick={() => setActiveTab('numbers')}
                        >
                            <i className="fas fa-phone mr-2"></i>Phone Numbers
                        </button>
                        <button
                            className={`px-6 py-3 font-medium ${
                                activeTab === 'signup' 
                                    ? 'border-b-2 border-blue-600 text-blue-600' 
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                            onClick={() => setActiveTab('signup')}
                        >
                            <i className="fas fa-cog mr-2"></i>Embedded Signup
                        </button>
                        <button
                            className={`px-6 py-3 font-medium ${
                                activeTab === 'status' 
                                    ? 'border-b-2 border-blue-600 text-blue-600' 
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                            onClick={() => setActiveTab('status')}
                        >
                            <i className="fas fa-chart-line mr-2"></i>Status Monitoring
                        </button>
                        <button
                            className={`px-6 py-3 font-medium ${
                                activeTab === 'registration' 
                                    ? 'border-b-2 border-blue-600 text-blue-600' 
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                            onClick={() => setActiveTab('registration')}
                        >
                            <i className="fas fa-cog mr-2"></i>Multi-WABA Registration
                        </button>
                    </div>
                    <div className="p-6">
                        {activeTab === 'numbers' && <PhoneNumberManagement />}
                        {activeTab === 'signup' && <EmbeddedSignupConfig facebookAppId={facebookAppId} facebookConfigId={facebookConfigId} />}
                        {activeTab === 'status' && <StatusMonitoring />}
                        {activeTab === 'registration' && <MultiWabaRegistration />}
                    </div>
                </div>
            </div>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);