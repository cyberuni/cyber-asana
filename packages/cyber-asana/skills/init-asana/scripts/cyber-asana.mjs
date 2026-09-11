#!/usr/bin/env node
// Runs the `cyber-asana` CLI that ships beside this skill, so a command never depends on
// a network fetch or on which version `npx` happens to resolve. The shipped CLI is
// bundled with its dependencies inlined, which is what makes this work from an installed
// plugin directory — those are copies of a source checkout and their `node_modules` is
// absent or incomplete.
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// <package>/skills/<skill>/scripts/cyber-asana.mjs: four levels up is the package root.
const packageRoot = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))))

// `dist/cli.js` parses `process.argv` and sets the exit code as a side effect of being
// imported, and it names its own program, so every argument this launcher received is
// already in the right place. There is nothing to splice and nothing to call.
await import(pathToFileURL(join(packageRoot, 'dist', 'cli.js')).href)
