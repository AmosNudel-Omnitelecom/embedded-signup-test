const MultiWabaRegistration = ({ 
    businessPortfolioId, 
    accessToken, 
    loading, 
    setLoading, 
    showMessage, 
    registerPhoneNumber 
}) => {
    const [wabas, setWabas] = React.useState([]);
    const [selectedWaba, setSelectedWaba] = React.useState(null);
    const [wabaPhoneNumbers, setWabaPhoneNumbers] = React.useState([]);
    const [selectedPhoneNumber, setSelectedPhoneNumber] = React.useState(null);
    const [pin, setPin] = React.useState('');

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

// Make component globally accessible
window.MultiWabaRegistration = MultiWabaRegistration;