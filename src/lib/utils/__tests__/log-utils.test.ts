/**
 * Tests for log-utils.ts
 * 
 * This file contains comprehensive tests for all utility functions
 * used in the log viewer components.
 */

import { describe, it, expect } from 'vitest';
import {
	formatFileSize,
	formatTokenUsage,
	formatTimelineTimestamp,
	formatDate,
	formatDuration,
	isCypherQuery,
	extractCypherQuery,
	extractCypherResults,
	formatCypherQuery,
	formatCypherResults,
	isValidJSON,
	countEntities,
	countCypherQueries,
	generateWorkflowSummary,
	extractKeyValuePairs,
	validateFilename,
	validateFilePath,
	sanitizeUrlParameter,
	sanitizeDisplayContent,
	createSafeErrorMessage,
	type LogEntry,
	type WorkflowSummary
} from '../log-utils';

describe('log-utils', () => {
	describe('formatFileSize', () => {
		it('should format bytes correctly', () => {
			expect(formatFileSize(0)).toBe('0 B');
			expect(formatFileSize(1024)).toBe('1 KB');
			expect(formatFileSize(1048576)).toBe('1 MB');
			expect(formatFileSize(1073741824)).toBe('1 GB');
		});

		it('should handle decimal values', () => {
			expect(formatFileSize(1536)).toBe('1.5 KB');
			expect(formatFileSize(1572864)).toBe('1.5 MB');
		});
	});

	describe('formatTokenUsage', () => {
		it('should format token counts correctly', () => {
			expect(formatTokenUsage(0)).toBe('0');
			expect(formatTokenUsage(100)).toBe('100');
			expect(formatTokenUsage(1000)).toBe('1K');
			expect(formatTokenUsage(1500)).toBe('1.5K');
			expect(formatTokenUsage(1000000)).toBe('1M');
			expect(formatTokenUsage(1500000)).toBe('1.5M');
		});
	});

	describe('formatTimelineTimestamp', () => {
		it('should format valid timestamps', () => {
			const timestamp = '2023-12-01T10:30:00Z';
			const result = formatTimelineTimestamp(timestamp);
			expect(result).toContain('2023');
		});

		it('should handle invalid timestamps', () => {
			expect(formatTimelineTimestamp('invalid')).toBe('invalid');
			expect(formatTimelineTimestamp(1234567890)).toContain('1970');
		});
	});

	describe('isCypherQuery', () => {
		it('should detect entity_discovery query type', () => {
			const entry: LogEntry = { query_type: 'entity_discovery' };
			expect(isCypherQuery(entry)).toBe(true);
		});

		it('should detect Cypher keywords in message', () => {
			const entry: LogEntry = { 
				message: 'MATCH (n:Person) RETURN n.name WHERE n.age > 25' 
			};
			expect(isCypherQuery(entry)).toBe(true);
		});

		it('should detect Cypher patterns', () => {
			const entry: LogEntry = { 
				message: 'MATCH (n:Person)-[r:KNOWS]->(m:Person) RETURN n, r, m' 
			};
			expect(isCypherQuery(entry)).toBe(true);
		});

		it('should reject non-Cypher content', () => {
			const entry: LogEntry = { 
				message: 'This is just a regular log message' 
			};
			expect(isCypherQuery(entry)).toBe(false);
		});

		it('should handle null/undefined entries', () => {
			expect(isCypherQuery(null)).toBe(false);
			expect(isCypherQuery(undefined)).toBe(false);
		});
	});

	describe('extractCypherQuery', () => {
		it('should extract query from various fields', () => {
			const entry: LogEntry = { 
				cypher_query: 'MATCH (n) RETURN n',
				query: 'SELECT * FROM users',
				message: 'MATCH (n:Person) RETURN n'
			};
			expect(extractCypherQuery(entry)).toBe('MATCH (n) RETURN n');
		});

		it('should extract from nested data object', () => {
			const entry: LogEntry = { 
				data: { cypher_query: 'MATCH (n) RETURN n' }
			};
			expect(extractCypherQuery(entry)).toBe('MATCH (n) RETURN n');
		});

		it('should return null for non-Cypher content', () => {
			const entry: LogEntry = { 
				message: 'This is not a Cypher query' 
			};
			expect(extractCypherQuery(entry)).toBe(null);
		});
	});

	describe('extractCypherResults', () => {
		it('should extract results from various fields', () => {
			const results = [{ name: 'John' }, { name: 'Jane' }];
			const entry: LogEntry = { 
				results,
				cypher_results: [{ name: 'Bob' }],
				records: [{ name: 'Alice' }]
			};
			expect(extractCypherResults(entry)).toEqual(results);
		});

		it('should extract from nested data object', () => {
			const results = [{ name: 'John' }];
			const entry: LogEntry = { 
				data: { results }
			};
			expect(extractCypherResults(entry)).toEqual(results);
		});

		it('should return null for no results', () => {
			const entry: LogEntry = { message: 'No results here' };
			expect(extractCypherResults(entry)).toBe(null);
		});
	});

	describe('formatCypherQuery', () => {
		it('should add line breaks after keywords', () => {
			const query = 'MATCH (n) WHERE n.age > 25 RETURN n';
			const formatted = formatCypherQuery(query);
			expect(formatted).toContain('\nMATCH');
			expect(formatted).toContain('\nWHERE');
			expect(formatted).toContain('\nRETURN');
		});

		it('should handle empty queries', () => {
			expect(formatCypherQuery('')).toBe('');
			expect(formatCypherQuery(null as any)).toBe('');
		});
	});

	describe('formatCypherResults', () => {
		it('should format single result', () => {
			const results = [{ name: 'John', age: 30 }];
			const formatted = formatCypherResults(results);
			expect(formatted).toContain('John');
			expect(formatted).toContain('30');
		});

		it('should format multiple results with summary', () => {
			const results = [
				{ name: 'John' },
				{ name: 'Jane' },
				{ name: 'Bob' },
				{ name: 'Alice' }
			];
			const formatted = formatCypherResults(results);
			expect(formatted).toContain('Found 4 results');
			expect(formatted).toContain('... and 1 more results');
		});

		it('should handle empty results', () => {
			expect(formatCypherResults([])).toBe('No results');
			expect(formatCypherResults(null as any)).toBe('No results');
		});
	});

	describe('isValidJSON', () => {
		it('should validate arrays', () => {
			expect(isValidJSON([])).toBe(true);
			expect(isValidJSON([1, 2, 3])).toBe(true);
		});

		it('should validate objects', () => {
			expect(isValidJSON({})).toBe(true);
			expect(isValidJSON({ key: 'value' })).toBe(true);
		});

		it('should reject invalid types', () => {
			expect(isValidJSON(null)).toBe(false);
			expect(isValidJSON(undefined)).toBe(false);
			expect(isValidJSON('string')).toBe(false);
			expect(isValidJSON(123)).toBe(false);
		});
	});

	describe('countEntities', () => {
		it('should count entities in log entries', () => {
			const content = [
				{ entities: [{ name: 'John' }, { name: 'Jane' }] },
				{ data: { entities: [{ name: 'Bob' }] } },
				{ message: 'No entities here' }
			];
			expect(countEntities(content)).toBe(3);
		});

		it('should handle empty content', () => {
			expect(countEntities([])).toBe(0);
			expect(countEntities(null as any)).toBe(0);
		});
	});

	describe('countCypherQueries', () => {
		it('should count Cypher queries in content', () => {
			const content = [
				{ query_type: 'entity_discovery' },
				{ message: 'MATCH (n) RETURN n' },
				{ message: 'Regular log message' }
			];
			expect(countCypherQueries(content)).toBe(2);
		});
	});

	describe('generateWorkflowSummary', () => {
		it('should generate correct summary', () => {
			const content = [
				{
					level: 'SUCCESS',
					duration: 1000,
					tokens: 100,
					entities: [{ name: 'John' }]
				},
				{
					level: 'ERROR',
					duration: 500,
					tokens: 50,
					query_type: 'entity_discovery'
				}
			];
			const summary = generateWorkflowSummary(content);
			expect(summary.totalSteps).toBe(2);
			expect(summary.totalDuration).toBe(1500);
			expect(summary.totalTokens).toBe(150);
			expect(summary.errorCount).toBe(1);
			expect(summary.successCount).toBe(1);
			expect(summary.entityCount).toBe(1);
			expect(summary.cypherQueries).toBe(1);
		});

		it('should handle empty content', () => {
			const summary = generateWorkflowSummary([]);
			expect(summary.totalSteps).toBe(0);
			expect(summary.totalDuration).toBe(0);
			expect(summary.totalTokens).toBe(0);
		});
	});

	describe('extractKeyValuePairs', () => {
		it('should extract key-value pairs from entry', () => {
			const entry: LogEntry = {
				event_type: 'test',
				message: 'Test message',
				duration: 1000,
				tokens: 100,
				level: 'SUCCESS',
				timestamp: '2023-12-01T10:30:00Z',
				query_type: 'entity_discovery',
				chat_id: 'chat-123',
				workflow_id: 'workflow-456'
			};
			const pairs = extractKeyValuePairs(entry);
			expect(pairs).toHaveLength(8);
			expect(pairs[0]).toEqual({
				key: 'Event Type',
				value: 'test',
				monospace: true
			});
		});
	});

	describe('validation functions', () => {
		describe('validateFilename', () => {
			it('should validate correct filenames', () => {
				expect(validateFilename('test.log')).toBe(true);
				expect(validateFilename('file-123.json')).toBe(true);
			});

			it('should reject invalid filenames', () => {
				expect(validateFilename('')).toBe(false);
				expect(validateFilename('../file.log')).toBe(false);
				expect(validateFilename('file/log.log')).toBe(false);
			});
		});

		describe('validateFilePath', () => {
			it('should validate correct file paths', () => {
				expect(validateFilePath('/path/to/file.log')).toBe(true);
				expect(validateFilePath('relative/path.json')).toBe(true);
			});

			it('should reject invalid file paths', () => {
				expect(validateFilePath('')).toBe(false);
				expect(validateFilePath(null as any)).toBe(false);
			});
		});

		describe('sanitizeUrlParameter', () => {
			it('should sanitize URL parameters', () => {
				expect(sanitizeUrlParameter('test-file.log')).toBe('test-file.log');
				expect(sanitizeUrlParameter('file with spaces.log')).toBe('filewithspaces.log');
				expect(sanitizeUrlParameter('file@#$%.log')).toBe('file.log');
			});
		});

		describe('sanitizeDisplayContent', () => {
			it('should sanitize display content', () => {
				expect(sanitizeDisplayContent('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
				expect(sanitizeDisplayContent('normal text')).toBe('normal text');
			});
		});

		describe('createSafeErrorMessage', () => {
			it('should create safe error messages', () => {
				expect(createSafeErrorMessage('Error: <script>alert("xss")</script>')).toBe('Error: scriptalert("xss")/script');
				expect(createSafeErrorMessage({ message: 'Error: <script>alert("xss")</script>' })).toBe('Error: scriptalert("xss")/script');
				expect(createSafeErrorMessage(null)).toBe('An unknown error occurred');
			});
		});
	});
});
