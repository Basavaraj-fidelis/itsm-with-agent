
#!/usr/bin/env python3
"""
Network Connectivity Monitor for ITSM Agent
Monitors connectivity to API endpoints and critical network resources
"""

import time
import socket
import requests
import threading
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from configparser import ConfigParser


class NetworkConnectivityMonitor:
    """Monitors network connectivity and API endpoint availability"""
    
    def __init__(self, config: ConfigParser):
        """Initialize network connectivity monitor
        
        Args:
            config: Configuration parser instance
        """
        self.config = config
        self.logger = logging.getLogger('NetworkMonitor')
        self.running = False
        self.monitor_thread = None
        
        # Configuration
        self.check_interval = config.getint('network', 'connectivity_check_interval', fallback=300)
        self.timeout_threshold = config.getint('network', 'timeout_threshold', fallback=10)
        self.failure_threshold = config.getint('network', 'failure_threshold', fallback=3)
        
        # Parse endpoints
        endpoints_str = config.get('network', 'connectivity_endpoints', 
                                 fallback='8.8.8.8,1.1.1.1')
        self.endpoints = [ep.strip() for ep in endpoints_str.split(',')]
        
        # Connectivity state tracking
        self.connectivity_state = {}
        self.failure_counts = {}
        self.last_check_time = None
        self.connectivity_history = []
        
        # Initialize state for all endpoints
        for endpoint in self.endpoints:
            self.connectivity_state[endpoint] = True
            self.failure_counts[endpoint] = 0
        
        self.logger.info(f"Network monitor initialized for {len(self.endpoints)} endpoints")
    
    def start(self):
        """Start network connectivity monitoring"""
        if self.running:
            return
        
        self.running = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()
        
        self.logger.info("Network connectivity monitor started")
    
    def stop(self):
        """Stop network connectivity monitoring"""
        self.running = False
        
        if self.monitor_thread:
            self.monitor_thread.join(timeout=10)
        
        self.logger.info("Network connectivity monitor stopped")
    
    def _monitor_loop(self):
        """Main monitoring loop"""
        while self.running:
            try:
                self._check_connectivity()
                time.sleep(self.check_interval)
                
            except Exception as e:
                self.logger.error(f"Error in network monitor loop: {e}")
                time.sleep(60)  # Wait longer on error
    
    def _check_connectivity(self):
        """Check connectivity to all configured endpoints"""
        check_time = datetime.now()
        check_results = {}
        
        for endpoint in self.endpoints:
            try:
                is_reachable = self._test_endpoint(endpoint)
                check_results[endpoint] = is_reachable
                
                if is_reachable:
                    # Reset failure count on success
                    self.failure_counts[endpoint] = 0
                    
                    # Update state if it was previously down
                    if not self.connectivity_state[endpoint]:
                        self.logger.info(f"Connectivity restored to {endpoint}")
                        self.connectivity_state[endpoint] = True
                else:
                    # Increment failure count
                    self.failure_counts[endpoint] += 1
                    
                    # Check if we've reached failure threshold
                    if (self.failure_counts[endpoint] >= self.failure_threshold and 
                        self.connectivity_state[endpoint]):
                        self.logger.warning(f"Connectivity lost to {endpoint} after {self.failure_counts[endpoint]} failures")
                        self.connectivity_state[endpoint] = False
                
            except Exception as e:
                self.logger.error(f"Error checking connectivity to {endpoint}: {e}")
                check_results[endpoint] = False
        
        # Store check results in history
        self.connectivity_history.append({
            'timestamp': check_time,
            'results': check_results.copy()
        })
        
        # Keep only recent history (last 24 hours)
        cutoff_time = check_time - timedelta(hours=24)
        self.connectivity_history = [
            entry for entry in self.connectivity_history 
            if entry['timestamp'] > cutoff_time
        ]
        
        self.last_check_time = check_time
        
        # Log overall connectivity status
        total_endpoints = len(self.endpoints)
        reachable_endpoints = sum(1 for state in self.connectivity_state.values() if state)
        
        if reachable_endpoints < total_endpoints:
            self.logger.warning(f"Network connectivity: {reachable_endpoints}/{total_endpoints} endpoints reachable")
        else:
            self.logger.debug(f"Network connectivity: All {total_endpoints} endpoints reachable")
    
    def _test_endpoint(self, endpoint: str) -> bool:
        """Test connectivity to a specific endpoint
        
        Args:
            endpoint: Endpoint to test (URL or IP address)
            
        Returns:
            True if reachable, False otherwise
        """
        try:
            if endpoint.startswith('http://') or endpoint.startswith('https://'):
                # HTTP/HTTPS endpoint
                return self._test_http_endpoint(endpoint)
            else:
                # IP address or hostname - test with ping/socket
                return self._test_network_endpoint(endpoint)
                
        except Exception as e:
            self.logger.debug(f"Connectivity test failed for {endpoint}: {e}")
            return False
    
    def _test_http_endpoint(self, url: str) -> bool:
        """Test HTTP/HTTPS endpoint connectivity
        
        Args:
            url: URL to test
            
        Returns:
            True if reachable, False otherwise
        """
        try:
            response = requests.get(
                url, 
                timeout=self.timeout_threshold,
                headers={'User-Agent': 'ITSM-Agent-NetworkMonitor/2.0.0'}
            )
            # Consider any response (even error codes) as connectivity
            return True
            
        except requests.exceptions.ConnectTimeout:
            return False
        except requests.exceptions.ConnectionError:
            return False
        except requests.exceptions.Timeout:
            return False
        except Exception:
            # For other exceptions, assume connectivity exists but endpoint has issues
            return True
    
    def _test_network_endpoint(self, host: str, port: int = 53) -> bool:
        """Test network endpoint connectivity using socket
        
        Args:
            host: Hostname or IP address
            port: Port to test (default 53 for DNS)
            
        Returns:
            True if reachable, False otherwise
        """
        try:
            # Try to establish TCP connection
            sock = socket.create_connection(
                (host, port), 
                timeout=self.timeout_threshold
            )
            sock.close()
            return True
            
        except (socket.timeout, socket.error, OSError):
            return False
    
    def get_connectivity_status(self) -> Dict[str, Any]:
        """Get current connectivity status
        
        Returns:
            Dictionary containing connectivity information
        """
        total_endpoints = len(self.endpoints)
        reachable_endpoints = sum(1 for state in self.connectivity_state.values() if state)
        
        # Calculate uptime percentage for last 24 hours
        uptime_percentage = self._calculate_uptime_percentage()
        
        return {
            'overall_status': 'healthy' if reachable_endpoints == total_endpoints else 'degraded',
            'reachable_endpoints': reachable_endpoints,
            'total_endpoints': total_endpoints,
            'uptime_percentage_24h': uptime_percentage,
            'endpoint_status': self.connectivity_state.copy(),
            'failure_counts': self.failure_counts.copy(),
            'last_check': self.last_check_time.isoformat() if self.last_check_time else None
        }
    
    def _calculate_uptime_percentage(self) -> float:
        """Calculate uptime percentage for last 24 hours
        
        Returns:
            Uptime percentage (0-100)
        """
        if not self.connectivity_history:
            return 100.0
        
        total_checks = len(self.connectivity_history)
        successful_checks = 0
        
        for entry in self.connectivity_history:
            results = entry['results']
            # Count as successful if at least one endpoint is reachable
            if any(results.values()):
                successful_checks += 1
        
        return (successful_checks / total_checks * 100) if total_checks > 0 else 100.0
    
    def is_api_reachable(self) -> bool:
        """Check if API endpoints are reachable
        
        Returns:
            True if at least one API endpoint is reachable
        """
        api_endpoints = [
            ep for ep in self.endpoints 
            if ep.startswith('http://') or ep.startswith('https://')
        ]
        
        if not api_endpoints:
            return True  # No API endpoints configured
        
        return any(
            self.connectivity_state.get(ep, False) 
            for ep in api_endpoints
        )
    
    def get_connectivity_metrics(self) -> Dict[str, Any]:
        """Get detailed connectivity metrics
        
        Returns:
            Dictionary containing detailed metrics
        """
        if not self.connectivity_history:
            return {}
        
        # Calculate metrics for each endpoint
        endpoint_metrics = {}
        
        for endpoint in self.endpoints:
            successful_checks = 0
            total_checks = 0
            
            for entry in self.connectivity_history:
                if endpoint in entry['results']:
                    total_checks += 1
                    if entry['results'][endpoint]:
                        successful_checks += 1
            
            uptime_percentage = (successful_checks / total_checks * 100) if total_checks > 0 else 0
            
            endpoint_metrics[endpoint] = {
                'uptime_percentage': uptime_percentage,
                'total_checks': total_checks,
                'successful_checks': successful_checks,
                'current_status': self.connectivity_state.get(endpoint, False),
                'failure_count': self.failure_counts.get(endpoint, 0)
            }
        
        return {
            'endpoint_metrics': endpoint_metrics,
            'total_history_entries': len(self.connectivity_history),
            'monitoring_duration_hours': (
                (self.connectivity_history[-1]['timestamp'] - self.connectivity_history[0]['timestamp']).total_seconds() / 3600
                if len(self.connectivity_history) > 1 else 0
            )
        }


if __name__ == '__main__':
    # Test network connectivity monitor
    from configparser import ConfigParser
    
    # Create test configuration
    config = ConfigParser()
    config.read_dict({
        'network': {
            'connectivity_check_interval': '30',
            'connectivity_endpoints': 'http://8.8.8.8,1.1.1.1,google.com',
            'timeout_threshold': '5',
            'failure_threshold': '2'
        }
    })
    
    # Initialize and test monitor
    monitor = NetworkConnectivityMonitor(config)
    
    print("Testing network connectivity monitor...")
    print("Starting monitor...")
    monitor.start()
    
    try:
        # Let it run for a bit
        time.sleep(35)
        
        # Get status
        status = monitor.get_connectivity_status()
        print("Connectivity Status:", status)
        
        metrics = monitor.get_connectivity_metrics()
        print("Connectivity Metrics:", metrics)
        
    finally:
        monitor.stop()
        print("Monitor stopped")
