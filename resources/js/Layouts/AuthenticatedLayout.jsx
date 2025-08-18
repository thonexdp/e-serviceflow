import React from 'react';

export default function AuthenticatedLayout({ 
    user = null, 
    header, 
    children, 
    notifications = [], 
    messages = [] 
}) {
    // Safe user access with fallbacks
    const userName = user?.name || 'Guest';
    const userEmail = user?.email || '';
    const userAvatar = user?.avatar || '/images/avatar/default.jpg';

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Your existing layout structure */}
            <nav className="bg-white border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <span>Welcome, {userName}</span>
                        </div>
                    </div>
                </div>
            </nav>

            {header && (
                <header className="bg-white shadow">
                    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                        {header}
                    </div>
                </header>
            )}

            <main>{children}</main>
        </div>
    );
}