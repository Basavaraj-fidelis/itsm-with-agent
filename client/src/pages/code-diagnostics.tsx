
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Code, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info, 
  Shield, 
  Zap,
  FileText,
  Database,
  Server,
  Settings,
  Download,
  RefreshCw,
  Bug,
  TrendingUp,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface DiagnosticIssue {
  severity: 'error' | 'warning' | 'info';
  type: string;
  message: string;
  file: string;
  line?: number;
  column?: number;
  rule?: string;
  suggestion?: string;
}

interface DiagnosticsData {
  overview: {
    totalFiles: number;
    totalLines: number;
    totalSize: number;
    languages: Record<string, number>;
    issueCount: {
      errors: number;
      warnings: number;
      info: number;
    };
  };
  files: Array<{
    file: string;
    size: number;
    lines: number;
    language: string;
    complexity: number;
    issues: DiagnosticIssue[];
    metrics: {
      cyclomaticComplexity?: number;
      maintainabilityIndex?: number;
      duplicateLines?: number;
      testCoverage?: number;
    };
  }>;
  recommendations: string[];
  securityIssues: DiagnosticIssue[];
  performanceIssues: DiagnosticIssue[];
  qualityMetrics: {
    averageComplexity: number;
    maintainabilityScore: number;
    testCoveragePercentage: number;
    duplicateCodePercentage: number;
  };
}

export default function CodeDiagnostics() {
  const [isRunning, setIsRunning] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const { data: diagnosticsData, isLoading, error, refetch } = useQuery({
    queryKey: ["code-diagnostics"],
    queryFn: () => runDiagnostics(),
    enabled: false, // Don't run automatically
    retry: 1
  });

  const { data: systemDiagnostics } = useQuery({
    queryKey: ["system-diagnostics"],
    queryFn: () => api.get("/api/diagnostics/system"),
    retry: 1
  });

  const { data: performanceDiagnostics } = useQuery({
    queryKey: ["performance-diagnostics"], 
    queryFn: () => api.get("/api/diagnostics/performance"),
    retry: 1
  });

  const runDiagnostics = async () => {
    setIsRunning(true);
    try {
      const response = await api.post("/api/diagnostics/run-full");
      return response.diagnostics;
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunDiagnostics = () => {
    setIsRunning(true);
    refetch();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return XCircle;
      case 'warning': return AlertTriangle;
      case 'info': return Info;
      default: return CheckCircle;
    }
  };

  const getQualityScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Code Diagnostics</h1>
          <p className="text-muted-foreground">
            Comprehensive analysis of code quality, security, and performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRunDiagnostics}
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Code className="w-4 h-4" />
            )}
            {isRunning ? 'Running...' : 'Run Diagnostics'}
          </Button>
        </div>
      </div>

      {isRunning && (
        <Alert>
          <Activity className="h-4 w-4" />
          <AlertTitle>Running Diagnostics</AlertTitle>
          <AlertDescription>
            Analyzing all project files... This may take a few minutes.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to run diagnostics: {error.message}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {diagnosticsData && (
            <>
              {/* Overview Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">Total Files</span>
                    </div>
                    <div className="text-2xl font-bold">{diagnosticsData.overview.totalFiles}</div>
                    <div className="text-sm text-muted-foreground">
                      {diagnosticsData.overview.totalLines.toLocaleString()} lines
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Bug className="w-4 h-4 text-red-500" />
                      <span className="font-medium">Issues Found</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {diagnosticsData.overview.issueCount.errors + 
                       diagnosticsData.overview.issueCount.warnings + 
                       diagnosticsData.overview.issueCount.info}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {diagnosticsData.overview.issueCount.errors} critical
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="font-medium">Quality Score</span>
                    </div>
                    <div className={`text-2xl font-bold ${getQualityScoreColor(diagnosticsData.qualityMetrics.maintainabilityScore)}`}>
                      {diagnosticsData.qualityMetrics.maintainabilityScore}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Maintainability Index
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-purple-500" />
                      <span className="font-medium">Security</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {diagnosticsData.securityIssues.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Security issues
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quality Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Code Quality Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">Maintainability</span>
                          <span className="text-sm">{diagnosticsData.qualityMetrics.maintainabilityScore}%</span>
                        </div>
                        <Progress value={diagnosticsData.qualityMetrics.maintainabilityScore} className="h-2" />
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">Test Coverage</span>
                          <span className="text-sm">{diagnosticsData.qualityMetrics.testCoveragePercentage}%</span>
                        </div>
                        <Progress value={diagnosticsData.qualityMetrics.testCoveragePercentage} className="h-2" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">Complexity</span>
                          <span className="text-sm">{diagnosticsData.qualityMetrics.averageComplexity}</span>
                        </div>
                        <Progress value={Math.min(100, diagnosticsData.qualityMetrics.averageComplexity * 5)} className="h-2" />
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">Duplicate Code</span>
                          <span className="text-sm">{diagnosticsData.qualityMetrics.duplicateCodePercentage}%</span>
                        </div>
                        <Progress value={diagnosticsData.qualityMetrics.duplicateCodePercentage} className="h-2" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Language Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Language Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(diagnosticsData.overview.languages).map(([language, count]) => (
                      <div key={language} className="text-center">
                        <div className="text-2xl font-bold">{count}</div>
                        <div className="text-sm text-muted-foreground capitalize">{language}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {diagnosticsData.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                        <span className="text-sm">{recommendation}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {!diagnosticsData && !isLoading && (
            <Card>
              <CardContent className="pt-6 text-center">
                <Code className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">No Diagnostics Data</h3>
                <p className="text-muted-foreground mb-4">Run diagnostics to analyze your codebase</p>
                <Button onClick={handleRunDiagnostics}>
                  Run Code Diagnostics
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="issues" className="space-y-6">
          {diagnosticsData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Issue Summary */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Issue Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="font-medium">Errors</span>
                    </div>
                    <span className="text-xl font-bold text-red-600">
                      {diagnosticsData.overview.issueCount.errors}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      <span className="font-medium">Warnings</span>
                    </div>
                    <span className="text-xl font-bold text-yellow-600">
                      {diagnosticsData.overview.issueCount.warnings}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">Info</span>
                    </div>
                    <span className="text-xl font-bold text-blue-600">
                      {diagnosticsData.overview.issueCount.info}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Issues List */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>All Issues</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {diagnosticsData.files.flatMap(file => 
                        file.issues.map((issue, index) => {
                          const SeverityIcon = getSeverityIcon(issue.severity);
                          return (
                            <div key={`${file.file}-${index}`} className="border rounded-lg p-3">
                              <div className="flex items-start gap-3">
                                <SeverityIcon className={`w-4 h-4 mt-0.5 ${
                                  issue.severity === 'error' ? 'text-red-500' :
                                  issue.severity === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                                }`} />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className={getSeverityColor(issue.severity)}>
                                      {issue.severity}
                                    </Badge>
                                    <Badge variant="secondary">{issue.type}</Badge>
                                  </div>
                                  <div className="font-medium mb-1">{issue.message}</div>
                                  <div className="text-sm text-muted-foreground mb-2">
                                    {issue.file}{issue.line ? `:${issue.line}` : ''}
                                  </div>
                                  {issue.suggestion && (
                                    <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
                                      💡 {issue.suggestion}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          {diagnosticsData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Issues ({diagnosticsData.securityIssues.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {diagnosticsData.securityIssues.length > 0 ? (
                  <div className="space-y-4">
                    {diagnosticsData.securityIssues.map((issue, index) => {
                      const SeverityIcon = getSeverityIcon(issue.severity);
                      return (
                        <div key={index} className="border rounded-lg p-4 border-red-200 bg-red-50">
                          <div className="flex items-start gap-3">
                            <SeverityIcon className="w-5 h-5 text-red-500 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="destructive">{issue.severity}</Badge>
                                <Badge variant="outline">{issue.type}</Badge>
                              </div>
                              <div className="font-semibold text-red-900 mb-2">{issue.message}</div>
                              <div className="text-sm text-red-700 mb-2">
                                📁 {issue.file}{issue.line ? ` (Line ${issue.line})` : ''}
                              </div>
                              {issue.suggestion && (
                                <div className="text-sm bg-white p-3 rounded border border-red-200">
                                  <strong>💡 Recommendation:</strong> {issue.suggestion}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <h3 className="font-semibold text-green-900 mb-2">No Security Issues Found</h3>
                    <p className="text-green-700">Your code appears to be secure based on our analysis.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {diagnosticsData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Performance Issues ({diagnosticsData.performanceIssues.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {diagnosticsData.performanceIssues.length > 0 ? (
                  <div className="space-y-4">
                    {diagnosticsData.performanceIssues.map((issue, index) => {
                      const SeverityIcon = getSeverityIcon(issue.severity);
                      return (
                        <div key={index} className="border rounded-lg p-4 border-yellow-200 bg-yellow-50">
                          <div className="flex items-start gap-3">
                            <SeverityIcon className="w-5 h-5 text-yellow-500 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="secondary">{issue.severity}</Badge>
                                <Badge variant="outline">{issue.type}</Badge>
                              </div>
                              <div className="font-semibold text-yellow-900 mb-2">{issue.message}</div>
                              <div className="text-sm text-yellow-700 mb-2">
                                📁 {issue.file}{issue.line ? ` (Line ${issue.line})` : ''}
                              </div>
                              {issue.suggestion && (
                                <div className="text-sm bg-white p-3 rounded border border-yellow-200">
                                  <strong>⚡ Optimization:</strong> {issue.suggestion}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Zap className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <h3 className="font-semibold text-green-900 mb-2">No Performance Issues Found</h3>
                    <p className="text-green-700">Your code appears to be optimized for performance.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="files" className="space-y-6">
          {diagnosticsData && (
            <Card>
              <CardHeader>
                <CardTitle>File Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {diagnosticsData.files.map((file, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span className="font-medium">{file.file}</span>
                            <Badge variant="outline">{file.language}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{file.lines} lines</span>
                            <span>{formatBytes(file.size)}</span>
                            <span>Complexity: {file.complexity}</span>
                          </div>
                        </div>

                        {file.metrics && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                            <div className="text-center">
                              <div className="text-lg font-semibold">{file.metrics.maintainabilityIndex || 'N/A'}</div>
                              <div className="text-xs text-muted-foreground">Maintainability</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold">{file.metrics.testCoverage || 0}%</div>
                              <div className="text-xs text-muted-foreground">Test Coverage</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold">{file.metrics.duplicateLines || 0}</div>
                              <div className="text-xs text-muted-foreground">Duplicate Lines</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold">{file.issues.length}</div>
                              <div className="text-xs text-muted-foreground">Issues</div>
                            </div>
                          </div>
                        )}

                        {file.issues.length > 0 && (
                          <div className="flex gap-2">
                            <Badge variant="destructive">
                              {file.issues.filter(i => i.severity === 'error').length} errors
                            </Badge>
                            <Badge variant="secondary">
                              {file.issues.filter(i => i.severity === 'warning').length} warnings
                            </Badge>
                            <Badge variant="outline">
                              {file.issues.filter(i => i.severity === 'info').length} info
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Info */}
            {systemDiagnostics && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    System Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Node Version</div>
                      <div className="text-muted-foreground">{systemDiagnostics.systemInfo?.node?.version}</div>
                    </div>
                    <div>
                      <div className="font-medium">Platform</div>
                      <div className="text-muted-foreground">{systemDiagnostics.systemInfo?.node?.platform}</div>
                    </div>
                    <div>
                      <div className="font-medium">Architecture</div>
                      <div className="text-muted-foreground">{systemDiagnostics.systemInfo?.node?.arch}</div>
                    </div>
                    <div>
                      <div className="font-medium">Uptime</div>
                      <div className="text-muted-foreground">
                        {Math.round((systemDiagnostics.systemInfo?.node?.uptime || 0) / 60)} min
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Performance Metrics */}
            {performanceDiagnostics && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {performanceDiagnostics.performance?.memory && (
                    <div>
                      <div className="font-medium mb-2">Memory Usage</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Heap Used:</span>
                          <span>{formatBytes(performanceDiagnostics.performance.memory.used.heapUsed)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Heap Total:</span>
                          <span>{formatBytes(performanceDiagnostics.performance.memory.used.heapTotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>RSS:</span>
                          <span>{formatBytes(performanceDiagnostics.performance.memory.used.rss)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
