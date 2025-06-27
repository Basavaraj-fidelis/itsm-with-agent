import { Router } from "express";
import { agentTunnelService } from "./agent-tunnel-service";
import { adService } from "./ad-service";
import expressWs from 'express-ws';

const router = Router();

// Add WebSocket support to the router
const wsInstance = expressWs(router as any);

// WebSocket tunnel for agent communication
wsInstance.app.ws('/agent-tunnel/:agentId', (ws, req) => {
  const agentId = req.params.agentId;
  const capabilities = req.query.capabilities?.toString().split(',') || [];

  agentTunnelService.registerAgent(agentId, ws, capabilities);
});

// Trigger AD sync via agent
router.post('/agents/:id/sync-ad', async (req, res) => {
  try {
    const agentId = req.params.id;

    if (!agentTunnelService.isAgentConnected(agentId)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Agent not connected' 
      });
    }

    const adConfig = req.body.adConfig || {
      server: 'ldap://192.168.1.195:389',
      searchBase: 'CN=Users,DC=fidelisgroup,DC=local',
      bindDN: 'CN=test,CN=Users,DC=fidelisgroup,DC=local',
      bindPassword: 'Fidelis@123'
    };

    // Send AD sync command to agent
    const result = await agentTunnelService.executeRemoteCommand(agentId, 'syncAD', {
      config: adConfig,
      syncUsers: true,
      syncGroups: true
    });

    res.json({
      success: true,
      message: 'AD sync initiated via agent',
      data: result
    });

  } catch (error) {
    console.error('Agent AD sync error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to sync AD via agent'
    });
  }
});

// Get AD sync status from agent
router.get('/agents/:id/ad-status', async (req, res) => {
  try {
    const agentId = req.params.id;

    if (!agentTunnelService.isAgentConnected(agentId)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Agent not connected' 
      });
    }

    const status = await agentTunnelService.executeRemoteCommand(agentId, 'getADStatus');

    res.json({
      success: true,
      status
    });

  } catch (error) {
    console.error('Agent AD status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get AD status from agent'
    });
  }
});

// Test AD connection via agent
router.post('/agents/:id/test-ad', async (req, res) => {
  try {
    const agentId = req.params.id;

    if (!agentTunnelService.isAgentConnected(agentId)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Agent not connected' 
      });
    }

    const adConfig = req.body;
    const result = await agentTunnelService.executeRemoteCommand(agentId, 'testADConnection', adConfig);

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Agent AD test error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to test AD connection via agent'
    });
  }
});

// Execute remote command via agent
router.post('/agents/:id/remote-command', async (req, res) => {
  try {
    const agentId = req.params.id;
    const { command, params } = req.body;

    if (!agentTunnelService.isAgentConnected(agentId)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Agent not connected' 
      });
    }

    const result = await agentTunnelService.executeRemoteCommand(agentId, command, params);

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Remote command error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to execute remote command'
    });
  }
});

export { router as agentADSyncRoutes };