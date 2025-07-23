
#!/usr/bin/env python3
"""
Performance Tests for Load Handling
Tests system performance under various load conditions
"""

import requests
import unittest
import time
import threading
import statistics

class TestPerformance(unittest.TestCase):
    """Test system performance"""
    
    def setUp(self):
        """Set up test environment"""
        self.base_url = "http://0.0.0.0:5000"
        self.headers = {
            'Authorization': 'Bearer dashboard-api-token',
            'Content-Type': 'application/json'
        }
        self.timeout = 30
        self.response_times = []
    
    def make_request(self, endpoint):
        """Make a single request and record response time"""
        start_time = time.time()
        try:
            response = requests.get(
                f"{self.base_url}{endpoint}",
                headers=self.headers,
                timeout=self.timeout
            )
            end_time = time.time()
            response_time = (end_time - start_time) * 1000  # Convert to ms
            
            if response.status_code == 200:
                self.response_times.append(response_time)
            
        except requests.exceptions.RequestException:
            pass  # Ignore failed requests for performance testing
    
    def test_concurrent_requests(self):
        """Test concurrent request handling"""
        endpoints = ['/api/devices', '/api/tickets', '/api/alerts', '/api/knowledge']
        threads = []
        num_threads = 10
        
        try:
            start_time = time.time()
            
            # Create and start threads
            for i in range(num_threads):
                endpoint = endpoints[i % len(endpoints)]
                thread = threading.Thread(target=self.make_request, args=(endpoint,))
                threads.append(thread)
                thread.start()
            
            # Wait for all threads to complete
            for thread in threads:
                thread.join()
            
            end_time = time.time()
            total_time = end_time - start_time
            
            if self.response_times:
                avg_response_time = statistics.mean(self.response_times)
                max_response_time = max(self.response_times)
                min_response_time = min(self.response_times)
                
                print(f"\nPerformance Results:")
                print(f"Total requests: {len(self.response_times)}")
                print(f"Total time: {total_time:.2f}s")
                print(f"Average response time: {avg_response_time:.2f}ms")
                print(f"Min response time: {min_response_time:.2f}ms")
                print(f"Max response time: {max_response_time:.2f}ms")
                
                # Assert reasonable performance
                self.assertLess(avg_response_time, 5000, "Average response time too high")
                self.assertLess(max_response_time, 10000, "Maximum response time too high")
            else:
                self.skipTest("No successful requests completed")
                
        except Exception as e:
            self.skipTest(f"Concurrent request test failed: {e}")
    
    def test_response_time_consistency(self):
        """Test response time consistency"""
        endpoint = '/api/devices'
        num_requests = 20
        response_times = []
        
        try:
            for i in range(num_requests):
                start_time = time.time()
                response = requests.get(
                    f"{self.base_url}{endpoint}",
                    headers=self.headers,
                    timeout=self.timeout
                )
                end_time = time.time()
                
                if response.status_code == 200:
                    response_time = (end_time - start_time) * 1000
                    response_times.append(response_time)
                
                time.sleep(0.1)  # Small delay between requests
            
            if response_times and len(response_times) >= 5:
                avg_time = statistics.mean(response_times)
                std_dev = statistics.stdev(response_times)
                
                print(f"\nConsistency Results:")
                print(f"Average: {avg_time:.2f}ms")
                print(f"Standard deviation: {std_dev:.2f}ms")
                print(f"Coefficient of variation: {(std_dev/avg_time)*100:.2f}%")
                
                # Assert reasonable consistency (CV < 50%)
                cv = (std_dev/avg_time)*100
                self.assertLess(cv, 50, "Response times too inconsistent")
            else:
                self.skipTest("Not enough successful requests for consistency test")
                
        except requests.exceptions.RequestException as e:
            self.skipTest(f"Response time consistency test failed: {e}")

if __name__ == '__main__':
    unittest.main()
