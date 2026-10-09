import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		include: ['src/**/*.system.ts', 'src/**/*.learn.test.ts'],
		exclude: ['node_modules', 'dist'],
	},
})
