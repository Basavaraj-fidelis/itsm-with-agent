
"""
WebSocket Agent Client for ITSM
Connects to the server and handles remote commands including AD sync
"""

import asyncio
import websockets
import json
import logging
import signal
import sys
from system_collector import SystemCollector
import uuid
import time
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ITSMAgent:
    def __init__(self, server_url, agent_id=None):
        self.server_url = server_url
        self.agent_id = agent_id or f"agent_{uuid.uuid4().hex[:8]}"
        self.websocket = None
        self.system_collector = SystemCollector()
        self.running = True
        self.capabilities = ['systemInfo', 'adSync', 'remoteCommand']
        
    async def connect(self):
        """Connect to the ITSM server via WebSocket"""
        try:
            capabilities_str = ','.join(self.capabilities)
            uri = f"{self.server_url}/api/agents/agent-tunnel/{self.agent_id}?capabilities={capabilities_str}"
            
            logger.info(f"Connecting to {uri}")
            self.websocket = await websockets.connect(uri)
            logger.info(f"Agent {self.agent_id} connected successfully")
            
            # Start ping task
            asyncio.create_task(self.ping_loop())
            
            # Listen for messages
            await self.listen_for_messages()
            
        except Exception as e:
            logger.error(f"Connection error: {e}")
            await asyncio.sleep(5)  # Wait before retry
            
    async def ping_loop(self):
        """Send periodic ping messages"""
        while self.running and self.websocket:
            try:
                await self.websocket.send(json.dumps({
                    'type': 'ping',
                    'timestamp': datetime.utcnow().isoformat()
                }))
                await asyncio.sleep(30)  # Ping every 30 seconds
            except Exception as e:
                logger.error(f"Ping error: {e}")
                break
                
    async def listen_for_messages(self):
        """Listen for incoming messages from server"""
        try:
            async for message in self.websocket:
                try:
                    data = json.loads(message)
                    await self.handle_message(data)
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON received: {e}")
                except Exception as e:
                    logger.error(f"Error handling message: {e}")
        except websockets.exceptions.ConnectionClosed:
            logger.info("Connection closed by server")
        except Exception as e:
            logger.error(f"Listen error: {e}")
            
    async def handle_message(self, data):
        """Handle incoming messages"""
        message_type = data.get('type')
        
        if message_type == 'pong':
            logger.debug("Received pong")
            
        elif message_type == 'command':
            await self.handle_command(data)
            
        else:
            logger.warning(f"Unknown message type: {message_type}")
            
    async def handle_command(self, data):
        """Handle remote commands"""
        request_id = data.get('requestId')
        command = data.get('command')
        params = data.get('params', {})
        
        logger.info(f"Executing command: {command}")
        
        try:
            if command == 'syncAD':
                result = self.sync_active_directory(params.get('config', {}))
            elif command == 'testADConnection':
                result = self.test_ad_connection(params)
            elif command == 'getADStatus':
                result = self.get_ad_status()
            elif command == 'collectSystemInfo':
                result = self.system_collector.collect_all()
            else:
                result = {'success': False, 'error': f'Unknown command: {command}'}
                
            # Send response back to server
            await self.websocket.send(json.dumps({
                'type': 'commandResponse',
                'requestId': request_id,
                'success': result.get('success', True),
                'data': result,
                'error': result.get('error') if not result.get('success', True) else None
            }))
            
        except Exception as e:
            logger.error(f"Command execution error: {e}")
            await self.websocket.send(json.dumps({
                'type': 'commandResponse',
                'requestId': request_id,
                'success': False,
                'error': str(e)
            }))
            
    def sync_active_directory(self, config):
        """Sync with Active Directory"""
        try:
            return self.system_collector.sync_active_directory(config)
        except Exception as e:
            logger.error(f"AD sync error: {e}")
            return {'success': False, 'error': str(e)}
            
    def test_ad_connection(self, config):
        """Test AD connection"""
        try:
            return self.system_collector.test_ad_connection(config)
        except Exception as e:
            logger.error(f"AD test error: {e}")
            return {'success': False, 'error': str(e)}
            
    def get_ad_status(self):
        """Get AD sync status"""
        return {
            'success': True,
            'status': 'ready',
            'capabilities': self.capabilities,
            'agent_id': self.agent_id
        }
        
    async def start(self):
        """Start the agent"""
        logger.info(f"Starting ITSM Agent {self.agent_id}")
        
        while self.running:
            try:
                await self.connect()
            except KeyboardInterrupt:
                logger.info("Agent stopped by user")
                break
            except Exception as e:
                logger.error(f"Agent error: {e}")
                await asyncio.sleep(10)  # Wait before reconnecting
                
    def stop(self):
        """Stop the agent"""
        self.running = False
        if self.websocket:
            asyncio.create_task(self.websocket.close())

async def main():
    # Server URL - change this to match your server
    server_url = "ws://185cd56e-141e-46ea-a8f3-24bb7937b01f-00-2fb1xx64qyx23.pike.replit.dev"
    
    agent = ITSMAgent(server_url)
    
    # Handle shutdown gracefully
    def signal_handler(signum, frame):
        logger.info("Received shutdown signal")
        agent.stop()
        
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    await agent.start()

if __name__ == "__main__":
    asyncio.run(main())
