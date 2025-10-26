"""
AIMbient Document Lifecycle Filter Function

This filter intercepts file operations in Open-WebUI to manage document lifecycle
with Neo4j and message bus integration. It handles upload, delete, and update
operations without modifying core Open-WebUI code.

Features:
- Creates DocumentMetadata nodes in Neo4j on file upload
- Publishes lifecycle events to message bus
- Handles file deletions and updates
- Provides graceful error handling
- Configurable via Valves
"""

import os
import json
import logging
import hashlib
import requests
from datetime import datetime
from typing import Dict, Any, Optional, List
from urllib.parse import urljoin

# Configure logging
log = logging.getLogger(__name__)

class Filter:
    """AIMbient Document Lifecycle Filter for Open-WebUI."""
    
    def __init__(self):
        """Initialize the filter with configuration."""
        self.neo4j_uri = None
        self.neo4j_user = None
        self.neo4j_password = None
        self.message_bus_url = None
        self.message_bus_key = None
        self.enabled = True
        self.neo4j_driver = None
        
    def inlet(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Intercept incoming requests (file uploads, operations).
        
        Args:
            context: Request context containing file information
            
        Returns:
            Modified context with additional metadata
        """
        try:
            if not self.enabled:
                return context
                
            # Check if this is a file upload operation
            if self._is_file_upload(context):
                return self._handle_file_upload(context)
            elif self._is_file_operation(context):
                return self._handle_file_operation(context)
                
        except Exception as e:
            log.error(f"AIMbient filter inlet error: {e}")
            # Don't block the request if filter fails
            return context
            
        return context
    
    def outlet(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Intercept outgoing responses (file processing results).
        
        Args:
            context: Response context containing processing results
            
        Returns:
            Modified context with enriched data
        """
        try:
            if not self.enabled:
                return context
                
            # Check if this is a file processing response
            if self._is_file_response(context):
                return self._enrich_file_response(context)
                
        except Exception as e:
            log.error(f"AIMbient filter outlet error: {e}")
            # Don't block the response if filter fails
            return context
            
        return context
    
    def _is_file_upload(self, context: Dict[str, Any]) -> bool:
        """Check if this is a file upload operation."""
        # Check for file upload indicators
        return (
            context.get('method') == 'POST' and
            '/files/' in context.get('path', '') and
            context.get('files') is not None
        )
    
    def _is_file_operation(self, context: Dict[str, Any]) -> bool:
        """Check if this is a file operation (delete, update)."""
        return (
            context.get('method') in ['DELETE', 'PUT', 'PATCH'] and
            '/files/' in context.get('path', '')
        )
    
    def _is_file_response(self, context: Dict[str, Any]) -> bool:
        """Check if this is a file processing response."""
        return (
            context.get('path', '').startswith('/api/v1/files/') and
            context.get('status_code', 200) == 200
        )
    
    def _handle_file_upload(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle file upload by creating DocumentMetadata node."""
        try:
            files = context.get('files', [])
            user_id = context.get('user_id')
            
            if not files or not user_id:
                return context
            
            for file_info in files:
                file_id = file_info.get('id')
                file_path = file_info.get('path')
                file_size = file_info.get('size', 0)
                
                if not file_id or not file_path:
                    continue
                
                # Calculate content hash
                content_hash = self._calculate_file_hash(file_path)
                
                # Create DocumentMetadata node in Neo4j
                success = self._create_document_metadata(
                    file_id=file_id,
                    file_path=file_path,
                    user_id=user_id,
                    file_size=file_size,
                    content_hash=content_hash
                )
                
                if success:
                    # Publish document.uploaded event to message bus
                    self._publish_event('document.uploaded', {
                        'file_id': file_id,
                        'file_path': file_path,
                        'user_id': user_id,
                        'file_size': file_size,
                        'content_hash': content_hash,
                        'timestamp': datetime.now().isoformat()
                    })
                    
                    log.info(f"DocumentMetadata created for file {file_id}")
                else:
                    log.warning(f"Failed to create DocumentMetadata for file {file_id}")
            
        except Exception as e:
            log.error(f"Error handling file upload: {e}")
            
        return context
    
    def _handle_file_operation(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle file operations (delete, update)."""
        try:
            method = context.get('method')
            path = context.get('path', '')
            user_id = context.get('user_id')
            
            # Extract file ID from path
            file_id = self._extract_file_id_from_path(path)
            if not file_id or not user_id:
                return context
            
            if method == 'DELETE':
                # Handle file deletion
                success = self._delete_document_metadata(file_id)
                
                if success:
                    # Publish document.deleted event
                    self._publish_event('document.deleted', {
                        'file_id': file_id,
                        'user_id': user_id,
                        'timestamp': datetime.now().isoformat()
                    })
                    
                    log.info(f"DocumentMetadata deleted for file {file_id}")
                else:
                    log.warning(f"Failed to delete DocumentMetadata for file {file_id}")
                    
            elif method in ['PUT', 'PATCH']:
                # Handle file update
                success = self._mark_for_reprocessing(file_id)
                
                if success:
                    # Publish document.updated event
                    self._publish_event('document.updated', {
                        'file_id': file_id,
                        'user_id': user_id,
                        'timestamp': datetime.now().isoformat()
                    })
                    
                    log.info(f"DocumentMetadata marked for reprocessing: {file_id}")
                else:
                    log.warning(f"Failed to mark DocumentMetadata for reprocessing: {file_id}")
            
        except Exception as e:
            log.error(f"Error handling file operation: {e}")
            
        return context
    
    def _enrich_file_response(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich file response with AIMbient processing status."""
        try:
            path = context.get('path', '')
            file_id = self._extract_file_id_from_path(path)
            
            if not file_id:
                return context
            
            # Get processing status from Neo4j
            status_info = self._get_document_status(file_id)
            
            if status_info:
                # Add AIMbient status to response
                if 'data' not in context:
                    context['data'] = {}
                
                context['data']['aimbient_status'] = {
                    'status': status_info.get('status'),
                    'created_at': status_info.get('created_at'),
                    'updated_at': status_info.get('updated_at'),
                    'enrichment_available': status_info.get('enrichment_available', False),
                    'error_message': status_info.get('error_message')
                }
                
                log.debug(f"Enriched response for file {file_id} with AIMbient status")
            
        except Exception as e:
            log.error(f"Error enriching file response: {e}")
            
        return context
    
    def _calculate_file_hash(self, file_path: str) -> Optional[str]:
        """Calculate SHA-256 hash of file content."""
        try:
            if not os.path.exists(file_path):
                return None
                
            hash_sha256 = hashlib.sha256()
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_sha256.update(chunk)
            return hash_sha256.hexdigest()
        except Exception as e:
            log.error(f"Error calculating file hash: {e}")
            return None
    
    def _extract_file_id_from_path(self, path: str) -> Optional[str]:
        """Extract file ID from API path."""
        try:
            # Extract from paths like /api/v1/files/{file_id}
            parts = path.split('/')
            if 'files' in parts:
                file_index = parts.index('files')
                if file_index + 1 < len(parts):
                    return parts[file_index + 1]
        except Exception as e:
            log.error(f"Error extracting file ID from path: {e}")
        return None
    
    def _get_neo4j_driver(self):
        """Get or create Neo4j driver connection."""
        if self.neo4j_driver is None:
            try:
                from neo4j import GraphDatabase
                self.neo4j_driver = GraphDatabase.driver(
                    self.neo4j_uri, 
                    auth=(self.neo4j_user, self.neo4j_password)
                )
                log.info("Connected to Neo4j")
            except Exception as e:
                log.error(f"Failed to connect to Neo4j: {e}")
                raise
        return self.neo4j_driver
    
    def _create_document_metadata(self, file_id: str, file_path: str, 
                                user_id: str, file_size: int, 
                                content_hash: str) -> bool:
        """Create DocumentMetadata node in Neo4j."""
        try:
            driver = self._get_neo4j_driver()
            
            with driver.session() as session:
                result = session.run("""
                    CALL createDocumentMetadata($fileId, $filePath, $userId, $fileSize)
                    YIELD value
                    RETURN value
                """, {
                    'fileId': file_id,
                    'filePath': file_path,
                    'userId': user_id,
                    'fileSize': file_size
                })
                
                node = result.single()
                if node:
                    # Update content hash
                    session.run("""
                        MATCH (dm:DocumentMetadata {open_webui_file_id: $fileId})
                        SET dm.content_hash = $contentHash
                    """, {
                        'fileId': file_id,
                        'contentHash': content_hash
                    })
                    return True
                    
        except Exception as e:
            log.error(f"Error creating DocumentMetadata: {e}")
            
        return False
    
    def _delete_document_metadata(self, file_id: str) -> bool:
        """Soft delete DocumentMetadata node."""
        try:
            driver = self._get_neo4j_driver()
            
            with driver.session() as session:
                result = session.run("""
                    CALL deleteDocumentMetadata($fileId)
                    YIELD value
                    RETURN value
                """, {'fileId': file_id})
                
                return result.single() is not None
                
        except Exception as e:
            log.error(f"Error deleting DocumentMetadata: {e}")
            
        return False
    
    def _mark_for_reprocessing(self, file_id: str) -> bool:
        """Mark DocumentMetadata for reprocessing."""
        try:
            driver = self._get_neo4j_driver()
            
            with driver.session() as session:
                result = session.run("""
                    CALL updateDocumentMetadataStatus($fileId, 'needs_reprocessing', 'File updated')
                    YIELD value
                    RETURN value
                """, {'fileId': file_id})
                
                return result.single() is not None
                
        except Exception as e:
            log.error(f"Error marking for reprocessing: {e}")
            
        return False
    
    def _get_document_status(self, file_id: str) -> Optional[Dict[str, Any]]:
        """Get DocumentMetadata status from Neo4j."""
        try:
            driver = self._get_neo4j_driver()
            
            with driver.session() as session:
                # Get DocumentMetadata node
                result = session.run("""
                    CALL getDocumentMetadata($fileId)
                    YIELD value
                    RETURN value
                """, {'fileId': file_id})
                
                node = result.single()
                if not node:
                    return None
                
                dm = node['value']
                
                # Check if enrichment data is available
                enrichment_result = session.run("""
                    MATCH (dm:DocumentMetadata {open_webui_file_id: $fileId})
                    OPTIONAL MATCH (dm)-[:STORED_AS]->(d:Document)
                    RETURN d IS NOT NULL as has_enrichment
                """, {'fileId': file_id})
                
                enrichment_data = enrichment_result.single()
                has_enrichment = enrichment_data['has_enrichment'] if enrichment_data else False
                
                return {
                    'status': dm.get('status'),
                    'created_at': dm.get('created_at'),
                    'updated_at': dm.get('updated_at'),
                    'error_message': dm.get('error_message'),
                    'enrichment_available': has_enrichment
                }
                
        except Exception as e:
            log.error(f"Error getting document status: {e}")
            
        return None
    
    def _publish_event(self, event_type: str, event_data: Dict[str, Any]) -> bool:
        """Publish event to message bus."""
        try:
            if not self.message_bus_url or not self.message_bus_key:
                log.debug("Message bus not configured, skipping event publication")
                return True
            
            event_payload = {
                'type': event_type,
                'data': event_data,
                'timestamp': datetime.now().isoformat(),
                'source': 'open-webui-filter'
            }
            
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.message_bus_key}'
            }
            
            response = requests.post(
                urljoin(self.message_bus_url, '/api/v1/events'),
                json=event_payload,
                headers=headers,
                timeout=5
            )
            
            if response.status_code in [200, 201]:
                log.debug(f"Event {event_type} published successfully")
                return True
            else:
                log.warning(f"Failed to publish event {event_type}: {response.status_code}")
                
        except Exception as e:
            log.error(f"Error publishing event {event_type}: {e}")
            
        return False
    
    def configure(self, valves: Dict[str, Any]):
        """
        Configure the filter using Valves.
        
        Args:
            valves: Configuration dictionary from Open-WebUI
        """
        try:
            # Neo4j configuration
            self.neo4j_uri = valves.get('neo4j_uri', os.getenv('NEO4J_URI', 'bolt://localhost:7687'))
            self.neo4j_user = valves.get('neo4j_user', os.getenv('NEO4J_USER', 'neo4j'))
            self.neo4j_password = valves.get('neo4j_password', os.getenv('NEO4J_PASSWORD', 'password'))
            
            # Message bus configuration
            self.message_bus_url = valves.get('message_bus_url', os.getenv('MESSAGE_BUS_URL'))
            self.message_bus_key = valves.get('message_bus_key', os.getenv('MESSAGE_BUS_KEY'))
            
            # Enable/disable flag
            self.enabled = valves.get('enabled', True)
            
            log.info(f"AIMbient filter configured - enabled: {self.enabled}")
            
        except Exception as e:
            log.error(f"Error configuring AIMbient filter: {e}")
            self.enabled = False
