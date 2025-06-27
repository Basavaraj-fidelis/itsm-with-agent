
import { storage } from "./storage";

export interface MLModel {
  id: string;
  model_type: 'anomaly_detection' | 'resource_prediction' | 'performance_classification';
  training_data_period: number; // days
  model_data: any; // serialized model
  accuracy_score: number;
  last_trained: Date;
  is_active: boolean;
}

class MLTrainingService {
  async trainAnomalyDetectionModel(deviceId: string): Promise<MLModel> {
    // Get 90 days of historical data for training
    const reports = await storage.getRecentDeviceReports(deviceId, 90);
    
    if (reports.length < 30) {
      throw new Error("Insufficient training data - need at least 30 days");
    }

    // Prepare training features
    const features = reports.map(report => [
      parseFloat(report.cpu_usage || "0"),
      parseFloat(report.memory_usage || "0"), 
      parseFloat(report.disk_usage || "0"),
      new Date(report.created_at).getHours(), // time of day
      new Date(report.created_at).getDay()    // day of week
    ]);

    // This would integrate with a real ML library like TensorFlow.js
    // For now, simulating model training
    const model = await this.trainIsolationForest(features);
    
    return {
      id: `anomaly-${deviceId}`,
      model_type: 'anomaly_detection',
      training_data_period: 90,
      model_data: model,
      accuracy_score: 0.85,
      last_trained: new Date(),
      is_active: true
    };
  }

  private async trainIsolationForest(features: number[][]): Promise<any> {
    // Placeholder for actual ML training
    // Would use libraries like ml-isolation-forest or TensorFlow.js
    return {
      type: 'isolation_forest',
      thresholds: this.calculateDynamicThresholds(features),
      feature_weights: [0.3, 0.3, 0.2, 0.1, 0.1]
    };
  }

  private calculateDynamicThresholds(features: number[][]): any {
    // Calculate percentile-based thresholds instead of hard-coded ones
    const cpuValues = features.map(f => f[0]).sort((a, b) => a - b);
    const memoryValues = features.map(f => f[1]).sort((a, b) => a - b);
    
    return {
      cpu_95th: cpuValues[Math.floor(cpuValues.length * 0.95)],
      memory_95th: memoryValues[Math.floor(memoryValues.length * 0.95)]
    };
  }
}

export const mlTrainingService = new MLTrainingService();
