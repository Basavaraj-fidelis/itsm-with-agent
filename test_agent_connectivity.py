
#!/usr/bin/env python3
"""
Test Agent Connectivity and Status
Tests agent connection status, commands, and remote connectivity features
"""

import requests
import json
import time

def test_api_health():
    """Test if the API server is running and healthy"""
    
    base_url = "https://0.0.0.0:5000"
    
    print("Testing API Health")
    print("="*50)
    
    try:
        response = requests.get(f"{base_url}/api/health", timeout=10)
        
        if response.status_code == 200:
            print("✅ SUCCESS: API server is healthy")
            return True
        else:
            print(f"❌ ERROR: API health check failed - {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Cannot connect to API server")
        print("   Make sure the server is running on port 5000")
        return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def test_agent_status():
    """Test agent status and connectivity"""
    
    base_url = "https://0.0.0.0:5000"
    headers = {
        'Authorization': 'Bearer dashboard-api-token',
        'Content-Type': 'application/json'
    }
    
    print("\nTesting Agent Status")
    print("="*50)
    
    try:
        # Get list of devices/agents
        response = requests.get(
            f"{base_url}/api/devices",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            devices = response.json()
            print(f"✅ Found {len(devices)} registered agents/devices")
            
            if devices:
                # Test first device
                device = devices[0]
                agent_id = device.get('id')
                hostname = device.get('hostname', 'Unknown')
                status = device.get('status', 'Unknown')
                
                print(f"\nTesting agent: {hostname} (ID: {agent_id})")
                print(f"Status: {status}")
                
                # Test connection status
                test_agent_connection_status(base_url, headers, agent_id)
                
                # Test connectivity
                test_agent_connectivity(base_url, headers, agent_id)
                
            else:
                print("ℹ️  No agents registered. Run the heartbeat test first.")
                
        else:
            print(f"❌ ERROR: Failed to get devices - {response.status_code}")
            
    except Exception as e:
        print(f"❌ ERROR: {e}")

def test_agent_connection_status(base_url, headers, agent_id):
    """Test agent connection status endpoint"""
    
    print(f"\n  Testing connection status...")
    
    try:
        response = requests.get(
            f"{base_url}/api/agents/{agent_id}/connection-status",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            status = response.json()
            print(f"  ✅ Connection status retrieved")
            print(f"     Online: {status.get('agent_online')}")
            print(f"     Last seen: {status.get('last_seen')}")
            print(f"     Minutes since contact: {status.get('minutes_since_contact')}")
            print(f"     Ready for connection: {status.get('ready_for_connection')}")
        else:
            print(f"  ❌ ERROR: Status {response.status_code}")
            
    except Exception as e:
        print(f"  ❌ ERROR: {e}")

def test_agent_connectivity(base_url, headers, agent_id):
    """Test agent connectivity testing endpoint"""
    
    print(f"\n  Testing connectivity test...")
    
    try:
        test_data = {"port": 5900}
        
        response = requests.post(
            f"{base_url}/api/agents/{agent_id}/test-connectivity",
            headers=headers,
            json=test_data,
            timeout=15
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"  ✅ Connectivity test completed")
            print(f"     Reachable: {result.get('reachable')}")
            print(f"     Port open: {result.get('port_open')}")
            print(f"     Response time: {result.get('response_time')}ms")
        else:
            print(f"  ❌ ERROR: Status {response.status_code}")
            
    except Exception as e:
        print(f"  ❌ ERROR: {e}")

def test_websocket_agents():
    """Test WebSocket agent tunnel service"""
    
    base_url = "https://0.0.0.0:5000"
    headers = {
        'Authorization': 'Bearer dashboard-api-token'
    }
    
    print("\nTesting WebSocket Agent Tunnels")
    print("="*50)
    
    try:
        response = requests.get(
            f"{base_url}/api/agents/websocket-status",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            status = response.json()
            print(f"✅ WebSocket service status retrieved")
            print(f"   Connected agents: {status.get('connected_agents', 0)}")
            print(f"   Active tunnels: {status.get('active_tunnels', 0)}")
        else:
            print(f"❌ ERROR: Status {response.status_code}")
            print("   WebSocket service may not be implemented yet")
            
    except Exception as e:
        print(f"❌ ERROR: {e}")

def test_agent_commands():
    """Test agent command system"""
    
    base_url = "https://0.0.0.0:5000"
    headers = {
        'Authorization': 'Bearer dashboard-api-token',
        'Content-Type': 'application/json'
    }
    
    print("\nTesting Agent Commands")
    print("="*50)
    
    try:
        # Get devices first
        response = requests.get(f"{base_url}/api/devices", headers=headers, timeout=10)
        
        if response.status_code == 200 and response.json():
            device = response.json()[0]
            agent_id = device.get('id')
            
            print(f"Testing commands for agent: {device.get('hostname')}")
            
            # Test getting pending commands
            response = requests.get(
                f"{base_url}/api/agents/{agent_id}/commands",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                commands = response.json()
                print(f"✅ Agent commands endpoint working")
                print(f"   Pending commands: {len(commands)}")
            else:
                print(f"❌ ERROR: Commands endpoint failed - {response.status_code}")
                
        else:
            print("ℹ️  No agents available for command testing")
            
    except Exception as e:
        print(f"❌ ERROR: {e}")

def main():
    print("ITSM Agent Connectivity Test")
    print("============================")
    print()
    
    # Test API health first
    if not test_api_health():
        print("\n❌ Cannot proceed - API server not accessible")
        return
    
    # Test agent status and connectivity
    test_agent_status()
    
    # Test WebSocket agents
    test_websocket_agents()
    
    # Test agent commands
    test_agent_commands()
    
    print()
    print("Connectivity test complete!")
    print()
    print("💡 Next steps:")
    print("   1. Run 'python test_agent_heartbeat.py' to test agent registration")
    print("   2. Run 'python test_agent_reporting.py' to test system data collection")
    print("   3. Check the dashboard at https://0.0.0.0:5000 to see agent data")

if __name__ == '__main__':
    main()
