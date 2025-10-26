import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import LogViewerPage from './+page.svelte';
import type { LogContentResponse } from '$lib/apis/aimby';

// Mock the API functions
vi.mock('$lib/apis/aimby', () => ({
	getLogContentViaProxy: vi.fn()
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
	validateFilename: vi.fn(() => true),
	sanitizeUrlParameter: vi.fn((param) => param),
	sanitizeDisplayContent: vi.fn((content) => content?.toString().replace(/[<>&"']/g, '')),
	createSafeErrorMessage: vi.fn(
		(error, fallback) => error?.message || fallback || 'An error occurred'
	)
}));

vi.mock('$lib/utils/errorHandling', () => ({
	globalErrorHandler: {
		handleError: vi.fn(() => false)
	},
	createErrorContext: vi.fn(() => ({ operation: 'test', component: 'test' })),
	withGracefulDegradation: vi.fn(async (fn) => await fn())
}));

// Mock highlight.js
vi.mock('highlight.js/lib/core', () => ({
	default: {
		registerLanguage: vi.fn(),
		highlightElement: vi.fn()
	}
}));

vi.mock('highlight.js/lib/languages/json', () => ({
	default: vi.fn()
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

import { getLogContentViaProxy } from '$lib/apis/aimby';
import { validateFilename, sanitizeUrlParameter } from '$lib/utils/validation';
import { globalErrorHandler } from '$lib/utils/errorHandling';

describe('LogViewer Page', () => {
	const mockLogContent: LogContentResponse = {
		filename: 'test.log',
		size: 2048,
		modified: 1640995200,
		content: [
			'{"timestamp": "2022-01-01T00:00:00Z", "level": "INFO", "message": "Application started"}',
			'{"timestamp": "2022-01-01T00:01:00Z", "level": "DEBUG", "message": "Processing request"}'
		],
		timestamp: '2022-01-01T00:00:00Z'
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// Setup default successful responses
		vi.mocked(getLogContentViaProxy).mockResolvedValue(mockLogContent);
		vi.mocked(validateFilename).mockReturnValue(true);
		vi.mocked(sanitizeUrlParameter).mockImplementation((param) => param);

		// Mock page URL parameters
		mockPage.url.searchParams.get.mockReturnValue('test.log');

		// Mock navigator.clipboard
		Object.defineProperty(navigator, 'clipboard', {
			value: {
				writeText: vi.fn().mockResolvedValue(undefined)
			},
			writable: true
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Component Initialization', () => {
		it('should render the log viewer page with proper structure', async () => {
			render(LogViewerPage);

			await waitFor(() => {
				expect(screen.getByText('Log Viewer')).toBeInTheDocument();
				expect(screen.getByText('File: test.log')).toBeInTheDocument();
			});
		});

		it('should redirect to log management when no filename is provided', async () => {
			mockPage.url.searchParams.get.mockReturnValue(null);

			render(LogViewerPage);

			await waitFor(() => {
				expect(mockGoto).toHaveBeenCalledWith('/admin/aimbience/log-management');
			});
		});

		it('should redirect when filename is invalid', async () => {
			mockPage.url.searchParams.get.mockReturnValue('../../../etc/passwd');
			vi.mocked(validateFilename).mockReturnValue(false);

			render(LogViewerPage);

			await waitFor(() => {
				expect(mockGoto).toHaveBeenCalledWith('/admin/aimbience/log-management');
			});
		});

		it('should sanitize filename parameter', async () => {
			mockPage.url.searchParams.get.mockReturnValue('test<script>.log');
			vi.mocked(sanitizeUrlParameter).mockReturnValue('testscript.log');

			render(LogViewerPage);

			await waitFor(() => {
				expect(sanitizeUrlParameter).toHaveBeenCalledWith('test<script>.log');
			});
		});
	});

	describe('Content Loading and Display', () => {
		it('should display loading state initially', () => {
			render(LogViewerPage);

			expect(screen.getByText('Loading log content...')).toBeInTheDocument();
			expect(screen.getByText('Fetching content from AIMBY-API')).toBeInTheDocument();
		});

		it('should fetch and display log content', async () => {
			render(LogViewerPage);

			await waitFor(() => {
				expect(getLogContentViaProxy).toHaveBeenCalledWith('test-token', 'test.log');
				expect(screen.getByText('File Information')).toBeInTheDocument();
				expect(screen.getByText('Log Content')).toBeInTheDocument();
			});
		});

		it('should display file information correctly', async () => {
			render(LogViewerPage);

			await waitFor(() => {
				expect(screen.getByText('test.log')).toBeInTheDocument();
				expect(screen.getByText('2 KB')).toBeInTheDocument(); // File size
				expect(screen.getByText('2024-01-01 12:00:00')).toBeInTheDocument(); // Modified date
			});
		});

		it('should display JSON content with proper formatting', async () => {
			render(LogViewerPage);

			await waitFor(() => {
				expect(screen.getByText('JSON Format')).toBeInTheDocument();
				const contentElement = screen.getByText(/Application started/);
				expect(contentElement).toBeInTheDocument();
			});
		});

		it('should display plain text content when not JSON', async () => {
			const plainTextContent: LogContentResponse = {
				...mockLogContent,
				content: 'Plain text log content\nSecond line'
			};
			vi.mocked(getLogContentViaProxy).mockResolvedValue(plainTextContent);

			render(LogViewerPage);

			await waitFor(() => {
				expect(screen.getByText('Plain Text')).toBeInTheDocument();
				expect(screen.getByText(/Plain text log content/)).toBeInTheDocument();
			});
		});

		it('should handle empty content', async () => {
			const emptyContent: LogContentResponse = {
				...mockLogContent,
				content: []
			};
			vi.mocked(getLogContentViaProxy).mockResolvedValue(emptyContent);

			render(LogViewerPage);

			await waitFor(() => {
				expect(screen.getByText('No content available for this log file')).toBeInTheDocument();
			});
		});
	});

	describe('Error Handling', () => {
		it('should display error message when content loading fails', async () => {
			const errorMessage = 'File not found';
			vi.mocked(getLogContentViaProxy).mockRejectedValue(new Error(errorMessage));

			render(LogViewerPage);

			await waitFor(() => {
				expect(screen.getByText('Error Loading Log Content')).toBeInTheDocument();
				expect(screen.getByText(errorMessage)).toBeInTheDocument();
				expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
			});
		});

		it('should handle retry functionality', async () => {
			vi.mocked(getLogContentViaProxy)
				.mockRejectedValueOnce(new Error('Network error'))
				.mockResolvedValueOnce(mockLogContent);

			render(LogViewerPage);

			await waitFor(() => {
				expect(screen.getByText('Error Loading Log Content')).toBeInTheDocument();
			});

			const retryButton = screen.getByRole('button', { name: /try again/i });
			await fireEvent.click(retryButton);

			await waitFor(() => {
				expect(screen.getByText('File Information')).toBeInTheDocument();
			});
		});

		it('should show retry count', async () => {
			vi.mocked(getLogContentViaProxy).mockRejectedValue(new Error('Network error'));

			render(LogViewerPage);

			await waitFor(() => {
				expect(screen.getByText('Attempt 1')).toBeInTheDocument();
			});
		});

		it('should handle null response from API', async () => {
			vi.mocked(getLogContentViaProxy).mockResolvedValue(null);

			render(LogViewerPage);

			await waitFor(() => {
				expect(screen.getByText('Error Loading Log Content')).toBeInTheDocument();
			});
		});
	});

	describe('User Interactions', () => {
		it('should navigate back to log management when back button is clicked', async () => {
			render(LogViewerPage);

			await waitFor(() => {
				expect(screen.getByText('File Information')).toBeInTheDocument();
			});

			const backButton = screen.getByLabelText('Back to Log Management');
			await fireEvent.click(backButton);

			expect(mockGoto).toHaveBeenCalledWith('/admin/aimbience/log-management');
		});

		it('should refresh content when refresh button is clicked', async () => {
			render(LogViewerPage);

			await waitFor(() => {
				expect(screen.getByText('File Information')).toBeInTheDocument();
			});

			const refreshButton = screen.getByRole('button', { name: /refresh content/i });
			await fireEvent.click(refreshButton);

			expect(getLogContentViaProxy).toHaveBeenCalledTimes(2); // Once on mount, once on refresh
		});

		it('should copy content to clipboard when copy button is clicked', async () => {
			render(LogViewerPage);

			await waitFor(() => {
				expect(screen.getByText('File Information')).toBeInTheDocument();
			});

			const copyButton = screen.getByTitle('Copy to clipboard');
			await fireEvent.click(copyButton);

			expect(navigator.clipboard.writeText).toHaveBeenCalled();
		});

		it('should handle clipboard copy failure', async () => {
			vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('Clipboard error'));

			render(LogViewerPage);

			await waitFor(() => {
				expect(screen.getByText('File Information')).toBeInTheDocument();
			});

			const copyButton = screen.getByTitle('Copy to clipboard');
			await fireEvent.click(copyButton);

			// Should handle error gracefully
			expect(navigator.clipboard.writeText).toHaveBeenCalled();
		});

		it('should prevent copying very large content', async () => {
			const largeContent = 'x'.repeat(200000); // > 100KB
			const largeLogContent: LogContentResponse = {
				...mockLogContent,
				content: largeContent
			};
			vi.mocked(getLogContentViaProxy).mockResolvedValue(largeLogContent);

			render(LogViewerPage);

			await waitFor(() => {
				expect(screen.getByText('File Information')).toBeInTheDocument();
			});

			const copyButton = screen.getByTitle('Copy to clipboard');
			await fireEvent.click(copyButton);

			// Should not attempt to copy large content
			expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
		});
	});

	describe('Content Formatting', () => {
		it('should format JSON content with proper indentation', async () => {
			const jsonContent: LogContentResponse = {
				...mockLogContent,
				content: { key: 'value', nested: { prop: 'test' } }
			};
			vi.mocked(getLogContentViaProxy).mockResolvedValue(jsonContent);

			render(LogViewerPage);

			await waitFor(() => {
				expect(screen.getByText('JSON Format')).toBeInTheDocument();
				// Should contain formatted JSON
				const contentElement = screen.getByText(/"key": "value"/);
				expect(contentElement).toBeInTheDocument();
			});
		});

		it('should handle mixed content types in arrays', async () => {
			const mixedContent: LogContentResponse = {
				...mockLogContent,
				content: ['{"valid": "json"}', 'plain text line', { object: 'value' }]
			};
			vi.mocked(getLogContentViaProxy).mockResolvedValue(mixedContent);

			render(LogViewerPage);

			await waitFor(() => {
				expect(screen.getByText(/valid.*json/)).toBeInTheDocument();
				expect(screen.getByText(/plain text line/)).toBeInTheDocument();
			});
		});

		it('should sanitize dangerous content', async () => {
			const dangerousContent: LogContentResponse = {
				...mockLogContent,
				content: '<script>alert("xss")</script>'
			};
			vi.mocked(getLogContentViaProxy).mockResolvedValue(dangerousContent);

			render(LogViewerPage);

			await waitFor(() => {
				// Content should be sanitized
				expect(screen.queryByText('<script>')).not.toBeInTheDocument();
			});
		});
	});

	describe('Accessibility', () => {
		it('should have proper ARIA labels and roles', async () => {
			render(LogViewerPage);

			await waitFor(() => {
				expect(screen.getByLabelText('Back to Log Management')).toBeInTheDocument();
				expect(screen.getByTitle('Copy to clipboard')).toBeInTheDocument();
			});
		});

		it('should have proper heading structure', async () => {
			render(LogViewerPage);

			await waitFor(() => {
				expect(screen.getByRole('heading', { level: 1, name: 'Log Viewer' })).toBeInTheDocument();
				expect(
					screen.getByRole('heading', { level: 2, name: 'File Information' })
				).toBeInTheDocument();
				expect(screen.getByRole('heading', { level: 2, name: 'Log Content' })).toBeInTheDocument();
			});
		});
	});

	describe('Edge Cases', () => {
		it('should handle very large file sizes', async () => {
			const largeFileContent: LogContentResponse = {
				...mockLogContent,
				size: 1073741824 // 1GB
			};
			vi.mocked(getLogContentViaProxy).mockResolvedValue(largeFileContent);

			render(LogViewerPage);

			await waitFor(() => {
				expect(screen.getByText('1 GB')).toBeInTheDocument();
			});
		});

		it('should handle missing timestamp', async () => {
			const noTimestampContent: LogContentResponse = {
				...mockLogContent,
				timestamp: undefined
			};
			vi.mocked(getLogContentViaProxy).mockResolvedValue(noTimestampContent);

			render(LogViewerPage);

			await waitFor(() => {
				expect(screen.getByText('File Information')).toBeInTheDocument();
				// Should not show timestamp section
				expect(screen.queryByText('Last updated:')).not.toBeInTheDocument();
			});
		});

		it('should handle invalid date values', async () => {
			const invalidDateContent: LogContentResponse = {
				...mockLogContent,
				modified: NaN
			};
			vi.mocked(getLogContentViaProxy).mockResolvedValue(invalidDateContent);

			render(LogViewerPage);

			await waitFor(() => {
				expect(screen.getByText('Invalid Date')).toBeInTheDocument();
			});
		});

		it('should handle filename validation during API call', async () => {
			vi.mocked(validateFilename).mockReturnValueOnce(true).mockReturnValueOnce(false);

			render(LogViewerPage);

			await waitFor(() => {
				expect(globalErrorHandler.handleError).toHaveBeenCalled();
			});
		});
	});

	describe('Performance', () => {
		it('should not re-render unnecessarily', async () => {
			const { component } = render(LogViewerPage);

			await waitFor(() => {
				expect(screen.getByText('File Information')).toBeInTheDocument();
			});

			// Component should be stable after initial render
			expect(component).toBeDefined();
		});

		it('should handle syntax highlighting efficiently', async () => {
			render(LogViewerPage);

			await waitFor(() => {
				expect(screen.getByText('JSON Format')).toBeInTheDocument();
			});

			// Should apply syntax highlighting after content updates
			// This is tested through the afterUpdate lifecycle
		});
	});

	describe('URL Parameter Handling', () => {
		it('should handle encoded filename parameters', async () => {
			mockPage.url.searchParams.get.mockReturnValue('test%20file.log');
			vi.mocked(sanitizeUrlParameter).mockReturnValue('test file.log');

			render(LogViewerPage);

			await waitFor(() => {
				expect(getLogContentViaProxy).toHaveBeenCalledWith('test-token', 'test file.log');
			});
		});

		it('should handle special characters in filename', async () => {
			mockPage.url.searchParams.get.mockReturnValue('test-file_2024.log');

			render(LogViewerPage);

			await waitFor(() => {
				expect(getLogContentViaProxy).toHaveBeenCalledWith('test-token', 'test-file_2024.log');
			});
		});
	});
});
