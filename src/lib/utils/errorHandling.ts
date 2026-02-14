/**
 * Enhanced error handling utilities for log management
 */

import { toast } from 'svelte-sonner';
import { createSafeErrorMessage } from './validation';

export interface RetryConfig {
	maxRetries: number;
	baseDelay: number;
	maxDelay: number;
	backoffMultiplier: number;
}

export interface ErrorContext {
	operation: string;
	component: string;
	timestamp: number;
	userAgent?: string;
	url?: string;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
	maxRetries: 3,
	baseDelay: 1000,
	maxDelay: 10000,
	backoffMultiplier: 2
};

/**
 * Enhanced error class with context
 */
export class LogManagementError extends Error {
	public readonly context: ErrorContext;
	public readonly originalError?: Error;
	public readonly isRetryable: boolean;

	constructor(
		message: string,
		context: ErrorContext,
		originalError?: Error,
		isRetryable: boolean = true
	) {
		super(message);
		this.name = 'LogManagementError';
		this.context = context;
		this.originalError = originalError;
		this.isRetryable = isRetryable;
	}
}

/**
 * Determines if an error is retryable based on its characteristics
 */
export function isRetryableError(error: any): boolean {
	if (error instanceof LogManagementError) {
		return error.isRetryable;
	}

	// Network errors are generally retryable
	if (error.name === 'TypeError' && error.message.includes('fetch')) {
		return true;
	}

	// HTTP status codes that are retryable
	if (error.status) {
		const retryableStatuses = [408, 429, 500, 502, 503, 504];
		return retryableStatuses.includes(error.status);
	}

	// Timeout errors are retryable
	if (error.name === 'AbortError' || error.message.includes('timeout')) {
		return true;
	}

	// Default to non-retryable for unknown errors
	return false;
}

/**
 * Implements exponential backoff delay
 */
export function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
	const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
	return Math.min(delay, config.maxDelay);
}

/**
 * Executes a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
	operation: () => Promise<T>,
	context: ErrorContext,
	config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
	let lastError: Error;

	for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error as Error;

			// Log the error for debugging
			console.error(`Attempt ${attempt} failed for ${context.operation}:`, error);

			// If this is the last attempt or error is not retryable, throw
			if (attempt > config.maxRetries || !isRetryableError(error)) {
				throw new LogManagementError(
					`Failed after ${attempt} attempts: ${lastError.message}`,
					context,
					lastError,
					false
				);
			}

			// Wait before retrying
			const delay = calculateBackoffDelay(attempt, config);
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	}

	// This should never be reached, but TypeScript requires it
	throw lastError!;
}

/**
 * Handles errors consistently across components
 */
export function handleError(
	error: any,
	context: ErrorContext,
	showToast: boolean = true
): LogManagementError {
	const logError = error instanceof LogManagementError 
		? error 
		: new LogManagementError(
			error.message || 'Unknown error occurred',
			context,
			error
		);

	// Log error for debugging
	console.error(`Error in ${context.component}.${context.operation}:`, {
		error: logError,
		context: logError.context,
		originalError: logError.originalError,
		timestamp: new Date(context.timestamp).toISOString()
	});

	// Show user-friendly toast message
	if (showToast) {
		const safeMessage = createSafeErrorMessage(error, `Error in ${context.operation}`);
		toast.error(safeMessage);
	}

	return logError;
}

/**
 * Creates error context for operations
 */
export function createErrorContext(
	operation: string,
	component: string,
	additionalInfo?: Partial<ErrorContext>
): ErrorContext {
	return {
		operation,
		component,
		timestamp: Date.now(),
		userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
		url: typeof window !== 'undefined' ? window.location.href : undefined,
		...additionalInfo
	};
}

/**
 * Network connectivity checker
 */
export async function checkNetworkConnectivity(): Promise<boolean> {
	try {
		// Try to fetch a small resource to check connectivity
		const response = await fetch('/api/v1/health', {
			method: 'HEAD',
			cache: 'no-cache'
		});
		return response.ok;
	} catch {
		return false;
	}
}

/**
 * Enhanced fetch wrapper with error handling and retry logic
 */
export async function enhancedFetch(
	url: string,
	options: RequestInit = {},
	context: ErrorContext,
	retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<Response> {
	const operation = async (): Promise<Response> => {
		// Check network connectivity before making request
		if (!(await checkNetworkConnectivity())) {
			throw new LogManagementError(
				'Network connectivity issue detected',
				context,
				undefined,
				true
			);
		}

		const response = await fetch(url, {
			...options,
			// Add timeout to prevent hanging requests
			signal: AbortSignal.timeout(30000)
		});

		if (!response.ok) {
			throw new LogManagementError(
				`HTTP ${response.status}: ${response.statusText}`,
				context,
				undefined,
				isRetryableError({ status: response.status })
			);
		}

		return response;
	};

	return withRetry(operation, context, retryConfig);
}

/**
 * Graceful degradation handler
 */
export function withGracefulDegradation<T>(
	operation: () => Promise<T>,
	fallback: T,
	context: ErrorContext
): Promise<T> {
	return operation().catch(error => {
		handleError(error, context, false); // Don't show toast for graceful degradation
		return fallback;
	});
}

/**
 * Debounced error handler to prevent spam
 */
export class DebouncedErrorHandler {
	private errorCounts = new Map<string, number>();
	private lastErrorTimes = new Map<string, number>();
	private readonly debounceTime: number;
	private readonly maxErrorsPerPeriod: number;

	constructor(debounceTime: number = 5000, maxErrorsPerPeriod: number = 3) {
		this.debounceTime = debounceTime;
		this.maxErrorsPerPeriod = maxErrorsPerPeriod;
	}

	public handleError(error: any, context: ErrorContext): boolean {
		const key = `${context.component}.${context.operation}`;
		const now = Date.now();
		
		const lastTime = this.lastErrorTimes.get(key) || 0;
		const count = this.errorCounts.get(key) || 0;

		// Reset count if enough time has passed
		if (now - lastTime > this.debounceTime) {
			this.errorCounts.set(key, 1);
			this.lastErrorTimes.set(key, now);
			handleError(error, context, true);
			return true;
		}

		// Increment count
		this.errorCounts.set(key, count + 1);
		this.lastErrorTimes.set(key, now);

		// Only show error if under the limit
		if (count < this.maxErrorsPerPeriod) {
			handleError(error, context, true);
			return true;
		}

		// Log but don't show toast for excessive errors
		handleError(error, context, false);
		return false;
	}
}

/**
 * Global debounced error handler instance
 */
export const globalErrorHandler = new DebouncedErrorHandler();