const AddPhoneNumber = ({ 
    businessPortfolioId, 
    accessToken, 
    loading, 
    setLoading, 
    showMessage, 
    numbers, 
    setNumbers,
    validateAndFormatPhoneNumber 
}) => {
    const [phoneNumber, setPhoneNumber] = React.useState('');
    const [phoneNumberError, setPhoneNumberError] = React.useState('');

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
            console.log('Add Phone Number API Response:', data);
            
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

    return (
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
    );
};

// Make component globally accessible
window.AddPhoneNumber = AddPhoneNumber;