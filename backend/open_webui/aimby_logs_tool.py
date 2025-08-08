"""
title: AIMby Log Files Tool
author: Dean
description: A tool to list and retrieve log files from the AIMby API
version: 1.0.0
license: MIT
requirements: requests
"""

import os
import requests
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class Tools:
    def __init__(self):
        """Initialize the AIMby Log Files Tool."""
        self.valves = self.Valves()

    class Valves(BaseModel):
        aimby_api_url: str = Field(
            default="http://localhost:8000", 
            description="Base URL for the AIMby API"
        )
        api_key: str = Field(
            default="", 
            description="API key for authentication with AIMby API"
        )

    def list_log_files(self, __user__: dict = {}) -> str:
        """
        List all available log files from the AIMby API.
        
        Returns a formatted list of log files with their metadata including:
        - filename: Name of the log file
        - size: File size in bytes
        - modified: Last modification timestamp
        - path: Relative path to the file
        """
        try:
            # Build the API URL
            api_url = f"{self.valves.aimby_api_url}/api/v1/logs/"
            
            # Prepare headers
            headers = {
                'Accept': 'application/json',
                'X-Source': 'open-webui-tool'
            }
            
            # Add API key if provided
            if self.valves.api_key:
                headers['Authorization'] = f'Bearer {self.valves.api_key}'
            
            # Make the API request
            response = requests.get(api_url, headers=headers, timeout=30)
            response.raise_for_status()
            
            log_files = response.json()
            
            if not log_files:
                return "No log files found."
            
            # Format the response
            result = f"Found {len(log_files)} log file(s):\n\n"
            
            for i, file_info in enumerate(log_files, 1):
                # Convert timestamp to readable format
                modified_time = datetime.fromtimestamp(file_info['modified']).strftime('%Y-%m-%d %H:%M:%S')
                
                # Convert size to human readable format
                size_bytes = file_info['size']
                if size_bytes < 1024:
                    size_str = f"{size_bytes} B"
                elif size_bytes < 1024 * 1024:
                    size_str = f"{size_bytes / 1024:.1f} KB"
                else:
                    size_str = f"{size_bytes / (1024 * 1024):.1f} MB"
                
                result += f"{i}. **{file_info['filename']}**\n"
                result += f"   - Size: {size_str}\n"
                result += f"   - Modified: {modified_time}\n"
                result += f"   - Path: {file_info['path']}\n\n"
            
            return result
            
        except requests.exceptions.ConnectionError:
            return f"Error: Could not connect to AIMby API at {self.valves.aimby_api_url}. Please check if the API is running and the URL is correct."
        except requests.exceptions.Timeout:
            return "Error: Request to AIMby API timed out. Please try again."
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 401:
                return "Error: Authentication failed. Please check your API key."
            elif e.response.status_code == 404:
                return "Error: Logs endpoint not found. Please check the API URL."
            else:
                return f"Error: HTTP {e.response.status_code} - {e.response.text}"
        except Exception as e:
            return f"Error: Unexpected error occurred: {str(e)}"

    def get_log_file_info(
        self, 
        filename: str = Field(..., description="Name of the log file to get information about")
    ) -> str:
        """
        Get detailed information about a specific log file from the AIMby API.
        
        Args:
            filename: Name of the log file (must end with .json)
            
        Returns detailed information including:
        - filename: Name of the log file
        - size: File size in bytes
        - modified: Last modification timestamp
        - created: File creation timestamp
        - readable: Whether the file is readable
        - content_preview: First few lines of the file content
        """
        try:
            # Validate filename
            if not filename.endswith('.json'):
                return "Error: Only JSON log files are allowed. Please provide a filename ending with .json"
            
            if '/' in filename or '\\' in filename or '..' in filename:
                return "Error: Invalid filename. Filename cannot contain path separators or directory traversal characters."
            
            # Build the API URL
            api_url = f"{self.valves.aimby_api_url}/api/v1/logs/{filename}/info"
            
            # Prepare headers
            headers = {
                'Accept': 'application/json',
                'X-Source': 'open-webui-tool'
            }
            
            # Add API key if provided
            if self.valves.api_key:
                headers['Authorization'] = f'Bearer {self.valves.api_key}'
            
            # Make the API request
            response = requests.get(api_url, headers=headers, timeout=30)
            response.raise_for_status()
            
            file_info = response.json()
            
            # Format the response
            result = f"**Log File Information: {file_info['filename']}**\n\n"
            
            # Convert timestamps to readable format
            modified_time = datetime.fromtimestamp(file_info['modified']).strftime('%Y-%m-%d %H:%M:%S')
            created_time = datetime.fromtimestamp(file_info['created']).strftime('%Y-%m-%d %H:%M:%S')
            
            # Convert size to human readable format
            size_bytes = file_info['size']
            if size_bytes < 1024:
                size_str = f"{size_bytes} B"
            elif size_bytes < 1024 * 1024:
                size_str = f"{size_bytes / 1024:.1f} KB"
            else:
                size_str = f"{size_bytes / (1024 * 1024):.1f} MB"
            
            result += f"**File Details:**\n"
            result += f"- Size: {size_str}\n"
            result += f"- Created: {created_time}\n"
            result += f"- Modified: {modified_time}\n"
            result += f"- Path: {file_info['path']}\n"
            result += f"- Readable: {'Yes' if file_info['readable'] else 'No'}\n\n"
            
            # Add content preview
            if file_info.get('content_preview'):
                result += f"**Content Preview:**\n"
                for i, line in enumerate(file_info['content_preview'], 1):
                    result += f"{i}. {line}\n"
            else:
                result += "**Content Preview:** No preview available\n"
            
            return result
            
        except requests.exceptions.ConnectionError:
            return f"Error: Could not connect to AIMby API at {self.valves.aimby_api_url}. Please check if the API is running and the URL is correct."
        except requests.exceptions.Timeout:
            return "Error: Request to AIMby API timed out. Please try again."
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 401:
                return "Error: Authentication failed. Please check your API key."
            elif e.response.status_code == 404:
                return f"Error: Log file '{filename}' not found."
            elif e.response.status_code == 400:
                return f"Error: {e.response.json().get('detail', 'Bad request')}"
            else:
                return f"Error: HTTP {e.response.status_code} - {e.response.text}"
        except Exception as e:
            return f"Error: Unexpected error occurred: {str(e)}"

    def get_log_file_content(
        self, 
        filename: str = Field(..., description="Name of the log file to retrieve content from")
    ) -> str:
        """
        Retrieve the full content of a specific log file from the AIMby API.
        
        Args:
            filename: Name of the log file (must end with .json)
            
        Returns the complete log file content as formatted text.
        """
        try:
            # Validate filename
            if not filename.endswith('.json'):
                return "Error: Only JSON log files are allowed. Please provide a filename ending with .json"
            
            if '/' in filename or '\\' in filename or '..' in filename:
                return "Error: Invalid filename. Filename cannot contain path separators or directory traversal characters."
            
            # Build the API URL
            api_url = f"{self.valves.aimby_api_url}/api/v1/logs/{filename}"
            
            # Prepare headers
            headers = {
                'Accept': 'application/json',
                'X-Source': 'open-webui-tool'
            }
            
            # Add API key if provided
            if self.valves.api_key:
                headers['Authorization'] = f'Bearer {self.valves.api_key}'
            
            # Make the API request
            response = requests.get(api_url, headers=headers, timeout=30)
            response.raise_for_status()
            
            # Get the content
            content = response.text
            
            # Try to parse as JSON for better formatting
            try:
                import json
                json_content = json.loads(content)
                formatted_content = json.dumps(json_content, indent=2)
                result = f"**Log File Content: {filename}**\n\n```json\n{formatted_content}\n```"
            except json.JSONDecodeError:
                # If not valid JSON, return as plain text
                result = f"**Log File Content: {filename}**\n\n```\n{content}\n```"
            
            return result
            
        except requests.exceptions.ConnectionError:
            return f"Error: Could not connect to AIMby API at {self.valves.aimby_api_url}. Please check if the API is running and the URL is correct."
        except requests.exceptions.Timeout:
            return "Error: Request to AIMby API timed out. Please try again."
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 401:
                return "Error: Authentication failed. Please check your API key."
            elif e.response.status_code == 404:
                return f"Error: Log file '{filename}' not found."
            elif e.response.status_code == 400:
                return f"Error: {e.response.json().get('detail', 'Bad request')}"
            else:
                return f"Error: HTTP {e.response.status_code} - {e.response.text}"
        except Exception as e:
            return f"Error: Unexpected error occurred: {str(e)}"

    def search_log_files(
        self, 
        pattern: str = Field(..., description="Search pattern to filter log files (e.g., '2024', 'error', 'workflow')")
    ) -> str:
        """
        Search through available log files for files matching a pattern.
        
        Args:
            pattern: Search pattern to match against filenames
            
        Returns a list of matching log files with their information.
        """
        try:
            # First get all log files
            api_url = f"{self.valves.aimby_api_url}/api/v1/logs/"
            
            # Prepare headers
            headers = {
                'Accept': 'application/json',
                'X-Source': 'open-webui-tool'
            }
            
            # Add API key if provided
            if self.valves.api_key:
                headers['Authorization'] = f'Bearer {self.valves.api_key}'
            
            # Make the API request
            response = requests.get(api_url, headers=headers, timeout=30)
            response.raise_for_status()
            
            all_log_files = response.json()
            
            # Filter files matching the pattern
            matching_files = [
                file_info for file_info in all_log_files
                if pattern.lower() in file_info['filename'].lower()
            ]
            
            if not matching_files:
                return f"No log files found matching pattern '{pattern}'."
            
            # Format the response
            result = f"Found {len(matching_files)} log file(s) matching '{pattern}':\n\n"
            
            for i, file_info in enumerate(matching_files, 1):
                # Convert timestamp to readable format
                modified_time = datetime.fromtimestamp(file_info['modified']).strftime('%Y-%m-%d %H:%M:%S')
                
                # Convert size to human readable format
                size_bytes = file_info['size']
                if size_bytes < 1024:
                    size_str = f"{size_bytes} B"
                elif size_bytes < 1024 * 1024:
                    size_str = f"{size_bytes / 1024:.1f} KB"
                else:
                    size_str = f"{size_bytes / (1024 * 1024):.1f} MB"
                
                result += f"{i}. **{file_info['filename']}**\n"
                result += f"   - Size: {size_str}\n"
                result += f"   - Modified: {modified_time}\n"
                result += f"   - Path: {file_info['path']}\n\n"
            
            return result
            
        except requests.exceptions.ConnectionError:
            return f"Error: Could not connect to AIMby API at {self.valves.aimby_api_url}. Please check if the API is running and the URL is correct."
        except requests.exceptions.Timeout:
            return "Error: Request to AIMby API timed out. Please try again."
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 401:
                return "Error: Authentication failed. Please check your API key."
            elif e.response.status_code == 404:
                return "Error: Logs endpoint not found. Please check the API URL."
            else:
                return f"Error: HTTP {e.response.status_code} - {e.response.text}"
        except Exception as e:
            return f"Error: Unexpected error occurred: {str(e)}" 