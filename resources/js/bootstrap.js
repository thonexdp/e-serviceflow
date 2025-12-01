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
// if (import.meta.env.VITE_PUSHER_APP_KEY) {
if ('staging-key') {
     window.Echo = new Echo({
        broadcaster: 'pusher',
        key: "staging-key",
        cluster: import.meta.env.PUSHER_APP_CLUSTER ?? 'mt1',
        wsHost: import.meta.env.PUSHER_HOST || window.location.hostname,
        wsPort: import.meta.env.PUSHER_PORT ?? 6001,
        wssPort: import.meta.env.PUSHER_PORT ?? 6001,
        forceTLS: (import.meta.env.PUSHER_SCHEME ?? 'http') === 'https',
        enabledTransports: ['ws', 'wss'],
        disableStats: true,
        authEndpoint: '/broadcasting/auth',
        auth: {
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
                'X-Requested-With': 'XMLHttpRequest',
            },
        },
    });
    // window.Echo = new Echo({
    //     broadcaster: 'pusher',
    //     key: import.meta.env.VITE_PUSHER_APP_KEY,
    //     cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER ?? 'mt1',
    //     wsHost: import.meta.env.VITE_PUSHER_HOST || window.location.hostname,
    //     wsPort: import.meta.env.VITE_PUSHER_PORT ?? 6001,
    //     wssPort: import.meta.env.VITE_PUSHER_PORT ?? 6001,
    //     forceTLS: (import.meta.env.VITE_PUSHER_SCHEME ?? 'http') === 'https',
    //     enabledTransports: ['ws', 'wss'],
    //     disableStats: true,
    //     authEndpoint: '/broadcasting/auth',
    //     auth: {
    //         headers: {
    //             'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
    //             'X-Requested-With': 'XMLHttpRequest',
    //         },
    //     },
    // });

    // Add connection event listeners for debugging
    window.Echo.connector.pusher.connection.bind('connected', () => {
        console.log('✅ WebSocket connected to Soketi');
    });

    window.Echo.connector.pusher.connection.bind('disconnected', () => {
        console.log('❌ WebSocket disconnected from Soketi');
    });

    window.Echo.connector.pusher.connection.bind('error', (err) => {
        console.error('❌ WebSocket error:', err);
    });
} else {
    console.warn('⚠️ VITE_PUSHER_APP_KEY is not set. WebSocket connections will not work.');
}
