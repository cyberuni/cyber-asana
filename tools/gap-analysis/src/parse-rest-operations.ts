import { parse } from 'yaml'
import type { RestOperation, RestParameter } from './rest-types.js'

const httpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']

/** Smallest plausible count; Asana's spec has 271 operations. */
const minimumOperationCount = 200

/** Parameter locations a command can expose; headers (`Asana-Enable`, ...) are client-wide. */
const parameterLocations = ['path', 'query', 'body'] as const

type Ref = { $ref?: string }
type OasParameter = Ref & { name?: string; in?: string }
type OasSchema = Ref & {
	allOf?: OasSchema[]
	properties?: Record<string, OasSchema>
	items?: OasSchema
	readOnly?: boolean
}
type OasRequestBody = Ref & { content?: Record<string, { schema?: OasSchema }> }
type OasOperation = {
	operationId?: string
	tags?: string[]
	deprecated?: boolean
	parameters?: OasParameter[]
	requestBody?: OasRequestBody
}
type OasDocument = {
	paths?: Record<string, Record<string, unknown> & { parameters?: OasParameter[] }>
	components?: Record<string, Record<string, unknown>>
}

function resolver(doc: OasDocument) {
	return <T extends Ref>(value: T | undefined): T | undefined => {
		let current: Ref | undefined = value
		for (let depth = 0; current?.$ref && depth < 20; depth++) {
			const [, , section, name] = current.$ref.split('/')
			current = doc.components?.[section!]?.[name!] as Ref | undefined
		}
		return current as T | undefined
	}
}

/** Top-level property names of a schema, through `$ref` and `allOf`, without read-only ones. */
function propertyNames(schema: OasSchema | undefined, resolve: ReturnType<typeof resolver>): string[] {
	const resolved = resolve(schema)
	if (!resolved) return []
	const own = Object.entries(resolved.properties ?? {})
		.filter(([, value]) => resolve(value)?.readOnly !== true)
		.map(([name]) => name)
	const inherited = (resolved.allOf ?? []).flatMap((part) => propertyNames(part, resolve))
	return [...own, ...inherited]
}

function bodyParameterNames(body: OasRequestBody | undefined, resolve: ReturnType<typeof resolver>): string[] {
	const content = resolve(body)?.content ?? {}
	const schema = resolve(Object.values(content)[0]?.schema)
	if (!schema) return []
	// JSON bodies wrap the fields in `data`; multipart bodies (attachments) carry them directly.
	const data = schema.properties?.data
	if (!data) return propertyNames(schema, resolve)
	const resolvedData = resolve(data)
	return propertyNames(resolvedData?.items ?? resolvedData, resolve)
}

function operationParameters(
	pathParameters: OasParameter[] | undefined,
	operation: OasOperation,
	resolve: ReturnType<typeof resolver>,
): RestParameter[] {
	const found = new Map<string, RestParameter>()
	for (const raw of [...(pathParameters ?? []), ...(operation.parameters ?? [])]) {
		const parameter = resolve(raw)
		if (!parameter?.name || !(parameterLocations as readonly string[]).includes(parameter.in ?? '')) continue
		found.set(`${parameter.in}:${parameter.name}`, { name: parameter.name, in: parameter.in as RestParameter['in'] })
	}
	for (const name of bodyParameterNames(operation.requestBody, resolve)) {
		found.set(`body:${name}`, { name, in: 'body' })
	}
	return [...found.values()].sort(
		(a, b) =>
			parameterLocations.indexOf(a.in) - parameterLocations.indexOf(b.in) ||
			(a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
	)
}

export function parseRestOperations(yamlText: string): RestOperation[] {
	const doc = parse(yamlText, { maxAliasCount: -1 }) as OasDocument | null
	if (!doc?.paths) throw new Error('OpenAPI document has no paths')
	const resolve = resolver(doc)

	const operations: RestOperation[] = []
	for (const [path, item] of Object.entries(doc.paths)) {
		for (const method of httpMethods) {
			const operation = item[method] as OasOperation | undefined
			if (!operation?.operationId) continue
			operations.push({
				operationId: operation.operationId,
				method: method.toUpperCase(),
				path,
				tag: operation.tags?.[0] ?? '',
				deprecated: operation.deprecated === true,
				parameters: operationParameters(item.parameters, operation, resolve),
			})
		}
	}
	return operations.sort((a, b) => (a.operationId < b.operationId ? -1 : a.operationId > b.operationId ? 1 : 0))
}

export function assertRestOperationCount(operations: RestOperation[]): void {
	if (operations.length < minimumOperationCount) {
		throw new Error(
			`Expected at least ${minimumOperationCount} REST operations, parsed ${operations.length}; the OpenAPI source may have moved`,
		)
	}
}
