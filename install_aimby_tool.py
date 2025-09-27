#!/usr/bin/env python3
"""
Install AIMBY Sync Workflows Tool for Open WebUI

This script installs the AIMBY sync tool into the Open WebUI database.
It should be run during the Docker build process to ensure the tool is available.
"""

import os
import sys
import time
import logging

# Add the backend directory to Python path
sys.path.insert(0, '/app/backend')

# Set up basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def install_aimby_tool():
    """Install the AIMBY sync tool into Open WebUI"""
    
    try:
        # Import Open WebUI modules
        from open_webui.models.tools import Tools, ToolForm, ToolMeta
        from open_webui.utils.plugin import load_tool_module_by_id
        
        # Tool content with both sync_workflows and get_workflows_status functions
        tool_content = '''"""
AIMBY Sync Workflows Tool for Open WebUI

This tool allows administrators to trigger workflow synchronization from within the Open WebUI interface.
It calls the AIMBY API to sync workflows from the repository and upload them to the pipeline service.

requirements: aiohttp
"""

import aiohttp
import asyncio
import logging
import time
from pydantic import BaseModel, Field
from typing import Optional

log = logging.getLogger(__name__)


class Tools:
    class Valves(BaseModel):
        aimby_api_base_url: str = Field(
            default="http://aimby-api:8000",
            description="Base URL for the AIMBY API service"
        )
        timeout_seconds: int = Field(
            default=30,
            description="Timeout in seconds for API calls"
        )

    class UserValves(BaseModel):
        custom_api_url: str = Field(
            default="",
            description="Custom API URL override from user settings"
        )
        custom_timeout: int = Field(
            default=30,
            description="Custom timeout override from user settings"
        )

    def __init__(self):
        self.valves = self.Valves()

    async def sync_workflows(self, __user__: Optional[dict] = None, __event_emitter__=None, __id__: str = "", custom_api_url: str = "", custom_timeout: int = 0) -> str:
        """
        Sync workflows from repository and upload to pipeline service.

        This function calls the AIMBY API to:
        1. Pull the latest workflows from the Git repository
        2. Convert workflows to pipeline format
        3. Upload pipelines to the pipeline service

        Returns a status message indicating success or failure.
        """
        try:
            # Emit status update
            if __event_emitter__:
                await __event_emitter__({
                    "type": "status",
                    "data": {
                        "description": "Starting workflow sync...",
                        "done": False,
                        "hidden": False
                    }
                })

            # Determine the API URL to use (priority: direct params > user valves > default valves)
            api_url = self.valves.aimby_api_base_url
            timeout_seconds = self.valves.timeout_seconds

            # Check for user custom settings
            if __user__ and hasattr(__user__, 'valves') and __user__.valves:
                if __user__.valves.custom_api_url:
                    api_url = __user__.valves.custom_api_url
                if __user__.valves.custom_timeout:
                    timeout_seconds = __user__.valves.custom_timeout

            # Override with direct parameters if provided (highest priority)
            if custom_api_url:
                api_url = custom_api_url
            if custom_timeout > 0:
                timeout_seconds = custom_timeout

            # Prepare the API call
            timeout = aiohttp.ClientTimeout(total=timeout_seconds)

            log.info(f"Calling AIMBY API sync workflows endpoint: {api_url}/workflows")

            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(f"{api_url}/workflows") as response:
                    if response.status == 200:
                        result = await response.json()

                        # Emit success status
                        if __event_emitter__:
                            await __event_emitter__({
                                "type": "status",
                                "data": {
                                    "description": "Workflow sync completed successfully!",
                                    "done": True,
                                    "hidden": False
                                }
                            })

                        # Format the response
                        status = result.get("status", "unknown")
                        message = result.get("message", "No message provided")
                        pipelines_synced = result.get("pipelines_synced", 0)
                        failed_pipelines = result.get("failed_pipelines", {})

                        response_text = f"✅ **Workflow Sync Completed**\\n\\n"
                        response_text += f"**Status:** {status}\\n"
                        response_text += f"**Message:** {message}\\n"
                        response_text += f"**Pipelines Synced:** {pipelines_synced}\\n"

                        if failed_pipelines:
                            response_text += f"\\n**Failed Pipelines:**\\n"
                            for pipeline, error in failed_pipelines.items():
                                response_text += f"- {pipeline}: {error}\\n"

                        return response_text

                    else:
                        error_text = await response.text()
                        log.error(f"AIMBY API returned status {response.status}: {error_text}")

                        # Emit error status
                        if __event_emitter__:
                            await __event_emitter__({
                                "type": "status",
                                "data": {
                                    "description": f"Workflow sync failed: HTTP {response.status}",
                                    "done": True,
                                    "hidden": False
                                }
                            })

                        return f"❌ **Workflow Sync Failed**\\n\\n**HTTP Status:** {response.status}\\n**Error:** {error_text}"

        except aiohttp.ClientError as e:
            error_msg = f"Network error connecting to AIMBY API: {str(e)}"
            log.error(error_msg)

            # Emit error status
            if __event_emitter__:
                await __event_emitter__({
                    "type": "status",
                    "data": {
                        "description": "Workflow sync failed: Network error",
                        "done": True,
                        "hidden": False
                    }
                })

            return f"❌ **Network Error**\\n\\n{error_msg}"

        except Exception as e:
            error_msg = f"Unexpected error during workflow sync: {str(e)}"
            log.error(error_msg)

            # Emit error status
            if __event_emitter__:
                await __event_emitter__({
                    "type": "status",
                    "data": {
                        "description": "Workflow sync failed: Unexpected error",
                        "done": True,
                        "hidden": False
                    }
                })

            return f"❌ **Unexpected Error**\\n\\n{error_msg}"

    async def get_workflows_status(self, __user__: Optional[dict] = None, __event_emitter__=None, __id__: str = "", custom_api_url: str = "", custom_timeout: int = 0) -> str:
        """
        Get the current status of workflows from the AIMBY API.

        This function calls the AIMBY API to check the current status of workflows
        and returns information about the last sync operation.

        Returns a status message with current workflow information.
        """
        try:
            # Emit initial status update
            if __event_emitter__:
                await __event_emitter__({
                    "type": "status",
                    "data": {
                        "description": "Initializing status check...",
                        "done": False,
                        "hidden": False
                    }
                })
            
                        # Determine the API URL to use (priority: direct params > user valves > default valves)
            api_url = self.valves.aimby_api_base_url
            timeout_seconds = self.valves.timeout_seconds

            # Check for user custom settings
            if __user__ and hasattr(__user__, 'valves') and __user__.valves:
                if __user__.valves.custom_api_url:
                    api_url = __user__.valves.custom_api_url
                if __user__.valves.custom_timeout:
                    timeout_seconds = __user__.valves.custom_timeout

            # Override with direct parameters if provided (highest priority)
            if custom_api_url:
                api_url = custom_api_url
            if custom_timeout > 0:
                timeout_seconds = custom_timeout
            
            # Prepare the API call
            timeout = aiohttp.ClientTimeout(total=timeout_seconds)

            log.info(f"Calling AIMBY API workflows endpoint: {api_url}/workflows")

            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(f"{api_url}/workflows") as response:
                    if response.status == 200:
                        # Emit processing status
                        if __event_emitter__:
                            await __event_emitter__({
                                "type": "status",
                                "data": {
                                    "description": "Processing workflow status data...",
                                    "done": False,
                                    "hidden": False
                                }
                            })
                        
                        # Small delay to show processing status
                        await asyncio.sleep(1.0)
                        
                        result = await response.json()

                        # Parse the actual response format
                        workflows = result.get("workflows", [])
                        health = result.get("health", {})
                        
                        # Emit success status (like sync_workflows does)
                        if __event_emitter__:
                            await __event_emitter__({
                                "type": "status",
                                "data": {
                                    "description": f"Retrieved {len(workflows)} workflows from repository",
                                    "done": True,
                                    "hidden": False
                                }
                            })

                        # Format the response to be displayed in sync status area
                        response_text = f"✅ **Workflow Status Retrieved**\\n\\n"
                        response_text += f"**Status:** Retrieved {len(workflows)} workflows\\n"
                        response_text += f"**Message:** Successfully retrieved workflow status from repository\\n"
                        response_text += f"**Workflows Found:** {len(workflows)}\\n"
                        
                        if workflows:
                            response_text += f"\\n**Available Workflows:**\\n"
                            for i, workflow in enumerate(workflows, 1):
                                response_text += f"- {workflow}\\n"
                        
                        if health:
                            health_status = health.get("status", "unknown")
                            health_message = health.get("message", "No message")
                            response_text += f"\\n**System Health:** {health_status}\\n"
                            response_text += f"**Health Message:** {health_message}\\n"
                            
                            services = health.get("services", {})
                            if services:
                                response_text += f"\\n**Services:**\\n"
                                for service, status in services.items():
                                    available = status.get("available", False)
                                    message = status.get("message", "No message")
                                    status_icon = "✅" if available else "❌"
                                    response_text += f"- {service}: {status_icon} {message}\\n"
                        
                        response_text += f"\\n*Status retrieved at: {time.strftime('%Y-%m-%d %H:%M:%S')}*"

                        return response_text

                    else:
                        error_text = await response.text()
                        log.error(f"AIMBY API returned status {response.status}: {error_text}")

                        # Emit error status
                        if __event_emitter__:
                            await __event_emitter__({
                                "type": "status",
                                "data": {
                                    "description": f"Failed to get workflow status: HTTP {response.status}",
                                    "done": True,
                                    "hidden": False
                                }
                            })

                        return f"❌ **Status Check Failed**\\n\\n**HTTP Status:** {response.status}\\n**Error:** {error_text}"

        except aiohttp.ClientError as e:
            error_msg = f"Network error connecting to AIMBY API: {str(e)}"
            log.error(error_msg)

            # Emit error status
            if __event_emitter__:
                await __event_emitter__({
                    "type": "status",
                    "data": {
                        "description": "Failed to get workflow status: Network error",
                        "done": True,
                        "hidden": False
                    }
                })

            return f"❌ **Network Error**\\n\\n{error_msg}"

        except Exception as e:
            error_msg = f"Unexpected error getting workflow status: {str(e)}"
            log.error(error_msg)

            # Emit error status
            if __event_emitter__:
                await __event_emitter__({
                    "type": "status",
                    "data": {
                        "description": "Failed to get workflow status: Unexpected error",
                        "done": True,
                        "hidden": False
                    }
                })

            return f"❌ **Unexpected Error**\\n\\n{error_msg}"

    async def test_connection(self, __user__: Optional[dict] = None, __event_emitter__=None, __id__: str = "", custom_api_url: str = "", custom_timeout: int = 0) -> str:
        """
        Test the connection to the AIMBY API.

        This function tests the connectivity to the AIMBY API by making a simple health check.
        It verifies that the API is reachable and responding.

        Returns a status message indicating connection success or failure.
        """
        try:
            # Emit initial status update
            if __event_emitter__:
                await __event_emitter__({
                    "type": "status",
                    "data": {
                        "description": "Testing AIMBY API connection...",
                        "done": False,
                        "hidden": False
                    }
                })
            
            # Small delay to show the initial status
            await asyncio.sleep(0.5)
            
            # Determine the API URL to use (priority: direct params > user valves > default valves)
            api_url = self.valves.aimby_api_base_url
            timeout_seconds = self.valves.timeout_seconds

            # Check for user custom settings
            if __user__ and hasattr(__user__, 'valves') and __user__.valves:
                if __user__.valves.custom_api_url:
                    api_url = __user__.valves.custom_api_url
                if __user__.valves.custom_timeout:
                    timeout_seconds = __user__.valves.custom_timeout

            # Override with direct parameters if provided (highest priority)
            if custom_api_url:
                api_url = custom_api_url
            if custom_timeout > 0:
                timeout_seconds = custom_timeout

            # Emit connecting status
            if __event_emitter__:
                await __event_emitter__({
                    "type": "status",
                    "data": {
                        "description": f"Connecting to: {api_url}",
                        "done": False,
                        "hidden": False
                    }
                })
            
            await asyncio.sleep(0.3)

            # Prepare the API call
            timeout = aiohttp.ClientTimeout(total=timeout_seconds)

            log.info(f"Testing AIMBY API connection: {api_url}/health")

            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(f"{api_url}/health") as response:
                    if response.status == 200:
                        # Emit success status
                        if __event_emitter__:
                            await __event_emitter__({
                                "type": "status",
                                "data": {
                                    "description": "Connection test successful!",
                                    "done": True,
                                    "hidden": False
                                }
                            })

                        result = await response.json()
                        status = result.get("status", "unknown")
                        
                        response_text = f"✅ **Connection Test Successful**\\n\\n"
                        response_text += f"**API URL:** {api_url}\\n"
                        response_text += f"**Status:** {status}\\n"
                        response_text += f"**Response Time:** {response.headers.get('X-Response-Time', 'N/A')}\\n"
                        response_text += f"**Server:** {response.headers.get('Server', 'N/A')}\\n"
                        
                        return response_text

                    else:
                        error_text = await response.text()
                        log.error(f"AIMBY API connection test failed: HTTP {response.status}")

                        # Emit error status
                        if __event_emitter__:
                            await __event_emitter__({
                                "type": "status",
                                "data": {
                                    "description": f"Connection test failed: HTTP {response.status}",
                                    "done": True,
                                    "hidden": False
                                }
                            })

                        return f"❌ **Connection Test Failed**\\n\\n**HTTP Status:** {response.status}\\n**Error:** {error_text}"

        except aiohttp.ClientError as e:
            error_msg = f"Network error connecting to AIMBY API: {str(e)}"
            log.error(error_msg)

            # Emit error status
            if __event_emitter__:
                await __event_emitter__({
                    "type": "status",
                    "data": {
                        "description": "Connection test failed: Network error",
                        "done": True,
                        "hidden": False
                    }
                })

            return f"❌ **Network Error**\\n\\n{error_msg}"

        except Exception as e:
            error_msg = f"Unexpected error during connection test: {str(e)}"
            log.error(error_msg)

            # Emit error status
            if __event_emitter__:
                await __event_emitter__({
                    "type": "status",
                    "data": {
                        "description": "Connection test failed: Unexpected error",
                        "done": True,
                        "hidden": False
                    }
                })

            return f"❌ **Unexpected Error**\\n\\n{error_msg}"
'''

        # Tool specs with sync_workflows and test_connection functions only
        tool_specs = [
            {
                "name": "sync_workflows",
                "description": "Sync workflows from repository and upload to pipeline service.\n\nThis function calls the AIMBY API to:\n1. Pull the latest workflows from the Git repository\n2. Convert workflows to pipeline format\n3. Upload pipelines to the pipeline service\n\nReturns a status message indicating success or failure.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "custom_api_url": {
                            "type": "string",
                            "default": "",
                            "description": "Custom API URL override from user settings"
                        },
                        "custom_timeout": {
                            "type": "integer",
                            "default": 0,
                            "description": "Custom timeout override from user settings"
                        }
                    }
                }
            },
            {
                "name": "test_connection",
                "description": "Test the connection to the AIMBY API.\n\nThis function tests the connectivity to the AIMBY API by making a simple health check.\nIt verifies that the API is reachable and responding.\n\nReturns a status message indicating connection success or failure.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "custom_api_url": {
                            "type": "string",
                            "default": "",
                            "description": "Custom API URL override from user settings"
                        },
                        "custom_timeout": {
                            "type": "integer",
                            "default": 0,
                            "description": "Custom timeout override from user settings"
                        }
                    }
                }
            }
        ]

        # Tool meta
        tool_meta = {
            "description": "Sync workflows from repository and upload to pipeline service, and test API connection",
            "manifest": {
                "author": "AIMbient Team",
                "version": "1.0.0"
            }
        }

        # Access control (admin only)
        access_control = {
            "read": {
                "user_ids": ["admin"]
            },
            "write": {
                "user_ids": ["admin"]
            }
        }

        # Create tool form
        tool_form = ToolForm(
            id="aimby_sync_workflows",
            name="AIMBY Sync Workflows",
            content=tool_content,
            meta=tool_meta,
            access_control=access_control
        )

        # Install the tool
        logger.info("Installing AIMBY sync tool...")
        
        # Check if tool already exists
        existing_tool = Tools.get_tool_by_id("aimby_sync_workflows")
        if existing_tool:
            logger.info("Tool already exists, updating...")
            Tools.update_tool_by_id("aimby_sync_workflows", {
                "name": tool_form.name,
                "content": tool_form.content,
                "specs": tool_specs,
                "meta": tool_form.meta.model_dump(),
                "access_control": tool_form.access_control
            })
        else:
            logger.info("Creating new tool...")
            Tools.insert_new_tool("admin", tool_form, tool_specs)

        logger.info("✅ AIMBY tool installation completed successfully!")
        return True

    except Exception as e:
        logger.error(f"❌ Failed to install tool: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Starting AIMBY tool installation...")
    success = install_aimby_tool()
    if not success:
        logger.error("❌ AIMBY tool installation failed!")
        print("❌ BUILD FAILED: AIMBY tool installation unsuccessful")
        sys.exit(1)
    else:
        print("✅ AIMBY tool installation completed successfully!")
        print("✅ BUILD SUCCESS: Tool ready for verification") 