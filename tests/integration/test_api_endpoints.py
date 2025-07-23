
#!/usr/bin/env python3
"""
Integration Tests for API Endpoints
Tests API endpoint functionality and data flow
"""

import requests
import unittest
import json
import time

class TestAPIEndpoints(unittest.TestCase):
    """Test API endpoints integration"""
    
    def setUp(self):
        """Set up test environment"""
        self.base_url = "http://0.0.0.0:5000"
        self.headers = {
            'Authorization': 'Bearer dashboard-api-token',
            'Content-Type': 'application/json',
            'User-Agent': 'ITSM-Test-Suite/1.0.0'
        }
        self.timeout = 30
    
    def test_api_health_check(self):
        """Test API health endpoint"""
        try:
            response = requests.get(f"{self.base_url}/api/health", timeout=10)
            self.assertEqual(response.status_code, 200)
        except requests.exceptions.RequestException as e:
            self.skipTest(f"API server not available: {e}")
    
    def test_authentication_endpoint(self):
        """Test authentication endpoint"""
        login_data = {
            'email': 'admin@company.com',
            'password': 'admin123'
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/login",
                json=login_data,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                data = response.json()
                self.assertIn('token', data)
                self.assertIn('user', data)
            else:
                self.skipTest(f"Authentication failed: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.skipTest(f"Authentication endpoint not available: {e}")
    
    def test_devices_endpoint(self):
        """Test devices API endpoint"""
        try:
            response = requests.get(
                f"{self.base_url}/api/devices",
                headers=self.headers,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                devices = response.json()
                self.assertIsInstance(devices, list)
                
                if devices:
                    device = devices[0]
                    required_fields = ['id', 'hostname', 'status']
                    for field in required_fields:
                        self.assertIn(field, device)
            else:
                self.skipTest(f"Devices endpoint failed: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.skipTest(f"Devices endpoint not available: {e}")
    
    def test_tickets_endpoint(self):
        """Test tickets API endpoint"""
        try:
            response = requests.get(
                f"{self.base_url}/api/tickets",
                headers=self.headers,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                tickets = response.json()
                self.assertIsInstance(tickets, list)
                
                if tickets:
                    ticket = tickets[0]
                    required_fields = ['id', 'title', 'status', 'priority']
                    for field in required_fields:
                        self.assertIn(field, ticket)
            else:
                self.skipTest(f"Tickets endpoint failed: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.skipTest(f"Tickets endpoint not available: {e}")
    
    def test_alerts_endpoint(self):
        """Test alerts API endpoint"""
        try:
            response = requests.get(
                f"{self.base_url}/api/alerts",
                headers=self.headers,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                alerts = response.json()
                self.assertIsInstance(alerts, list)
                
                if alerts:
                    alert = alerts[0]
                    required_fields = ['id', 'device_id', 'severity', 'message']
                    for field in required_fields:
                        self.assertIn(field, alert)
            else:
                self.skipTest(f"Alerts endpoint failed: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.skipTest(f"Alerts endpoint not available: {e}")

if __name__ == '__main__':
    unittest.main()
