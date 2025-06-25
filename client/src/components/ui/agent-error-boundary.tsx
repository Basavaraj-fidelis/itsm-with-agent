
import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AgentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Agent data processing error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              <span>{this.props.fallbackTitle || 'Data Processing Error'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">
              {this.props.fallbackMessage || 'There was an error processing the agent data. This might be due to malformed data or a processing issue.'}
            </p>
            <div className="space-y-2">
              <p className="text-sm text-red-500">
                Error: {this.state.error?.message}
              </p>
              <Button 
                onClick={this.handleRetry}
                variant="outline" 
                size="sm"
                className="flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Wrapper component for safer data rendering
export const SafeDataRenderer: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback }) => {
  return (
    <AgentErrorBoundary 
      fallbackTitle="Data Display Error"
      fallbackMessage="Unable to display this section due to data processing issues."
    >
      {children}
    </AgentErrorBoundary>
  );
};
