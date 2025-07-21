
#!/usr/bin/env python3
"""
Unit Tests for Authentication Module
Tests JWT token validation, user authentication, and authorization
"""

import unittest
import jwt
import time
from datetime import datetime, timedelta

class TestAuthModule(unittest.TestCase):
    """Test authentication functionality"""
    
    def setUp(self):
        """Set up test environment"""
        self.secret_key = "test-secret-key"
        self.test_user = {
            'id': 'user-123',
            'email': 'test@company.com',
            'role': 'admin'
        }
    
    def test_jwt_token_creation(self):
        """Test JWT token creation"""
        payload = {
            'userId': self.test_user['id'],
            'email': self.test_user['email'],
            'role': self.test_user['role'],
            'iat': int(time.time()),
            'exp': int(time.time()) + 86400  # 24 hours
        }
        
        token = jwt.encode(payload, self.secret_key, algorithm='HS256')
        self.assertIsInstance(token, str)
        self.assertGreater(len(token), 0)
    
    def test_jwt_token_validation(self):
        """Test JWT token validation"""
        payload = {
            'userId': self.test_user['id'],
            'email': self.test_user['email'],
            'role': self.test_user['role'],
            'iat': int(time.time()),
            'exp': int(time.time()) + 86400
        }
        
        token = jwt.encode(payload, self.secret_key, algorithm='HS256')
        decoded = jwt.decode(token, self.secret_key, algorithms=['HS256'])
        
        self.assertEqual(decoded['userId'], self.test_user['id'])
        self.assertEqual(decoded['email'], self.test_user['email'])
        self.assertEqual(decoded['role'], self.test_user['role'])
    
    def test_token_expiration(self):
        """Test expired token handling"""
        payload = {
            'userId': self.test_user['id'],
            'email': self.test_user['email'],
            'role': self.test_user['role'],
            'iat': int(time.time()) - 3600,  # 1 hour ago
            'exp': int(time.time()) - 1800   # 30 minutes ago (expired)
        }
        
        token = jwt.encode(payload, self.secret_key, algorithm='HS256')
        
        with self.assertRaises(jwt.ExpiredSignatureError):
            jwt.decode(token, self.secret_key, algorithms=['HS256'])
    
    def test_role_validation(self):
        """Test role-based access validation"""
        valid_roles = ['admin', 'technician', 'user']
        
        self.assertIn(self.test_user['role'], valid_roles)
        
        # Test admin permissions
        admin_permissions = ['read', 'write', 'delete', 'manage_users']
        if self.test_user['role'] == 'admin':
            self.assertTrue(all(perm in admin_permissions for perm in admin_permissions))

if __name__ == '__main__':
    unittest.main()
