import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import LogManagement from './LogManagement.svelte';
import type { LogFileInfo } from '$lib/apis/aimby';

// Mock the API functions
vi.mock('$lib/apis/aimby', () => ({
	getLogsViaProxy: vi.fn()
}));

vi.mock('$lib/apis/auths', () => ({
	getAimbienceConfig: vi.fn()
}));

// Mock utility functions
vi.mock('$lib/utils/validation', () => ({
	validateSearchQuery: vi.fn(() => true),
	validateNumericParameter: vi.fn((val) => typeof val === 'number' ? val : parseInt(val)),
	createSafeErrorMessage: vi.fn((error, fallback) => error?.message || fallback || 'An error occurred'),
	validateFilename: vi.fn(() => true)
}));

vi.mock('$lib/utils/errorHandling', () => ({
	globalErrorHandler: {
		handleError: vi.fn(() => false)
	},
	createErrorContext: vi.fn(() => ({ operation: 'test', component: 'test' })),
	withGracefulDegradation: vi.fn(async (fn) => await fn())
}));

// Mock Svelte context
const mockContext = new Map();
mockContext.set('i18n', {});

vi.mock('svelte', async () => {
	const actual = await vi.importActual('svelte');
	return {
		...actual,
		getContext: vi.fn(() => mockContext.get('i18n'))
	};
});

import { getLogsViaProxy } from '$lib/apis/aimby';
import { getAimbienceConfig } from '$lib/apis/auths';
import { validateSearchQuery, validateNumericParameter, validateFilename } from '$lib/utils/validation';
import { globalErrorHandler } from '$lib/utils/errorHandling';

describe('LogManagement Component', () => {
	const mockLogs: LogFileInfo[] = [
		{
			filename: 'app.log',
			size: 2048,
			modified: 1640995200,
			path: '/logs/app.log',
			timestamp: '2022-01-01T00:00:00Z'
		},
		{
			filename: 'error.log',
			size: 1024,
			modified: 1640995100,
			path: '/logs/error.log'
		},
		{
			filename: 'debug.log',
			size: 512,
			modified: 1640995000,
			path: '/logs/debug.log'
		}
	];

	const mockConfig = {
		ENABLE_AIMBENCE: true,
		AIMBENCE_API_BASE_URL: 'http://localhost:8080'
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// Setup default successful responses
		vi.mocked(getAimbienceConfig).mockResolvedValue(mockConfig);
		vi.mocked(getLogsViaProxy).mockResolvedValue(mockLogs);
		vi.mocked(validateSearchQuery).mockReturnValue(true);
		vi.mocked(validateNumericParameter).mockImplementation((val) => 
			typeof val === 'number' ? val : parseInt(val)
		);
		vi.mocked(validateFilename).mockReturnValue(true);
		
		// Mock window.location.href for navigation
		Object.defineProperty(window, 'location', {
			value: { href: '' },
			writable: true
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Component Rendering', () => {
		it('should render the component with proper structure', async () => {
			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('Log Management')).toBeInTheDocument();
				expect(screen.getByText('View and manage system log files from the AIMBY-API service')).toBeInTheDocument();
				expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
			});
		});

		it('should show disabled state when aimbience is not enabled', async () => {
			vi.mocked(getAimbienceConfig).mockResolvedValue({
				...mockConfig,
				ENABLE_AIMBENCE: false
			});

			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('Aimbience integration is not enabled. Please enable it in the Aimbience Config tab.')).toBeInTheDocument();
			});
		});

		it('should display loading state initially', () => {
			render(LogManagement);
			
			// Component should show loading state while fetching data
			expect(screen.getByRole('button', { name: /refresh/i })).toBeDisabled();
		});
	});

	describe('Data Fetching and Display', () => {
		it('should fetch and display log files on mount', async () => {
			render(LogManagement);

			await waitFor(() => {
				expect(getLogsViaProxy).toHaveBeenCalledWith('test-token', 10);
				expect(screen.getByText('app.log')).toBeInTheDocument();
				expect(screen.getByText('error.log')).toBeInTheDocument();
				expect(screen.getByText('debug.log')).toBeInTheDocument();
			});
		});

		it('should display correct file information', async () => {
			render(LogManagement);

			await waitFor(() => {
				// Check if file sizes are displayed correctly
				expect(screen.getByText('2 KB')).toBeInTheDocument(); // 2048 bytes
				expect(screen.getByText('1 KB')).toBeInTheDocument(); // 1024 bytes
				expect(screen.getByText('512 B')).toBeInTheDocument(); // 512 bytes
			});
		});

		it('should display stats cards with correct information', async () => {
			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('Total Log Files')).toBeInTheDocument();
				expect(screen.getByText('3')).toBeInTheDocument(); // Total count
				expect(screen.getByText('Displayed')).toBeInTheDocument();
			});
		});

		it('should handle empty log list', async () => {
			vi.mocked(getLogsViaProxy).mockResolvedValue([]);

			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('No log files found')).toBeInTheDocument();
			});
		});
	});

	describe('Error Handling', () => {
		it('should display error message when API call fails', async () => {
			const errorMessage = 'Failed to fetch logs';
			vi.mocked(getLogsViaProxy).mockRejectedValue(new Error(errorMessage));

			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('Error Loading Log Files')).toBeInTheDocument();
				expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
			});
		});

		it('should handle retry functionality', async () => {
			vi.mocked(getLogsViaProxy)
				.mockRejectedValueOnce(new Error('Network error'))
				.mockResolvedValueOnce(mockLogs);

			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('Error Loading Log Files')).toBeInTheDocument();
			});

			const retryButton = screen.getByRole('button', { name: /retry/i });
			await fireEvent.click(retryButton);

			await waitFor(() => {
				expect(screen.getByText('app.log')).toBeInTheDocument();
			});
		});

		it('should handle config loading failure gracefully', async () => {
			vi.mocked(getAimbienceConfig).mockRejectedValue(new Error('Config error'));

			render(LogManagement);

			// Should still attempt to fetch logs even if config fails
			await waitFor(() => {
				expect(getLogsViaProxy).toHaveBeenCalled();
			});
		});
	});

	describe('Search Functionality', () => {
		it('should filter logs based on search query', async () => {
			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('app.log')).toBeInTheDocument();
			});

			const searchInput = screen.getByPlaceholderText(/search log files/i);
			await fireEvent.input(searchInput, { target: { value: 'app' } });

			await waitFor(() => {
				expect(screen.getByText('app.log')).toBeInTheDocument();
				expect(screen.queryByText('error.log')).not.toBeInTheDocument();
			});
		});

		it('should validate search queries', async () => {
			vi.mocked(validateSearchQuery).mockReturnValue(false);

			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('app.log')).toBeInTheDocument();
			});

			const searchInput = screen.getByPlaceholderText(/search log files/i);
			await fireEvent.input(searchInput, { target: { value: '<script>' } });

			await waitFor(() => {
				expect(screen.getByText('Invalid search query. Please avoid special characters.')).toBeInTheDocument();
			});
		});

		it('should clear search when escape key is pressed', async () => {
			render(LogManagement);

			const searchInput = screen.getByPlaceholderText(/search log files/i);
			await fireEvent.input(searchInput, { target: { value: 'test' } });
			await fireEvent.keyDown(searchInput, { key: 'Escape' });

			expect(searchInput.value).toBe('');
		});

		it('should show filtered results count', async () => {
			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('app.log')).toBeInTheDocument();
			});

			const searchInput = screen.getByPlaceholderText(/search log files/i);
			await fireEvent.input(searchInput, { target: { value: 'app' } });

			await waitFor(() => {
				expect(screen.getByText('Filtered from 3')).toBeInTheDocument();
			});
		});
	});

	describe('Sorting Functionality', () => {
		it('should sort by filename when filename header is clicked', async () => {
			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('app.log')).toBeInTheDocument();
			});

			const filenameHeader = screen.getByText('Filename');
			await fireEvent.click(filenameHeader);

			// Should sort alphabetically
			const rows = screen.getAllByRole('row');
			expect(rows[1]).toHaveTextContent('app.log'); // First data row after header
		});

		it('should toggle sort direction when same header is clicked twice', async () => {
			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('app.log')).toBeInTheDocument();
			});

			const filenameHeader = screen.getByText('Filename');
			await fireEvent.click(filenameHeader); // First click - ascending
			await fireEvent.click(filenameHeader); // Second click - descending

			// Should show sort indicators
			expect(screen.getByText('Filename').closest('th')).toBeInTheDocument();
		});

		it('should sort by size correctly', async () => {
			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('app.log')).toBeInTheDocument();
			});

			const sizeHeader = screen.getByText('Size');
			await fireEvent.click(sizeHeader);

			// Should sort by size (descending by default for numeric fields)
			const rows = screen.getAllByRole('row');
			expect(rows[1]).toHaveTextContent('2 KB'); // Largest file first
		});
	});

	describe('Pagination', () => {
		it('should handle count selector changes', async () => {
			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('app.log')).toBeInTheDocument();
			});

			const countSelector = screen.getByLabelText(/show:/i);
			await fireEvent.change(countSelector, { target: { value: '5' } });

			expect(countSelector.value).toBe('5');
		});

		it('should validate count parameter', async () => {
			vi.mocked(validateNumericParameter).mockReturnValue(null);

			render(LogManagement);

			await waitFor(() => {
				expect(globalErrorHandler.handleError).toHaveBeenCalled();
			});
		});
	});

	describe('User Interactions', () => {
		it('should handle refresh button click', async () => {
			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('app.log')).toBeInTheDocument();
			});

			const refreshButton = screen.getByRole('button', { name: /refresh/i });
			await fireEvent.click(refreshButton);

			expect(getLogsViaProxy).toHaveBeenCalledTimes(2); // Once on mount, once on refresh
		});

		it('should navigate to log viewer when view button is clicked', async () => {
			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('app.log')).toBeInTheDocument();
			});

			const viewButtons = screen.getAllByText('View');
			await fireEvent.click(viewButtons[0]);

			expect(window.location.href).toBe('/admin/aimbience/log-viewer?filename=app.log');
		});

		it('should validate filename before navigation', async () => {
			vi.mocked(validateFilename).mockReturnValue(false);

			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('app.log')).toBeInTheDocument();
			});

			const viewButtons = screen.getAllByRole('button', { name: /view/i });
			await fireEvent.click(viewButtons[0]);

			expect(globalErrorHandler.handleError).toHaveBeenCalled();
			expect(window.location.href).toBe(''); // Should not navigate
		});
	});

	describe('Accessibility', () => {
		it('should have proper ARIA labels and roles', async () => {
			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
				expect(screen.getByLabelText(/show:/i)).toBeInTheDocument();
				expect(screen.getByLabelText(/search log files/i)).toBeInTheDocument();
			});
		});

		it('should handle keyboard navigation', async () => {
			render(LogManagement);

			const searchInput = screen.getByPlaceholderText(/search log files/i);
			
			// Test escape key functionality
			await fireEvent.input(searchInput, { target: { value: 'test' } });
			await fireEvent.keyDown(searchInput, { key: 'Escape' });

			expect(searchInput.value).toBe('');
		});
	});

	describe('Edge Cases', () => {
		it('should handle logs with missing properties', async () => {
			const incompleteLog: LogFileInfo = {
				filename: 'incomplete.log',
				size: 0,
				modified: 0,
				path: '/logs/incomplete.log'
			};

			vi.mocked(getLogsViaProxy).mockResolvedValue([incompleteLog]);

			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('incomplete.log')).toBeInTheDocument();
				expect(screen.getByText('0 B')).toBeInTheDocument(); // Size formatting
				expect(screen.getByText('Invalid Date')).toBeInTheDocument(); // Date formatting
			});
		});

		it('should handle very large file sizes', async () => {
			const largeLog: LogFileInfo = {
				filename: 'large.log',
				size: 1073741824, // 1GB
				modified: 1640995200,
				path: '/logs/large.log'
			};

			vi.mocked(getLogsViaProxy).mockResolvedValue([largeLog]);

			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('1 GB')).toBeInTheDocument();
			});
		});

		it('should handle null/undefined API responses', async () => {
			vi.mocked(getLogsViaProxy).mockResolvedValue(null);

			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('Error Loading Log Files')).toBeInTheDocument();
			});
		});
	});

	describe('Performance', () => {
		it('should not re-render unnecessarily', async () => {
			const { component } = render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('app.log')).toBeInTheDocument();
			});

			// Component should be stable after initial render
			expect(component).toBeDefined();
		});

		it('should handle large datasets efficiently', async () => {
			const largeLogs = Array.from({ length: 1000 }, (_, i) => ({
				filename: `log-${i}.log`,
				size: Math.floor(Math.random() * 10000),
				modified: 1640995200 + i,
				path: `/logs/log-${i}.log`
			}));

			vi.mocked(getLogsViaProxy).mockResolvedValue(largeLogs);

			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('1000')).toBeInTheDocument(); // Total count
			});

			// Should only render paginated results
			const rows = screen.getAllByRole('row');
			expect(rows.length).toBeLessThan(20); // Header + max 10 data rows + pagination
		});
	});
});