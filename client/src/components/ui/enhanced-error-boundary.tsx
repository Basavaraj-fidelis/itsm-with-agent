
import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Mail } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Badge } from './badge';

interface EnhancedErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showReportButton?: boolean;
  allowRetry?: boolean;
  context?: string;
}

interface EnhancedErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorId?: string;
  retryCount: number;
  lastErrorTime?: number;
}

export class EnhancedErrorBoundary extends React.Component<
  EnhancedErrorBoundaryProps, 
  EnhancedErrorBoundaryState
> {
  private retryTimeoutId?: NodeJS.Timeout;

  constructor(props: EnhancedErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<EnhancedErrorBoundaryState> {
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId,
      lastErrorTime: Date.now(),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Enhanced Error Boundary caught an error:', error, errorInfo);
    
    // Send error to monitoring service (you can integrate with your preferred service)
    this.reportError(error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: EnhancedErrorBoundaryProps, prevState: EnhancedErrorBoundaryState) {
    // Auto-retry logic for transient errors
    if (this.state.hasError && this.state.retryCount < 3) {
      const timeSinceError = Date.now() - (this.state.lastErrorTime || 0);
      
      // Auto-retry after 5 seconds for network-related errors
      if (timeSinceError > 5000 && this.isRetriableError(this.state.error)) {
        this.retryTimeoutId = setTimeout(() => {
          this.handleRetry();
        }, 2000);
      }
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private isRetriableError(error?: Error): boolean {
    if (!error) return false;
    
    const retriableMessages = [
      'network error',
      'fetch failed',
      'timeout',
      'connection refused',
      'temporary failure'
    ];
    
    return retriableMessages.some(msg => 
      error.message.toLowerCase().includes(msg)
    );
  }

  private reportError = async (error: Error, errorInfo: React.ErrorInfo) => {
    try {
      const errorReport = {
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        context: this.props.context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        retryCount: this.state.retryCount,
      };

      // Send to your error reporting service
      await fetch('/api/error-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport),
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  private handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      retryCount: prevState.retryCount + 1,
      lastErrorTime: undefined,
    }));
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportIssue = () => {
    const subject = `Error Report: ${this.state.errorId}`;
    const body = `Error ID: ${this.state.errorId}\nContext: ${this.props.context}\nError: ${this.state.error?.message}`;
    const mailtoUrl = `mailto:support@company.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl);
  };

  private getErrorSeverity(): 'low' | 'medium' | 'high' {
    const error = this.state.error;
    if (!error) return 'low';

    if (error.message.includes('ChunkLoadError') || error.message.includes('Loading chunk')) {
      return 'medium';
    }
    
    if (error.message.includes('Network') || error.message.includes('fetch')) {
      return 'medium';
    }

    return 'high';
  }

  private getErrorTypeDisplay(): string {
    const error = this.state.error;
    if (!error) return 'Unknown Error';

    if (error.message.includes('ChunkLoadError')) return 'Resource Loading Error';
    if (error.message.includes('Network')) return 'Network Error';
    if (error.message.includes('TypeError')) return 'Type Error';
    if (error.message.includes('ReferenceError')) return 'Reference Error';
    
    return 'Application Error';
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const severity = this.getErrorSeverity();
      const errorType = this.getErrorTypeDisplay();

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl mx-auto shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className={`p-4 rounded-full ${
                  severity === 'high' ? 'bg-red-100 dark:bg-red-900/20' :
                  severity === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                  'bg-blue-100 dark:bg-blue-900/20'
                }`}>
                  <AlertTriangle className={`h-8 w-8 ${
                    severity === 'high' ? 'text-red-600 dark:text-red-400' :
                    severity === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-blue-600 dark:text-blue-400'
                  }`} />
                </div>
              </div>
              
              <CardTitle className="text-xl mb-2">Oops! Something went wrong</CardTitle>
              <CardDescription className="text-base">
                We encountered an unexpected error. Don't worry, our team has been notified.
              </CardDescription>
              
              <div className="flex justify-center gap-2 mt-4">
                <Badge variant="outline">{errorType}</Badge>
                <Badge variant={severity === 'high' ? 'destructive' : 'secondary'}>
                  {severity.toUpperCase()}
                </Badge>
                {this.state.retryCount > 0 && (
                  <Badge variant="outline">Retry #{this.state.retryCount}</Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Error Details */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Error ID: {this.state.errorId}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(this.state.errorId || '')}
                  >
                    Copy ID
                  </Button>
                </div>
                
                {this.props.context && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Context: {this.props.context}
                  </p>
                )}
                
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                    Technical Details
                  </summary>
                  <pre className="mt-2 text-xs bg-white dark:bg-gray-900 p-3 rounded border overflow-auto max-h-32">
                    {this.state.error?.message}
                  </pre>
                </details>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {this.props.allowRetry !== false && this.state.retryCount < 3 && (
                  <Button 
                    onClick={this.handleRetry}
                    className="flex items-center gap-2"
                    disabled={this.state.retryCount >= 3}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Go to Dashboard
                </Button>
                
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh Page
                </Button>
              </div>

              {/* Report Issue */}
              {this.props.showReportButton !== false && (
                <div className="border-t pt-4 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Still having issues? Let us know!
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={this.handleReportIssue}
                    className="flex items-center gap-2 mx-auto"
                  >
                    <Mail className="h-4 w-4" />
                    Report Issue
                  </Button>
                </div>
              )}

              {/* Auto-retry notification */}
              {this.isRetriableError(this.state.error) && this.state.retryCount < 3 && (
                <div className="text-center">
                  <Badge variant="outline" className="text-xs">
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Auto-retry in progress...
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
