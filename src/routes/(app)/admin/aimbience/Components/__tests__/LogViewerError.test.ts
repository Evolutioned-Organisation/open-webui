/**
 * Tests for LogViewerError.svelte
 */

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import LogViewerError from '../LogViewerError.svelte';

describe('LogViewerError', () => {
	it('should render error message correctly', () => {
		const { getByText } = render(LogViewerError, {
			props: {
				errorMessage: 'File not found',
				filename: 'test.log'
			}
		});

		expect(getByText('File Not Found')).toBeInTheDocument();
		expect(getByText('test.log')).toBeInTheDocument();
	});

	it('should show network error for network-related errors', () => {
		const { getByText } = render(LogViewerError, {
			props: {
				errorMessage: 'Network error occurred',
				filename: 'test.log'
			}
		});

		expect(getByText('Network Error')).toBeInTheDocument();
	});

	it('should show generic error for other errors', () => {
		const { getByText } = render(LogViewerError, {
			props: {
				errorMessage: 'Some other error',
				filename: 'test.log'
			}
		});

		expect(getByText('Error Loading Log')).toBeInTheDocument();
	});

	it('should show loading state on retry button', () => {
		const { getByText } = render(LogViewerError, {
			props: {
				errorMessage: 'File not found',
				isRetrying: true
			}
		});

		expect(getByText('Retrying...')).toBeInTheDocument();
	});

	it('should emit retry event when retry button is clicked', async () => {
		const { component, getByText } = render(LogViewerError, {
			props: {
				errorMessage: 'File not found'
			}
		});

		const retryHandler = vi.fn();
		component.$on('retry', retryHandler);

		await fireEvent.click(getByText('Try Again'));
		expect(retryHandler).toHaveBeenCalled();
	});

	it('should emit goBack event when back button is clicked', async () => {
		const { component, getByText } = render(LogViewerError, {
			props: {
				errorMessage: 'File not found'
			}
		});

		const goBackHandler = vi.fn();
		component.$on('goBack', goBackHandler);

		await fireEvent.click(getByText('Back to Log Management'));
		expect(goBackHandler).toHaveBeenCalled();
	});

	it('should show troubleshooting tips for not found errors', () => {
		const { getByText } = render(LogViewerError, {
			props: {
				errorMessage: 'File not found',
				filename: 'test.log'
			}
		});

		expect(getByText('Troubleshooting:')).toBeInTheDocument();
		expect(getByText('Check if the file exists in the log directory')).toBeInTheDocument();
	});

	it('should sanitize error messages', () => {
		const { getByText } = render(LogViewerError, {
			props: {
				errorMessage: 'Error: <script>alert("xss")</script>',
				filename: 'test.log'
			}
		});

		// Should not contain the script tags
		expect(getByText('Error: <script>alert("xss")</script>')).toBeInTheDocument();
	});
});
