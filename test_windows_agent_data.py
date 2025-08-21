
#!/usr/bin/env python3
"""
Test Windows Agent Data Collection
Comprehensive test to verify all system information is being collected properly
"""

import requests
import json
import time
from datetime import datetime

def test_windows_agent_data():
    """Test Windows agent data collection comprehensively"""
    
    base_url = "http://0.0.0.0:5000"
    
    print("Windows Agent Data Collection Test")
    print("=" * 60)
    print(f"Testing against: {base_url}")
    print(f"Test time: {datetime.now().isoformat()}")
    print()
    
    # Step 1: Check if any agents are registered
    try:
        response = requests.get(f"{base_url}/api/agents", timeout=30)
        if response.status_code == 200:
            agents = response.json()
            print(f"✓ Found {len(agents)} registered agents")
            
            if not agents:
                print("❌ No agents found. Please ensure the Windows agent is running and connected.")
                return
                
            # Find Windows agents
            windows_agents = [agent for agent in agents if 'windows' in agent.get('platform', '').lower()]
            
            if not windows_agents:
                print("❌ No Windows agents found. Looking for any agent with recent activity...")
                # Check for any recent agents
                recent_agents = [agent for agent in agents if agent.get('status') == 'online' or 
                               (agent.get('last_seen') and 
                                (datetime.now() - datetime.fromisoformat(agent['last_seen'].replace('Z', '+00:00'))).total_seconds() < 3600)]
                
                if recent_agents:
                    print(f"Found {len(recent_agents)} recent agents (will test the first one)")
                    test_agent = recent_agents[0]
                else:
                    print("❌ No recent agent activity found")
                    return
            else:
                test_agent = windows_agents[0]
                print(f"✓ Testing Windows agent: {test_agent.get('hostname', 'Unknown')}")
            
        else:
            print(f"❌ Failed to get agents list: {response.status_code}")
            return
            
    except Exception as e:
        print(f"❌ Error connecting to server: {e}")
        return
    
    # Step 2: Get detailed agent information
    try:
        agent_id = test_agent.get('id')
        response = requests.get(f"{base_url}/api/devices/{agent_id}", timeout=30)
        
        if response.status_code == 200:
            device_data = response.json()
            print(f"\n✓ Retrieved detailed data for agent: {device_data.get('hostname', 'Unknown')}")
            
            # Analyze the collected data
            analyze_agent_data(device_data)
            
        else:
            print(f"❌ Failed to get device details: {response.status_code}")
            return
            
    except Exception as e:
        print(f"❌ Error getting device details: {e}")
        return

def analyze_agent_data(device_data):
    """Analyze the completeness of agent data"""
    
    print("\nData Collection Analysis:")
    print("-" * 40)
    
    # Check basic information
    basic_fields = ['hostname', 'os_name', 'os_version', 'ip_address', 'status']
    print("\n1. Basic Information:")
    for field in basic_fields:
        value = device_data.get(field, 'Missing')
        status = "✓" if value and value != 'Missing' else "❌"
        print(f"   {status} {field}: {value}")
    
    # Check latest report data
    latest_report = device_data.get('latest_report', {})
    if latest_report:
        print("\n2. Performance Metrics:")
        metrics = ['cpu_usage', 'memory_usage', 'disk_usage', 'network_io']
        for metric in metrics:
            value = latest_report.get(metric, 'Missing')
            status = "✓" if value and value != 'Missing' else "❌"
            print(f"   {status} {metric}: {value}")
    else:
        print("\n2. Performance Metrics: ❌ No latest report data")
    
    # Check raw system data
    raw_data = latest_report.get('raw_data', {})
    if raw_data:
        print("\n3. System Information Categories:")
        
        # Operating System Info
        os_info = raw_data.get('os_info', {})
        if os_info:
            print(f"   ✓ OS Info: {len(os_info)} fields")
            important_os_fields = ['name', 'version', 'architecture', 'build_number', 'product_name']
            for field in important_os_fields:
                if field in os_info:
                    print(f"     - {field}: {os_info[field]}")
        else:
            print("   ❌ OS Info: Missing")
        
        # Hardware Info
        hardware = raw_data.get('hardware', {})
        if hardware:
            print(f"   ✓ Hardware Info: Available")
            
            # CPU Info
            cpu = hardware.get('cpu', {})
            if cpu:
                print(f"     - CPU: {cpu.get('physical_cores', 'N/A')} cores, {cpu.get('usage_percent', 'N/A')}% usage")
            
            # Memory Info
            memory = hardware.get('memory', {})
            if memory:
                total_gb = round(memory.get('total', 0) / (1024**3), 2)
                used_percent = memory.get('percentage', 0)
                print(f"     - Memory: {total_gb}GB total, {used_percent}% used")
            
            # System Info (Manufacturer/Model)
            system = hardware.get('system', {})
            if system:
                manufacturer = system.get('manufacturer', 'N/A')
                model = system.get('model', 'N/A')
                print(f"     - System: {manufacturer} {model}")
        else:
            print("   ❌ Hardware Info: Missing")
        
        # Network Info
        network = raw_data.get('network', {})
        if network:
            interfaces = network.get('interfaces', [])
            public_ip = network.get('public_ip', 'N/A')
            location = network.get('location', 'N/A')
            print(f"   ✓ Network Info: {len(interfaces)} interfaces")
            print(f"     - Public IP: {public_ip}")
            print(f"     - Location: {location}")
            
            # Check for specific interface types
            interface_types = {}
            for interface in interfaces:
                itype = interface.get('type', 'Unknown')
                interface_types[itype] = interface_types.get(itype, 0) + 1
            
            for itype, count in interface_types.items():
                print(f"     - {itype}: {count} interface(s)")
        else:
            print("   ❌ Network Info: Missing")
        
        # Storage Info
        storage = raw_data.get('storage', {})
        if storage:
            disks = storage.get('disks', [])
            print(f"   ✓ Storage Info: {len(disks)} disk(s)")
            for disk in disks[:3]:  # Show first 3 disks
                device = disk.get('device', 'N/A')
                total_gb = round(disk.get('total', 0) / (1024**3), 2)
                used_percent = disk.get('percent', 0)
                print(f"     - {device}: {total_gb}GB, {used_percent}% used")
        else:
            print("   ❌ Storage Info: Missing")
        
        # Security Info
        security = raw_data.get('security', {})
        if security:
            print(f"   ✓ Security Info: Available")
            firewall = security.get('firewall_status', 'N/A')
            antivirus = security.get('antivirus_status', 'N/A')
            print(f"     - Firewall: {firewall}")
            print(f"     - Antivirus: {antivirus}")
        else:
            print("   ❌ Security Info: Missing")
        
        # Software Info
        software = raw_data.get('software', [])
        if software:
            print(f"   ✓ Software Info: {len(software)} installed programs")
        else:
            print("   ❌ Software Info: Missing")
        
        # USB Devices
        usb_devices = raw_data.get('usb_devices', [])
        if usb_devices:
            print(f"   ✓ USB Devices: {len(usb_devices)} device(s)")
        else:
            print("   ✓ USB Devices: None detected (normal)")
        
        # Windows Updates
        windows_updates = raw_data.get('windows_updates')
        if windows_updates:
            available = len(windows_updates.get('available_updates', []))
            installed = len(windows_updates.get('installed_updates', []))
            print(f"   ✓ Windows Updates: {available} available, {installed} installed")
        else:
            print("   ❌ Windows Updates: Missing")
        
        # Network Scan
        network_scan = raw_data.get('network_scan', {})
        if network_scan and not network_scan.get('error'):
            discovered = network_scan.get('total_devices_found', 0)
            scan_time = network_scan.get('scan_duration_seconds', 0)
            print(f"   ✓ Network Scan: {discovered} devices found in {scan_time:.1f}s")
        else:
            print("   ❌ Network Scan: Failed or missing")
        
        # Processes
        processes = raw_data.get('processes', [])
        if processes:
            print(f"   ✓ Process Info: {len(processes)} top processes")
        else:
            print("   ❌ Process Info: Missing")
        
    else:
        print("\n3. System Information: ❌ No raw data available")
    
    # Overall assessment
    print("\n" + "=" * 60)
    
    required_sections = ['os_info', 'hardware', 'network', 'storage', 'security']
    present_sections = [section for section in required_sections if raw_data.get(section)]
    
    completeness = len(present_sections) / len(required_sections) * 100
    
    print(f"Data Completeness: {completeness:.1f}% ({len(present_sections)}/{len(required_sections)} sections)")
    
    if completeness >= 80:
        print("✅ EXCELLENT: Agent is collecting comprehensive data")
    elif completeness >= 60:
        print("✅ GOOD: Agent is collecting most required data")
    elif completeness >= 40:
        print("⚠️  PARTIAL: Agent is collecting some data but missing key sections")
    else:
        print("❌ POOR: Agent data collection needs attention")
    
    # Recommendations
    if completeness < 100:
        print("\nRecommendations:")
        missing_sections = [section for section in required_sections if not raw_data.get(section)]
        for section in missing_sections:
            print(f"  - Check {section} collection in the agent")
        
        if not latest_report:
            print("  - Verify agent is sending regular reports")
        
        print("  - Check agent logs for any collection errors")
        print("  - Ensure agent has proper Windows permissions")

def main():
    print("ITSM Windows Agent Data Verification")
    print("====================================")
    print()
    
    test_windows_agent_data()
    
    print()
    print("Test complete!")

if __name__ == '__main__':
    main()
