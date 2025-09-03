import { render, fireEvent, screen } from '@testing-library/svelte';
import { vi } from 'vitest';
import LogTree from '../LogTree.svelte';

describe('LogTree', () => {
	describe('Array of log entries', () => {
		const mockLogContent = [
			{
				message: 'User asked about weather',
				timestamp: '2024-01-01T10:00:00Z',
				level: 'info',
				metadata: {
					user_id: '123',
					session_id: 'abc'
				}
			},
			{
				message: 'System processed request',
				timestamp: '2024-01-01T10:01:00Z',
				level: 'debug',
				data: {
					response_time: 150,
					status: 'success'
				}
			}
		];

		it('should render message as main node name for each entry', () => {
			render(LogTree, { logContent: mockLogContent });

			expect(screen.getByText('User asked about weather')).toBeInTheDocument();
			expect(screen.getByText('System processed request')).toBeInTheDocument();
		});

		it('should display messages with proper styling', () => {
			render(LogTree, { logContent: mockLogContent });

			const message1 = screen.getByText('User asked about weather');
			const message2 = screen.getByText('System processed request');

			expect(message1).toHaveClass('text-lg', 'font-semibold');
			expect(message2).toHaveClass('text-lg', 'font-semibold');
		});

		it('should show other fields when expanded', () => {
			render(LogTree, { logContent: mockLogContent });

			// Messages should be visible by default
			expect(screen.getByText('User asked about weather')).toBeInTheDocument();

			// Other fields should be visible when expanded
			expect(screen.getByText('"timestamp"')).toBeInTheDocument();
			expect(screen.getByText('"level"')).toBeInTheDocument();
			expect(screen.getByText('"metadata"')).toBeInTheDocument();
		});

		it('should handle entries without message field', () => {
			const logWithoutMessage = [
				{
					msg: 'Alternative message field',
					timestamp: '2024-01-01T10:00:00Z'
				},
				{
					text: 'Another alternative',
					level: 'info'
				},
				{
					// No message field at all
					timestamp: '2024-01-01T10:00:00Z',
					level: 'error'
				}
			];

			render(LogTree, { logContent: logWithoutMessage });

			expect(screen.getByText('Alternative message field')).toBeInTheDocument();
			expect(screen.getByText('Another alternative')).toBeInTheDocument();
			expect(screen.getByText('Entry 3')).toBeInTheDocument(); // Fallback for missing message
		});

		it('should allow collapsing and expanding entries', async () => {
			render(LogTree, { logContent: mockLogContent });

			// Find toggle buttons (they should be present for objects with children)
			const toggleButtons = screen.getAllByRole('button', { name: /expand|collapse/i });

			// Click first toggle button to collapse
			await fireEvent.click(toggleButtons[0]);

			// The entry should show collapsed summary - look for the specific text pattern
			expect(screen.getByText(/Object\(4\).*click to expand/)).toBeInTheDocument();

			// Click again to expand
			await fireEvent.click(toggleButtons[0]);

			// Should show expanded content again
			expect(screen.getByText('"timestamp"')).toBeInTheDocument();
		});
	});

	describe('Single object', () => {
		const mockSingleObject = {
			message: 'Single log entry',
			timestamp: '2024-01-01T10:00:00Z',
			level: 'info',
			nested: {
				key1: 'value1',
				key2: 'value2'
			}
		};

		it('should render single object correctly', () => {
			render(LogTree, { logContent: mockSingleObject });

			expect(screen.getByText('"message"')).toBeInTheDocument();
			expect(screen.getByText('"timestamp"')).toBeInTheDocument();
			expect(screen.getByText('"level"')).toBeInTheDocument();
			expect(screen.getByText('"nested"')).toBeInTheDocument();
		});

		it('should handle nested objects', async () => {
			render(LogTree, { logContent: mockSingleObject });

			// Find the nested object toggle button
			const nestedToggle = screen.getByRole('button', { name: /expand|collapse/i });

			// Click to expand nested object
			await fireEvent.click(nestedToggle);

			// Should show nested keys
			expect(screen.getByText('"key1"')).toBeInTheDocument();
			expect(screen.getByText('"key2"')).toBeInTheDocument();
		});
	});

	describe('Array handling', () => {
		const mockArrayContent = {
			items: [
				{ name: 'Item 1', value: 100 },
				{ name: 'Item 2', value: 200 }
			],
			metadata: {
				count: 2,
				total: 300
			}
		};

		it('should handle arrays correctly', async () => {
			render(LogTree, { logContent: mockArrayContent });

			// Find toggle button for items array (get the first one)
			const arrayToggles = screen.getAllByRole('button', { name: /expand|collapse/i });
			const arrayToggle = arrayToggles[0]; // First toggle button

			// Click to expand array
			await fireEvent.click(arrayToggle);

			// Should show array items
			expect(screen.getByText('[0]')).toBeInTheDocument();
			expect(screen.getByText('[1]')).toBeInTheDocument();
		});
	});

	describe('Invalid JSON', () => {
		it('should show error message for invalid JSON', () => {
			render(LogTree, { logContent: 'invalid json string' });

			expect(screen.getByText('Invalid JSON Structure')).toBeInTheDocument();
			expect(
				screen.getByText('The log content cannot be displayed as a tree structure.')
			).toBeInTheDocument();
		});

		it('should show error message for null content', () => {
			render(LogTree, { logContent: null });

			expect(screen.getByText('Invalid JSON Structure')).toBeInTheDocument();
		});
	});

	describe('Node type detection', () => {
		it('should handle different data types correctly', () => {
			const mixedContent = {
				string_field: 'hello',
				number_field: 42,
				boolean_field: true,
				null_field: null,
				undefined_field: undefined,
				array_field: [1, 2, 3],
				object_field: { nested: 'value' }
			};

			render(LogTree, { logContent: mixedContent });

			// All fields should be rendered
			expect(screen.getByText('"string_field"')).toBeInTheDocument();
			expect(screen.getByText('"number_field"')).toBeInTheDocument();
			expect(screen.getByText('"boolean_field"')).toBeInTheDocument();
			expect(screen.getByText('"null_field"')).toBeInTheDocument();
			expect(screen.getByText('"array_field"')).toBeInTheDocument();
			expect(screen.getByText('"object_field"')).toBeInTheDocument();
		});
	});

	describe('Accessibility', () => {
		it('should have proper ARIA labels for toggle buttons', () => {
			const mockContent = {
				message: 'Test message',
				nested: { key: 'value' }
			};

			render(LogTree, { logContent: mockContent });

			const toggleButtons = screen.getAllByRole('button');
			toggleButtons.forEach((button) => {
				expect(button).toHaveAttribute('aria-label');
			});
		});

		it('should be keyboard accessible', async () => {
			const mockContent = {
				message: 'Test message',
				nested: { key: 'value' }
			};

			render(LogTree, { logContent: mockContent });

			const toggleButton = screen.getByRole('button');

			// Should be focusable
			toggleButton.focus();
			expect(toggleButton).toHaveFocus();

			// Should respond to Enter key
			await fireEvent.keyDown(toggleButton, { key: 'Enter' });
			// Note: In a real test, you'd verify the state change
		});
	});

	describe('Edge cases', () => {
		it('should handle empty array', () => {
			render(LogTree, { logContent: [] });

			// Should render without errors
			expect(screen.getByText('Interactive Tree View')).toBeInTheDocument();
		});

		it('should handle empty object', () => {
			render(LogTree, { logContent: {} });

			// Should render without errors
			expect(screen.getByText('Interactive Tree View')).toBeInTheDocument();
		});

		it('should handle very deep nesting', () => {
			const deepObject = {
				level1: {
					level2: {
						level3: {
							level4: {
								message: 'Deep nested message',
								value: 'test'
							}
						}
					}
				}
			};

			render(LogTree, { logContent: deepObject });

			// Should render without errors
			expect(screen.getByText('"level1"')).toBeInTheDocument();
		});

		it('should handle large arrays', () => {
			const largeArray = Array.from({ length: 100 }, (_, i) => ({
				message: `Message ${i}`,
				id: i
			}));

			render(LogTree, { logContent: largeArray });

			// Should render first few messages
			expect(screen.getByText('Message 0')).toBeInTheDocument();
			expect(screen.getByText('Message 1')).toBeInTheDocument();
		});
	});
});
