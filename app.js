const { useState } = React;

// Import components
const Configuration = window.Configuration;
const AddPhoneNumber = window.AddPhoneNumber;
const ManualVerification = window.ManualVerification;
const PhoneNumbersList = window.PhoneNumbersList;
const EmbeddedSignup = window.EmbeddedSignup;
const StatusMonitoring = window.StatusMonitoring;
const MultiWabaRegistration = window.MultiWabaRegistration;

const App = () => {
    const [activeTab, setActiveTab] = useState('configuration');
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
            setLoading(true);
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
        } finally {
            setLoading(false);
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

                {/* Configuration Component */}
                {activeTab === 'configuration' && (
                    <Configuration 
                        businessPortfolioId={businessPortfolioId}
                        setBusinessPortfolioId={setBusinessPortfolioId}
                        accessToken={accessToken}
                        setAccessToken={setAccessToken}
                        loading={loading}
                        setLoading={setLoading}
                        showMessage={showMessage}
                        loadConfig={loadConfig}
                        loadExistingNumbers={loadExistingNumbers}
                    />
                )}

                <div className="bg-white rounded-lg shadow-md mb-6">
                    <div className="flex border-b">
                        <button
                            className={`px-6 py-3 font-medium ${
                                activeTab === 'configuration' 
                                    ? 'border-b-2 border-blue-600 text-blue-600' 
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                            onClick={() => setActiveTab('configuration')}
                        >
                            <i className="fas fa-cog mr-2"></i>Configuration
                        </button>
                        <button
                            className={`px-6 py-3 font-medium ${
                                activeTab === 'add' 
                                    ? 'border-b-2 border-blue-600 text-blue-600' 
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                            onClick={() => setActiveTab('add')}
                        >
                            <i className="fas fa-plus mr-2"></i>Add Phone Number
                        </button>
                        <button
                            className={`px-6 py-3 font-medium ${
                                activeTab === 'manual' 
                                    ? 'border-b-2 border-blue-600 text-blue-600' 
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                            onClick={() => setActiveTab('manual')}
                        >
                            <i className="fas fa-terminal mr-2"></i>Manual Verification
                        </button>
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
                        {activeTab === 'add' && (
                            <AddPhoneNumber 
                                businessPortfolioId={businessPortfolioId}
                                accessToken={accessToken}
                                loading={loading}
                                setLoading={setLoading}
                                showMessage={showMessage}
                                numbers={numbers}
                                setNumbers={setNumbers}
                                validateAndFormatPhoneNumber={validateAndFormatPhoneNumber}
                            />
                        )}
                        {activeTab === 'manual' && (
                            <ManualVerification 
                                loading={loading}
                                setLoading={setLoading}
                                showMessage={showMessage}
                                accessToken={accessToken}
                                loadExistingNumbers={loadExistingNumbers}
                            />
                        )}
                        {activeTab === 'numbers' && (
                            <PhoneNumbersList 
                                numbers={numbers}
                                loading={loading}
                                setLoading={setLoading}
                                showMessage={showMessage}
                                accessToken={accessToken}
                                deletePhoneNumber={deletePhoneNumber}
                                registerPhoneNumber={registerPhoneNumber}
                                loadExistingNumbers={loadExistingNumbers}
                            />
                        )}
                        {activeTab === 'signup' && (
                            <EmbeddedSignup 
                                facebookAppId={facebookAppId}
                                facebookConfigId={facebookConfigId}
                                numbers={numbers}
                                showMessage={showMessage}
                            />
                        )}
                        {activeTab === 'status' && (
                            <StatusMonitoring 
                                numbers={numbers}
                            />
                        )}
                        {activeTab === 'registration' && (
                            <MultiWabaRegistration 
                                businessPortfolioId={businessPortfolioId}
                                accessToken={accessToken}
                                loading={loading}
                                setLoading={setLoading}
                                showMessage={showMessage}
                                registerPhoneNumber={registerPhoneNumber}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);