/**
 * We'll load the axios HTTP library which allows us to easily issue requests
 * to our Laravel back-end. This library automatically handles sending the
 * CSRF token as a header based on the value of the "XSRF" token cookie.
 */

import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

/**
 * Echo exposes an expressive API for subscribing to channels and listening
 * for events that are broadcast by Laravel. Echo and event broadcasting
 * allows your team to easily build robust real-time web applications.
 */

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

// Only initialize Echo if Pusher key is available
if (import.meta.env.VITE_PUSHER_APP_KEY) {
    window.Echo = new Echo({
        broadcaster: 'pusher',
        key: import.meta.env.VITE_PUSHER_APP_KEY,
        cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER ?? 'mt1',
        forceTLS: true,
        encrypted: true,
        authEndpoint: '/broadcasting/auth',
        auth: {
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
                'X-Requested-With': 'XMLHttpRequest',
            },
        },
    });

    // Add connection event listeners for debugging
    window.Echo.connector.pusher.connection.bind('connected', () => {
        console.log('✅ WebSocket connected to Pusher');
    });

    window.Echo.connector.pusher.connection.bind('disconnected', () => {
        console.log('❌ WebSocket disconnected from Pusher');
    });

    window.Echo.connector.pusher.connection.bind('error', (err) => {
        console.error('❌ WebSocket error:', err);
    });
} else {
    console.warn('⚠️ VITE_PUSHER_APP_KEY is not set. WebSocket connections will not work.');
}
