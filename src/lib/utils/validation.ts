/**
 * Validation utilities for log management security
 */

/**
 * Validates a filename to prevent path traversal attacks
 * @param filename - The filename to validate
 * @returns true if valid, false otherwise
 */
export function validateFilename(filename: string): boolean {
	if (!filename || typeof filename !== 'string') {
		return false;
	}

	// Check for empty or whitespace-only strings
	if (!filename.trim()) {
		return false;
	}

	// Check for path traversal patterns
	const dangerousPatterns = [
		'../',
		'..\\',
		'%2e%2e%2f', // URL encoded ../
		'%2e%2e%5c', // URL encoded ..\
		'\0', // Null byte
		'<', // HTML/XML injection
		'>', // HTML/XML injection
		'"', // Quote injection
		"'", // Quote injection
		'&', // HTML entity injection
		'|', // Command injection
		';', // Command injection
		'`', // Command injection
		'$', // Variable injection
		'*', // Wildcard
		'?' // Wildcard
	];

	// Check if filename contains any dangerous patterns
	const lowerFilename = filename.toLowerCase();
	for (const pattern of dangerousPatterns) {
		if (lowerFilename.includes(pattern.toLowerCase())) {
			return false;
		}
	}

	// Check filename length (reasonable limit)
	if (filename.length > 255) {
		return false;
	}

	// Check for valid filename characters (alphanumeric, dots, hyphens, underscores, forward slashes for paths)
	const validFilenameRegex = /^[a-zA-Z0-9._/-]+$/;
	if (!validFilenameRegex.test(filename)) {
		return false;
	}

	// Ensure filename doesn't start with a dot (hidden files)
	if (filename.startsWith('.')) {
		return false;
	}

	return true;
}

/**
 * Validates a file path to prevent path traversal attacks while allowing subdirectories
 * @param filePath - The file path to validate
 * @returns true if valid, false otherwise
 */
export function validateFilePath(filePath: string): boolean {
	if (!filePath || typeof filePath !== 'string') {
		return false;
	}

	// Check for empty or whitespace-only strings
	if (!filePath.trim()) {
		return false;
	}

	// Check for path traversal patterns
	const dangerousPatterns = [
		'../',
		'..\\',
		'%2e%2e%2f', // URL encoded ../
		'%2e%2e%5c', // URL encoded ..\
		'\0', // Null byte
		'<', // HTML/XML injection
		'>', // HTML/XML injection
		'"', // Quote injection
		"'", // Quote injection
		'&', // HTML entity injection
		'|', // Command injection
		';', // Command injection
		'`', // Command injection
		'$', // Variable injection
		'*', // Wildcard
		'?' // Wildcard
	];

	// Check if filePath contains any dangerous patterns
	const lowerFilePath = filePath.toLowerCase();
	for (const pattern of dangerousPatterns) {
		if (lowerFilePath.includes(pattern.toLowerCase())) {
			return false;
		}
	}

	// Check filePath length (reasonable limit)
	if (filePath.length > 500) {
		return false;
	}

	// Check for valid file path characters (alphanumeric, dots, hyphens, underscores, forward slashes)
	const validFilePathRegex = /^[a-zA-Z0-9._/-]+$/;
	if (!validFilePathRegex.test(filePath)) {
		return false;
	}

	// Ensure filePath doesn't start with a dot (hidden files)
	if (filePath.startsWith('.')) {
		return false;
	}

	// Ensure filePath doesn't start with a slash (absolute paths)
	if (filePath.startsWith('/')) {
		return false;
	}

	return true;
}

/**
 * Sanitizes URL parameters to prevent injection attacks
 * @param param - The parameter to sanitize
 * @returns sanitized parameter
 */
export function sanitizeUrlParameter(param: string): string {
	if (!param || typeof param !== 'string') {
		return '';
	}

	// Remove dangerous characters and patterns
	return param
		.replace(/[<>'"&|;`$*?]/g, '') // Remove dangerous characters
		.replace(/\0/g, '') // Remove null bytes
		.replace(/%[0-9a-fA-F]{2}/g, '') // Remove URL encoded characters
		.trim()
		.substring(0, 255); // Limit length
}

/**
 * Validates search query input
 * @param query - The search query to validate
 * @returns true if valid, false otherwise
 */
export function validateSearchQuery(query: string): boolean {
	if (!query || typeof query !== 'string') {
		return true; // Empty queries are valid
	}

	// Check length
	if (query.length > 100) {
		return false;
	}

	// Check for dangerous patterns
	const dangerousPatterns = [
		'<script',
		'javascript:',
		'data:',
		'vbscript:',
		'onload=',
		'onerror=',
		'onclick=',
		'eval(',
		'expression(',
		'url(',
		'import(',
		'require('
	];

	const lowerQuery = query.toLowerCase();
	for (const pattern of dangerousPatterns) {
		if (lowerQuery.includes(pattern)) {
			return false;
		}
	}

	return true;
}

/**
 * Sanitizes content for safe display in HTML
 * @param content - The content to sanitize
 * @returns sanitized content
 */
export function sanitizeDisplayContent(content: any): string {
	if (content === null || content === undefined) {
		return '';
	}

	let stringContent: string;

	if (typeof content === 'object') {
		try {
			stringContent = JSON.stringify(content, null, 2);
		} catch {
			stringContent = String(content);
		}
	} else {
		stringContent = String(content);
	}

	// Basic HTML escaping
	return stringContent
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#x27;')
		.replace(/\//g, '&#x2F;');
}

/**
 * Validates numeric input parameters
 * @param value - The value to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns validated number or null if invalid
 */
export function validateNumericParameter(
	value: any,
	min: number = 0,
	max: number = Number.MAX_SAFE_INTEGER
): number | null {
	const num = Number(value);

	if (isNaN(num) || !isFinite(num)) {
		return null;
	}

	if (num < min || num > max) {
		return null;
	}

	return Math.floor(num); // Ensure integer
}

/**
 * Creates a safe error message for display to users
 * @param error - The error object or message
 * @param fallback - Fallback message if error is not safe to display
 * @returns safe error message
 */
export function createSafeErrorMessage(error: any, fallback: string = 'An error occurred'): string {
	if (!error) {
		return fallback;
	}

	let message: string;

	if (typeof error === 'string') {
		message = error;
	} else if (error.message) {
		message = error.message;
	} else if (error.detail) {
		message = error.detail;
	} else {
		return fallback;
	}

	// Sanitize the message to prevent XSS
	message = sanitizeDisplayContent(message);

	// Limit message length
	if (message.length > 200) {
		message = message.substring(0, 197) + '...';
	}

	return message || fallback;
}
