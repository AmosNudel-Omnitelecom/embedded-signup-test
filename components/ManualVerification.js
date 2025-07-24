const ManualVerification = ({ 
    loading, 
    setLoading, 
    showMessage, 
    accessToken, 
    loadExistingNumbers 
}) => {
    const [selectedNumber, setSelectedNumber] = React.useState('');
    const [verificationCode, setVerificationCode] = React.useState('');

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
                setSelectedNumber('');
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
    );
};

// Make component globally accessible
window.ManualVerification = ManualVerification;