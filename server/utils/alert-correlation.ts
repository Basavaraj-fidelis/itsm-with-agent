
import { db } from '../db';
import { systemAlerts } from '@shared/schema';
import { eq, and, gte, desc } from 'drizzle-orm';

export interface AlertCorrelation {
  id: string;
  correlatedAlerts: string[];
  rootCause?: string;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  affectedServices: string[];
  correlationScore: number;
}

export class AlertCorrelationEngine {
  private static readonly CORRELATION_WINDOW = 15 * 60 * 1000; // 15 minutes
  private static readonly MIN_CORRELATION_SCORE = 0.7;

  /**
   * Find correlated alerts based on time, device proximity, and alert patterns
   */
  static async findCorrelatedAlerts(newAlert: any): Promise<AlertCorrelation | null> {
    try {
      const windowStart = new Date(Date.now() - this.CORRELATION_WINDOW);
      
      // Find recent alerts from the same device and nearby timeframe
      const recentAlerts = await db
        .select()
        .from(systemAlerts)
        .where(
          and(
            eq(systemAlerts.device_id, newAlert.device_id),
            gte(systemAlerts.created_at, windowStart),
            eq(systemAlerts.is_active, true)
          )
        )
        .orderBy(desc(systemAlerts.created_at));

      if (recentAlerts.length < 2) {
        return null; // Need at least 2 alerts for correlation
      }

      const correlationScore = this.calculateCorrelationScore(newAlert, recentAlerts);
      
      if (correlationScore < this.MIN_CORRELATION_SCORE) {
        return null;
      }

      const impactLevel = this.determineImpactLevel(recentAlerts);
      const affectedServices = this.identifyAffectedServices(recentAlerts);
      const rootCause = this.identifyRootCause(recentAlerts);

      return {
        id: `corr_${Date.now()}`,
        correlatedAlerts: recentAlerts.map(a => a.id),
        rootCause,
        impactLevel,
        affectedServices,
        correlationScore
      };

    } catch (error) {
      console.error('Error in alert correlation:', error);
      return null;
    }
  }

  /**
   * Calculate correlation score based on alert patterns
   */
  private static calculateCorrelationScore(newAlert: any, existingAlerts: any[]): number {
    let score = 0;

    // Time proximity score (closer alerts get higher score)
    const timeScores = existingAlerts.map(alert => {
      const timeDiff = Math.abs(new Date(newAlert.timestamp).getTime() - new Date(alert.created_at).getTime());
      return Math.max(0, 1 - (timeDiff / this.CORRELATION_WINDOW));
    });
    score += timeScores.reduce((sum, s) => sum + s, 0) / existingAlerts.length * 0.4;

    // Severity pattern score
    const severityLevels = ['info', 'warning', 'high', 'critical'];
    const newSeverityIndex = severityLevels.indexOf(newAlert.severity);
    const avgSeverityIndex = existingAlerts.reduce((sum, alert) => 
      sum + severityLevels.indexOf(alert.severity), 0) / existingAlerts.length;
    
    if (Math.abs(newSeverityIndex - avgSeverityIndex) <= 1) {
      score += 0.3;
    }

    // Category correlation score
    const categoryMatches = existingAlerts.filter(alert => alert.category === newAlert.type).length;
    score += (categoryMatches / existingAlerts.length) * 0.3;

    return Math.min(score, 1.0);
  }

  /**
   * Determine overall impact level
   */
  private static determineImpactLevel(alerts: any[]): 'low' | 'medium' | 'high' | 'critical' {
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const highCount = alerts.filter(a => a.severity === 'high').length;
    
    if (criticalCount > 2 || (criticalCount > 0 && alerts.length > 5)) {
      return 'critical';
    }
    if (highCount > 3 || criticalCount > 0) {
      return 'high';
    }
    if (alerts.length > 3) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Identify affected services based on alert metadata
   */
  private static identifyAffectedServices(alerts: any[]): string[] {
    const services = new Set<string>();
    
    alerts.forEach(alert => {
      if (alert.metadata?.service) {
        services.add(alert.metadata.service);
      }
      // Infer services from alert categories
      if (alert.category === 'performance') {
        services.add('System Performance');
      }
      if (alert.category === 'security') {
        services.add('Security');
      }
      if (alert.category === 'connectivity') {
        services.add('Network Connectivity');
      }
    });

    return Array.from(services);
  }

  /**
   * Attempt to identify root cause from alert patterns
   */
  private static identifyRootCause(alerts: any[]): string | undefined {
    const categories = alerts.map(a => a.category);
    const messages = alerts.map(a => a.message.toLowerCase());

    // Check for common patterns
    if (categories.includes('connectivity') && categories.includes('performance')) {
      return 'Network connectivity issues causing performance degradation';
    }
    
    if (messages.some(m => m.includes('cpu')) && messages.some(m => m.includes('memory'))) {
      return 'System resource exhaustion - high CPU and memory usage';
    }
    
    if (messages.some(m => m.includes('disk')) && messages.some(m => m.includes('space'))) {
      return 'Storage capacity issues';
    }

    return undefined;
  }

  /**
   * Suppress duplicate alerts based on correlation
   */
  static async suppressDuplicateAlerts(correlatedAlerts: string[]): Promise<void> {
    try {
      if (correlatedAlerts.length < 2) return;

      // Keep the first alert active, suppress others
      const alertsToSuppress = correlatedAlerts.slice(1);
      
      await db
        .update(systemAlerts)
        .set({
          is_active: false,
          metadata: db.raw(`metadata || '{"suppressed": true, "suppression_reason": "correlated_duplicate"}'::jsonb`),
          updated_at: new Date()
        })
        .where(
          and(
            systemAlerts.id.in(alertsToSuppress),
            eq(systemAlerts.is_active, true)
          )
        );

      console.log(`Suppressed ${alertsToSuppress.length} duplicate correlated alerts`);
    } catch (error) {
      console.error('Error suppressing duplicate alerts:', error);
    }
  }
}
