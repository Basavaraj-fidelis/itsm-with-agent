
import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface UnifiedErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  showDetails?: boolean;
  onReset?: () => void;
  variant?: 'agent' | 'dashboard' | 'api' | 'generic';
}

export class UnifiedErrorBoundary extends React.Component<
  UnifiedErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: UnifiedErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error caught by ${this.props.variant || 'generic'} error boundary:`, error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  getVariantConfig() {
    const { variant = 'generic' } = this.props;
    
    const configs = {
      agent: {
        title: "Agent Detail Error",
        message: "There was an error loading the agent details. This might be due to data processing issues or network problems.",
        icon: AlertTriangle,
        color: "text-blue-600"
      },
      dashboard: {
        title: "Dashboard Error", 
        message: "Unable to load dashboard components. Please check your connection and try again.",
        icon: AlertTriangle,
        color: "text-red-600"
      },
      api: {
        title: "API Error",
        message: "Unable to connect to the server. Please check your network connection.",
        icon: AlertTriangle,
        color: "text-orange-600"
      },
      generic: {
        title: "Something went wrong",
        message: "An unexpected error occurred. Please try refreshing the page.",
        icon: AlertTriangle,
        color: "text-gray-600"
      }
    };

    return configs[variant];
  }

  render() {
    if (this.state.hasError) {
      const config = this.getVariantConfig();
      const { fallbackTitle, fallbackMessage, showDetails = false } = this.props;
      const Icon = config.icon;

      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className={`mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${config.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {fallbackTitle || config.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {fallbackMessage || config.message}
                  </p>
                </div>

                {showDetails && this.state.error && (
                  <details className="text-left">
                    <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                      Error Details
                    </summary>
                    <pre className="text-xs text-red-600 mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border overflow-auto max-h-32">
                      {this.state.error.message}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </details>
                )}

                <div className="flex flex-col sm:flex-row gap-2 pt-4">
                  <Button
                    onClick={this.handleReset}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </Button>
                  <Button
                    onClick={() => window.location.href = '/'}
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Home className="w-4 h-4" />
                    Go Home
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Convenience exports for different variants
export const AgentErrorBoundary: React.FC<Omit<UnifiedErrorBoundaryProps, 'variant'>> = (props) => (
  <UnifiedErrorBoundary {...props} variant="agent" />
);

export const DashboardErrorBoundary: React.FC<Omit<UnifiedErrorBoundaryProps, 'variant'>> = (props) => (
  <UnifiedErrorBoundary {...props} variant="dashboard" />
);

export const ApiErrorBoundary: React.FC<Omit<UnifiedErrorBoundaryProps, 'variant'>> = (props) => (
  <UnifiedErrorBoundary {...props} variant="api" />
);

export default UnifiedErrorBoundary;
