/**
 * Tests for LogViewerTabs.svelte
 */

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import LogViewerTabs from '../LogViewerTabs.svelte';

describe('LogViewerTabs', () => {
	it('should render all tabs correctly', () => {
		const { getByText } = render(LogViewerTabs, {
			props: {
				currentViewMode: 'timeline'
			}
		});

		expect(getByText('Timeline')).toBeInTheDocument();
		expect(getByText('Raw JSON')).toBeInTheDocument();
	});

	it('should highlight the current active tab', () => {
		const { getByText } = render(LogViewerTabs, {
			props: {
				currentViewMode: 'raw'
			}
		});

		const rawTab = getByText('Raw JSON').closest('button');
		expect(rawTab).toHaveClass('border-blue-500', 'text-blue-600');
	});

	it('should emit tabChange event when tab is clicked', async () => {
		const { component, getByText } = render(LogViewerTabs, {
			props: {
				currentViewMode: 'timeline'
			}
		});

		const tabChangeHandler = vi.fn();
		component.$on('tabChange', tabChangeHandler);

		await fireEvent.click(getByText('Raw JSON'));
		expect(tabChangeHandler).toHaveBeenCalledWith(
			expect.objectContaining({
				detail: { viewMode: 'raw' }
			})
		);
	});

	it('should not emit event when clicking the current tab', async () => {
		const { component, getByText } = render(LogViewerTabs, {
			props: {
				currentViewMode: 'timeline'
			}
		});

		const tabChangeHandler = vi.fn();
		component.$on('tabChange', tabChangeHandler);

		await fireEvent.click(getByText('Timeline'));
		expect(tabChangeHandler).not.toHaveBeenCalled();
	});

	it('should have proper accessibility attributes', () => {
		const { getByText } = render(LogViewerTabs, {
			props: {
				currentViewMode: 'timeline'
			}
		});

		const timelineTab = getByText('Timeline').closest('button');
		expect(timelineTab).toHaveAttribute('aria-label');
		expect(timelineTab).toHaveAttribute('title');
	});
});
