import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./vitest.setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            include: ['src/lib/**/*.{ts,tsx}'],
            thresholds: {
                lines: 8,
                functions: 8,
                branches: 8,
                statements: 8,
            },
        },
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
