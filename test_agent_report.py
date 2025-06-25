
import requests
import json
import platform

def test_agent_report():
    """Test the full agent report endpoint that sends system data"""
    
    # Your server URL - update if different
    base_url = "https://209e26fc-2931-458c-85b3-210b90c65ac7-00-36q1h5xyrtfab.pike.replit.dev"
    
    headers = {
        'Authorization': 'Bearer dashboard-api-token',
        'Content-Type': 'application/json',
        'User-Agent': 'ITSM-Agent/2.0.0'
    }
    
    # Test data similar to what the Windows agent would send
    test_report_data = {
        'hostname': 'DESKTOP-CMM8H3C',
        'os_info': {
            'name': 'Windows',
            'version': '10',
            'platform': 'Windows',
            'current_user': 'testuser'
        },
        'system_health': {
            'cpu_percent': 25.5,
            'memory_percent': 45.2,
            'disk_percent': 67.3
        },
        'hardware': {
            'cpu_percent': 25.5,
            'memory_percent': 45.2
        },
        'network': {
            'ip_address': '192.168.1.100'
        },
        'processes': [
            {
                'name': 'explorer.exe',
                'username': 'DESKTOP-CMM8H3C\\testuser',
                'pid': 1234,
                'cpu_percent': 2.1,
                'memory_percent': 1.5
            }
        ],
        'usb_devices': [],
        'installed_software': [
            {
                'name': 'Microsoft Office',
                'version': '2021',
                'publisher': 'Microsoft'
            }
        ]
    }
    
    print("Testing agent report endpoint...")
    print(f"URL: {base_url}/api/report")
    print(f"Headers: {headers}")
    print("=" * 60)
    
    try:
        response = requests.post(
            f"{base_url}/api/report", 
            json=test_report_data, 
            headers=headers, 
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Content Type: {response.headers.get('content-type', 'Unknown')}")
        
        if response.status_code == 200:
            print("✅ SUCCESS: Agent report endpoint is working!")
            if response.headers.get('content-type', '').startswith('application/json'):
                print(f"Response: {response.json()}")
            else:
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

if __name__ == '__main__':
    test_agent_report()
