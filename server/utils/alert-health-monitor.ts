
import { db } from '../db';
import { systemAlerts } from '@shared/schema';
import { eq, gte, count } from 'drizzle-orm';

export interface AlertSystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  metrics: {
    alertsProcessedLastHour: number;
    alertsCreatedLastHour: number;
    averageProcessingTime: number;
    errorRate: number;
    activeAlertsCount: number;
  };
  recommendations: string[];
}

export class AlertHealthMonitor {
  private static performanceMetrics = {
    processingTimes: [] as number[],
    errors: [] as { timestamp: number; error: string }[],
    lastCleanup: Date.now()
  };

  /**
   * Record processing time for performance monitoring
   */
  static recordProcessingTime(processingTime: number): void {
    this.performanceMetrics.processingTimes.push(processingTime);
    
    // Keep only last 1000 records
    if (this.performanceMetrics.processingTimes.length > 1000) {
      this.performanceMetrics.processingTimes = this.performanceMetrics.processingTimes.slice(-1000);
    }
  }

  /**
   * Record error for monitoring
   */
  static recordError(error: string): void {
    this.performanceMetrics.errors.push({
      timestamp: Date.now(),
      error
    });

    // Clean old errors (older than 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.performanceMetrics.errors = this.performanceMetrics.errors.filter(e => e.timestamp > oneDayAgo);
  }

  /**
   * Get current system health status
   */
  static async getSystemHealth(): Promise<AlertSystemHealth> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      // Get metrics from database
      const [alertsLastHour] = await db
        .select({ count: count() })
        .from(systemAlerts)
        .where(gte(systemAlerts.created_at, oneHourAgo));

      const [activeAlerts] = await db
        .select({ count: count() })
        .from(systemAlerts)
        .where(eq(systemAlerts.is_active, true));

      const averageProcessingTime = this.performanceMetrics.processingTimes.length > 0
        ? this.performanceMetrics.processingTimes.reduce((sum, time) => sum + time, 0) / this.performanceMetrics.processingTimes.length
        : 0;

      const recentErrors = this.performanceMetrics.errors.filter(e => Date.now() - e.timestamp < 60 * 60 * 1000);
      const errorRate = recentErrors.length / Math.max(alertsLastHour.count, 1);

      const metrics = {
        alertsProcessedLastHour: alertsLastHour.count,
        alertsCreatedLastHour: alertsLastHour.count,
        averageProcessingTime,
        errorRate,
        activeAlertsCount: activeAlerts.count
      };

      const status = this.determineHealthStatus(metrics);
      const recommendations = this.generateRecommendations(metrics);

      return {
        status,
        metrics,
        recommendations
      };

    } catch (error) {
      console.error('Error getting alert system health:', error);
      return {
        status: 'critical',
        metrics: {
          alertsProcessedLastHour: 0,
          alertsCreatedLastHour: 0,
          averageProcessingTime: 0,
          errorRate: 1,
          activeAlertsCount: 0
        },
        recommendations: ['Alert system health check failed - manual investigation required']
      };
    }
  }

  /**
   * Determine overall health status
   */
  private static determineHealthStatus(metrics: AlertSystemHealth['metrics']): 'healthy' | 'degraded' | 'critical' {
    if (metrics.errorRate > 0.1 || metrics.averageProcessingTime > 5000 || metrics.activeAlertsCount > 1000) {
      return 'critical';
    }
    
    if (metrics.errorRate > 0.05 || metrics.averageProcessingTime > 2000 || metrics.activeAlertsCount > 500) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Generate recommendations based on metrics
   */
  private static generateRecommendations(metrics: AlertSystemHealth['metrics']): string[] {
    const recommendations: string[] = [];

    if (metrics.errorRate > 0.1) {
      recommendations.push('High error rate detected - investigate alert processing errors');
    }

    if (metrics.averageProcessingTime > 5000) {
      recommendations.push('Slow alert processing detected - consider optimizing database queries');
    }

    if (metrics.activeAlertsCount > 1000) {
      recommendations.push('High number of active alerts - review alert resolution processes');
    }

    if (metrics.alertsProcessedLastHour > 1000) {
      recommendations.push('High alert volume - consider implementing alert aggregation');
    }

    if (recommendations.length === 0) {
      recommendations.push('Alert system is operating normally');
    }

    return recommendations;
  }

  /**
   * Clean up old metrics and perform maintenance
   */
  static performMaintenance(): void {
    const now = Date.now();
    
    // Perform cleanup every hour
    if (now - this.performanceMetrics.lastCleanup > 60 * 60 * 1000) {
      // Clean old processing times (keep last 24 hours worth)
      this.performanceMetrics.processingTimes = this.performanceMetrics.processingTimes.slice(-1000);
      
      // Clean old errors
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      this.performanceMetrics.errors = this.performanceMetrics.errors.filter(e => e.timestamp > oneDayAgo);
      
      this.performanceMetrics.lastCleanup = now;
      console.log('Alert system maintenance completed');
    }
  }
}
