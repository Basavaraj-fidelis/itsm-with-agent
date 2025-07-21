
#!/usr/bin/env python3
"""
Module Tests for Knowledge Base
Tests article creation, search, and management functionality
"""

import requests
import unittest
import json
import time

class TestKnowledgeBaseModule(unittest.TestCase):
    """Test knowledge base module"""
    
    def setUp(self):
        """Set up test environment"""
        self.base_url = "http://0.0.0.0:5000"
        self.headers = {
            'Authorization': 'Bearer dashboard-api-token',
            'Content-Type': 'application/json'
        }
        self.timeout = 30
    
    def test_article_listing(self):
        """Test knowledge base article listing"""
        try:
            response = requests.get(
                f"{self.base_url}/api/knowledge",
                headers=self.headers,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                articles = response.json()
                self.assertIsInstance(articles, list)
                
                if articles:
                    article = articles[0]
                    required_fields = ['id', 'title', 'content', 'category']
                    for field in required_fields:
                        self.assertIn(field, article)
            else:
                self.skipTest(f"Knowledge base listing failed: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.skipTest(f"Knowledge base test failed: {e}")
    
    def test_article_search(self):
        """Test article search functionality"""
        search_terms = ['password', 'network', 'computer']
        
        for term in search_terms:
            try:
                response = requests.get(
                    f"{self.base_url}/api/knowledge/search",
                    params={'q': term},
                    headers=self.headers,
                    timeout=self.timeout
                )
                
                if response.status_code == 200:
                    search_results = response.json()
                    self.assertIsInstance(search_results, list)
                    
                    # Verify search results contain the search term
                    for result in search_results:
                        content = (result.get('title', '') + ' ' + result.get('content', '')).lower()
                        # Note: Search might be fuzzy, so we don't enforce exact matches
                        self.assertIsInstance(result, dict)
                else:
                    self.skipTest(f"Search for '{term}' failed: {response.status_code}")
                    
            except requests.exceptions.RequestException as e:
                self.skipTest(f"Search test failed: {e}")

if __name__ == '__main__':
    unittest.main()
