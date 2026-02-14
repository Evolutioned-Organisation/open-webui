/**
 * Tests for CypherQuerySection.svelte
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import CypherQuerySection from '../CypherQuerySection.svelte';
import type { LogEntry } from '$lib/utils/log-utils';

describe('CypherQuerySection', () => {
	describe('Query Type Detection', () => {
		it('should detect entity_discovery query type', () => {
			const entry: LogEntry = {
				query_type: 'entity_discovery',
				query_text: `
            MATCH (c:Chunk)-[r]-(e:Entity)
            WHERE c.id IN $chunk_ids
            RETURN DISTINCT e.id AS id,
                   e.name AS name,
                   e.description AS description,
                   e.type AS type,
                   e.alias AS alias,
                   type(r) AS relationship_type,
                   c.id AS source_chunk_id
            LIMIT $limit
            `,
				results: [
					{
						id: 'entity_1',
						name: 'John Doe',
						description: 'Software Engineer',
						type: 'Person',
						alias: 'JD',
						relationship_type: 'MENTIONED_IN',
						source_chunk_id: 'chunk_123'
					}
				]
			};

			const { getByText } = render(CypherQuerySection, {
				props: { entry }
			});

			// Should render the component (not show "Invalid JSON Structure")
			expect(getByText('Debug Info:')).toBeInTheDocument();
			expect(getByText('Query found: Yes')).toBeInTheDocument();
			expect(getByText('Results found: Yes (1)')).toBeInTheDocument();
		});

		it('should detect claim_discovery query type', () => {
			const entry: LogEntry = {
				query_type: 'claim_discovery',
				query_text: `
            MATCH (c:Chunk)-[r]-(cl:Claim)
            WHERE c.id IN $chunk_ids
            RETURN DISTINCT cl.id AS id,
                   cl.text AS text,
                   cl.confidence AS confidence,
                   cl.source AS source,
                   type(r) AS relationship_type,
                   c.id AS source_chunk_id
            LIMIT $limit
            `,
				results: [
					{
						id: 'claim_1',
						text: 'The sky is blue',
						confidence: 0.95,
						source: 'scientific_paper',
						relationship_type: 'CONTAINS',
						source_chunk_id: 'chunk_456'
					}
				]
			};

			const { getByText } = render(CypherQuerySection, {
				props: { entry }
			});

			expect(getByText('Debug Info:')).toBeInTheDocument();
			expect(getByText('Query found: Yes')).toBeInTheDocument();
			expect(getByText('Results found: Yes (1)')).toBeInTheDocument();
		});

		it('should not render for non-Cypher query types', () => {
			const entry: LogEntry = {
				query_type: 'text_processing',
				message: 'Processing text content',
				data: { processed: true }
			};

			const { container } = render(CypherQuerySection, {
				props: { entry }
			});

			// Should not render the main content (only whitespace)
			expect(container.textContent?.trim()).toBe('');
		});
	});

	describe('Query Extraction', () => {
		it('should extract query from query_text field', () => {
			const entry: LogEntry = {
				query_type: 'entity_discovery',
				query_text: 'MATCH (n:Person) RETURN n.name',
				results: []
			};

			const { getByText } = render(CypherQuerySection, {
				props: { entry }
			});

			expect(getByText('Cypher Query')).toBeInTheDocument();
			expect(getByText('entity_discovery')).toBeInTheDocument();
		});

		it('should extract query from cypher_query field', () => {
			const entry: LogEntry = {
				query_type: 'entity_discovery',
				cypher_query: 'MATCH (n:Company) RETURN n.name',
				results: []
			};

			const { getByText } = render(CypherQuerySection, {
				props: { entry }
			});

			expect(getByText('Cypher Query')).toBeInTheDocument();
		});

		it('should extract query from message field when other fields are empty', () => {
			const entry: LogEntry = {
				query_type: 'entity_discovery',
				message: 'MATCH (n:Product) RETURN n.title',
				results: []
			};

			const { getByText } = render(CypherQuerySection, {
				props: { entry }
			});

			expect(getByText('Cypher Query')).toBeInTheDocument();
		});

		it('should handle missing query gracefully', () => {
			const entry: LogEntry = {
				query_type: 'entity_discovery',
				results: []
			};

			const { getByText } = render(CypherQuerySection, {
				props: { entry }
			});

			expect(getByText('No Cypher query found in this entry')).toBeInTheDocument();
		});
	});

	describe('Results Extraction', () => {
		it('should extract results from results field', () => {
			const entry: LogEntry = {
				query_type: 'entity_discovery',
				query_text: 'MATCH (n) RETURN n',
				results: [
					{ id: '1', name: 'Entity 1' },
					{ id: '2', name: 'Entity 2' }
				]
			};

			const { getByText } = render(CypherQuerySection, {
				props: { entry }
			});

			expect(getByText('Query Results')).toBeInTheDocument();
			expect(getByText('2 results')).toBeInTheDocument();
		});

		it('should extract results from cypher_results field', () => {
			const entry: LogEntry = {
				query_type: 'entity_discovery',
				query_text: 'MATCH (n) RETURN n',
				cypher_results: [{ id: '1', name: 'Entity 1' }]
			};

			const { getByText } = render(CypherQuerySection, {
				props: { entry }
			});

			expect(getByText('Query Results')).toBeInTheDocument();
			expect(getByText('1 result')).toBeInTheDocument();
		});

		it('should extract results from nested data field', () => {
			const entry: LogEntry = {
				query_type: 'entity_discovery',
				query_text: 'MATCH (n) RETURN n',
				data: {
					results: [{ id: '1', name: 'Entity 1' }]
				}
			};

			const { getByText } = render(CypherQuerySection, {
				props: { entry }
			});

			expect(getByText('Query Results')).toBeInTheDocument();
			expect(getByText('1 result')).toBeInTheDocument();
		});

		it('should handle missing results gracefully', () => {
			const entry: LogEntry = {
				query_type: 'entity_discovery',
				query_text: 'MATCH (n) RETURN n'
			};

			const { getByText } = render(CypherQuerySection, {
				props: { entry }
			});

			expect(getByText('No query results found in this entry')).toBeInTheDocument();
		});
	});

	describe('Real-world Entity Discovery Example', () => {
		it('should handle complete entity_discovery log entry', () => {
			const entry: LogEntry = {
				timestamp: '2024-01-15T10:30:00Z',
				level: 'INFO',
				message: 'Executing entity discovery query',
				query_type: 'entity_discovery',
				query_text: `
            MATCH (c:Chunk)-[r]-(e:Entity)
            WHERE c.id IN $chunk_ids
            RETURN DISTINCT e.id AS id,
                   e.name AS name,
                   e.description AS description,
                   e.type AS type,
                   e.alias AS alias,
                   type(r) AS relationship_type,
                   c.id AS source_chunk_id
            LIMIT $limit
            `,
				results: [
					{
						id: 'entity_1',
						name: 'John Doe',
						description: 'Software Engineer at TechCorp',
						type: 'Person',
						alias: 'JD',
						relationship_type: 'MENTIONED_IN',
						source_chunk_id: 'chunk_123'
					},
					{
						id: 'entity_2',
						name: 'TechCorp',
						description: 'Technology Company',
						type: 'Organization',
						alias: 'TC',
						relationship_type: 'EMPLOYED_BY',
						source_chunk_id: 'chunk_124'
					}
				],
				duration_ms: 150,
				token_usage: {
					total_tokens: 500,
					prompt_tokens: 300,
					completion_tokens: 200
				}
			};

			const { getByText } = render(CypherQuerySection, {
				props: { entry }
			});

			// Debug information
			expect(getByText('Debug Info:')).toBeInTheDocument();
			expect(getByText('Query found: Yes')).toBeInTheDocument();
			expect(getByText('Results found: Yes (2)')).toBeInTheDocument();

			// Query section
			expect(getByText('Cypher Query')).toBeInTheDocument();
			expect(getByText('entity_discovery')).toBeInTheDocument();

			// Results section
			expect(getByText('Query Results')).toBeInTheDocument();
			expect(getByText('2 results')).toBeInTheDocument();
		});
	});

	describe('Real-world Claim Discovery Example', () => {
		it('should handle complete claim_discovery log entry', () => {
			const entry: LogEntry = {
				timestamp: '2024-01-15T10:35:00Z',
				level: 'INFO',
				message: 'Executing claim discovery query',
				query_type: 'claim_discovery',
				query_text: `
            MATCH (c:Chunk)-[r]-(cl:Claim)
            WHERE c.id IN $chunk_ids
            RETURN DISTINCT cl.id AS id,
                   cl.text AS text,
                   cl.confidence AS confidence,
                   cl.source AS source,
                   type(r) AS relationship_type,
                   c.id AS source_chunk_id
            LIMIT $limit
            `,
				results: [
					{
						id: 'claim_1',
						text: 'The sky is blue due to Rayleigh scattering',
						confidence: 0.95,
						source: 'scientific_paper_2023',
						relationship_type: 'CONTAINS',
						source_chunk_id: 'chunk_125'
					},
					{
						id: 'claim_2',
						text: 'Water boils at 100°C at sea level',
						confidence: 0.99,
						source: 'physics_textbook',
						relationship_type: 'CONTAINS',
						source_chunk_id: 'chunk_126'
					}
				],
				duration_ms: 200,
				token_usage: {
					total_tokens: 750,
					prompt_tokens: 400,
					completion_tokens: 350
				}
			};

			const { getByText } = render(CypherQuerySection, {
				props: { entry }
			});

			// Debug information
			expect(getByText('Debug Info:')).toBeInTheDocument();
			expect(getByText('Query found: Yes')).toBeInTheDocument();
			expect(getByText('Results found: Yes (2)')).toBeInTheDocument();

			// Query section
			expect(getByText('Cypher Query')).toBeInTheDocument();
			expect(getByText('claim_discovery')).toBeInTheDocument();

			// Results section
			expect(getByText('Query Results')).toBeInTheDocument();
			expect(getByText('2 results')).toBeInTheDocument();
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty results array', () => {
			const entry: LogEntry = {
				query_type: 'entity_discovery',
				query_text: 'MATCH (n) RETURN n',
				results: []
			};

			const { getByText } = render(CypherQuerySection, {
				props: { entry }
			});

			expect(getByText('No query results found in this entry')).toBeInTheDocument();
		});

		it('should handle null/undefined entry', () => {
			const { container } = render(CypherQuerySection, {
				props: { entry: null }
			});

			// Should not render the main content (only whitespace)
			expect(container.textContent?.trim()).toBe('');
		});

		it('should handle entry with only query_type and no other fields', () => {
			const entry: LogEntry = {
				query_type: 'entity_discovery'
			};

			const { getByText } = render(CypherQuerySection, {
				props: { entry }
			});

			expect(getByText('Debug Info:')).toBeInTheDocument();
			expect(getByText('Query found: No')).toBeInTheDocument();
			expect(getByText('Results found: No')).toBeInTheDocument();
		});
	});
});
