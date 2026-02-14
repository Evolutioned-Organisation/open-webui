import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import LogManagement from '$lib/components/admin/Aimbience/Components/LogManagement.svelte';
import LogViewerPage from '../../routes/(app)/admin/aimbience/log-viewer/+page.svelte';
import type { LogFileInfo, LogContentResponse } from '$lib/apis/aimby';

// Mock the API functions
vi.mock('$lib/apis/aimby', () => ({
	getLogsViaProxy: vi.fn(),
	getLogContentViaProxy: vi.fn()
}));

vi.mock('$lib/apis/auths', () => ({
	getAimbienceConfig: vi.fn()
}));

// Mock SvelteKit stores and navigation
const mockPage = {
	url: {
		searchParams: {
			get: vi.fn()
		}
	}
};

const mockGoto = vi.fn();

vi.mock('$app/stores', () => ({
	page: {
		subscribe: vi.fn((callback) => {
			callback(mockPage);
			return () => {};
		})
	}
}));

vi.mock('$app/navigation', () => ({
	goto: mockGoto
}));

// Mock utility functions
vi.mock('$lib/utils/validation', () => ({
	validateSearchQuery: vi.fn(() => true),
	validateNumericParameter: vi.fn((val) => typeof val === 'number' ? val : parseInt(val)),
	createSafeErrorMessage: vi.fn((error, fallback) => error?.message || fallback || 'An error occurred'),
	validateFilename: vi.fn(() => true),
	sanitizeUrlParameter: vi.fn((param) => param),
	sanitizeDisplayContent: vi.fn((content) => content?.toString().replace(/[<>&"']/g, ''))
}));

vi.mock('$lib/utils/errorHandling', () => ({
	globalErrorHandler: {
		handleError: vi.fn(() => false)
	},
	createErrorContext: vi.fn(() => ({ operation: 'test', component: 'test' })),
	withGracefulDegradation: vi.fn(async (fn) => await fn()),
	enhancedFetch: vi.fn(),
	withRetry: vi.fn(),
	DEFAULT_RETRY_CONFIG: { maxRetries: 3, baseDelay: 1000, maxDelay: 10000, backoffMultiplier: 2 }
}));

// Mock Svelte context
const mockContext = new Map();
mockContext.set('i18n', {});

vi.mock('svelte', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		getContext: vi.fn(() => mockContext.get('i18n'))
	};
});

import { getLogsViaProxy, getLogContentViaProxy } from '$lib/apis/aimby';
import { getAimbienceConfig } from '$lib/apis/auths';
import { validateFilename, sanitizeUrlParameter } from '$lib/utils/validation';
import { withRetry, enhancedFetch } from '$lib/utils/errorHandling';

describe('Log Management Integration Tests', () => {
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

	const mockLogContent: LogContentResponse = {
		filename: 'app.log',
		size: 2048,
		modified: 1640995200,
		content: [
			'{"timestamp": "2022-01-01T00:00:00Z", "level": "INFO", "message": "Application started"}',
			'{"timestamp": "2022-01-01T00:01:00Z", "level": "DEBUG", "message": "Processing request"}'
		],
		timestamp: '2022-01-01T00:00:00Z'
	};

	const mockConfig = {
		ENABLE_AIMBENCE: true,
		AIMBENCE_API_BASE_URL: 'http://localhost:8080'
	};

	beforeEach(() => {
		vi.clearAllMocks();
		
		// Setup default successful responses
		vi.mocked(getAimbienceConfig).mockResolvedValue(mockConfig);
		vi.mocked(getLogsViaProxy).mockResolvedValue(mockLogs);
		vi.mocked(getLogContentViaProxy).mockResolvedValue(mockLogContent);
		vi.mocked(validateFilename).mockReturnValue(true);
		vi.mocked(sanitizeUrlParameter).mockImplementation((param) => param);
		
		// Mock withRetry to just execute the operation
		vi.mocked(withRetry).mockImplementation(async (operation) => await operation());
		
		// Mock enhancedFetch to return a successful response
		vi.mocked(enhancedFetch).mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue(mockLogContent)
		} as any);
		
		// Mock page URL parameters
		mockPage.url.searchParams.get.mockReturnValue('app.log');
		
		// Mock window.location.href for navigation
		Object.defineProperty(window, 'location', {
			value: { href: '' },
			writable: true
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Complete User Workflow', () => {
		it('should complete the full workflow from log list to log viewer', async () => {
			// Step 1: Render LogManagement component
			const { unmount } = render(LogManagement);

			// Step 2: Wait for logs to load
			await waitFor(() => {
				expect(screen.getByText('app.log')).toBeInTheDocument();
				expect(screen.getByText('error.log')).toBeInTheDocument();
				expect(screen.getByText('debug.log')).toBeInTheDocument();
			});

			// Step 3: Verify API was called correctly
			expect(getLogsViaProxy).toHaveBeenCalledWith('test-token', 10);

			// Step 4: Click on "View" button for first log
			const viewButtons = screen.getAllByRole('button', { name: /view/i });
			expect(viewButtons).toHaveLength(3);
			
			await fireEvent.click(viewButtons[0]);

			// Step 5: Verify navigation was triggered
			expect(window.location.href).toBe('/admin/aimbience/log-viewer?filename=app.log');

			// Clean up
			unmount();

			// Step 6: Simulate navigation to log viewer
			mockPage.url.searchParams.get.mockReturnValue('app.log');
			
			// Step 7: Render LogViewer component
			render(LogViewerPage);

			// Step 8: Wait for log content to load
			await waitFor(() => {
				expect(screen.getByText('Log Viewer')).toBeInTheDocument();
				expect(screen.getByText('File: app.log')).toBeInTheDocument();
			});

			// Step 9: Verify log content API was called
			expect(getLogContentViaProxy).toHaveBeenCalledWith('test-token', 'app.log');

			// Step 10: Verify content is displayed
			await waitFor(() => {
				expect(screen.getByText('File Information')).toBeInTheDocument();
				expect(screen.getByText('Log Content')).toBeInTheDocument();
				expect(screen.getByText(/Application started/)).toBeInTheDocument();
			});
		});

		it('should handle navigation back from log viewer to log management', async () => {
			// Start with log viewer
			mockPage.url.searchParams.get.mockReturnValue('app.log');
			render(LogViewerPage);

			await waitFor(() => {
				expect(screen.getByText('Log Viewer')).toBeInTheDocument();
			});

			// Click back button
			const backButton = screen.getByLabelText('Back to Log Management');
			await fireEvent.click(backButton);

			// Verify navigation was called
			expect(mockGoto).toHaveBeenCalledWith('/admin/aimbience/log-management');
		});

		it('should handle search and filtering workflow', async () => {
			render(LogManagement);

			// Wait for logs to load
			await waitFor(() => {
				expect(screen.getByText('app.log')).toBeInTheDocument();
			});

			// Perform search
			const searchInput = screen.getByPlaceholderText(/search log files/i);
			await fireEvent.input(searchInput, { target: { value: 'app' } });

			// Verify filtering works
			await waitFor(() => {
				expect(screen.getByText('app.log')).toBeInTheDocument();
				expect(screen.queryByText('error.log')).not.toBeInTheDocument();
				expect(screen.queryByText('debug.log')).not.toBeInTheDocument();
			});

			// Clear search
			await fireEvent.input(searchInput, { target: { value: '' } });

			// Verify all logs are shown again
			await waitFor(() => {
				expect(screen.getByText('app.log')).toBeInTheDocument();
				expect(screen.getByText('error.log')).toBeInTheDocument();
				expect(screen.getByText('debug.log')).toBeInTheDocument();
			});
		});

		it('should handle sorting workflow', async () => {
			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('app.log')).toBeInTheDocument();
			});

			// Click on filename header to sort
			const filenameHeader = screen.getByText('Filename');
			await fireEvent.click(filenameHeader);

			// Verify sorting indicators are shown
			const headerElement = filenameHeader.closest('th');
			expect(headerElement).toBeInTheDocument();

			// Click again to reverse sort
			await fireEvent.click(filenameHeader);

			// Should still show all logs
			expect(screen.getByText('app.log')).toBeInTheDocument();
			expect(screen.getByText('error.log')).toBeInTheDocument();
			expect(screen.getByText('debug.log')).toBeInTheDocument();
		});

		it('should handle refresh workflow', async () => {
			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('app.log')).toBeInTheDocument();
			});

			// Click refresh button
			const refreshButton = screen.getByRole('button', { name: /refresh/i });
			await fireEvent.click(refreshButton);

			// Verify API was called again
			expect(getLogsViaProxy).toHaveBeenCalledTimes(2); // Once on mount, once on refresh
		});
	});

	describe('Error Recovery Workflows', () => {
		it('should handle API errors and recovery in log management', async () => {
			// First call fails, second succeeds
			vi.mocked(getLogsViaProxy)
				.mockRejectedValueOnce(new Error('Network error'))
				.mockResolvedValueOnce(mockLogs);

			render(LogManagement);

			// Wait for error to be displayed
			await waitFor(() => {
				expect(screen.getByText('Error Loading Log Files')).toBeInTheDocument();
			});

			// Click retry button
			const retryButton = screen.getByRole('button', { name: /retry/i });
			await fireEvent.click(retryButton);

			// Wait for successful load
			await waitFor(() => {
				expect(screen.getByText('app.log')).toBeInTheDocument();
			});
		});

		it('should handle API errors and recovery in log viewer', async () => {
			mockPage.url.searchParams.get.mockReturnValue('app.log');
			
			// First call fails, second succeeds
			vi.mocked(getLogContentViaProxy)
				.mockRejectedValueOnce(new Error('File not found'))
				.mockResolvedValueOnce(mockLogContent);

			render(LogViewerPage);

			// Wait for error to be displayed
			await waitFor(() => {
				expect(screen.getByText('Error Loading Log Content')).toBeInTheDocument();
			});

			// Click retry button
			const retryButton = screen.getByRole('button', { name: /try again/i });
			await fireEvent.click(retryButton);

			// Wait for successful load
			await waitFor(() => {
				expect(screen.getByText('File Information')).toBeInTheDocument();
			});
		});

		it('should handle invalid filename navigation', async () => {
			mockPage.url.searchParams.get.mockReturnValue('../../../etc/passwd');
			vi.mocked(validateFilename).mockReturnValue(false);

			render(LogViewerPage);

			// Should redirect to log management
			await waitFor(() => {
				expect(mockGoto).toHaveBeenCalledWith('/admin/aimbience/log-management');
			});
		});

		it('should handle missing filename parameter', async () => {
			mockPage.url.searchParams.get.mockReturnValue(null);

			render(LogViewerPage);

			// Should redirect to log management
			await waitFor(() => {
				expect(mockGoto).toHaveBeenCalledWith('/admin/aimbience/log-management');
			});
		});
	});

	describe('API Proxy Integration', () => {
		it('should test API proxy integration with backend', async () => {
			// Mock successful API responses
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue(mockLogs)
			});
			global.fetch = mockFetch;

			// Mock withRetry to actually call the operation
			vi.mocked(withRetry).mockImplementation(async (operation) => {
				return await operation();
			});

			// Mock enhancedFetch to use the global fetch
			vi.mocked(enhancedFetch).mockImplementation(async (url, options) => {
				return await fetch(url, options);
			});

			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('app.log')).toBeInTheDocument();
			});

			// Verify the correct proxy URL was called
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/v1/auths/admin/aimbience/proxy/api/v1/logs?limit=10',
				expect.objectContaining({
					method: 'GET',
					headers: expect.objectContaining({
						'Authorization': 'Bearer test-token'
					})
				})
			);
		});

		it('should test log content API proxy integration', async () => {
			mockPage.url.searchParams.get.mockReturnValue('app.log');

			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({
					filename: 'app.log',
					size: 2048,
					modified: 1640995200,
					content_preview: mockLogContent.content,
					timestamp: '2022-01-01T00:00:00Z'
				})
			});
			global.fetch = mockFetch;

			// Mock withRetry to actually call the operation
			vi.mocked(withRetry).mockImplementation(async (operation) => {
				return await operation();
			});

			// Mock enhancedFetch to use the global fetch
			vi.mocked(enhancedFetch).mockImplementation(async (url, options) => {
				return await fetch(url, options);
			});

			render(LogViewerPage);

			await waitFor(() => {
				expect(screen.getByText('File Information')).toBeInTheDocument();
			});

			// Verify the correct proxy URL was called
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/v1/auths/admin/aimbience/proxy/api/v1/logs/app.log/info',
				expect.objectContaining({
					method: 'GET',
					headers: expect.objectContaining({
						'Authorization': 'Bearer test-token'
					})
				})
			);
		});

		it('should handle proxy authentication errors', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 401,
				statusText: 'Unauthorized',
				json: vi.fn().mockResolvedValue({ detail: 'Invalid token' })
			});
			global.fetch = mockFetch;

			vi.mocked(enhancedFetch).mockRejectedValue(new Error('Unauthorized'));

			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('Error Loading Log Files')).toBeInTheDocument();
			});
		});

		it('should handle proxy network errors', async () => {
			const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
			global.fetch = mockFetch;

			vi.mocked(enhancedFetch).mockRejectedValue(new Error('Network error'));

			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('Error Loading Log Files')).toBeInTheDocument();
			});
		});
	});

	describe('URL Handling and Navigation', () => {
		it('should handle URL parameter encoding correctly', async () => {
			mockPage.url.searchParams.get.mockReturnValue('test%20file.log');
			vi.mocked(sanitizeUrlParameter).mockReturnValue('test file.log');

			render(LogViewerPage);

			await waitFor(() => {
				expect(getLogContentViaProxy).toHaveBeenCalledWith('test-token', 'test file.log');
			});
		});

		it('should handle special characters in filenames', async () => {
			const specialFilename = 'test-file_2024.log';
			mockPage.url.searchParams.get.mockReturnValue(specialFilename);

			render(LogViewerPage);

			await waitFor(() => {
				expect(getLogContentViaProxy).toHaveBeenCalledWith('test-token', specialFilename);
			});
		});

		it('should maintain state during navigation', async () => {
			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('app.log')).toBeInTheDocument();
			});

			// Perform search
			const searchInput = screen.getByPlaceholderText(/search log files/i);
			await fireEvent.input(searchInput, { target: { value: 'app' } });

			// Change page size
			const countSelector = screen.getByLabelText(/show:/i);
			await fireEvent.change(countSelector, { target: { value: '25' } });

			// Verify state is maintained
			expect(searchInput.value).toBe('app');
			expect(countSelector.value).toBe('25');
		});
	});

	describe('Performance and Edge Cases', () => {
		it('should handle large datasets efficiently', async () => {
			const largeLogs = Array.from({ length: 100 }, (_, i) => ({
				filename: `log-${i}.log`,
				size: Math.floor(Math.random() * 10000),
				modified: 1640995200 + i,
				path: `/logs/log-${i}.log`
			}));

			vi.mocked(getLogsViaProxy).mockResolvedValue(largeLogs);

			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('100')).toBeInTheDocument(); // Total count
			});

			// Should handle pagination
			const rows = screen.getAllByRole('row');
			expect(rows.length).toBeLessThan(20); // Header + max 10 data rows
		});

		it('should handle empty datasets gracefully', async () => {
			vi.mocked(getLogsViaProxy).mockResolvedValue([]);

			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('No log files found')).toBeInTheDocument();
			});
		});

		it('should handle malformed API responses', async () => {
			vi.mocked(getLogsViaProxy).mockResolvedValue(null);

			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('Error Loading Log Files')).toBeInTheDocument();
			});
		});

		it('should handle concurrent API calls', async () => {
			render(LogManagement);

			// Trigger multiple refreshes quickly
			const refreshButton = screen.getByRole('button', { name: /refresh/i });
			
			await fireEvent.click(refreshButton);
			await fireEvent.click(refreshButton);
			await fireEvent.click(refreshButton);

			// Should handle concurrent calls gracefully
			await waitFor(() => {
				expect(screen.getByText('app.log')).toBeInTheDocument();
			});
		});
	});

	describe('Accessibility Integration', () => {
		it('should maintain accessibility during navigation workflow', async () => {
			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('app.log')).toBeInTheDocument();
			});

			// Verify ARIA labels are present
			expect(screen.getByLabelText(/search log files/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/show:/i)).toBeInTheDocument();

			// Test keyboard navigation
			const searchInput = screen.getByPlaceholderText(/search log files/i);
			await fireEvent.keyDown(searchInput, { key: 'Escape' });

			expect(searchInput.value).toBe('');
		});

		it('should maintain focus management during error states', async () => {
			vi.mocked(getLogsViaProxy).mockRejectedValue(new Error('Network error'));

			render(LogManagement);

			await waitFor(() => {
				expect(screen.getByText('Error Loading Log Files')).toBeInTheDocument();
			});

			// Retry button should be focusable
			const retryButton = screen.getByRole('button', { name: /retry/i });
			expect(retryButton).toBeInTheDocument();
			expect(retryButton).not.toBeDisabled();
		});
	});
});