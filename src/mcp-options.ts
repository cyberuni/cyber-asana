import { z } from 'zod'

export const paginationParams = {
	limit: z.number().int().min(1).max(100).optional().describe('Results per page, from 1 to 100'),
	offset: z.string().optional().describe('Offset token returned by a previous paginated response'),
	opt_fields: z.string().optional().describe('Comma-separated optional Asana fields to include'),
}

export const paginationParamsWithoutLimit = {
	offset: paginationParams.offset,
	opt_fields: paginationParams.opt_fields,
}

export function paginationOptions(params: { limit?: number; offset?: string; opt_fields?: string }) {
	return {
		limit: params.limit,
		offset: params.offset,
		optFields: params.opt_fields,
	}
}
