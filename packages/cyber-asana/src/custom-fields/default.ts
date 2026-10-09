import { createClient } from '../platform/client.js'
import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import { createCustomFieldApi } from './api.js'
import { createAsanaCustomFieldGateway } from './gateway.js'

function defaultCustomFieldApi() {
	return createCustomFieldApi(createAsanaCustomFieldGateway(createClient()))
}

export async function listCustomFields(workspaceGid: string, opts?: PaginationOptions) {
	return defaultCustomFieldApi().listCustomFields(workspaceGid, opts)
}

export async function getCustomField(customFieldGid: string, opts?: ReadOptions) {
	return defaultCustomFieldApi().getCustomField(customFieldGid, opts)
}

export async function listCustomFieldSettingsForProject(projectGid: string, opts?: PaginationOptions) {
	return defaultCustomFieldApi().listCustomFieldSettingsForProject(projectGid, opts)
}

export async function listCustomFieldSettingsForPortfolio(portfolioGid: string, opts?: PaginationOptions) {
	return defaultCustomFieldApi().listCustomFieldSettingsForPortfolio(portfolioGid, opts)
}

export async function listCustomFieldSettingsForGoal(goalGid: string, opts?: PaginationOptions) {
	return defaultCustomFieldApi().listCustomFieldSettingsForGoal(goalGid, opts)
}

export async function listCustomFieldSettingsForTeam(teamGid: string, opts?: PaginationOptions) {
	return defaultCustomFieldApi().listCustomFieldSettingsForTeam(teamGid, opts)
}
