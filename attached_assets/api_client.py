"""
API Client for ITSM Agent
Handles communication with the central ITSM API
"""

import json
import time
import logging
import requests
from urllib.parse import urljoin


class APIClient:
    """Client for communicating with ITSM API"""
    
    def __init__(self, base_url, auth_token, timeout=30, retry_attempts=3, retry_delay=5):
        """Initialize API client with configuration"""
        self.base_url = base_url.rstrip('/')
        self.auth_token = auth_token
        self.timeout = timeout
        self.retry_attempts = retry_attempts
        self.retry_delay = retry_delay
        self.logger = logging.getLogger('APIClient')
        
        # Setup session with default headers
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {auth_token}',
            'Content-Type': 'application/json',
            'User-Agent': 'ITSM-Agent/1.0'
        })
    
    def report_system_info(self, system_info):
        """Report system information to the API"""
        endpoint = '/api/report'
        url = urljoin(self.base_url, endpoint)
        
        return self._make_request_with_retry('POST', url, json=system_info)
    
    def _make_request_with_retry(self, method, url, **kwargs):
        """Make HTTP request with retry logic and exponential backoff"""
        last_exception = None
        
        for attempt in range(self.retry_attempts):
            try:
                self.logger.info(f"Making {method} request to {url} (attempt {attempt + 1}/{self.retry_attempts})")
                
                # Make the request
                response = self.session.request(
                    method=method,
                    url=url,
                    timeout=self.timeout,
                    **kwargs
                )
                
                # Log the response
                self.logger.info(f"Response status: {response.status_code}")
                
                # Check if request was successful
                if response.status_code in [200, 201, 202]:
                    self.logger.info("Request successful")
                    try:
                        response_data = response.json()
                        self.logger.debug(f"Response data: {response_data}")
                    except json.JSONDecodeError:
                        self.logger.debug("Response is not JSON")
                    return True
                
                elif response.status_code in [400, 401, 403, 404]:
                    # Client errors - don't retry
                    self.logger.error(f"Client error {response.status_code}: {response.text}")
                    return False
                
                else:
                    # Server errors - retry
                    self.logger.warning(f"Server error {response.status_code}: {response.text}")
                    last_exception = Exception(f"HTTP {response.status_code}: {response.text}")
                
            except requests.exceptions.Timeout as e:
                self.logger.warning(f"Request timeout: {e}")
                last_exception = e
                
            except requests.exceptions.ConnectionError as e:
                self.logger.warning(f"Connection error: {e}")
                last_exception = e
                
            except requests.exceptions.RequestException as e:
                self.logger.error(f"Request error: {e}")
                last_exception = e
                
            except Exception as e:
                self.logger.error(f"Unexpected error: {e}")
                last_exception = e
            
            # Calculate delay for next attempt (exponential backoff)
            if attempt < self.retry_attempts - 1:
                delay = self.retry_delay * (2 ** attempt)
                self.logger.info(f"Waiting {delay} seconds before retry...")
                time.sleep(delay)
        
        # All attempts failed
        self.logger.error(f"All {self.retry_attempts} attempts failed. Last error: {last_exception}")
        return False
    
    def test_connection(self):
        """Test connection to the API"""
        try:
            endpoint = '/api/health'
            url = urljoin(self.base_url, endpoint)
            
            response = self.session.get(url, timeout=self.timeout)
            
            if response.status_code == 200:
                self.logger.info("API connection test successful")
                return True
            else:
                self.logger.warning(f"API connection test failed: {response.status_code}")
                return False
                
        except Exception as e:
            self.logger.error(f"API connection test error: {e}")
            return False
    
    def get_agent_config(self):
        """Get agent configuration from API"""
        try:
            endpoint = '/api/agent/config'
            url = urljoin(self.base_url, endpoint)
            
            response = self.session.get(url, timeout=self.timeout)
            
            if response.status_code == 200:
                config = response.json()
                self.logger.info("Retrieved agent configuration from API")
                return config
            else:
                self.logger.warning(f"Failed to get agent config: {response.status_code}")
                return None
                
        except Exception as e:
            self.logger.error(f"Error getting agent config: {e}")
            return None
