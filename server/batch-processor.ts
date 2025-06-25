
interface BatchProcessorConfig {
  batchSize: number;
  maxConcurrent: number;
  retryAttempts: number;
}

export class BatchProcessor {
  private config: BatchProcessorConfig;

  constructor(config: BatchProcessorConfig = {
    batchSize: 50,
    maxConcurrent: 5,
    retryAttempts: 3
  }) {
    this.config = config;
  }

  async processDeviceBatch<T>(
    devices: string[],
    processor: (deviceId: string) => Promise<T>
  ): Promise<T[]> {
    const results: T[] = [];
    
    // Process in batches to avoid overwhelming the database
    for (let i = 0; i < devices.length; i += this.config.batchSize) {
      const batch = devices.slice(i, i + this.config.batchSize);
      
      // Process batch with limited concurrency
      const batchPromises = batch.map(deviceId => 
        this.withRetry(() => processor(deviceId))
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error('Batch processing error:', result.reason);
        }
      });
    }
    
    return results;
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.config.retryAttempts) {
          // Exponential backoff
          await new Promise(resolve => 
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }
    
    throw lastError!;
  }

  // Batch health check for large fleets
  async batchHealthCheck(deviceIds: string[]): Promise<any[]> {
    return this.processDeviceBatch(deviceIds, async (deviceId) => {
      try {
        const reports = await db
          .select()
          .from(device_reports)
          .where(eq(device_reports.device_id, deviceId))
          .orderBy(desc(device_reports.created_at))
          .limit(1);

        const latestReport = reports[0];
        
        return {
          deviceId,
          isHealthy: latestReport && 
            parseFloat(latestReport.cpu_usage || '0') < 90 &&
            parseFloat(latestReport.memory_usage || '0') < 90 &&
            parseFloat(latestReport.disk_usage || '0') < 95,
          lastReportTime: latestReport?.created_at,
          metrics: latestReport ? {
            cpu: parseFloat(latestReport.cpu_usage || '0'),
            memory: parseFloat(latestReport.memory_usage || '0'),
            disk: parseFloat(latestReport.disk_usage || '0')
          } : null
        };
      } catch (error) {
        console.error(`Health check failed for device ${deviceId}:`, error);
        return {
          deviceId,
          isHealthy: false,
          error: error.message
        };
      }
    });
  }
}

export const batchProcessor = new BatchProcessor();
