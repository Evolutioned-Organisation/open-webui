import os
import json
import requests
import logging
from datetime import datetime
from typing import List, Union, Generator, Iterator
from pydantic import BaseModel, Field
from fastapi import Request

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Pipeline:
    """AIMBY Workflow Pipeline for Open WebUI
    
    This pipeline allows direct integration with AIMBY workflows from Open WebUI.
    It calls the AIMBY API directly and streams responses back to the user.
    """
    
    class Valves(BaseModel):
        """Configuration options for the AIMBY pipeline"""
        AIMBY_API_URL: str = Field(
            default="http://aimby-api:8000",
            description="AIMBY API base URL"
        )
        WORKFLOW_ID: str = Field(
            default="StreamRagWorkflow",
            description="Default workflow ID to use"
        )
        TIMEOUT: int = Field(
            default=120,
            description="Request timeout in seconds"
        )
        ENABLE_DEBUG: bool = Field(
            default=True,
            description="Enable debug logging"
        )

    def __init__(self):
        """Initialize the pipeline with configuration"""
        self.name = "AIMBY Workflow"
        self.valves = self.Valves(
            **{k: os.getenv(k, v.default) for k, v in self.Valves.model_fields.items()}
        )
        
        if self.valves.ENABLE_DEBUG:
            logger.setLevel(logging.DEBUG)
        
        logger.info(f"Initialized AIMBY Workflow Pipeline")
        logger.info(f"API URL: {self.valves.AIMBY_API_URL}")
        logger.info(f"Default Workflow: {self.valves.WORKFLOW_ID}")
        logger.info(f"Timeout: {self.valves.TIMEOUT}s")

    async def on_startup(self):
        """Called when the pipeline starts up"""
        logger.info("AIMBY Workflow Pipeline started")
        pass

    async def on_shutdown(self):
        """Called when the pipeline shuts down"""
        logger.info("AIMBY Workflow Pipeline stopped")
        pass

    def _call_aimby_workflow(self, user_message: str, workflow_id: str = None) -> Generator[str, None, None]:
        """Call AIMBY workflow and stream the response
        
        Args:
            user_message: The user's message
            workflow_id: Optional workflow ID to override default
            
        Yields:
            Response chunks from the AIMBY workflow
        """
        if workflow_id is None:
            workflow_id = self.valves.WORKFLOW_ID
            
        url = f"{self.valves.AIMBY_API_URL}/generate/{workflow_id}?stream=true"
        
        logger.info(f"Calling AIMBY workflow: {workflow_id}")
        logger.info(f"URL: {url}")
        logger.info(f"Message length: {len(user_message)}")
        
        try:
            # Make streaming request to AIMBY API
            response = requests.post(
                url=url,
                json={"user_message": user_message},
                stream=True,
                timeout=self.valves.TIMEOUT,
                headers={"Accept": "text/event-stream"}
            )
            
            logger.info(f"Response status: {response.status_code}")
            
            if response.status_code != 200:
                error_msg = f"AIMBY API returned error status: {response.status_code}"
                logger.error(error_msg)
                yield error_msg
                return
            
            # Process streaming response
            for line in response.iter_lines():
                if not line:
                    continue
                    
                # Decode the line from bytes to string
                line = line.decode("utf-8")
                logger.debug(f"SSE line: {line}")
                
                # Only process data lines
                if line.startswith("data:"):
                    # Extract data content
                    data_content = line[5:].strip()
                    
                    if not data_content:
                        continue
                        
                    # Handle [DONE] marker
                    if data_content == "[DONE]":
                        logger.info("Received [DONE] marker")
                        break
                    
                    try:
                        # Parse the JSON content
                        data = json.loads(data_content)
                        
                        # Extract content from various possible formats
                        content = None
                        
                        # Check for OpenAI-compatible format
                        if "choices" in data and len(data["choices"]) > 0:
                            choice = data["choices"][0]
                            if "delta" in choice and "content" in choice["delta"]:
                                content = choice["delta"]["content"]
                        
                        # Check for direct content field
                        elif "content" in data and isinstance(data["content"], str):
                            content = data["content"]
                        
                        # Check for result field
                        elif "result" in data:
                            content = data["result"]
                        
                        # Check for chunk field
                        elif "chunk" in data:
                            content = data["chunk"]
                        
                        # Skip status messages
                        elif "event_type" in data and data["event_type"] == "status":
                            logger.info(f"Status message: {data.get('message', '')}")
                            continue
                        
                        # Yield content if found
                        if content:
                            yield content
                            
                    except json.JSONDecodeError:
                        # Not valid JSON - try to handle as plain text
                        logger.warning(f"Invalid JSON in data: {data_content}")
                        if data_content and not data_content.startswith(("INFO:", "WARNING:", "ERROR:")):
                            yield data_content
                            
        except requests.exceptions.ConnectionError as e:
            error_msg = f"Connection error to AIMBY API: {str(e)}"
            logger.error(error_msg)
            yield error_msg
            
        except requests.exceptions.Timeout:
            error_msg = "Request to AIMBY API timed out"
            logger.error(error_msg)
            yield error_msg
            
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            logger.error(error_msg)
            yield error_msg

    async def pipe(
        self,
        body: dict,
        __user__: dict,
        __request__: Request,
    ) -> Union[str, Generator[str, None, None]]:
        """Main pipeline method called by Open WebUI
        
        Args:
            body: Request body containing messages and other data
            __user__: User information
            __request__: FastAPI request object
            
        Returns:
            Streaming response from AIMBY workflow
        """
        logger.info("=== AIMBY Workflow Pipeline Called ===")
        logger.info(f"User: {__user__.get('name', 'Unknown')}")
        logger.info(f"Body keys: {list(body.keys())}")
        
        # Extract user message from body
        user_message = None
        
        # Check for direct user_message field
        if "user_message" in body:
            user_message = body["user_message"]
            logger.info("Using direct user_message field")
        
        # Check for messages array
        elif "messages" in body and body["messages"]:
            # Get the last user message
            for msg in reversed(body["messages"]):
                if msg.get("role") == "user":
                    user_message = msg.get("content")
                    logger.info("Using message from messages array")
                    break
        
        # Check for prompt field
        elif "prompt" in body:
            user_message = body["prompt"]
            logger.info("Using prompt field")
        
        if not user_message:
            error_msg = "No user message found in request"
            logger.error(error_msg)
            return error_msg
        
        logger.info(f"User message: {user_message[:100]}...")
        
        # Check if a specific workflow is requested
        workflow_id = None
        
        # Check for workflow in model_id (if user selects a specific workflow)
        if "model" in body and body["model"]:
            model_id = body["model"]
            # If model_id looks like a workflow ID, use it
            if "Workflow" in model_id or "RAG" in model_id:
                workflow_id = model_id
                logger.info(f"Using workflow from model_id: {workflow_id}")
        
        # Check for workflow in custom fields
        if "workflow_id" in body:
            workflow_id = body["workflow_id"]
            logger.info(f"Using workflow from body: {workflow_id}")
        
        # Stream the response
        logger.info("Starting streaming response")
        yield f"🤖 Using AIMBY workflow: **{workflow_id or self.valves.WORKFLOW_ID}**\n\n"
        
        for chunk in self._call_aimby_workflow(user_message, workflow_id):
            yield chunk 