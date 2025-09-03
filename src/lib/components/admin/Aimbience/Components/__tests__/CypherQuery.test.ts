/**
 * Tests for CypherQuery.svelte
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import CypherQuery from '../CypherQuery.svelte';
import type { LogEntry } from '$lib/utils/log-utils';

describe('CypherQuery', () => {
	it('should render debug information', () => {
		const entry: LogEntry = {
			query_type: 'entity_discovery',
			cypher_query: 'MATCH (n) RETURN n',
			results: [{ name: 'John' }]
		};

		const { getByText } = render(CypherQuery, {
			props: { entry }
		});

		expect(getByText('Debug Info:')).toBeInTheDocument();
		expect(getByText('Query found: Yes')).toBeInTheDocument();
		expect(getByText('Results found: Yes (1)')).toBeInTheDocument();
	});

	it('should render Cypher query when present', () => {
		const entry: LogEntry = {
			query_type: 'entity_discovery',
			cypher_query: 'MATCH (n:Person) RETURN n.name'
		};

		const { getByText } = render(CypherQuery, {
			props: { entry }
		});

		expect(getByText('Cypher Query')).toBeInTheDocument();
		expect(getByText('entity_discovery')).toBeInTheDocument();
	});

	it('should render query results when present', () => {
		const entry: LogEntry = {
			query_type: 'entity_discovery',
			results: [
				{ name: 'John', age: 30 },
				{ name: 'Jane', age: 25 }
			]
		};

		const { getByText } = render(CypherQuery, {
			props: { entry }
		});

		expect(getByText('Query Results')).toBeInTheDocument();
		expect(getByText('2 results')).toBeInTheDocument();
	});

	it('should show no query message when no query found', () => {
		const entry: LogEntry = {
			message: 'Regular log message'
		};

		const { getByText } = render(CypherQuery, {
			props: { entry }
		});

		expect(getByText('No Cypher query found in this entry')).toBeInTheDocument();
	});

	it('should show no results message when no results found', () => {
		const entry: LogEntry = {
			query_type: 'entity_discovery',
			cypher_query: 'MATCH (n) RETURN n'
		};

		const { getByText } = render(CypherQuery, {
			props: { entry }
		});

		expect(getByText('No query results found in this entry')).toBeInTheDocument();
	});

	it('should handle single result correctly', () => {
		const entry: LogEntry = {
			query_type: 'entity_discovery',
			results: [{ name: 'John' }]
		};

		const { getByText } = render(CypherQuery, {
			props: { entry }
		});

		expect(getByText('1 result')).toBeInTheDocument();
	});

	it('should extract query from nested data object', () => {
		const entry: LogEntry = {
			data: {
				cypher_query: 'MATCH (n) RETURN n'
			}
		};

		const { getByText } = render(CypherQuery, {
			props: { entry }
		});

		expect(getByText('Cypher Query')).toBeInTheDocument();
	});

	it('should extract results from nested data object', () => {
		const entry: LogEntry = {
			data: {
				results: [{ name: 'John' }]
			}
		};

		const { getByText } = render(CypherQuery, {
			props: { entry }
		});

		expect(getByText('Query Results')).toBeInTheDocument();
		expect(getByText('1 result')).toBeInTheDocument();
	});
});
