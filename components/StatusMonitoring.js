const StatusMonitoring = ({ numbers }) => {
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

// Make component globally accessible
window.StatusMonitoring = StatusMonitoring; 