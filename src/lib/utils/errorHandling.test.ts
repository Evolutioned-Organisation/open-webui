import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	validateFilename,
	sanitizeUrlParameter,
	validateSearchQuery,
	validateNumericParameter,
	createSafeErrorMessage,
	sanitizeDisplayContent
} from './validation';
import {
	isRetryableError,
	calculateBackoffDelay,
	withRetry,
	LogManagementError,
	createErrorContext,
	DebouncedErrorHandler,
	DEFAULT_RETRY_CONFIG
} from './errorHandling';

describe('Validation Utils', () => {
	describe('validateFilename', () => {
		it('should accept valid filenames', () => {
			expect(validateFilename('test.log')).toBe(true);
			expect(validateFilename('app-2024-01-01.log')).toBe(true);
			expect(validateFilename('service_debug.txt')).toBe(true);
		});

		it('should reject invalid filenames', () => {
			expect(validateFilename('')).toBe(false);
			expect(validateFilename('../test.log')).toBe(false);
			expect(validateFilename('test/file.log')).toBe(false);
			expect(validateFilename('test\\file.log')).toBe(false);
			expect(validateFilename('.hidden')).toBe(false);
			expect(validateFilename('test<script>.log')).toBe(false);
		});

		it('should reject null or undefined', () => {
			expect(validateFilename(null as any)).toBe(false);
			expect(validateFilename(undefined as any)).toBe(false);
		});
	});

	describe('sanitizeUrlParameter', () => {
		it('should sanitize dangerous characters', () => {
			expect(sanitizeUrlParameter('test<script>alert(1)</script>')).toBe('testscriptalert(1)/script');
			expect(sanitizeUrlParameter('test&param=value')).toBe('testparam=value');
			expect(sanitizeUrlParameter('test|command')).toBe('testcommand');
		});

		it('should handle null/undefined', () => {
			expect(sanitizeUrlParameter(null as any)).toBe('');
			expect(sanitizeUrlParameter(undefined as unknown)).toBe('');
		});
	});

	describe('validateSearchQuery', () => {
		it('should accept safe search queries', () => {
			expect(validateSearchQuery('test log')).toBe(true);
			expect(validateSearchQuery('error 404')).toBe(true);
			expect(validateSearchQuery('')).toBe(true);
		});

		it('should reject dangerous queries', () => {
			expect(validateSearchQuery('<script>alert(1)</script>')).toBe(false);
			expect(validateSearchQuery('javascript:alert(1)')).toBe(false);
			expect(validateSearchQuery('eval(malicious)')).toBe(false);
		});
	});

	describe('validateNumericParameter', () => {
		it('should validate numeric ranges', () => {
			expect(validateNumericParameter(5, 1, 10)).toBe(5);
			expect(validateNumericParameter('5', 1, 10)).toBe(5);
			expect(validateNumericParameter(5.7, 1, 10)).toBe(5); // Should floor
		});

		it('should reject invalid numbers', () => {
			expect(validateNumericParameter('abc', 1, 10)).toBe(null);
			expect(validateNumericParameter(15, 1, 10)).toBe(null);
			expect(validateNumericParameter(-5, 1, 10)).toBe(null);
		});
	});

	describe('createSafeErrorMessage', () => {
		it('should create safe error messages', () => {
			const error = new Error('Test error');
			expect(createSafeErrorMessage(error)).toBe('Test error');
		});

		it('should use fallback for unsafe errors', () => {
			expect(createSafeErrorMessage(null)).toBe('An error occurred');
			expect(createSafeErrorMessage(undefined, 'Custom fallback')).toBe('Custom fallback');
		});
	});

	describe('sanitizeDisplayContent', () => {
		it('should escape HTML characters', () => {
			expect(sanitizeDisplayContent('<script>alert(1)</script>'))
				.toBe('&lt;script&gt;alert(1)&lt;&#x2F;script&gt;');
			expect(sanitizeDisplayContent('test & "quotes"'))
				.toBe('test &amp; &quot;quotes&quot;');
		});
	});
});

describe('Error Handling Utils', () => {
	describe('isRetryableError', () => {
		it('should identify retryable errors', () => {
			expect(isRetryableError({ status: 500 })).toBe(true);
			expect(isRetryableError({ status: 502 })).toBe(true);
			expect(isRetryableError({ status: 503 })).toBe(true);
			expect(isRetryableError({ name: 'TypeError', message: 'fetch failed' })).toBe(true);
		});

		it('should identify non-retryable errors', () => {
			expect(isRetryableError({ status: 400 })).toBe(false);
			expect(isRetryableError({ status: 401 })).toBe(false);
			expect(isRetryableError({ status: 404 })).toBe(false);
		});
	});

	describe('calculateBackoffDelay', () => {
		it('should calculate exponential backoff', () => {
			const config = { baseDelay: 1000, maxDelay: 10000, backoffMultiplier: 2, maxRetries: 3 };
			expect(calculateBackoffDelay(1, config)).toBe(1000);
			expect(calculateBackoffDelay(2, config)).toBe(2000);
			expect(calculateBackoffDelay(3, config)).toBe(4000);
		});

		it('should respect max delay', () => {
			const config = { baseDelay: 1000, maxDelay: 3000, backoffMultiplier: 2, maxRetries: 5 };
			expect(calculateBackoffDelay(5, config)).toBe(3000);
		});
	});

	describe('LogManagementError', () => {
		it('should create error with context', () => {
			const context = createErrorContext('test', 'component');
			const error = new LogManagementError('Test error', context);
			
			expect(error.message).toBe('Test error');
			expect(error.context.operation).toBe('test');
			expect(error.context.component).toBe('component');
			expect(error.isRetryable).toBe(true);
		});
	});

	describe('withRetry', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		it('should succeed on first attempt', async () => {
			const operation = vi.fn().mockResolvedValue('success');
			const context = createErrorContext('test', 'component');
			
			const result = await withRetry(operation, context, { ...DEFAULT_RETRY_CONFIG, maxRetries: 2 });
			
			expect(result).toBe('success');
			expect(operation).toHaveBeenCalledTimes(1);
		});

		it('should retry on retryable errors', async () => {
			const operation = vi.fn()
				.mockRejectedValueOnce({ status: 500, message: 'Server error' })
				.mockResolvedValue('success');
			const context = createErrorContext('test', 'component');
			
			// Use very short delays for testing
			const result = await withRetry(operation, context, { 
				maxRetries: 1, 
				baseDelay: 1, 
				maxDelay: 1, 
				backoffMultiplier: 1 
			});
			
			expect(result).toBe('success');
			expect(operation).toHaveBeenCalledTimes(2);
		}, 10000);
	});

	describe('DebouncedErrorHandler', () => {
		it('should handle errors with debouncing', () => {
			const handler = new DebouncedErrorHandler(1000, 2);
			const context = createErrorContext('test', 'component');
			
			// First error should be handled
			expect(handler.handleError(new Error('Test'), context)).toBe(true);
			
			// Second error should be handled
			expect(handler.handleError(new Error('Test'), context)).toBe(true);
			
			// Third error should be debounced
			expect(handler.handleError(new Error('Test'), context)).toBe(false);
		});
	});
});