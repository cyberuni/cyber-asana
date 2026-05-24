import { defineConfig } from 'tsdown'

export default defineConfig({
	entry: {
		index: 'src/index.ts',
		cli: 'src/cli.ts',
		mcp: 'src/mcp.ts',
	},
	format: 'esm',
	outExtensions: () => ({
		js: '.js',
	}),
	dts: true,
	clean: true,
	outDir: 'dist',
	platform: 'node',
	target: 'node22',
})
