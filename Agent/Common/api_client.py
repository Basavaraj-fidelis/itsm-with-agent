#!/usr/bin/env python3
"""
API Client for ITSM Agent
Handles communication with the central ITSM server
"""

import json
import time
import logging
import requests
from typing import Dict, List, Any, Optional
from urllib.parse import urljoin


class APIClient:
    """Handles API communication with the ITSM server"""

    def __init__(self, base_url: str, auth_token: str, timeout: int = 30):
        """Initialize the API client

        Args:
            base_url: Base URL of the ITSM API server
            auth_token: Authentication token for API access
            timeout: Request timeout in seconds
        """
        self.base_url = base_url.rstrip('/')
        self.auth_token = auth_token
        self.timeout = timeout
        self.logger = logging.getLogger('APIClient')

        # Session for connection pooling
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {auth_token}',
            'Content-Type': 'application/json',
            'User-Agent': 'ITSM-Agent/2.0.0'
        })

        # Rate limiting
        self.last_request_time = 0
        self.min_request_interval = 1  # Minimum seconds between requests

        self.logger.info(f"API Client initialized for {self.base_url}")

    def _make_request(self, method: str, endpoint: str, data: Any = None, 
                     params: Dict = None, retry_count: int = 3) -> Optional[Dict]:
        """Make an HTTP request with retry logic and rate limiting

        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: API endpoint (relative to base_url)
            data: Request body data
            params: Query parameters
            retry_count: Number of retry attempts

        Returns:
            Response data as dictionary or None on failure
        """
        # Rate limiting
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        if time_since_last < self.min_request_interval:
            time.sleep(self.min_request_interval - time_since_last)

        url = urljoin(self.base_url + '/', endpoint.lstrip('/'))

        for attempt in range(retry_count):
            try:
                self.last_request_time = time.time()

                if method.upper() == 'GET':
                    response = self.session.get(url, params=params, timeout=self.timeout)
                elif method.upper() == 'POST':
                    response = self.session.post(url, json=data, params=params, timeout=self.timeout)
                elif method.upper() == 'PUT':
                    response = self.session.put(url, json=data, params=params, timeout=self.timeout)
                elif method.upper() == 'DELETE':
                    response = self.session.delete(url, params=params, timeout=self.timeout)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")

                # Handle response
                if response.status_code == 200 or response.status_code == 201:
                    try:
                        return response.json()
                    except json.JSONDecodeError:
                        self.logger.warning(f"Invalid JSON response from {url}")
                        self.logger.warning(f"Response text: {response.text[:500]}")
                        return {'success': True}
                elif response.status_code == 404:
                    self.logger.warning(f"Endpoint not found: {url}")
                    return None
                elif response.status_code >= 400:
                    self.logger.error(f"HTTP error {response.status_code} for {url}")
                    self.logger.error(f"Response text: {response.text[:500]}")

                    # Don't retry client errors (4xx)
                    if 400 <= response.status_code < 500:
                        return None

            except requests.exceptions.Timeout:
                self.logger.warning(f"Request timeout for {url} (attempt {attempt + 1}/{retry_count})")
            except requests.exceptions.ConnectionError as e:
                self.logger.warning(f"Connection error for {url} (attempt {attempt + 1}/{retry_count}): {e}")
            except requests.exceptions.RequestException as e:
                self.logger.error(f"Request error for {url}: {e}")
            except Exception as e:
                self.logger.error(f"Unexpected error during request to {url}: {e}")
                import traceback
                self.logger.error(f"Traceback: {traceback.format_exc()}")

            # Wait before retry (exponential backoff)
            if attempt < retry_count - 1:
                wait_time = (2 ** attempt) * 1  # 1, 2, 4 seconds
                time.sleep(wait_time)

        self.logger.error(f"Failed to complete request to {url} after {retry_count} attempts")
        return None

    def send_heartbeat(self, system_info: Dict[str, Any]) -> Optional[Dict]:
        """Send heartbeat with system information

        Args:
            system_info: Current system information

        Returns:
            Server response or None on failure
        """
        try:
            self.logger.debug("Sending heartbeat to server")
            response = self._make_request('POST', '/heartbeat', data=system_info)

            if response:
                self.logger.debug("Heartbeat sent successfully")
            else:
                self.logger.warning("Failed to send heartbeat")

            return response

        except Exception as e:
            self.logger.error(f"Error sending heartbeat: {e}")
            return None

    def report_system_info(self, system_info: Dict[str, Any]) -> bool:
        """Report comprehensive system information

        Args:
            system_info: Complete system information dictionary

        Returns:
            True if successful, False otherwise
        """
        try:
            # For now, we'll include system info in the heartbeat
            # In a production system, you might have a separate endpoint
            heartbeat_data = {
                'hostname': system_info.get('hostname'),
                'systemInfo': {
                    'platform': system_info.get('platform'),
                    'detailed_info': system_info
                }
            }

            response = self.send_heartbeat(heartbeat_data)
            return response is not None

        except Exception as e:
            self.logger.error(f"Error reporting system info: {e}")
            return False

    def get_pending_commands(self, agent_id: Optional[int] = None) -> List[Dict]:
        """Get pending commands for this agent

        Args:
            agent_id: Agent ID (if known)

        Returns:
            List of pending commands
        """
        try:
            if agent_id:
                endpoint = f'/api/commands/next/{agent_id}'
                response = self._make_request('GET', endpoint)

                if response and response.get('command'):
                    return [response['command']]
                else:
                    return []
            else:
                # Get all queued commands if agent_id not known
                response = self._make_request('GET', '/api/commands', params={'status': 'queued'})
                return response if response else []

        except Exception as e:
            self.logger.error(f"Error getting pending commands: {e}")
            return []

    def update_command_status(self, command_id: int, status: str, 
                            output: str = None, error_message: str = None) -> bool:
        """Update command execution status

        Args:
            command_id: Command ID
            status: New status (executing, completed, failed, deferred)
            output: Command output (if any)
            error_message: Error message (if failed)

        Returns:
            True if successful, False otherwise
        """
        try:
            update_data = {'status': status}

            if output is not None:
                update_data['output'] = output

            if error_message is not None:
                update_data['errorMessage'] = error_message

            response = self._make_request('PUT', f'/api/commands/{command_id}', data=update_data)
            return response is not None

        except Exception as e:
            self.logger.error(f"Error updating command status: {e}")
            return False

    def report_metrics(self, agent_id: int, metrics: Dict[str, Any]) -> bool:
        """Report system metrics

        Args:
            agent_id: Agent ID
            metrics: Metrics data

        Returns:
            True if successful, False otherwise
        """
        try:
            metrics_data = {
                'agentId': agent_id,
                **metrics
            }

            response = self._make_request('POST', '/api/metrics', data=metrics_data)
            return response is not None

        except Exception as e:
            self.logger.error(f"Error reporting metrics: {e}")
            return False

    def create_operation_lock(self, agent_id: int, operation_type: str, 
                            lock_reason: str, expires_in_minutes: int = 60) -> bool:
        """Create an operation lock to prevent conflicting commands

        Args:
            agent_id: Agent ID
            operation_type: Type of operation being locked
            lock_reason: Reason for the lock
            expires_in_minutes: Lock expiration time in minutes

        Returns:
            True if successful, False otherwise
        """
        try:
            from datetime import datetime, timedelta

            lock_data = {
                'agentId': agent_id,
                'operationType': operation_type,
                'lockReason': lock_reason,
                'expiresAt': (datetime.now() + timedelta(minutes=expires_in_minutes)).isoformat()
            }

            response = self._make_request('POST', '/api/locks', data=lock_data)
            return response is not None

        except Exception as e:
            self.logger.error(f"Error creating operation lock: {e}")
            return False

    def remove_operation_lock(self, lock_id: int) -> bool:
        """Remove an operation lock

        Args:
            lock_id: Lock ID to remove

        Returns:
            True if successful, False otherwise
        """
        try:
            response = self._make_request('DELETE', f'/api/locks/{lock_id}')
            return response is not None

        except Exception as e:
            self.logger.error(f"Error removing operation lock: {e}")
            return False

    def get_operation_locks(self, agent_id: int) -> List[Dict]:
        """Get current operation locks for an agent

        Args:
            agent_id: Agent ID

        Returns:
            List of active operation locks
        """
        try:
            response = self._make_request('GET', f'/api/locks/{agent_id}')
            return response if response else []

        except Exception as e:
            self.logger.error(f"Error getting operation locks: {e}")
            return []

    def test_connection(self) -> bool:
        """Test API connection

        Returns:
            True if connection is successful, False otherwise
        """
        try:
            response = self._make_request('GET', '/api/agents')
            return response is not None

        except Exception as e:
            self.logger.error(f"Connection test failed: {e}")
            return False

    def close(self):
        """Close the API client and cleanup resources"""
        try:
            self.session.close()
            self.logger.info("API Client closed")
        except Exception as e:
            self.logger.error(f"Error closing API client: {e}")


if __name__ == '__main__':
    # Test the API client
    import os

    # Test with environment variables or config file
    base_url = os.getenv('ITSM_API_URL')
    auth_token = os.getenv('ITSM_AUTH_TOKEN')
    
    # If not in environment, try to read from config file
    if not base_url or not auth_token:
        try:
            import configparser
            config = configparser.ConfigParser()
            config.read('config.ini')
            if not base_url:
                base_url = config.get('api', 'base_url', fallback='http://localhost:5000/api')
            if not auth_token:
                auth_token = config.get('api', 'auth_token', fallback='dashboard-api-token')
        except Exception:
            base_url = base_url or 'http://localhost:5000/api'
            auth_token = auth_token or 'dashboard-api-token'

    client = APIClient(base_url, auth_token)

    print("Testing API connection...")
    if client.test_connection():
        print("✓ API connection successful")

        # Test heartbeat
        print("Testing heartbeat...")
        heartbeat_data = {
            'hostname': 'test-host',
            'systemInfo': {
                'platform': 'test',
                'cpu_usage': 25,
                'memory_usage': 60
            }
        }

        response = client.send_heartbeat(heartbeat_data)
        if response:
            print("✓ Heartbeat successful")
            print(f"Agent ID: {response.get('agentId')}")
        else:
            print("✗ Heartbeat failed")
    else:
        print("✗ API connection failed")

    client.close()