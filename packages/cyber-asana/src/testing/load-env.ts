import { existsSync } from 'node:fs'

/**
 * Loads each existing `.env` file into `process.env`, nearest first. A variable the
 * shell or an earlier file already set stays as it was, so an explicit `export` wins.
 */
export function loadEnvFiles(paths: string[]): void {
	for (const path of paths) {
		if (existsSync(path)) process.loadEnvFile(path)
	}
}
