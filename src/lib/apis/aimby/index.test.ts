import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	getLogsViaProxy,
	getLogContentViaProxy,
	type LogFileInfo,
	type LogContentResponse
} from './index';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AIMBY API Log Functions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset console methods to avoid noise in tests
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('getLogsViaProxy', () => {
		it('should construct correct URL with default parameters', async () => {
			const mockResponse: LogFileInfo[] = [
				{
					filename: 'test.log',
					size: 1024,
					modified: 1640995200,
					path: '/logs/test.log'
				}
			];

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse)
			});

			const result = await getLogsViaProxy('test-token');

			expect(mockFetch).toHaveBeenCalledWith(
				'/api/v1/auths/admin/aimbience/proxy/api/v1/logs?limit=10',
				{
					method: 'GET',
					headers: {
						Accept: 'application/json',
						'Content-Type': 'application/json',
						Authorization: 'Bearer test-token'
					}
				}
			);
			expect(result).toEqual(mockResponse);
		});

		it('should construct correct URL with custom limit parameter', async () => {
			const mockResponse: LogFileInfo[] = [];

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse)
			});

			await getLogsViaProxy('test-token', 25);

			expect(mockFetch).toHaveBeenCalledWith(
				'/api/v1/auths/admin/aimbience/proxy/api/v1/logs?limit=25',
				expect.any(Object)
			);
		});

		it('should handle successful response with log data', async () => {
			const mockResponse: LogFileInfo[] = [
				{
					filename: 'app.log',
					size: 2048,
					modified: 1640995200,
					path: '/logs/app.log',
					timestamp: '2022-01-01T00:00:00Z'
				},
				{
					filename: 'error.log',
					size: 512,
					modified: 1640995100,
					path: '/logs/error.log'
				}
			];

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse)
			});

			const result = await getLogsViaProxy('test-token');

			expect(result).toEqual(mockResponse);
			expect(result).toHaveLength(2);
			expect(result![0].filename).toBe('app.log');
			expect(result![1].filename).toBe('error.log');
		});

		it('should handle empty token parameter', async () => {
			const mockResponse: LogFileInfo[] = [];

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse)
			});

			await getLogsViaProxy('');

			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: 'Bearer '
					})
				})
			);
		});

		it('should handle API error response with JSON error details', async () => {
			const errorResponse = { detail: 'Unauthorized access' };

			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				statusText: 'Unauthorized',
				json: () => Promise.resolve(errorResponse)
			});

			const result = await getLogsViaProxy('invalid-token');

			expect(result).toBeNull();
			expect(console.error).toHaveBeenCalledWith('API error:', 401, 'Unauthorized access');
		});

		it('should handle API error response without JSON error details', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error',
				json: () => Promise.reject(new Error('Invalid JSON'))
			});

			const result = await getLogsViaProxy('test-token');

			expect(result).toBeNull();
			expect(console.error).toHaveBeenCalledWith('API error:', 500, 'Internal Server Error');
		});

		it('should handle network error', async () => {
			const networkError = new Error('Network connection failed');
			mockFetch.mockRejectedValueOnce(networkError);

			const result = await getLogsViaProxy('test-token');

			expect(result).toBeNull();
			expect(console.error).toHaveBeenCalledWith('Network error:', networkError);
		});

		it('should handle network error with custom message', async () => {
			const networkError = { message: 'Custom network error' };
			mockFetch.mockRejectedValueOnce(networkError);

			const result = await getLogsViaProxy('test-token');

			expect(result).toBeNull();
			expect(console.error).toHaveBeenCalledWith('Network error:', networkError);
		});
	});

	describe('getLogContentViaProxy', () => {
		it('should construct correct URL for valid filename', async () => {
			const mockResponse = {
				filename: 'test.log',
				size: 1024,
				modified: 1640995200,
				content_preview: ['line 1', 'line 2'],
				timestamp: '2022-01-01T00:00:00Z'
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse)
			});

			const result = await getLogContentViaProxy('test-token', 'test.log');

			expect(mockFetch).toHaveBeenCalledWith(
				'/api/v1/auths/admin/aimbience/proxy/api/v1/logs/test.log/info',
				{
					method: 'GET',
					headers: {
						Accept: 'application/json',
						'Content-Type': 'application/json',
						Authorization: 'Bearer test-token'
					}
				}
			);
			expect(result).toEqual({
				filename: 'test.log',
				size: 1024,
				modified: 1640995200,
				content: ['line 1', 'line 2'],
				timestamp: '2022-01-01T00:00:00Z'
			});
		});

		it('should properly encode filename in URL', async () => {
			const mockResponse = {
				filename: 'test file.log',
				size: 1024,
				modified: 1640995200,
				content_preview: []
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse)
			});

			await getLogContentViaProxy('test-token', 'test file.log');

			expect(mockFetch).toHaveBeenCalledWith(
				'/api/v1/auths/admin/aimbience/proxy/api/v1/logs/test%20file.log/info',
				expect.any(Object)
			);
		});

		it('should handle successful response with content preview', async () => {
			const mockResponse = {
				filename: 'app.log',
				size: 2048,
				modified: 1640995200,
				content_preview: [
					'{"timestamp": "2022-01-01T00:00:00Z", "level": "INFO", "message": "Application started"}',
					'{"timestamp": "2022-01-01T00:01:00Z", "level": "DEBUG", "message": "Processing request"}'
				],
				timestamp: '2022-01-01T00:00:00Z'
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse)
			});

			const result = await getLogContentViaProxy('test-token', 'app.log');

			expect(result).toEqual({
				filename: 'app.log',
				size: 2048,
				modified: 1640995200,
				content: [
					'{"timestamp": "2022-01-01T00:00:00Z", "level": "INFO", "message": "Application started"}',
					'{"timestamp": "2022-01-01T00:01:00Z", "level": "DEBUG", "message": "Processing request"}'
				],
				timestamp: '2022-01-01T00:00:00Z'
			});
		});

		it('should handle response without content preview', async () => {
			const mockResponse = {
				filename: 'empty.log',
				size: 0,
				modified: 1640995200
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse)
			});

			const result = await getLogContentViaProxy('test-token', 'empty.log');

			expect(result).toEqual({
				filename: 'empty.log',
				size: 0,
				modified: 1640995200,
				content: [],
				timestamp: undefined
			});
		});

		it('should reject invalid filename with path traversal attempt', async () => {
			const result = await getLogContentViaProxy('test-token', '../../../etc/passwd');

			expect(result).toBeNull();
			expect(mockFetch).not.toHaveBeenCalled();
			expect(console.error).toHaveBeenCalledWith('Invalid filename:', '../../../etc/passwd');
		});

		it('should reject filename with forward slash', async () => {
			const result = await getLogContentViaProxy('test-token', 'logs/test.log');

			expect(result).toBeNull();
			expect(mockFetch).not.toHaveBeenCalled();
			expect(console.error).toHaveBeenCalledWith('Invalid filename:', 'logs/test.log');
		});

		it('should reject filename with backslash', async () => {
			const result = await getLogContentViaProxy('test-token', 'logs\\test.log');

			expect(result).toBeNull();
			expect(mockFetch).not.toHaveBeenCalled();
			expect(console.error).toHaveBeenCalledWith('Invalid filename:', 'logs\\test.log');
		});

		it('should reject empty filename', async () => {
			const result = await getLogContentViaProxy('test-token', '');

			expect(result).toBeNull();
			expect(mockFetch).not.toHaveBeenCalled();
			expect(console.error).toHaveBeenCalledWith('Invalid filename:', '');
		});

		it('should handle API error response with JSON error details', async () => {
			const errorResponse = { detail: 'File not found' };

			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: 'Not Found',
				json: () => Promise.resolve(errorResponse)
			});

			const result = await getLogContentViaProxy('test-token', 'nonexistent.log');

			expect(result).toBeNull();
			expect(console.error).toHaveBeenCalledWith('API error getting file info:', 404, 'File not found');
		});

		it('should handle API error response without JSON error details', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 403,
				statusText: 'Forbidden',
				json: () => Promise.reject(new Error('Invalid JSON'))
			});

			const result = await getLogContentViaProxy('test-token', 'restricted.log');

			expect(result).toBeNull();
			expect(console.error).toHaveBeenCalledWith('API error getting file info:', 403, 'Forbidden');
		});

		it('should handle network error', async () => {
			const networkError = new Error('Connection timeout');
			mockFetch.mockRejectedValueOnce(networkError);

			const result = await getLogContentViaProxy('test-token', 'test.log');

			expect(result).toBeNull();
			expect(console.error).toHaveBeenCalledWith('Network error:', networkError);
		});

		it('should handle network error with custom message', async () => {
			const networkError = { message: 'DNS resolution failed' };
			mockFetch.mockRejectedValueOnce(networkError);

			const result = await getLogContentViaProxy('test-token', 'test.log');

			expect(result).toBeNull();
			expect(console.error).toHaveBeenCalledWith('Network error:', networkError);
		});

		it('should handle empty token parameter', async () => {
			const mockResponse = {
				filename: 'test.log',
				size: 1024,
				modified: 1640995200,
				content_preview: []
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse)
			});

			await getLogContentViaProxy('', 'test.log');

			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: 'Bearer '
					})
				})
			);
		});
	});

	describe('URL Construction and Parameter Passing', () => {
		it('should construct proxy URLs following the established pattern', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve([])
			});

			await getLogsViaProxy('token', 5);
			await getLogContentViaProxy('token', 'test.log');

			const calls = mockFetch.mock.calls;
			
			// Verify logs endpoint URL structure
			expect(calls[0][0]).toBe('/api/v1/auths/admin/aimbience/proxy/api/v1/logs?limit=5');
			
			// Verify log content endpoint URL structure
			expect(calls[1][0]).toBe('/api/v1/auths/admin/aimbience/proxy/api/v1/logs/test.log/info');
		});

		it('should pass parameters correctly in query string', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve([])
			});

			await getLogsViaProxy('token', 100);

			expect(mockFetch).toHaveBeenCalledWith(
				'/api/v1/auths/admin/aimbience/proxy/api/v1/logs?limit=100',
				expect.any(Object)
			);
		});

		it('should properly encode special characters in filename', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({
					filename: 'test file with spaces.log',
					size: 0,
					modified: 0,
					content_preview: []
				})
			});

			await getLogContentViaProxy('token', 'test file with spaces.log');

			expect(mockFetch).toHaveBeenCalledWith(
				'/api/v1/auths/admin/aimbience/proxy/api/v1/logs/test%20file%20with%20spaces.log/info',
				expect.any(Object)
			);
		});
	});

	describe('Response Parsing', () => {
		it('should parse log list response correctly', async () => {
			const mockResponse: LogFileInfo[] = [
				{
					filename: 'test1.log',
					size: 1024,
					modified: 1640995200,
					path: '/logs/test1.log',
					timestamp: '2022-01-01T00:00:00Z'
				},
				{
					filename: 'test2.log',
					size: 2048,
					modified: 1640995100,
					path: '/logs/test2.log'
				}
			];

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse)
			});

			const result = await getLogsViaProxy('token');

			expect(result).toEqual(mockResponse);
			expect(Array.isArray(result)).toBe(true);
			expect(result).toHaveLength(2);
		});

		it('should parse log content response correctly', async () => {
			const mockApiResponse = {
				filename: 'test.log',
				size: 1024,
				modified: 1640995200,
				content_preview: ['line1', 'line2'],
				timestamp: '2022-01-01T00:00:00Z'
			};

			const expectedResult: LogContentResponse = {
				filename: 'test.log',
				size: 1024,
				modified: 1640995200,
				content: ['line1', 'line2'],
				timestamp: '2022-01-01T00:00:00Z'
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockApiResponse)
			});

			const result = await getLogContentViaProxy('token', 'test.log');

			expect(result).toEqual(expectedResult);
		});

		it('should handle malformed JSON response gracefully', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.reject(new Error('Invalid JSON'))
			});

			const result = await getLogsViaProxy('token');

			expect(result).toBeNull();
			expect(console.error).toHaveBeenCalledWith('Network error:', expect.any(Error));
		});
	});
});