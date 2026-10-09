import { defineConfig } from 'vitest/config'
import { loadEnvFiles } from './src/testing/load-env.js'

// The fixture setup prints these variables; keeping them in a gitignored `.env`
// (package first, then repo root) saves exporting them for every system run.
loadEnvFiles(['.env', '../../.env'])

export default defineConfig({
	test: {
		include: ['src/**/*.system.ts', 'src/**/*.learn.test.ts'],
		exclude: ['node_modules', 'dist'],
	},
})
