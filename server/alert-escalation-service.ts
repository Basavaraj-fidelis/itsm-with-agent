
export class AlertEscalationService {
  private escalationRules = new Map<string, { timeMinutes: number; action: string }>([
    ['critical', { timeMinutes: 15, action: 'create_ticket' }],
    ['high', { timeMinutes: 60, action: 'notify_manager' }],
    ['warning', { timeMinutes: 240, action: 'log_escalation' }]
  ]);

  async checkEscalations() {
    try {
      const { pool } = await import('./db');
      
      // Get unacknowledged critical alerts older than 15 minutes
      const criticalAlerts = await pool.query(`
        SELECT a.*, d.hostname 
        FROM alerts a 
        JOIN devices d ON a.device_id = d.id 
        WHERE a.severity = 'critical' 
        AND a.is_active = true 
        AND a.triggered_at < NOW() - INTERVAL '15 minutes'
        AND (a.metadata->>'escalated' IS NULL OR a.metadata->>'escalated' = 'false')
      `);

      for (const alert of criticalAlerts.rows) {
        await this.escalateAlert(alert);
      }
    } catch (error) {
      console.error('Error checking alert escalations:', error);
    }
  }

  private async escalateAlert(alert: any) {
    try {
      const { pool } = await import('./db');
      
      // Create incident ticket for critical alert
      const ticketResult = await pool.query(`
        INSERT INTO tickets (
          ticket_number, title, description, type, priority, status,
          category, requester_email, created_at, updated_at
        ) VALUES (
          'AL-' || EXTRACT(EPOCH FROM NOW())::INT,
          'CRITICAL ALERT: ' || $1,
          'Auto-escalated from system alert on ' || $2 || E'\n\nAlert Details:\n' || $3,
          'incident',
          'critical',
          'open',
          'System Alert',
          'system@alerts.local',
          NOW(),
          NOW()
        ) RETURNING id
      `, [alert.message, alert.hostname, JSON.stringify(alert.metadata, null, 2)]);

      // Mark alert as escalated
      await pool.query(`
        UPDATE alerts 
        SET metadata = jsonb_set(
          COALESCE(metadata, '{}'),
          '{escalated}',
          'true'
        ),
        metadata = jsonb_set(
          metadata,
          '{escalated_at}',
          to_jsonb(NOW())
        ),
        metadata = jsonb_set(
          metadata,
          '{ticket_id}',
          to_jsonb($1)
        )
        WHERE id = $2
      `, [ticketResult.rows[0].id, alert.id]);

      console.log(`Escalated critical alert ${alert.id} to ticket ${ticketResult.rows[0].id}`);
    } catch (error) {
      console.error('Error escalating alert:', error);
    }
  }
}

export const alertEscalationService = new AlertEscalationService();
