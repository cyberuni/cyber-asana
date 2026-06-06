import path from 'node:path'
import { fileURLToPath } from 'node:url'

const moduleDir = path.dirname(fileURLToPath(import.meta.url))

export const repoRoot = path.resolve(moduleDir, '../..')

export const officialBaselinePath = path.join(repoRoot, 'data/official-asana-mcp-baseline.json')

export const cyberCatalogPath = path.join(repoRoot, 'data/cyber-asana-mcp-catalog.json')

export const officialToolsReferenceUrl = 'https://developers.asana.com/docs/mcp-tools-reference'
