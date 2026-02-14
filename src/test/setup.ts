import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock localStorage
const localStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
	length: 0,
	key: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
	value: localStorageMock
});

// Mock sessionStorage
const sessionStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
	length: 0,
	key: vi.fn()
};
Object.defineProperty(window, 'sessionStorage', {
	value: sessionStorageMock
});

// Mock window.location
Object.defineProperty(window, 'location', {
	value: {
		href: 'http://localhost:3000',
		origin: 'http://localhost:3000',
		pathname: '/',
		search: '',
		hash: ''
	},
	writable: true
});

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
	value: {
		writeText: vi.fn().mockResolvedValue(undefined),
		readText: vi.fn().mockResolvedValue('')
	}
});

// Mock fetch globally
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock dayjs
vi.mock('dayjs', () => {
	const mockDayjs = vi.fn(() => ({
		format: vi.fn(() => '2024-01-01 12:00:00'),
		fromNow: vi.fn(() => '2 hours ago')
	}));
	mockDayjs.extend = vi.fn();
	return { default: mockDayjs };
});

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

// Mock svelte-sonner toast
vi.mock('svelte-sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		warning: vi.fn()
	}
}));

// Mock SvelteKit stores and navigation
vi.mock('$app/stores', () => ({
	page: {
		subscribe: vi.fn(() => () => {}),
		url: {
			searchParams: {
				get: vi.fn()
			}
		}
	}
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidate: vi.fn(),
	invalidateAll: vi.fn()
}));

// Mock SvelteKit environment
vi.mock('$app/environment', () => ({
	browser: true,
	dev: true,
	building: false,
	version: 'test'
}));

// Reset all mocks before each test
beforeEach(() => {
	vi.clearAllMocks();
	localStorageMock.getItem.mockReturnValue('test-token');
});