
#!/usr/bin/env python3
"""
Configuration and API Test Utility
Tests configuration file and API connectivity
"""

import os
import sys
import configparser
import requests
from pathlib import Path


def load_config(config_path='config.ini'):
    """Load configuration from file"""
    config = configparser.ConfigParser()
    
    if not os.path.exists(config_path):
        print(f"❌ Configuration file not found: {config_path}")
        return None
    
    try:
        config.read(config_path)
        print(f"✅ Configuration file loaded: {config_path}")
        return config
    except Exception as e:
        print(f"❌ Error reading configuration file: {e}")
        return None


def test_config_sections(config):
    """Test required configuration sections"""
    required_sections = ['agent', 'api', 'monitoring']
    missing_sections = []
    
    for section in required_sections:
        if not config.has_section(section):
            missing_sections.append(section)
    
    if missing_sections:
        print(f"❌ Missing configuration sections: {', '.join(missing_sections)}")
        return False
    else:
        print("✅ All required configuration sections present")
        return True


def test_api_connectivity(config):
    """Test API connectivity using config values"""
    try:
        base_url = config.get('api', 'base_url')
        auth_token = config.get('api', 'auth_token')
        timeout = config.getint('api', 'timeout', fallback=30)
        
        print(f"🔗 Testing API connection to: {base_url}")
        
        # Test health endpoint
        health_url = base_url
        if not health_url.endswith('/health'):
            if health_url.endswith('/api'):
                health_url = health_url + '/health'
            else:
                health_url = health_url + '/api/health'
        
        headers = {
            'Authorization': f'Bearer {auth_token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.get(health_url, headers=headers, timeout=timeout)
        
        if response.status_code == 200:
            print("✅ API connection successful")
            return True
        else:
            print(f"❌ API returned status code: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API server - check URL and network connectivity")
        return False
    except requests.exceptions.Timeout:
        print(f"❌ API request timeout after {timeout} seconds")
        return False
    except Exception as e:
        print(f"❌ API test failed: {e}")
        return False


def print_config_summary(config):
    """Print configuration summary"""
    print("\n📋 Configuration Summary:")
    print("-" * 40)
    
    try:
        print(f"API URL: {config.get('api', 'base_url')}")
        print(f"Auth Token: {config.get('api', 'auth_token')[:10]}...")
        print(f"Collection Interval: {config.get('agent', 'collection_interval')} seconds")
        print(f"Heartbeat Interval: {config.get('agent', 'heartbeat_interval')} seconds")
        print(f"Log Level: {config.get('agent', 'log_level')}")
    except Exception as e:
        print(f"Error reading configuration: {e}")


def main():
    """Main test function"""
    config_path = sys.argv[1] if len(sys.argv) > 1 else 'config.ini'
    
    print("🧪 ITSM Agent Configuration Test")
    print("=" * 40)
    
    # Load configuration
    config = load_config(config_path)
    if not config:
        sys.exit(1)
    
    # Print configuration summary
    print_config_summary(config)
    
    print("\n🔍 Running Tests:")
    print("-" * 40)
    
    # Test configuration sections
    config_ok = test_config_sections(config)
    
    # Test API connectivity
    api_ok = test_api_connectivity(config)
    
    print("\n📊 Test Results:")
    print("-" * 40)
    print(f"Configuration: {'✅ PASS' if config_ok else '❌ FAIL'}")
    print(f"API Connectivity: {'✅ PASS' if api_ok else '❌ FAIL'}")
    
    if config_ok and api_ok:
        print("\n🎉 All tests passed! Agent should work correctly.")
        sys.exit(0)
    else:
        print("\n⚠️  Some tests failed. Please check configuration and connectivity.")
        sys.exit(1)


if __name__ == '__main__':
    main()
