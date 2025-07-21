
#!/usr/bin/env python3
"""
Test Agent Heartbeat and Registration
Tests the /api/agents/heartbeat endpoint that agents use to register and report status
"""

import requests
import json
import time
from datetime import datetime

def test_agent_heartbeat():
    """Test the agent heartbeat/registration endpoint"""
    
    # Your current server URL
    base_url = "http://0.0.0.0:5000"  # Update if different
    
    headers = {
        'Authorization': 'Bearer dashboard-api-token',
        'Content-Type': 'application/json',
        'User-Agent': 'ITSM-Agent/2.0.0'
    }
    
    # Test data similar to what your current agent sends
    test_heartbeat_data = {
        "hostname": "test-agent-001",
        "platform": "windows",
        "version": "2.0.0",
        "agent_id": "test-agent-001",
        "systemInfo": {
            "cpu_usage": 25.5,
            "memory_usage": 45.2,
            "disk_usage": 67.8,
            "platform": "Windows 11",
            "uptime": 86400,
            "processes": 156,
            "network_interfaces": 2
        },
        "capabilities": ["systemInfo", "remoteCommand", "adSync"],
        "status": "online"
    }
    
    print("Testing Agent Heartbeat Endpoint")
    print("="*50)
    print(f"URL: {base_url}/api/agents/heartbeat")
    print(f"Agent: {test_heartbeat_data['hostname']}")
    print()
    
    try:
        response = requests.post(
            f"{base_url}/api/agents/heartbeat", 
            json=test_heartbeat_data, 
            headers=headers, 
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("✅ SUCCESS: Agent heartbeat endpoint is working!")
            try:
                result = response.json()
                print(f"Agent ID: {result.get('agentId', 'Unknown')}")
                print(f"Status: {result.get('status', 'Unknown')}")
                print(f"Message: {result.get('message', 'No message')}")
            except json.JSONDecodeError:
                print(f"Response Text: {response.text[:200]}")
        else:
            print(f"❌ ERROR: Status {response.status_code}")
            print(f"Response: {response.text[:500]}")
            
    except requests.exceptions.Timeout:
        print("❌ ERROR: Request timed out")
    except requests.exceptions.ConnectionError as e:
        print(f"❌ ERROR: Connection failed - {e}")
    except Exception as e:
        print(f"❌ ERROR: {e}")

def test_agent_commands():
    """Test the agent commands endpoint"""
    
    base_url = "https://0.0.0.0:5000"
    headers = {
        'Authorization': 'Bearer dashboard-api-token',
        'Content-Type': 'application/json'
    }
    
    agent_id = "test-agent-001"
    
    print("\nTesting Agent Commands Endpoint")
    print("="*50)
    
    try:
        response = requests.get(
            f"{base_url}/api/agents/{agent_id}/commands",
            headers=headers,
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ SUCCESS: Commands endpoint is working!")
            commands = response.json()
            print(f"Pending commands: {len(commands)}")
        else:
            print(f"❌ ERROR: Status {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ ERROR: {e}")

def main():
    print("ITSM Agent Heartbeat Test")
    print("=========================")
    print()
    
    test_agent_heartbeat()
    test_agent_commands()
    
    print()
    print("Test complete!")

if __name__ == '__main__':
    main()
