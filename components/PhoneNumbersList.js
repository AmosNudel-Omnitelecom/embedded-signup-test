const PhoneNumbersList = ({ 
    numbers, 
    loading, 
    setLoading, 
    showMessage, 
    accessToken, 
    deletePhoneNumber, 
    registerPhoneNumber, 
    loadExistingNumbers 
}) => {
    const [selectedNumber, setSelectedNumber] = React.useState(null);
    const [verificationCode, setVerificationCode] = React.useState('');
    const [codeMethod, setCodeMethod] = React.useState('SMS');

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
            {/* Verification Code Section */}
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

// Make component globally accessible
window.PhoneNumbersList = PhoneNumbersList;