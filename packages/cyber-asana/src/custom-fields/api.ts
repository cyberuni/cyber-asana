import { createClient } from '../client.js'
import type { PaginationOptions } from '../pagination.js'
import type { ReadOptions } from '../read-options.js'
import { type CustomFieldGateway, createAsanaCustomFieldGateway } from './gateway.js'

export type CustomFieldApi = ReturnType<typeof createCustomFieldApi>

export function createCustomFieldApi(gateway: CustomFieldGateway) {
	return {
		listCustomFields(workspaceGid: string, opts?: PaginationOptions) {
			return gateway.listCustomFields(workspaceGid, opts)
		},
		getCustomField(customFieldGid: string, opts?: ReadOptions) {
			return gateway.getCustomField(customFieldGid, opts)
		},
		listCustomFieldSettingsForProject(projectGid: string, opts?: PaginationOptions) {
			return gateway.listCustomFieldSettingsForProject(projectGid, opts)
		},
		listCustomFieldSettingsForPortfolio(portfolioGid: string, opts?: PaginationOptions) {
			return gateway.listCustomFieldSettingsForPortfolio(portfolioGid, opts)
		},
		listCustomFieldSettingsForGoal(goalGid: string, opts?: PaginationOptions) {
			return gateway.listCustomFieldSettingsForGoal(goalGid, opts)
		},
		listCustomFieldSettingsForTeam(teamGid: string, opts?: PaginationOptions) {
			return gateway.listCustomFieldSettingsForTeam(teamGid, opts)
		},
	}
}

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
