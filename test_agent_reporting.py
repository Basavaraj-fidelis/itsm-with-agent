#!/usr/bin/env python3
"""
Test Agent System Reporting
Tests the /api/report endpoint that agents use to send system information
"""

import requests
import json
import socket
import platform
import psutil
from datetime import datetime

def generate_test_system_data():
    """Generate realistic test system data similar to what the agent collects"""

    return {
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'hostname': socket.gethostname(),
        'os_info': {
            'name': platform.system(),
            'version': platform.version(),
            'release': platform.release(),
            'architecture': platform.architecture()[0],
            'platform_string': platform.platform(),
            'uptime_seconds': 86400
        },
        'hardware': {
            'cpu': {
                'physical_cores': psutil.cpu_count(logical=False),
                'logical_cores': psutil.cpu_count(logical=True),
                'usage_percent': 25.5,
                'model': 'Test CPU Model'
            },
            'memory': {
                'total': 16 * 1024 * 1024 * 1024,  # 16GB
                'used': 8 * 1024 * 1024 * 1024,   # 8GB
                'percentage': 50.0
            },
            'system': {
                'manufacturer': 'Test Manufacturer',
                'model': 'Test Model',
                'serial_number': 'TEST123456'
            }
        },
        'network': {
            'public_ip': '203.0.113.1',
            'primary_mac': '00:11:22:33:44:55',
            'interfaces': [
                {
                    'name': 'Ethernet',
                    'addresses': [
                        {
                            'family': 'AF_INET',
                            'address': '192.168.1.100',
                            'netmask': '255.255.255.0'
                        }
                    ],
                    'mac_address': '00:11:22:33:44:55',
                    'stats': {
                        'is_up': True,
                        'speed': 1000,
                        'mtu': 1500
                    }
                }
            ]
        },
        'storage': {
            'disks': [
                {
                    'device': 'C:',
                    'mountpoint': 'C:\\',
                    'filesystem': 'NTFS',
                    'total': 500 * 1024 * 1024 * 1024,  # 500GB
                    'used': 200 * 1024 * 1024 * 1024,   # 200GB
                    'free': 300 * 1024 * 1024 * 1024,   # 300GB
                    'percent': 40.0
                }
            ]
        },
        'processes': [
            {
                'pid': 1234,
                'name': 'explorer.exe',
                'username': 'testuser',
                'cpu_percent': 2.1,
                'memory_percent': 1.5
            }
        ],
        'software': [
            {
                'name': 'Microsoft Office',
                'version': '2021',
                'vendor': 'Microsoft'
            }
        ],
        'usb_devices': [
            {
                'description': 'USB Mass Storage Device',
                'device_id': 'USB\\VID_1234&PID_5678'
            }
        ],
        'security': {
            'firewall_status': 'enabled',
            'antivirus_status': 'enabled',
            'last_scan': '2024-01-15 10:30:00'
        },
        'assigned_user': 'testuser@company.com',
        'virtualization': {
            'is_virtual': False,
            'hypervisor': 'unknown'
        }
    }

def test_agent_report():
    """Test the agent system report endpoint"""

    base_url = "http://0.0.0.0:5000"

    headers = {
        'Authorization': 'Bearer dashboard-api-token',
        'Content-Type': 'application/json',
        'User-Agent': 'ITSM-Agent/2.0.0'
    }

    # Generate test system data
    system_data = generate_test_system_data()

    print("Testing Agent System Report Endpoint")
    print("="*60)
    print(f"URL: {base_url}/api/report")
    print(f"Hostname: {system_data['hostname']}")
    print(f"Data size: {len(json.dumps(system_data))} bytes")
    print()

    try:
        response = requests.post(
            f"{base_url}/api/report", 
            json=system_data, 
            headers=headers, 
            timeout=30
        )

        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")

        if response.status_code == 200:
            print("✅ SUCCESS: Agent report endpoint is working!")
            try:
                result = response.json()
                print(f"Response: {json.dumps(result, indent=2)}")
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

def test_device_registration():
    """Test if the device appears in the devices list after reporting"""

    base_url = "http://0.0.0.0:5000"
    headers = {
        'Authorization': 'Bearer dashboard-api-token',
        'Content-Type': 'application/json'
    }

    print("\nTesting Device Registration")
    print("="*60)

    try:
        response = requests.get(
            f"{base_url}/api/devices",
            headers=headers,
            timeout=10
        )

        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            devices = response.json()
            print(f"✅ SUCCESS: Found {len(devices)} devices in system")

            # Look for our test device
            test_hostname = socket.gethostname()
            for device in devices:
                if device.get('hostname') == test_hostname:
                    print(f"✅ Test device found: {device.get('hostname')}")
                    print(f"   Status: {device.get('status')}")
                    print(f"   Last seen: {device.get('last_seen')}")
                    break
            else:
                print(f"ℹ️  Test device '{test_hostname}' not found (may need to run report test first)")
        else:
            print(f"❌ ERROR: Status {response.status_code}")

    except Exception as e:
        print(f"❌ ERROR: {e}")

def main():
    print("ITSM Agent System Reporting Test")
    print("=================================")
    print()

    test_agent_report()
    test_device_registration()

    print()
    print("Test complete!")

if __name__ == '__main__':
    main()