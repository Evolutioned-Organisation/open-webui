"""
AIMBY Sync Workflows Tool for Open WebUI

This tool allows administrators to trigger workflow synchronization from within the Open WebUI interface.
It calls the AIMBY API to sync workflows from the repository and upload them to the pipeline service.

requirements: aiohttp
"""

import aiohttp
import logging
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
                        
                        response_text = f"✅ **Workflow Sync Completed**\n\n"
                        response_text += f"**Status:** {status}\n"
                        response_text += f"**Message:** {message}\n"
                        response_text += f"**Pipelines Synced:** {pipelines_synced}\n"
                        
                        if failed_pipelines:
                            response_text += f"\n**Failed Pipelines:**\n"
                            for pipeline, error in failed_pipelines.items():
                                response_text += f"- {pipeline}: {error}\n"
                        
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
                        
                        return f"❌ **Workflow Sync Failed**\n\n**HTTP Status:** {response.status}\n**Error:** {error_text}"
                        
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
            
            return f"❌ **Network Error**\n\n{error_msg}"
            
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
            
            return f"❌ **Unexpected Error**\n\n{error_msg}"

    async def get_workflows_status(self, __user__: Optional[dict] = None, __event_emitter__=None, __id__: str = "", custom_api_url: str = "", custom_timeout: int = 0) -> str:
        """
        Get the current status of available workflows.
        
        This function calls the AIMBY API to retrieve information about
        currently available workflows without performing any sync operations.
        
        Returns a status message with workflow information.
        """
        try:
            # Emit status update
            if __event_emitter__:
                await __event_emitter__({
                    "type": "status",
                    "data": {
                        "description": "Fetching workflow status...",
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
                
            log.info(f"Calling AIMBY API get workflows endpoint: {api_url}/workflows")
            
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(f"{api_url}/workflows") as response:
                    if response.status == 200:
                        result = await response.json()
                        
                        # Emit success status
                        if __event_emitter__:
                            await __event_emitter__({
                                "type": "status",
                                "data": {
                                    "description": "Workflow status retrieved successfully!",
                                    "done": True,
                                    "hidden": False
                                }
                            })
                        
                        # Format the response
                        response_text = f"📋 **Workflow Status**\n\n"
                        
                        if isinstance(result, list):
                            response_text += f"**Available Workflows:** {len(result)}\n\n"
                            for i, workflow in enumerate(result, 1):
                                response_text += f"{i}. **{workflow.get('name', 'Unknown')}**\n"
                                response_text += f"   - ID: `{workflow.get('id', 'N/A')}`\n"
                                response_text += f"   - Description: {workflow.get('description', 'No description')}\n\n"
                        else:
                            response_text += f"**Response:** {result}\n"
                        
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
                        
                        return f"❌ **Failed to Get Workflow Status**\n\n**HTTP Status:** {response.status}\n**Error:** {error_text}"
                        
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
            
            return f"❌ **Network Error**\n\n{error_msg}"
            
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
            
            return f"❌ **Unexpected Error**\n\n{error_msg}" 