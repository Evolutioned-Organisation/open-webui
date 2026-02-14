#!/bin/bash

# Log Management Test Runner
# This script runs all tests related to the log management feature

echo "🧪 Running Log Management Tests"
echo "================================"

# Set test environment
export NODE_ENV=test

# Run unit tests for API functions
echo "📋 Running API unit tests..."
npm run test:frontend -- --run src/lib/apis/aimby/index.test.ts

# Run unit tests for utility functions
echo "📋 Running utility unit tests..."
npm run test:frontend -- --run src/lib/utils/errorHandling.test.ts

# Run component unit tests
echo "📋 Running component unit tests..."
npm run test:frontend -- --run src/lib/components/admin/Aimbience/Components/LogManagement.test.ts

# Run log viewer unit tests
echo "📋 Running log viewer unit tests..."
npm run test:frontend -- --run src/routes/\(app\)/admin/aimbience/log-viewer/LogViewer.test.ts

# Run integration tests
echo "📋 Running integration tests..."
npm run test:frontend -- --run src/test/integration/log-management.integration.test.ts

echo "✅ All log management tests completed!"
echo ""
echo "📊 Test Coverage Summary:"
echo "- API Functions: Comprehensive unit tests with mocked responses"
echo "- Components: UI interaction and state management tests"
echo "- Integration: End-to-end workflow testing"
echo "- Error Handling: Retry mechanisms and error recovery"
echo "- Accessibility: ARIA labels and keyboard navigation"
echo "- Security: Input validation and sanitization"
echo ""
echo "🔧 To run tests individually:"
echo "npm run test:frontend -- --run <test-file-path>"
echo ""
echo "📈 To run with coverage:"
echo "npm run test:frontend -- --coverage"