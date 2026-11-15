/**
 * The HTML rules a surface accepts, as pure functions over one rule table. The domains that post
 * rich text (the scrum dashboard, `tidy-description`) call these; the CLI and MCP tools follow.
 */
export { checkHtml } from './check.js'
