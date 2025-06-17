
import { aiService } from './ai-service';
import { storage } from './storage';

export interface AutomatedAction {
  id: string;
  device_id: string;
  insight_id: string;
  action_type: 'create_ticket' | 'send_alert' | 'run_script' | 'schedule_maintenance';
  action_data: any;
  executed_at: Date;
  status: 'pending' | 'completed' | 'failed';
}

class AIWorkflowIntegration {
  async processInsightForAutomation(deviceId: string, insight: any): Promise<AutomatedAction[]> {
    const actions: AutomatedAction[] = [];

    try {
      // Critical severity - auto-create tickets
      if (insight.severity === 'critical' || insight.severity === 'high') {
        const ticketAction = await this.createAutoTicket(deviceId, insight);
        if (ticketAction) actions.push(ticketAction);
      }

      // Security issues - immediate alerts
      if (insight.type === 'security') {
        const alertAction = await this.sendSecurityAlert(deviceId, insight);
        if (alertAction) actions.push(alertAction);
      }

      // Predictive maintenance
      if (insight.type === 'prediction' && insight.confidence > 0.8) {
        const maintenanceAction = await this.schedulePreventiveMaintenance(deviceId, insight);
        if (maintenanceAction) actions.push(maintenanceAction);
      }

      return actions;
    } catch (error) {
      console.error('Error in AI workflow integration:', error);
      return actions;
    }
  }

  private async createAutoTicket(deviceId: string, insight: any): Promise<AutomatedAction | null> {
    try {
      // Get device info
      const device = await storage.getDeviceById(deviceId);
      if (!device) return null;

      const ticketData = {
        title: `[AI Alert] ${insight.title} - ${device.name}`,
        description: `AI-generated ticket based on system analysis:\n\n${insight.description}\n\nRecommended Action: ${insight.recommendation}\n\nConfidence: ${(insight.confidence * 100).toFixed(0)}%`,
        priority: insight.severity === 'critical' ? 'urgent' : 'high',
        category: this.mapInsightTypeToCategory(insight.type),
        status: 'open',
        tags: ['ai-generated', insight.type, insight.severity],
        device_id: deviceId
      };

      // Create ticket via storage
      const ticket = await storage.createTicket(ticketData);

      return {
        id: `auto-ticket-${Date.now()}`,
        device_id: deviceId,
        insight_id: insight.id,
        action_type: 'create_ticket',
        action_data: { ticket_id: ticket.id, ticket_data: ticketData },
        executed_at: new Date(),
        status: 'completed'
      };
    } catch (error) {
      console.error('Error creating auto ticket:', error);
      return null;
    }
  }

  private async sendSecurityAlert(deviceId: string, insight: any): Promise<AutomatedAction | null> {
    try {
      const alertData = {
        type: 'security_breach',
        severity: insight.severity,
        device_id: deviceId,
        message: insight.description,
        recommendation: insight.recommendation,
        confidence: insight.confidence,
        timestamp: new Date()
      };

      // In a real implementation, this would integrate with notification systems
      console.log('SECURITY ALERT:', alertData);

      return {
        id: `security-alert-${Date.now()}`,
        device_id: deviceId,
        insight_id: insight.id,
        action_type: 'send_alert',
        action_data: alertData,
        executed_at: new Date(),
        status: 'completed'
      };
    } catch (error) {
      console.error('Error sending security alert:', error);
      return null;
    }
  }

  private async schedulePreventiveMaintenance(deviceId: string, insight: any): Promise<AutomatedAction | null> {
    try {
      const maintenanceData = {
        device_id: deviceId,
        maintenance_type: 'preventive',
        reason: insight.description,
        recommended_actions: insight.recommendation,
        scheduled_date: this.calculateMaintenanceDate(insight),
        priority: insight.severity
      };

      return {
        id: `maintenance-${Date.now()}`,
        device_id: deviceId,
        insight_id: insight.id,
        action_type: 'schedule_maintenance',
        action_data: maintenanceData,
        executed_at: new Date(),
        status: 'pending'
      };
    } catch (error) {
      console.error('Error scheduling maintenance:', error);
      return null;
    }
  }

  private mapInsightTypeToCategory(type: string): string {
    const mapping = {
      'performance': 'Hardware',
      'security': 'Security',
      'maintenance': 'Maintenance',
      'prediction': 'Preventive Maintenance',
      'optimization': 'System Optimization'
    };
    return mapping[type] || 'General';
  }

  private calculateMaintenanceDate(insight: any): Date {
    const now = new Date();
    const daysOffset = insight.severity === 'high' ? 1 : insight.severity === 'medium' ? 7 : 30;
    return new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000);
  }
}

export const aiWorkflowIntegration = new AIWorkflowIntegration();
