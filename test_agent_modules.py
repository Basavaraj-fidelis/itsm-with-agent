
#!/usr/bin/env python3
"""
Test Agent Modular System
Verify that the refactored modular agent system is working properly
"""

import requests
import json
from datetime import datetime

def test_agent_modules():
    """Test agent modular system functionality"""
    
    base_url = "http://0.0.0.0:5000"
    
    print("Agent Modular System Test")
    print("=" * 50)
    print()
    
    try:
        # Get agents
        response = requests.get(f"{base_url}/api/agents", timeout=30)
        if response.status_code != 200:
            print(f"❌ Failed to get agents: {response.status_code}")
            return
        
        agents = response.json()
        if not agents:
            print("❌ No agents found")
            return
        
        # Test the first available agent
        test_agent = agents[0]
        agent_id = test_agent.get('id')
        hostname = test_agent.get('hostname', 'Unknown')
        
        print(f"Testing agent: {hostname} ({agent_id})")
        print()
        
        # Get detailed device data
        response = requests.get(f"{base_url}/api/devices/{agent_id}", timeout=30)
        if response.status_code != 200:
            print(f"❌ Failed to get device data: {response.status_code}")
            return
        
        device_data = response.json()
        raw_data = device_data.get('latest_report', {}).get('raw_data', {})
        
        if not raw_data:
            print("❌ No raw data available")
            return
        
        # Check for modular system indicators
        print("Modular System Analysis:")
        print("-" * 30)
        
        # Check for module status information
        module_status = raw_data.get('_module_status', {})
        if module_status:
            print("✓ Modular architecture detected")
            print(f"  Active modules: {len(module_status)}")
            
            for module_name, status in module_status.items():
                enabled = status.get('enabled', False)
                has_error = status.get('last_error') is not None
                
                if enabled and not has_error:
                    print(f"  ✓ {module_name}: Working")
                elif enabled and has_error:
                    print(f"  ⚠️  {module_name}: Enabled but has errors")
                else:
                    print(f"  ❌ {module_name}: Disabled")
        else:
            print("⚠️  No module status found - may be using legacy architecture")
        
        # Check data collection by category
        print(f"\nData Collection Categories:")
        print("-" * 30)
        
        categories = {
            'system': 'os_info',
            'cpu': 'hardware.cpu',
            'memory': 'hardware.memory', 
            'disk': 'storage',
            'network': 'network',
            'services': 'processes',
            'security': 'security'
        }
        
        for module_name, data_path in categories.items():
            # Navigate nested data paths
            data = raw_data
            for key in data_path.split('.'):
                data = data.get(key, {})
            
            if data:
                print(f"  ✓ {module_name}: Data collected")
            else:
                print(f"  ❌ {module_name}: No data")
        
        # Check for collection metadata
        collection_status = raw_data.get('_collection_status', {})
        if collection_status:
            print(f"\nCollection Status:")
            print(f"  Modular: {collection_status.get('modular', False)}")
            print(f"  Collection time: {collection_status.get('collection_time', 'N/A')}")
        
        # Check timestamp freshness
        timestamp = raw_data.get('timestamp', '')
        if timestamp:
            try:
                data_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                age_seconds = (datetime.now().replace(tzinfo=data_time.tzinfo) - data_time).total_seconds()
                print(f"\nData Freshness:")
                print(f"  Last collection: {timestamp}")
                print(f"  Age: {age_seconds:.0f} seconds")
                
                if age_seconds < 300:  # 5 minutes
                    print("  ✓ Data is fresh")
                elif age_seconds < 3600:  # 1 hour
                    print("  ⚠️  Data is somewhat old")
                else:
                    print("  ❌ Data is stale")
            except:
                print(f"  ⚠️  Could not parse timestamp: {timestamp}")
        
        print(f"\n" + "=" * 50)
        print("Modular system test complete")
        
    except Exception as e:
        print(f"❌ Error during test: {e}")

if __name__ == '__main__':
    test_agent_modules()
