
#!/usr/bin/env python3
"""
Test script to run ITSM agent locally in Replit
"""

import os
import sys
import time
import signal
import subprocess
import threading
from pathlib import Path

# Add Agent directory to Python path
agent_dir = Path(__file__).parent / "Agent"
sys.path.insert(0, str(agent_dir))

def check_server_running():
    """Check if the API server is running"""
    try:
        import requests
        response = requests.get("http://0.0.0.0:5000/api/health", timeout=5)
        return response.status_code == 200
    except:
        return False

def start_agent():
    """Start the agent in test mode"""
    print("🚀 Starting ITSM Agent locally...")
    
    # Check if server is running
    if not check_server_running():
        print("❌ API server is not running on port 5000")
        print("Please make sure the dev server is running")
        return False
    
    print("✅ API server is accessible")
    
    # Change to agent directory
    os.chdir(agent_dir)
    
    try:
        # Import and run agent
        from itsm_agent import ITSMAgent
        
        # Create agent with local config
        agent = ITSMAgent('config_local.ini')
        
        print("✅ Agent initialized successfully")
        print("📊 Starting data collection...")
        print("Press Ctrl+C to stop the agent")
        
        # Start the agent
        agent.start()
        
    except KeyboardInterrupt:
        print("\n🛑 Stopping agent...")
        if 'agent' in locals():
            agent.stop()
        print("✅ Agent stopped")
    except Exception as e:
        print(f"❌ Error running agent: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

def main():
    print("ITSM Agent Local Test")
    print("===================")
    print()
    
    start_agent()

if __name__ == '__main__':
    main()
