
import requests
import json

def test_api_endpoints():
    """Test the API endpoints that the agent uses"""
    base_url = "https://209e26fc-2931-458c-85b3-210b90c65ac7-00-36q1h5xyrtfab.pike.replit.dev"
    headers = {
        'Authorization': 'Bearer dashboard-api-token',
        'Content-Type': 'application/json',
        'User-Agent': 'ITSM-Agent/2.0.0'
    }
    
    # Test heartbeat endpoint
    print("Testing heartbeat endpoint...")
    heartbeat_data = {
        'hostname': 'test-agent',
        'systemInfo': {
            'platform': 'windows',
            'version': '2.0.0',
            'cpu_usage': 25.0,
            'memory_usage': 45.0,
            'disk_usage': 67.0
        }
    }
    
    try:
        response = requests.post(f"{base_url}/api/heartbeat", 
                               json=heartbeat_data, 
                               headers=headers, 
                               timeout=10)
        print(f"Heartbeat - Status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        print(f"Response text: {response.text[:200]}")
        
        if response.headers.get('content-type', '').startswith('application/json'):
            print(f"JSON Response: {response.json()}")
        else:
            print("Non-JSON response received")
            
    except Exception as e:
        print(f"Heartbeat error: {e}")
    
    print("\n" + "="*50 + "\n")
    
    # Test commands endpoint
    print("Testing commands endpoint...")
    try:
        response = requests.get(f"{base_url}/api/commands", 
                              headers=headers, 
                              timeout=10)
        print(f"Commands - Status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        print(f"Response text: {response.text[:200]}")
        
        if response.headers.get('content-type', '').startswith('application/json'):
            print(f"JSON Response: {response.json()}")
        else:
            print("Non-JSON response received")
            
    except Exception as e:
        print(f"Commands error: {e}")

if __name__ == '__main__':
    test_api_endpoints()
