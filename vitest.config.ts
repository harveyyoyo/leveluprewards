import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        setupFiles: ['./vitest.setup.ts'],
        include: ['src/**/*.{test,spec}.{ts,tsx}', 'src/**/__tests__/**/*.{ts,tsx}'],
        exclude: [
            'e2e/**',
            '**/e2e/**',
            '**/node_modules/**',
            '**/.firebase/**',
            '**/functions/**',
        ],
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    }
})
