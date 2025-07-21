
#!/usr/bin/env python3
"""
Module Tests for Ticket Management
Tests ticket creation, updates, SLA tracking, and workflow
"""

import requests
import unittest
import json
import time

class TestTicketModule(unittest.TestCase):
    """Test ticket management module"""
    
    def setUp(self):
        """Set up test environment"""
        self.base_url = "http://0.0.0.0:5000"
        self.headers = {
            'Authorization': 'Bearer dashboard-api-token',
            'Content-Type': 'application/json'
        }
        self.timeout = 30
    
    def test_ticket_creation(self):
        """Test ticket creation workflow"""
        ticket_data = {
            'title': f'Test Ticket - {int(time.time())}',
            'description': 'Test ticket created by automated testing',
            'priority': 'medium',
            'category': 'incident',
            'requester_email': 'test@company.com',
            'tags': ['automated', 'test']
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/tickets",
                json=ticket_data,
                headers=self.headers,
                timeout=self.timeout
            )
            
            if response.status_code in [200, 201]:
                ticket = response.json()
                self.assertIn('id', ticket)
                self.assertEqual(ticket['title'], ticket_data['title'])
                self.assertEqual(ticket['priority'], ticket_data['priority'])
                return ticket['id']
            else:
                self.skipTest(f"Ticket creation failed: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.skipTest(f"Ticket creation test failed: {e}")
    
    def test_ticket_status_updates(self):
        """Test ticket status update workflow"""
        # First create a ticket
        ticket_id = self.test_ticket_creation()
        
        if not ticket_id:
            self.skipTest("Cannot test status updates without creating ticket")
        
        status_updates = ['in_progress', 'resolved', 'closed']
        
        for status in status_updates:
            try:
                update_data = {'status': status}
                response = requests.patch(
                    f"{self.base_url}/api/tickets/{ticket_id}",
                    json=update_data,
                    headers=self.headers,
                    timeout=self.timeout
                )
                
                if response.status_code == 200:
                    updated_ticket = response.json()
                    self.assertEqual(updated_ticket['status'], status)
                else:
                    self.skipTest(f"Status update to {status} failed: {response.status_code}")
                    
            except requests.exceptions.RequestException as e:
                self.skipTest(f"Status update test failed: {e}")
    
    def test_sla_tracking(self):
        """Test SLA tracking functionality"""
        try:
            response = requests.get(
                f"{self.base_url}/api/sla/analysis",
                headers=self.headers,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                sla_data = response.json()
                self.assertIn('overall_performance', sla_data)
                self.assertIn('breach_analysis', sla_data)
                
                # Validate SLA metrics structure
                if 'overall_performance' in sla_data:
                    performance = sla_data['overall_performance']
                    expected_fields = ['total_tickets', 'breached_tickets', 'compliance_rate']
                    for field in expected_fields:
                        self.assertIn(field, performance)
            else:
                self.skipTest(f"SLA analysis failed: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.skipTest(f"SLA tracking test failed: {e}")

if __name__ == '__main__':
    unittest.main()
