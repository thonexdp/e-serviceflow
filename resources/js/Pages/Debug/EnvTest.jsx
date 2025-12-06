import React from 'react';

export default function EnvTest({ serverEnv, broadcastingConfig }) {
    // Get client-side VITE variables
    const clientViteVars = {
        'VITE_PUSHER_APP_KEY': import.meta.env.VITE_PUSHER_APP_KEY || 'NOT SET ❌',
        'VITE_PUSHER_HOST': import.meta.env.VITE_PUSHER_HOST || 'NOT SET ❌',
        'VITE_PUSHER_PORT': import.meta.env.VITE_PUSHER_PORT || 'NOT SET ❌',
        'VITE_PUSHER_SCHEME': import.meta.env.VITE_PUSHER_SCHEME || 'NOT SET ❌',
        'VITE_PUSHER_APP_CLUSTER': import.meta.env.VITE_PUSHER_APP_CLUSTER || 'NOT SET ❌',
    };

    // Check if Echo is available
    const echoStatus = {
        'Echo Available': window.Echo ? 'YES ✅' : 'NO ❌',
        'Pusher Available': window.Pusher ? 'YES ✅' : 'NO ❌',
    };

    // Try to get Echo connection status
    let echoConnectionStatus = 'N/A';
    if (window.Echo && window.Echo.connector && window.Echo.connector.pusher) {
        echoConnectionStatus = window.Echo.connector.pusher.connection.state || 'Unknown';
    }

    return (
        <div style={{
            fontFamily: 'monospace',
            padding: '20px',
            backgroundColor: '#1a1a1a',
            color: '#00ff00',
            minHeight: '100vh'
        }}>
            <h1 style={{ color: '#00ff00', marginBottom: '10px' }}>🔍 Environment Variables Debug Page</h1>
            <p style={{ color: '#ffff00', marginBottom: '30px' }}>
                ⚠️ IMPORTANT: Remove this route in production!
            </p>

            {/* Server-Side Environment Variables */}
            <div style={{ marginBottom: '30px' }}>
                <h2 style={{ color: '#00ddff', borderBottom: '2px solid #00ddff', paddingBottom: '5px' }}>
                    📡 Server-Side Environment Variables (Laravel .env)
                </h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#333' }}>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #555' }}>Variable</th>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #555' }}>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(serverEnv).map(([key, value]) => (
                            <tr key={key}>
                                <td style={{ padding: '8px', borderBottom: '1px solid #333' }}>{key}</td>
                                <td style={{
                                    padding: '8px',
                                    borderBottom: '1px solid #333',
                                    color: value ? '#00ff00' : '#ff0000'
                                }}>
                                    {value || 'NOT SET ❌'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Broadcasting Config */}
            <div style={{ marginBottom: '30px' }}>
                <h2 style={{ color: '#00ddff', borderBottom: '2px solid #00ddff', paddingBottom: '5px' }}>
                    📻 Broadcasting Configuration (config/broadcasting.php)
                </h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#333' }}>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #555' }}>Config Key</th>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #555' }}>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(broadcastingConfig).map(([key, value]) => (
                            <tr key={key}>
                                <td style={{ padding: '8px', borderBottom: '1px solid #333' }}>{key}</td>
                                <td style={{
                                    padding: '8px',
                                    borderBottom: '1px solid #333',
                                    color: value ? '#00ff00' : '#ff0000'
                                }}>
                                    {value || 'NOT SET ❌'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Client-Side VITE Variables */}
            <div style={{ marginBottom: '30px' }}>
                <h2 style={{ color: '#ff6600', borderBottom: '2px solid #ff6600', paddingBottom: '5px' }}>
                    🎨 Client-Side VITE Variables (Compiled into JavaScript)
                </h2>
                <p style={{ color: '#ffff00', fontSize: '14px', marginTop: '10px' }}>
                    These are baked into the JavaScript during <code>npm run build</code>
                </p>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#333' }}>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #555' }}>Variable</th>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #555' }}>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(clientViteVars).map(([key, value]) => (
                            <tr key={key}>
                                <td style={{ padding: '8px', borderBottom: '1px solid #333' }}>{key}</td>
                                <td style={{
                                    padding: '8px',
                                    borderBottom: '1px solid #333',
                                    color: value.includes('NOT SET') ? '#ff0000' : '#00ff00',
                                    fontWeight: value.includes('NOT SET') ? 'bold' : 'normal'
                                }}>
                                    {value}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Echo/Pusher Status */}
            <div style={{ marginBottom: '30px' }}>
                <h2 style={{ color: '#ff00ff', borderBottom: '2px solid #ff00ff', paddingBottom: '5px' }}>
                    🔌 WebSocket Connection Status
                </h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#333' }}>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #555' }}>Check</th>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #555' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(echoStatus).map(([key, value]) => (
                            <tr key={key}>
                                <td style={{ padding: '8px', borderBottom: '1px solid #333' }}>{key}</td>
                                <td style={{
                                    padding: '8px',
                                    borderBottom: '1px solid #333',
                                    color: value.includes('YES') ? '#00ff00' : '#ff0000',
                                    fontWeight: 'bold'
                                }}>
                                    {value}
                                </td>
                            </tr>
                        ))}
                        <tr>
                            <td style={{ padding: '8px', borderBottom: '1px solid #333' }}>Connection State</td>
                            <td style={{
                                padding: '8px',
                                borderBottom: '1px solid #333',
                                color: echoConnectionStatus === 'connected' ? '#00ff00' : '#ff0000',
                                fontWeight: 'bold'
                            }}>
                                {echoConnectionStatus}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Diagnostic Summary */}
            <div style={{
                padding: '20px',
                backgroundColor: '#2a2a2a',
                borderRadius: '5px',
                border: '2px solid #ffff00'
            }}>
                <h2 style={{ color: '#ffff00', marginTop: 0 }}>📋 Diagnostic Summary</h2>

                <h3 style={{ color: '#00ddff', marginTop: '20px' }}>Issues Found:</h3>
                <ul style={{ lineHeight: '1.8' }}>
                    {!clientViteVars.VITE_PUSHER_APP_KEY.includes('NOT SET') ? (
                        <li style={{ color: '#00ff00' }}>✅ VITE_PUSHER_APP_KEY is set</li>
                    ) : (
                        <li style={{ color: '#ff0000' }}>❌ VITE_PUSHER_APP_KEY is NOT SET - Build with --build-arg!</li>
                    )}

                    {!clientViteVars.VITE_PUSHER_HOST.includes('NOT SET') ? (
                        <li style={{ color: '#00ff00' }}>✅ VITE_PUSHER_HOST is set</li>
                    ) : (
                        <li style={{ color: '#ff0000' }}>❌ VITE_PUSHER_HOST is NOT SET - Build with --build-arg!</li>
                    )}

                    {serverEnv.PUSHER_APP_KEY ? (
                        <li style={{ color: '#00ff00' }}>✅ PUSHER_APP_KEY (server) is set</li>
                    ) : (
                        <li style={{ color: '#ff0000' }}>❌ PUSHER_APP_KEY (server) is NOT SET - Check Cloud Run env vars!</li>
                    )}

                    {serverEnv.PUSHER_HOST ? (
                        <li style={{ color: '#00ff00' }}>✅ PUSHER_HOST (server) is set</li>
                    ) : (
                        <li style={{ color: '#ff0000' }}>❌ PUSHER_HOST (server) is NOT SET - Check Cloud Run env vars!</li>
                    )}

                    {window.Echo ? (
                        <li style={{ color: '#00ff00' }}>✅ Echo is initialized</li>
                    ) : (
                        <li style={{ color: '#ff0000' }}>❌ Echo is NOT initialized - VITE vars missing during build!</li>
                    )}
                </ul>

                <h3 style={{ color: '#00ddff', marginTop: '20px' }}>What Values Should Match:</h3>
                <div style={{
                    padding: '15px',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '3px',
                    marginTop: '10px'
                }}>
                    <p style={{ margin: '5px 0' }}>
                        Server PUSHER_APP_KEY: <strong style={{ color: '#00ff00' }}>{serverEnv.PUSHER_APP_KEY || 'NOT SET'}</strong>
                    </p>
                    <p style={{ margin: '5px 0' }}>
                        Client VITE_PUSHER_APP_KEY: <strong style={{ color: '#00ff00' }}>{clientViteVars.VITE_PUSHER_APP_KEY}</strong>
                    </p>
                    <p style={{ margin: '5px 0', color: serverEnv.PUSHER_APP_KEY === clientViteVars.VITE_PUSHER_APP_KEY ? '#00ff00' : '#ff0000' }}>
                        {serverEnv.PUSHER_APP_KEY === clientViteVars.VITE_PUSHER_APP_KEY ? '✅ MATCH!' : '❌ MISMATCH!'}
                    </p>

                    <hr style={{ border: '1px solid #333', margin: '15px 0' }} />

                    <p style={{ margin: '5px 0' }}>
                        Server PUSHER_HOST: <strong style={{ color: '#00ff00' }}>{serverEnv.PUSHER_HOST || 'NOT SET'}</strong>
                    </p>
                    <p style={{ margin: '5px 0' }}>
                        Client VITE_PUSHER_HOST: <strong style={{ color: '#00ff00' }}>{clientViteVars.VITE_PUSHER_HOST}</strong>
                    </p>
                    <p style={{ margin: '5px 0', color: serverEnv.PUSHER_HOST === clientViteVars.VITE_PUSHER_HOST ? '#00ff00' : '#ff0000' }}>
                        {serverEnv.PUSHER_HOST === clientViteVars.VITE_PUSHER_HOST ? '✅ MATCH!' : '❌ MISMATCH!'}
                    </p>
                </div>

                <h3 style={{ color: '#ff6600', marginTop: '20px' }}>Next Steps:</h3>
                <ol style={{ lineHeight: '2' }}>
                    <li>If VITE_ vars are NOT SET: Rebuild Docker image with --build-arg flags</li>
                    <li>If PUSHER_ vars are NOT SET: Update Cloud Run environment variables</li>
                    <li>If values MISMATCH: Ensure both use the same keys/host</li>
                    <li>After fixing, check browser console for WebSocket connection</li>
                </ol>
            </div>

            <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#4a0000', borderRadius: '5px' }}>
                <p style={{ color: '#ff0000', fontWeight: 'bold', margin: 0 }}>
                    ⚠️ SECURITY WARNING: Delete this /test-env route before deploying to production!
                </p>
            </div>
        </div>
    );
}
