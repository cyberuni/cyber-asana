import path from 'node:path'
import { fileURLToPath } from 'node:url'

const toolDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const workspaceRoot = path.resolve(toolDir, '../..')

const dataDir = path.join(toolDir, 'data')
export const cyberAsanaSrcDir = path.join(workspaceRoot, 'packages/cyber-asana/src')

export const officialBaselinePath = path.join(dataDir, 'official-asana-mcp-baseline.json')
export const cyberCatalogPath = path.join(dataDir, 'cyber-asana-mcp-catalog.json')
export const officialToolsReferenceUrl = 'https://developers.asana.com/docs/mcp-tools-reference'

export const restBaselinePath = path.join(dataDir, 'asana-rest-baseline.json')
export const asanaOpenApiUrl = 'https://raw.githubusercontent.com/Asana/openapi/master/defs/asana_oas.yaml'
