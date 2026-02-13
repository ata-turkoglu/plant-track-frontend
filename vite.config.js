import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig(function () { return ({
    plugins: [tailwindcss(), react()],
    server: {
        port: 5173,
    },
    test: {
        environment: 'jsdom',
        setupFiles: './src/setupTests.ts'
    }
}); });
