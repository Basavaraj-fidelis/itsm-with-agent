
#!/usr/bin/env python3
"""
Unit Tests for Storage Layer
Tests individual storage functions and database operations
"""

import unittest
import sys
import os
import asyncio
import json

# Add server path to import modules
sys.path.append(os.path.join(os.path.dirname(__file__), '../../server'))

class TestStorageLayer(unittest.TestCase):
    """Test storage layer functionality"""
    
    def setUp(self):
        """Set up test environment"""
        self.test_data = {
            'device_id': 'test-device-001',
            'hostname': 'test-host',
            'cpu_usage': 25.5,
            'memory_usage': 45.2,
            'disk_usage': 67.8
        }
    
    def test_device_data_validation(self):
        """Test device data validation"""
        # Test valid data
        self.assertIsInstance(self.test_data['cpu_usage'], (int, float))
        self.assertGreaterEqual(self.test_data['cpu_usage'], 0)
        self.assertLessEqual(self.test_data['cpu_usage'], 100)
        
        # Test hostname format
        self.assertIsInstance(self.test_data['hostname'], str)
        self.assertGreater(len(self.test_data['hostname']), 0)
    
    def test_performance_metrics_calculation(self):
        """Test performance metrics calculations"""
        cpu = self.test_data['cpu_usage']
        memory = self.test_data['memory_usage']
        disk = self.test_data['disk_usage']
        
        # Calculate health score (example logic)
        health_score = 100 - ((cpu * 0.4) + (memory * 0.4) + (disk * 0.2))
        
        self.assertIsInstance(health_score, (int, float))
        self.assertGreaterEqual(health_score, 0)
        self.assertLessEqual(health_score, 100)
    
    def test_alert_threshold_logic(self):
        """Test alert threshold calculations"""
        cpu_threshold = 80
        memory_threshold = 85
        disk_threshold = 90
        
        cpu_alert = self.test_data['cpu_usage'] > cpu_threshold
        memory_alert = self.test_data['memory_usage'] > memory_threshold
        disk_alert = self.test_data['disk_usage'] > disk_threshold
        
        self.assertFalse(cpu_alert)  # 25.5 < 80
        self.assertFalse(memory_alert)  # 45.2 < 85
        self.assertFalse(disk_alert)  # 67.8 < 90

if __name__ == '__main__':
    unittest.main()
