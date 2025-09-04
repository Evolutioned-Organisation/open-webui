/**
 * Log Viewer Utility Functions
 *
 * This file contains all the helper functions for processing and formatting log data.
 * These functions are used across multiple log viewer components.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface LogEntry {
	[key: string]: any;
	timestamp?: string | number;
	level?: string;
	message?: string;
	msg?: string;
	text?: string;
	event_type?: string;
	duration?: number;
	duration_ms?: number;
	execution_time?: number;
	tokens?: number;
	token_usage?: any;
	query_type?: string;
	chat_id?: string;
	workflow_id?: string;
	data?: any;
	metadata?: any;
	errors?: any;
	cypher_query?: string;
	query?: string;
	cypher?: string;
	sql?: string;
	results?: any[];
	cypher_results?: any[];
	query_results?: any[];
	records?: any[];
}

export interface LogContent {
	content: LogEntry[] | any;
	metadata?: any;
	summary?: any;
}

export interface WorkflowSummary {
	totalSteps: number;
	totalDuration: number;
	totalTokens: number;
	errorCount: number;
	successCount: number;
	entityCount: number;
	cypherQueries: number;
}

// ============================================================================
// FORMATTING FUNCTIONS
// ============================================================================

/**
 * Format file size in bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 B';
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format token usage for display
 */
export function formatTokenUsage(tokens: number): string {
	if (!tokens || tokens === 0) return '0';
	if (tokens >= 1000000) {
		return (tokens / 1000000).toFixed(1) + 'M';
	} else if (tokens >= 1000) {
		return (tokens / 1000).toFixed(1) + 'K';
	}
	return tokens.toString();
}

/**
 * Format timestamp for timeline display
 */
export function formatTimelineTimestamp(timestamp: string | number): string {
	try {
		// Handle Unix timestamp (seconds) by converting to milliseconds
		const ts = typeof timestamp === 'number' ? timestamp * 1000 : timestamp;
		const date = new Date(ts);
		return date.toLocaleString();
	} catch {
		return timestamp.toString();
	}
}

/**
 * Format date for display
 */
export function formatDate(date: string | number): string {
	try {
		// Handle Unix timestamp (seconds) by converting to milliseconds
		const timestamp = typeof date === 'number' ? date * 1000 : date;
		return new Date(timestamp).toLocaleString();
	} catch {
		return date.toString();
	}
}

/**
 * Format duration in milliseconds
 */
export function formatDuration(duration: number): string {
	if (!duration) return 'N/A';
	return `${duration}ms`;
}

// ============================================================================
// CYPHER QUERY FUNCTIONS
// ============================================================================

/**
 * Detect if a log entry contains a Cypher query
 */
export function isCypherQuery(entry: LogEntry): boolean {
	if (!entry) return false;

	// Check for explicit query type
	if (entry.query_type === 'entity_discovery' || entry.query_type === 'claim_discovery')
		return true;

	// Check message content for Cypher keywords
	const message = entry.message || entry.msg || entry.text || '';
	const cypherKeywords = ['MATCH', 'CREATE', 'MERGE', 'DELETE', 'SET', 'RETURN', 'WHERE', 'WITH'];
	const hasKeywords = cypherKeywords.some((keyword) => message.toUpperCase().includes(keyword));

	// Check for query patterns
	const queryPatterns = [
		/\([a-zA-Z_][a-zA-Z0-9_]*\)/g, // Node patterns like (n)
		/-\[[a-zA-Z_][a-zA-Z0-9_]*\]->/g, // Relationship patterns like -[r]->
		/\([a-zA-Z_][a-zA-Z0-9_]*:\w+\)/g // Labeled nodes like (n:Person)
	];
	const hasPatterns = queryPatterns.some((pattern) => pattern.test(message));

	return hasKeywords && hasPatterns;
}

/**
 * Extract Cypher query from log entry
 */
export function extractCypherQuery(entry: LogEntry): string | null {
	if (!entry) return null;

	// Try to find query in various fields
	const possibleFields = [
		entry.query,
		entry.cypher_query,
		entry.cypher,
		entry.data?.query,
		entry.data?.cypher_query,
		entry.data?.cypher,
		entry.message,
		entry.msg,
		entry.text
	];

	for (const field of possibleFields) {
		if (typeof field === 'string' && field.trim()) {
			// Check if it looks like a Cypher query
			const cypherKeywords = [
				'MATCH',
				'CREATE',
				'MERGE',
				'DELETE',
				'SET',
				'RETURN',
				'WHERE',
				'WITH'
			];
			if (cypherKeywords.some((keyword) => field.toUpperCase().includes(keyword))) {
				return field.trim();
			}
		}
	}

	return null;
}

/**
 * Extract Cypher results from log entry
 */
export function extractCypherResults(entry: LogEntry): any[] | null {
	if (!entry) return null;

	// Try to find results in various fields
	const possibleFields = [
		entry.results,
		entry.cypher_results,
		entry.data?.results,
		entry.data?.cypher_results,
		entry.data?.records,
		entry.records
	];

	for (const field of possibleFields) {
		if (Array.isArray(field) && field.length > 0) {
			return field;
		}
	}

	return null;
}

/**
 * Format Cypher query for display
 */
export function formatCypherQuery(query: string): string {
	if (!query) return '';

	// Add line breaks after common Cypher keywords
	return query
		.replace(/\b(MATCH|CREATE|MERGE|DELETE|SET|RETURN|WHERE|WITH|UNWIND|FOREACH)\b/g, '\n$1')
		.replace(/\b(AND|OR)\b/g, '\n  $1')
		.trim();
}

/**
 * Format Cypher results for display
 */
export function formatCypherResults(results: any[]): string {
	if (!results || results.length === 0) return 'No results';

	if (results.length === 1) {
		return JSON.stringify(results[0], null, 2);
	}

	// For multiple results, show a summary
	return `Found ${results.length} results:\n\n${results
		.slice(0, 3)
		.map((result, index) => `Result ${index + 1}:\n${JSON.stringify(result, null, 2)}`)
		.join('\n\n')}${results.length > 3 ? `\n\n... and ${results.length - 3} more results` : ''}`;
}

// ============================================================================
// CONTENT ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Check if content is valid JSON
 */
export function isValidJSON(content: any): boolean {
	if (!content) return false;
	return Array.isArray(content) || (typeof content === 'object' && content !== null);
}

/**
 * Count entities in log content
 */
export function countEntities(content: any): number {
	if (!content || !Array.isArray(content)) return 0;

	let count = 0;
	content.forEach((entry) => {
		if (entry.entities) {
			count += Array.isArray(entry.entities) ? entry.entities.length : 1;
		}
		if (entry.data?.entities) {
			count += Array.isArray(entry.data.entities) ? entry.data.entities.length : 1;
		}
	});
	return count;
}

/**
 * Count Cypher queries in log content
 */
export function countCypherQueries(content: any): number {
	if (!content || !Array.isArray(content)) return 0;

	return content.filter((entry) => isCypherQuery(entry)).length;
}

/**
 * Generate workflow summary from log content
 */
export function generateWorkflowSummary(content: any): WorkflowSummary {
	if (!content || !Array.isArray(content)) {
		return {
			totalSteps: 0,
			totalDuration: 0,
			totalTokens: 0,
			errorCount: 0,
			successCount: 0,
			entityCount: 0,
			cypherQueries: 0
		};
	}

	const summary: WorkflowSummary = {
		totalSteps: content.length,
		totalDuration: 0,
		totalTokens: 0,
		errorCount: 0,
		successCount: 0,
		entityCount: 0,
		cypherQueries: 0
	};

	content.forEach((entry) => {
		// Duration
		const duration = entry.duration || entry.duration_ms || entry.execution_time || 0;
		summary.totalDuration += duration;

		// Tokens
		const tokens = entry.tokens || entry.token_usage?.total_tokens || 0;
		summary.totalTokens += tokens;

		// Level counts
		const level = entry.level || entry.severity || '';
		if (level === 'ERROR') summary.errorCount++;
		if (level === 'SUCCESS') summary.successCount++;

		// Entities
		if (entry.entities) {
			summary.entityCount += Array.isArray(entry.entities) ? entry.entities.length : 1;
		}
		if (entry.data?.entities) {
			summary.entityCount += Array.isArray(entry.data.entities) ? entry.data.entities.length : 1;
		}

		// Cypher queries
		if (isCypherQuery(entry)) {
			summary.cypherQueries++;
		}
	});

	return summary;
}

// ============================================================================
// DATA EXTRACTION FUNCTIONS
// ============================================================================

/**
 * Extract key-value pairs from log entry for display
 */
export function extractKeyValuePairs(entry: LogEntry): Array<{
	key: string;
	value: string | number | boolean;
	formatted?: boolean;
	badge?: boolean;
	monospace?: boolean;
	badgeColor?: 'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'gray';
}> {
	const pairs: Array<{
		key: string;
		value: string | number | boolean;
		formatted?: boolean;
		badge?: boolean;
		monospace?: boolean;
		badgeColor?: 'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'gray';
	}> = [];

	// Event Type
	if (entry.event_type) {
		pairs.push({
			key: 'Event Type',
			value: entry.event_type,
			monospace: true
		});
	}

	// Full Message
	if (entry.message) {
		pairs.push({
			key: 'Full Message',
			value: entry.message
		});
	}

	// Duration
	if (entry.duration) {
		pairs.push({
			key: 'Duration',
			value: entry.duration,
			formatted: true
		});
	}

	// Token Usage
	if (entry.tokens && entry.tokens > 0) {
		pairs.push({
			key: 'Token Usage',
			value: entry.tokens,
			formatted: true
		});
	}

	// Level
	if (entry.level) {
		pairs.push({
			key: 'Level',
			value: entry.level,
			badge: true,
			badgeColor:
				entry.level === 'ERROR'
					? 'red'
					: entry.level === 'WARNING'
						? 'yellow'
						: entry.level === 'SUCCESS'
							? 'green'
							: 'blue'
		});
	}

	// Timestamp
	if (entry.timestamp) {
		pairs.push({
			key: 'Timestamp',
			value: entry.timestamp,
			formatted: true,
			monospace: true
		});
	}

	// Query Type
	if (entry.query_type) {
		pairs.push({
			key: 'Query Type',
			value: entry.query_type,
			badge: true,
			badgeColor: 'purple'
		});
	}

	// Chat ID
	if (entry.chat_id) {
		pairs.push({
			key: 'Chat ID',
			value: entry.chat_id,
			monospace: true
		});
	}

	// Workflow ID
	if (entry.workflow_id) {
		pairs.push({
			key: 'Workflow ID',
			value: entry.workflow_id,
			monospace: true
		});
	}

	return pairs;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate filename parameter
 */
export function validateFilename(filename: string): boolean {
	if (!filename || typeof filename !== 'string') return false;
	if (filename.length === 0 || filename.length > 255) return false;
	if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) return false;
	return true;
}

/**
 * Validate file path parameter
 */
export function validateFilePath(filePath: string): boolean {
	if (!filePath || typeof filePath !== 'string') return false;
	if (filePath.length === 0 || filePath.length > 1000) return false;
	return true;
}

/**
 * Sanitize URL parameter
 */
export function sanitizeUrlParameter(param: string): string {
	if (!param || typeof param !== 'string') return '';
	return param.replace(/[^a-zA-Z0-9._-]/g, '');
}

/**
 * Sanitize display content
 */
export function sanitizeDisplayContent(content: any): string {
	if (typeof content === 'string') {
		return content.replace(/[<>]/g, '');
	}
	return JSON.stringify(content);
}

/**
 * Create safe error message
 */
export function createSafeErrorMessage(error: any): string {
	if (typeof error === 'string') {
		return error.replace(/[<>]/g, '');
	}
	if (error?.message) {
		return error.message.replace(/[<>]/g, '');
	}
	return 'An unknown error occurred';
}
