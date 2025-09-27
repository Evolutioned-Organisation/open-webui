/**
 * Tests for LogViewerHeader.svelte
 */

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import LogViewerHeader from '../LogViewerHeader.svelte';

describe('LogViewerHeader', () => {
	it('should render file information correctly', () => {
		const { getByText } = render(LogViewerHeader, {
			props: {
				filename: 'test.log',
				fileSize: 1024,
				modifiedDate: '2023-12-01T10:30:00Z',
				chatId: 'chat-123'
			}
		});

		expect(getByText('test.log')).toBeInTheDocument();
		expect(getByText('Size: 1 KB')).toBeInTheDocument();
		expect(getByText('Chat ID: chat-123')).toBeInTheDocument();
	});

	it('should show loading state on refresh button', () => {
		const { getByText } = render(LogViewerHeader, {
			props: {
				filename: 'test.log',
				isLoading: true
			}
		});

		expect(getByText('Refreshing...')).toBeInTheDocument();
	});

	it('should show error indicator when error is present', () => {
		const { getByText } = render(LogViewerHeader, {
			props: {
				filename: 'test.log',
				error: 'File not found'
			}
		});

		expect(getByText('Error')).toBeInTheDocument();
	});

	it('should emit refresh event when refresh button is clicked', async () => {
		const { component, getByText } = render(LogViewerHeader, {
			props: {
				filename: 'test.log'
			}
		});

		const refreshHandler = vi.fn();
		component.$on('refresh', refreshHandler);

		await fireEvent.click(getByText('Refresh'));
		expect(refreshHandler).toHaveBeenCalled();
	});

	it('should emit goBack event when back button is clicked', async () => {
		const { component, getByText } = render(LogViewerHeader, {
			props: {
				filename: 'test.log'
			}
		});

		const goBackHandler = vi.fn();
		component.$on('goBack', goBackHandler);

		await fireEvent.click(getByText('Back'));
		expect(goBackHandler).toHaveBeenCalled();
	});

	it('should handle missing props gracefully', () => {
		const { getByText } = render(LogViewerHeader);

		expect(getByText('Unknown File')).toBeInTheDocument();
		expect(getByText('Size: Unknown')).toBeInTheDocument();
		expect(getByText('Modified: Unknown')).toBeInTheDocument();
		expect(getByText('Chat ID: Unknown')).toBeInTheDocument();
	});
});
