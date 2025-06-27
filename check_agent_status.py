
#!/usr/bin/env python3
"""
Check agent status and connectivity
"""

import sys
import requests
import json
from pathlib import Path

# Add Agent directory to Python path
agent_dir = Path(__file__).parent / "Agent"
sys.path.insert(0, str(agent_dir))

def check_api_connectivity():
    """Check if API server is accessible"""
    try:
        response = requests.get("https://9a952752-7cf3-4c76-a203-0413c6fe3adc-00-q98ajwzbdtxi.pike.replit.dev/api/health", timeout=5)
        if response.status_code == 200:
            print("✅ API server is accessible")
            return True
        else:
            print(f"❌ API server returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to API server: {e}")
        return False

def check_agent_heartbeat():
    """Check latest agent heartbeat"""
    try:
        response = requests.get("http://0.0.0.0:5000/api/agents", timeout=5)
        if response.status_code == 200:
            agents = response.json()
            print(f"📊 Found {len(agents)} registered agents")
            
            for agent in agents:
                print(f"  Agent: {agent.get('hostname', 'Unknown')}")
                print(f"    Status: {agent.get('status', 'Unknown')}")
                print(f"    Last Seen: {agent.get('lastSeen', 'Never')}")
                print(f"    Platform: {agent.get('platform', 'Unknown')}")
            return True
        else:
            print(f"❌ Failed to get agents: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error checking agents: {e}")
        return False

def test_agent_registration():
    """Test agent registration endpoint"""
    try:
        test_data = {
            "hostname": "test-agent",
            "platform": "linux",
            "version": "2.0.0",
            "systemInfo": {
                "cpu_usage": 25.5,
                "memory_usage": 45.2,
                "disk_usage": 67.8
            }
        }
        
        response = requests.post(
            "https://9a952752-7cf3-4c76-a203-0413c6fe3adc-00-q98ajwzbdtxi.pike.replit.dev/api/agents/heartbeat",
            json=test_data,
            headers={"Authorization": "Bearer dashboard-api-token"},
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ Agent registration test successful")
            result = response.json()
            print(f"  Agent ID: {result.get('agentId', 'Unknown')}")
            return True
        else:
            print(f"❌ Agent registration failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error testing registration: {e}")
        return False

def main():
    print("ITSM Agent Status Check")
    print("======================")
    print()
    
    # Check API connectivity
    api_ok = check_api_connectivity()
    print()
    
    if api_ok:
        # Check registered agents
        check_agent_heartbeat()
        print()
        
        # Test registration
        test_agent_registration()
    
    print()
    print("Status check complete!")

if __name__ == '__main__':
    main()
