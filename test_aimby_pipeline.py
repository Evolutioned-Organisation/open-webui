#!/usr/bin/env python3
"""
Test script for AIMBY Workflow Pipeline

This script tests the pipeline functionality without requiring Open WebUI.
"""

import asyncio
import json
import sys
import os
from unittest.mock import Mock

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from aimby_workflow_pipeline import Pipeline

class MockRequest:
    """Mock FastAPI Request object"""
    def __init__(self):
        self.headers = {}
        self.query_params = {}
        self.path_params = {}

async def test_pipeline_initialization():
    """Test pipeline initialization"""
    print("🧪 Testing pipeline initialization...")
    
    try:
        pipeline = Pipeline()
        print(f"✅ Pipeline initialized successfully")
        print(f"   Name: {pipeline.name}")
        print(f"   API URL: {pipeline.valves.AIMBY_API_URL}")
        print(f"   Default Workflow: {pipeline.valves.WORKFLOW_ID}")
        print(f"   Timeout: {pipeline.valves.TIMEOUT}s")
        print(f"   Debug Enabled: {pipeline.valves.ENABLE_DEBUG}")
        return True
    except Exception as e:
        print(f"❌ Pipeline initialization failed: {e}")
        return False

async def test_message_extraction():
    """Test message extraction from different body formats"""
    print("\n🧪 Testing message extraction...")
    
    pipeline = Pipeline()
    mock_request = MockRequest()
    mock_user = {"name": "Test User", "id": "test-123"}
    
    # Test cases
    test_cases = [
        {
            "name": "Direct user_message field",
            "body": {"user_message": "Hello, this is a test message"},
            "expected": "Hello, this is a test message"
        },
        {
            "name": "Messages array format",
            "body": {
                "messages": [
                    {"role": "system", "content": "You are a helpful assistant"},
                    {"role": "user", "content": "What is the weather like?"}
                ]
            },
            "expected": "What is the weather like?"
        },
        {
            "name": "Prompt field",
            "body": {"prompt": "Tell me about AI"},
            "expected": "Tell me about AI"
        },
        {
            "name": "No message found",
            "body": {"other_field": "some value"},
            "expected": None
        }
    ]
    
    for test_case in test_cases:
        print(f"   Testing: {test_case['name']}")
        
        try:
            # Create a generator from the pipe method
            generator = pipeline.pipe(test_case["body"], mock_user, mock_request)
            
            # Get the first yield to see if it's an error message
            first_chunk = None
            try:
                first_chunk = await anext(generator)
            except StopAsyncIteration:
                pass
            
            if test_case["expected"] is None:
                # Should return an error message
                if first_chunk and "No user message found" in first_chunk:
                    print(f"   ✅ Correctly detected missing message")
                else:
                    print(f"   ❌ Failed to detect missing message")
            else:
                # Should start with workflow info
                if first_chunk and "Using AIMBY workflow" in first_chunk:
                    print(f"   ✅ Message extracted successfully")
                else:
                    print(f"   ❌ Message extraction failed")
                    
        except Exception as e:
            print(f"   ❌ Test failed with exception: {e}")

async def test_workflow_selection():
    """Test workflow selection logic"""
    print("\n🧪 Testing workflow selection...")
    
    pipeline = Pipeline()
    mock_request = MockRequest()
    mock_user = {"name": "Test User", "id": "test-123"}
    
    test_cases = [
        {
            "name": "Default workflow",
            "body": {"user_message": "Test message"},
            "expected_workflow": "StreamRagWorkflow"
        },
        {
            "name": "Workflow from model_id",
            "body": {
                "user_message": "Test message",
                "model": "StreamRagWorkflow"
            },
            "expected_workflow": "StreamRagWorkflow"
        },
        {
            "name": "Custom workflow_id field",
            "body": {
                "user_message": "Test message",
                "workflow_id": "CustomWorkflow"
            },
            "expected_workflow": "CustomWorkflow"
        }
    ]
    
    for test_case in test_cases:
        print(f"   Testing: {test_case['name']}")
        
        try:
            generator = pipeline.pipe(test_case["body"], mock_user, mock_request)
            first_chunk = await anext(generator)
            
            if test_case["expected_workflow"] in first_chunk:
                print(f"   ✅ Correct workflow selected: {test_case['expected_workflow']}")
            else:
                print(f"   ❌ Wrong workflow selected. Expected: {test_case['expected_workflow']}")
                
        except Exception as e:
            print(f"   ❌ Test failed with exception: {e}")

async def test_environment_variables():
    """Test environment variable configuration"""
    print("\n🧪 Testing environment variable configuration...")
    
    # Test with custom environment variables
    original_env = os.environ.copy()
    
    try:
        # Set custom environment variables
        os.environ["AIMBY_API_URL"] = "http://custom-api:9000"
        os.environ["WORKFLOW_ID"] = "CustomWorkflow"
        os.environ["TIMEOUT"] = "60"
        os.environ["ENABLE_DEBUG"] = "false"
        
        # Create new pipeline instance
        pipeline = Pipeline()
        
        # Check if environment variables were applied
        if pipeline.valves.AIMBY_API_URL == "http://custom-api:9000":
            print("   ✅ AIMBY_API_URL configured correctly")
        else:
            print(f"   ❌ AIMBY_API_URL not configured. Got: {pipeline.valves.AIMBY_API_URL}")
            
        if pipeline.valves.WORKFLOW_ID == "CustomWorkflow":
            print("   ✅ WORKFLOW_ID configured correctly")
        else:
            print(f"   ❌ WORKFLOW_ID not configured. Got: {pipeline.valves.WORKFLOW_ID}")
            
        if pipeline.valves.TIMEOUT == 60:
            print("   ✅ TIMEOUT configured correctly")
        else:
            print(f"   ❌ TIMEOUT not configured. Got: {pipeline.valves.TIMEOUT}")
            
        if not pipeline.valves.ENABLE_DEBUG:
            print("   ✅ ENABLE_DEBUG configured correctly")
        else:
            print(f"   ❌ ENABLE_DEBUG not configured. Got: {pipeline.valves.ENABLE_DEBUG}")
            
    finally:
        # Restore original environment
        os.environ.clear()
        os.environ.update(original_env)

def test_imports():
    """Test that all required imports are available"""
    print("\n🧪 Testing imports...")
    
    required_modules = [
        "os", "json", "requests", "logging", "datetime",
        "typing", "pydantic", "fastapi"
    ]
    
    for module in required_modules:
        try:
            __import__(module)
            print(f"   ✅ {module} imported successfully")
        except ImportError as e:
            print(f"   ❌ Failed to import {module}: {e}")

async def main():
    """Run all tests"""
    print("🚀 Starting AIMBY Pipeline Tests\n")
    
    # Test imports first
    test_imports()
    
    # Test pipeline functionality
    tests = [
        test_pipeline_initialization,
        test_message_extraction,
        test_workflow_selection,
        test_environment_variables
    ]
    
    results = []
    for test in tests:
        try:
            result = await test()
            results.append(result)
        except Exception as e:
            print(f"❌ Test {test.__name__} failed with exception: {e}")
            results.append(False)
    
    # Summary
    print("\n" + "="*50)
    print("📊 Test Summary")
    print("="*50)
    
    passed = sum(1 for r in results if r is not False)
    total = len(results)
    
    print(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 All tests passed! The pipeline is ready to use.")
    else:
        print("⚠️  Some tests failed. Please check the output above.")
    
    return passed == total

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1) 