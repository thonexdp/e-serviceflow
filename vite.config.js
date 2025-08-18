import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
    ],
    resolve: {
        alias: {
            '@': '/resources/js',
        },
    },
     server: {
        host: '0.0.0.0', // listen on all network interfaces
        port: 5173,      // ensure it matches docker-compose.yml
        strictPort: true, // fail instead of randomly picking another port
        hmr: {
            host: 'localhost', // browser will connect to your machine
        },
    },
});