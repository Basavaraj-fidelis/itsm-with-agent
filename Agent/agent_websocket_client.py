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
        self.capabilities = ['systemInfo', 'adSync', 'remoteCommand', 'autonomousNetworkScan']

        # Load autonomous scanning config
        self.load_autonomous_config()

        self.last_scan_time = 0

    def load_autonomous_config(self):
        """Load autonomous scanning configuration"""
        try:
            from configparser import ConfigParser
            config = ConfigParser()
            config.read('config.ini')

            self.auto_scan_enabled = config.getboolean('autonomous_scanning', 'enabled', fallback=True)
            self.scan_interval = config.getint('autonomous_scanning', 'scan_interval', fallback=300)
            self.scan_type = config.get('autonomous_scanning', 'scan_type', fallback='ping')

            logger.info(f"🔧 Autonomous scanning config: enabled={self.auto_scan_enabled}, interval={self.scan_interval}s")
        except Exception as e:
            logger.warning(f"Could not load autonomous config, using defaults: {e}")
            self.auto_scan_enabled = True
            self.scan_interval = 300
            self.scan_type = 'ping'

    async def connect(self):
        """Connect to the ITSM server via WebSocket"""
        try:
            # Convert HTTP URL to WebSocket URL
            if self.server_url.startswith('https://'):
                ws_url = self.server_url.replace('https://', 'wss://') + '/ws'
            elif self.server_url.startswith('http://'):
                ws_url = self.server_url.replace('http://', 'ws://') + '/ws'
            else:
                ws_url = f"ws://{self.server_url}/ws"

            logger.info(f"🔗 Attempting to connect to {ws_url}")
            logger.info(f"📋 Agent ID: {self.agent_id}")
            logger.info(f"🛠️ Capabilities: {self.capabilities}")

            # Add connection timeout and extra headers
            self.websocket = await websockets.connect(
                ws_url,
                timeout=30,
                ping_interval=30,
                ping_timeout=10,
                extra_headers={
                    'User-Agent': f'ITSM-Agent/{self.agent_id}',
                    'X-Agent-Version': '1.0.0'
                }
            )
            logger.info(f"✅ WebSocket connection established for Agent {self.agent_id}")

            # Send agent identification immediately after connection
            connect_message = {
                'type': 'agent-connect',
                'agentId': self.agent_id,
                'capabilities': self.capabilities,
                'timestamp': datetime.utcnow().isoformat(),
                'status': 'online',
                'version': '1.0.0'
            }

            await self.websocket.send(json.dumps(connect_message))
            logger.info(f"📤 Sent agent registration: {connect_message}")

            # Wait for connection confirmation
            try:
                response = await asyncio.wait_for(self.websocket.recv(), timeout=10.0)
                response_data = json.loads(response)
                if response_data.get('type') == 'connection-confirmed':
                    logger.info(f"✅ Connection confirmed by server: {response_data.get('message', '')}")
                else:
                    logger.warning(f"⚠️ Unexpected response: {response_data}")
            except asyncio.TimeoutError:
                logger.warning("⏰ No connection confirmation received within 10 seconds")
            except Exception as e:
                logger.warning(f"⚠️ Error waiting for confirmation: {e}")

            # Start ping task
            ping_task = asyncio.create_task(self.ping_loop())
            logger.info("💓 Started ping loop task")

            # Listen for messages
            await self.listen_for_messages()

        except websockets.exceptions.ConnectionClosed as e:
            logger.error(f"🔌 Connection closed: {e}")
            await asyncio.sleep(5)
        except websockets.exceptions.InvalidURI as e:
            logger.error(f"🌐 Invalid WebSocket URI: {e}")
            await asyncio.sleep(10)
        except Exception as e:
            logger.error(f"❌ Connection error: {e}")
            await asyncio.sleep(5)

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

        elif message_type == 'connection-confirmed':
            logger.info(f"Connection confirmed by server for agent: {data.get('agentId')}")

        elif message_type == 'command':
            logger.info(f"Received command: {data.get('command')} with requestId: {data.get('requestId')}")
            await self.handle_command(data)

        else:
            logger.warning(f"Unknown message type: {message_type}, data: {data}")

    async def handle_command(self, data):
        """Handle remote commands"""
        request_id = data.get('requestId')
        command = data.get('command')
        params = data.get('params', {})

        logger.info(f"Executing command: {command} with params: {params}")

        try:
            if command == 'syncAD':
                result = self.sync_active_directory(params.get('config', {}))
            elif command == 'testADConnection':
                result = self.test_ad_connection(params)
            elif command == 'getADStatus':
                result = self.get_ad_status()
            elif command == 'collectSystemInfo':
                result = self.system_collector.collect_all()
            elif command == 'networkScan':
                result = self.perform_network_scan(params)
            else:
                result = {'success': False, 'error': f'Unknown command: {command}'}

            # Send response back to server
            await self.websocket.send(json.dumps({
                'type': 'command-response',
                'requestId': request_id,
                'payload': {
                    'success': result.get('success', True),
                    'data': result,
                    'error': result.get('error') if not result.get('success', True) else None
                }
            }))

        except Exception as e:
            logger.error(f"Command execution error: {e}")
            await self.websocket.send(json.dumps({
                'type': 'command-response',
                'requestId': request_id,
                'payload': {
                    'success': False,
                    'error': str(e)
                }
            }))

    def perform_network_scan(self, params):
        """Perform network scan on the specified subnet"""
        try:
            subnet = params.get('subnet')
            scan_type = params.get('scan_type', 'ping')
            session_id = params.get('session_id')

            logger.info(f"Starting network scan for subnet: {subnet}, type: {scan_type}, session: {session_id}")

            # Use the enhanced network scan method
            scan_result = self.system_collector.collect_network_scan(subnet=subnet, scan_type=scan_type)

            if 'error' in scan_result:
                logger.error(f"Network scan failed: {scan_result['error']}")
                return {'success': False, 'error': scan_result['error']}

            logger.info(f"Network scan completed. Found {scan_result.get('total_devices_found', 0)} devices")

            # Get local system info for the agent itself
            try:
                system_info = self.system_collector.collect_all()
                local_mac = None
                if 'network' in system_info and 'interfaces' in system_info['network']:
                    for iface in system_info['network']['interfaces']:
                        if iface.get('mac_address') and iface.get('ip_address') and not iface['ip_address'].startswith('127.'):
                            local_mac = iface['mac_address']
                            break
            except Exception as e:
                logger.warning(f"Could not get local system info: {e}")
                local_mac = "Unknown"

            return {
                'success': True,
                'subnet': subnet,
                'scan_type': scan_type,
                'session_id': session_id,
                'local_mac': local_mac,
                **scan_result  # Include all scan results
            }

        except Exception as e:
            logger.error(f"Network scan error: {e}")
            return {'success': False, 'error': str(e)}

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

    async def autonomous_network_scan(self):
        """Perform autonomous network scan and report to server"""
        try:
            if not self.auto_scan_enabled:
                return

            current_time = time.time()
            if current_time - self.last_scan_time < self.scan_interval:
                return

            logger.info("🔍 Starting autonomous network scan...")
            self.last_scan_time = current_time

            # Get local network info to determine subnet
            system_info = self.system_collector.collect_all()
            local_subnet = None
            local_ip = None

            if 'network' in system_info and 'interfaces' in system_info['network']:
                for iface in system_info['network']['interfaces']:
                    ip = iface.get('ip_address', '')
                    if ip and not ip.startswith('127.') and not ip.startswith('169.254'):
                        local_ip = ip
                        # Calculate subnet (assuming /24)
                        ip_parts = ip.split('.')
                        if len(ip_parts) == 4:
                            local_subnet = f"{ip_parts[0]}.{ip_parts[1]}.{ip_parts[2]}.1/24"
                        break

            if not local_subnet:
                logger.warning("Could not determine local subnet for autonomous scan")
                return

            logger.info(f"📡 Scanning local subnet: {local_subnet} from IP: {local_ip}")

            # Perform network scan
            scan_result = self.perform_network_scan({
                'subnet': local_subnet,
                'scan_type': 'ping',
                'session_id': f"auto_scan_{int(current_time)}",
                'autonomous': True
            })

            if scan_result.get('success'):
                # Send scan results to server
                if self.websocket and self.websocket.open:
                    report_message = {
                        'type': 'autonomous-scan-report',
                        'agentId': self.agent_id,
                        'timestamp': datetime.utcnow().isoformat(),
                        'scan_data': scan_result
                    }

                    await self.websocket.send(json.dumps(report_message))
                    logger.info(f"📤 Sent autonomous scan report to server - found {scan_result.get('total_devices_found', 0)} devices")
                else:
                    logger.warning("WebSocket not connected - cannot send scan report")
            else:
                logger.error(f"Autonomous network scan failed: {scan_result.get('error')}")

        except Exception as e:
            logger.error(f"Error in autonomous network scan: {e}")

    async def scan_loop(self):
        """Autonomous scan loop"""
        while self.running:
            try:
                await self.autonomous_network_scan()
                await asyncio.sleep(60)  # Check every minute
            except Exception as e:
                logger.error(f"Scan loop error: {e}")
                await asyncio.sleep(60)

    async def start(self):
        """Start the agent"""
        logger.info(f"Starting ITSM Agent {self.agent_id}")
        logger.info(f"🤖 Autonomous network scanning: {'Enabled' if self.auto_scan_enabled else 'Disabled'}")

        # Start scan loop
        if self.auto_scan_enabled:
            scan_task = asyncio.create_task(self.scan_loop())

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
    # Load server URL from config.ini
    try:
        from configparser import ConfigParser
        config = ConfigParser()
        config.read('config.ini')
        server_url = config.get('api', 'base_url', fallback="http://0.0.0.0:5000")
        logger.info(f"Loaded server URL from config: {server_url}")
    except Exception as e:
        logger.warning(f"Could not load server URL from config, using default: {e}")
        server_url = "http://0.0.0.0:5000"

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