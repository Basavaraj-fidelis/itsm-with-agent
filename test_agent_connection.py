
#!/usr/bin/env python3
"""
Test script to verify agent WebSocket connectivity
Run this to check if the agent can connect to the server
"""

import asyncio
import sys
import os

# Add the Agent directory to the path
agent_dir = os.path.join(os.path.dirname(__file__), 'Agent')
sys.path.insert(0, agent_dir)

from agent_websocket_client import ITSMAgent

async def test_agent_connection():
    """Test agent connection to the server"""
    server_url = "http://0.0.0.0:5000"
    
    print(f"Testing agent connection to {server_url}")
    print("=" * 50)
    
    agent = ITSMAgent(server_url, agent_id="test-agent-123")
    
    try:
        # Try to connect (this will run indefinitely if successful)
        print("Starting agent connection test...")
        await agent.connect()
    except KeyboardInterrupt:
        print("\nAgent connection test stopped by user")
        agent.stop()
    except Exception as e:
        print(f"Agent connection test failed: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("ITSM Agent Connection Test")
    print("Press Ctrl+C to stop the test")
    print("")
    
    try:
        asyncio.run(test_agent_connection())
    except KeyboardInterrupt:
        print("\nTest stopped by user")
