import { fileURLToPath } from 'node:url'

export function isDirectRun(metaUrl: string): boolean {
	return process.argv[1] === fileURLToPath(metaUrl)
}
