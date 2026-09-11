import { defineConfig } from 'tsdown'

// Two configs, because the entries want opposite dependency treatment. They share an
// `outDir`, which is safe: tsdown hoists `clean` and runs it once across every config
// before any build writes, so neither wipes the other.
const shared = {
	format: 'esm',
	outDir: 'dist',
	platform: 'node',
	target: 'node22',
	// Without this tsdown writes `.mjs` / `.d.mts`, which would move the published
	// paths named in `exports` and `bin`.
	outExtensions: () => ({ js: '.js' }),
	clean: true,
} as const

export default defineConfig([
	{
		// Library entries. Dependencies stay EXTERNAL on purpose: zod schemas and the
		// MCP server types surface in the public `.d.ts`, and a consumer that also uses
		// zod must share one copy rather than get a private inlined duplicate.
		...shared,
		entry: { index: 'src/index.ts', mcp: 'src/mcp.ts' },
		dts: true,
	},
	{
		// CLI entry. Every runtime dependency is inlined so the published `dist/cli.js`
		// runs with no `node_modules` present — which is the state an installed agent
		// plugin is actually in, since the plugin directory is a copy of the source
		// checkout rather than an npm install.
		//
		// `bin` points straight at this file, so the `#!/usr/bin/env node` shebang in
		// `src/cli.ts` has to survive; tsdown preserves it and sets the execute bit.
		//
		// Regexes rather than bare names because these are imported by subpath too
		// (`@modelcontextprotocol/sdk/server/mcp.js`). Only this package's own
		// `dependencies` need listing — those are the only ones tsdown externalizes by
		// default, so anything they pull in transitively is inlined automatically.
		// `onlyBundle: false` silences the "bundled a dependency" warnings that are the
		// whole point here.
		...shared,
		entry: { cli: 'src/cli.ts' },
		dts: false,
		deps: {
			alwaysBundle: [/^@modelcontextprotocol\/sdk(\/|$)/, /^asana(\/|$)/, /^commander(\/|$)/, /^zod(\/|$)/],
			onlyBundle: false,
		},
	},
])
