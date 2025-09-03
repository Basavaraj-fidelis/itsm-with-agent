
#!/usr/bin/env python3
"""
Test WebSocket connectivity to the ITSM server
"""

import asyncio
import websockets
import json
import sys
import requests
from datetime import datetime

SERVER_URL = "http://0.0.0.0:5000"
WS_URL = "ws://0.0.0.0:5000/ws"

async def test_websocket_connection():
    """Test direct WebSocket connection"""
    print("🔗 Testing WebSocket connection...")
    print(f"   URL: {WS_URL}")
    
    try:
        # Test WebSocket connection
        async with websockets.connect(WS_URL, timeout=10) as websocket:
            print("✅ WebSocket connection successful!")
            
            # Send test message
            test_message = {
                'type': 'agent-connect',
                'agentId': 'test-agent-connectivity',
                'capabilities': ['test'],
                'timestamp': datetime.utcnow().isoformat(),
                'status': 'online'
            }
            
            await websocket.send(json.dumps(test_message))
            print("📤 Sent test agent-connect message")
            
            # Wait for response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                response_data = json.loads(response)
                print(f"📨 Received response: {response_data}")
                
                if response_data.get('type') == 'connection-confirmed':
                    print("✅ Connection confirmed by server!")
                    return True
                else:
                    print(f"⚠️ Unexpected response type: {response_data.get('type')}")
                    
            except asyncio.TimeoutError:
                print("⏰ No response received within 5 seconds")
                
    except websockets.exceptions.ConnectionClosed as e:
        print(f"🔌 Connection closed: {e}")
        return False
    except websockets.exceptions.InvalidURI as e:
        print(f"🌐 Invalid WebSocket URI: {e}")
        return False
    except Exception as e:
        print(f"❌ WebSocket connection failed: {e}")
        return False
    
    return False

def test_websocket_status_endpoint():
    """Test the WebSocket status endpoint"""
    print("\n🔍 Testing WebSocket status endpoint...")
    
    try:
        response = requests.get(f"{SERVER_URL}/api/network-scan/websocket-status", timeout=10)
        
        if response.status_code == 200:
            status = response.json()
            print("✅ WebSocket status endpoint accessible!")
            print(f"   Connected agents: {status.get('totalConnections', 0)}")
            print(f"   Server info: {status.get('server_info', {})}")
            
            if status.get('connectionDetails'):
                print("   Agent details:")
                for agent in status['connectionDetails']:
                    print(f"     - {agent.get('agentId')}: alive={agent.get('isAlive')}")
            
            return True
        else:
            print(f"❌ Status endpoint returned {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server - is it running?")
        return False
    except Exception as e:
        print(f"❌ Error testing status endpoint: {e}")
        return False

def test_server_health():
    """Test if the server is running"""
    print("🏥 Testing server health...")
    
    try:
        response = requests.get(f"{SERVER_URL}/api/health", timeout=5)
        if response.status_code == 200:
            print("✅ Server is running!")
            return True
    except:
        pass
    
    try:
        response = requests.get(f"{SERVER_URL}/", timeout=5)
        if response.status_code in [200, 401, 403]:  # Any valid HTTP response
            print("✅ Server is accessible!")
            return True
    except Exception as e:
        print(f"❌ Server is not accessible: {e}")
        return False

async def main():
    print("ITSM WebSocket Connectivity Test")
    print("=" * 50)
    
    # Test 1: Server health
    if not test_server_health():
        print("\n❌ Server is not running. Please start the server first.")
        return False
    
    # Test 2: WebSocket status endpoint
    status_ok = test_websocket_status_endpoint()
    
    # Test 3: Direct WebSocket connection
    ws_ok = await test_websocket_connection()
    
    print("\n" + "=" * 50)
    print("CONNECTIVITY TEST RESULTS:")
    print(f"  Server Health: {'✅ PASS' if True else '❌ FAIL'}")
    print(f"  Status Endpoint: {'✅ PASS' if status_ok else '❌ FAIL'}")
    print(f"  WebSocket Connection: {'✅ PASS' if ws_ok else '❌ FAIL'}")
    
    if ws_ok and status_ok:
        print("\n🎉 All tests passed! WebSocket connectivity is working.")
        return True
    else:
        print("\n⚠️ Some tests failed. Check the logs above for details.")
        return False

if __name__ == "__main__":
    try:
        result = asyncio.run(main())
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n🛑 Test interrupted by user")
        sys.exit(1)
