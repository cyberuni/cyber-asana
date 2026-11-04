import type { OverlapEntry } from './types.js'

/** Hand-maintained official ↔ cyber-asana tool pairs. Updated when catalogs change. */
export const overlapMap: OverlapEntry[] = [
	{ official: 'get_task', cyber: 'asana_task_get', confidence: 'high' },
	{ official: 'get_tasks', cyber: 'asana_task_list', confidence: 'high' },
	{ official: 'get_my_tasks', cyber: 'asana_task_my_tasks', confidence: 'high' },
	{ official: 'search_tasks', cyber: 'asana_task_search', confidence: 'high' },
	{ official: 'create_tasks', cyber: 'asana_task_create', confidence: 'high' },
	{ official: 'update_tasks', cyber: 'asana_task_update', confidence: 'high' },
	{ official: 'delete_task', cyber: 'asana_task_delete', confidence: 'high' },
	{ official: 'add_comment', cyber: 'asana_comment_create', confidence: 'high' },
	{ official: 'get_project', cyber: 'asana_project_get', confidence: 'high' },
	{ official: 'get_projects', cyber: 'asana_project_list', confidence: 'high' },
	{ official: 'create_project', cyber: 'asana_project_create', confidence: 'high' },
	{ official: 'update_project', cyber: 'asana_project_update', confidence: 'high' },
	{
		official: 'create_project_from_template',
		cyber: 'asana_project_template_instantiate',
		confidence: 'high',
	},
	{
		official: 'create_task_from_template',
		cyber: 'asana_task_template_instantiate',
		confidence: 'high',
	},
	// `partial`: the official tool reads one task's stories; `asana_story_list` takes any parent.
	{ official: 'get_task_stories', cyber: 'asana_story_list', confidence: 'partial' },
	{ official: 'get_portfolio', cyber: 'asana_portfolio_get', confidence: 'high' },
	{ official: 'get_portfolios', cyber: 'asana_portfolio_list', confidence: 'high' },
	{ official: 'get_items_for_portfolio', cyber: 'asana_portfolio_item_list', confidence: 'high' },
	// Deliberately NOT paired with `asana_status_list`: `get_status_overview` returns an
	// aggregated report found by its own keyword search, with task summaries and flagged
	// blockers, while `asana_status_list` lists the updates on one parent named by GID.
	// Neither contains the other, so counting them as overlap overstates both servers.
	{ official: 'create_project_status_update', cyber: 'asana_status_create', confidence: 'partial' },
	{ official: 'get_attachments', cyber: 'asana_attachment_list', confidence: 'high' },
	{ official: 'get_user', cyber: 'asana_user_get', confidence: 'high' },
	{ official: 'get_me', cyber: 'asana_user_me', confidence: 'high' },
	{ official: 'get_users', cyber: 'asana_user_list', confidence: 'high' },
	{ official: 'get_teams', cyber: 'asana_team_list', confidence: 'high' },
	// `partial`: the official tool searches across object types in one call, ours takes one
	// `resource_type` per call because that is all Asana's typeahead endpoint accepts.
	{ official: 'search_objects', cyber: 'asana_search_objects', confidence: 'partial' },
]
