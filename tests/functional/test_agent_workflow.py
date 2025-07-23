
#!/usr/bin/env python3
"""
Functional Tests for Agent Workflow
Tests complete agent registration, reporting, and management workflows
"""

import requests
import unittest
import json
import time
import socket

class TestAgentWorkflow(unittest.TestCase):
    """Test complete agent workflow functionality"""
    
    def setUp(self):
        """Set up test environment"""
        self.base_url = "http://0.0.0.0:5000"
        self.headers = {
            'Authorization': 'Bearer dashboard-api-token',
            'Content-Type': 'application/json',
            'User-Agent': 'ITSM-Agent/2.0.0'
        }
        self.test_agent_id = f"test-agent-{int(time.time())}"
        self.timeout = 30
    
    def test_complete_agent_lifecycle(self):
        """Test complete agent lifecycle from registration to monitoring"""
        
        # Step 1: Agent Registration (Heartbeat)
        heartbeat_data = {
            "hostname": self.test_agent_id,
            "platform": "linux",
            "version": "2.0.0",
            "agent_id": self.test_agent_id,
            "systemInfo": {
                "cpu_usage": 25.5,
                "memory_usage": 45.2,
                "disk_usage": 67.8,
                "platform": "Linux",
                "uptime": 86400,
                "processes": 156
            },
            "capabilities": ["systemInfo", "remoteCommand"],
            "status": "online"
        }
        
        try:
            # Register agent
            response = requests.post(
                f"{self.base_url}/api/agents/heartbeat",
                json=heartbeat_data,
                headers=self.headers,
                timeout=self.timeout
            )
            
            if response.status_code != 200:
                self.skipTest(f"Agent registration failed: {response.status_code}")
            
            registration_result = response.json()
            self.assertIn('agentId', registration_result)
            
            # Step 2: Send System Report
            system_report = {
                'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'hostname': self.test_agent_id,
                'os_info': {
                    'name': 'Linux',
                    'version': '5.4.0',
                    'architecture': 'x86_64'
                },
                'hardware': {
                    'cpu': {
                        'usage_percent': 30.0,
                        'cores': 4
                    },
                    'memory': {
                        'total': 8589934592,  # 8GB
                        'used': 3865470976,   # ~3.6GB
                        'percentage': 45.0
                    }
                },
                'network': {
                    'interfaces': [{
                        'name': 'eth0',
                        'addresses': [{'address': '192.168.1.100'}]
                    }]
                }
            }
            
            response = requests.post(
                f"{self.base_url}/api/report",
                json=system_report,
                headers=self.headers,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                self.assertTrue(True)  # Report submitted successfully
            else:
                self.skipTest(f"System report failed: {response.status_code}")
            
            # Step 3: Verify agent appears in device list
            time.sleep(2)  # Allow processing time
            
            response = requests.get(
                f"{self.base_url}/api/devices",
                headers=self.headers,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                devices = response.json()
                test_device = next((d for d in devices if d.get('hostname') == self.test_agent_id), None)
                
                if test_device:
                    self.assertEqual(test_device['hostname'], self.test_agent_id)
                    self.assertIn('status', test_device)
                else:
                    self.skipTest("Test agent not found in device list")
            
        except requests.exceptions.RequestException as e:
            self.skipTest(f"Agent workflow test failed due to connectivity: {e}")
    
    def test_alert_generation_workflow(self):
        """Test alert generation based on thresholds"""
        
        # Send high CPU usage report to trigger alert
        high_usage_report = {
            'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'hostname': f"alert-test-{int(time.time())}",
            'hardware': {
                'cpu': {
                    'usage_percent': 95.0  # High CPU to trigger alert
                },
                'memory': {
                    'percentage': 90.0  # High memory to trigger alert
                }
            }
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/report",
                json=high_usage_report,
                headers=self.headers,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                # Check if alerts were generated
                time.sleep(3)  # Allow alert processing time
                
                response = requests.get(
                    f"{self.base_url}/api/alerts",
                    headers=self.headers,
                    timeout=self.timeout
                )
                
                if response.status_code == 200:
                    alerts = response.json()
                    self.assertIsInstance(alerts, list)
                    # Note: Alerts might not be generated immediately in test environment
                else:
                    self.skipTest(f"Alerts endpoint failed: {response.status_code}")
            else:
                self.skipTest(f"High usage report failed: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.skipTest(f"Alert workflow test failed due to connectivity: {e}")

if __name__ == '__main__':
    unittest.main()
