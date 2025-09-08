import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
	plugins: [react()],
	server: {
		port: 5173,
		proxy: {
			'/shorturls': {
				target: 'http://localhost:3000',
				changeOrigin: true,
			},
			'/u': {
				target: 'http://localhost:3000',
				changeOrigin: true,
			}
		}
	},
	build: {
		outDir: 'dist'
	}
}) 