import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle, Clock, XCircle, RefreshCw, Play, FileText } from 'lucide-react';
import { api } from '@/lib/api';

interface SLAAnalysis {
  analysis: {
    summary: {
      totalTickets: number;
      openTickets: number;
      closedTickets: number;
      slaBreached: number;
      slaOnTrack: number;
      responseBreached: number;
      resolutionBreached: number;
    };
    ticketDetails: any[];
    slaValidation: {
      ticketsWithSLA: number;
      ticketsWithoutSLA: number;
      slaCalculationErrors: any[];
    };
    futureTicketTest: any;
  };
  policies: any[];
  timestamp: string;
}

export default function SLAAnalysisPage() {
  const [analysis, setAnalysis] = useState<SLAAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fixing, setFixing] = useState(false);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/sla/analysis');
      setAnalysis(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching SLA analysis:', err);
      setError('Failed to fetch SLA analysis');
    } finally {
      setLoading(false);
    }
  };

  const fixTickets = async () => {
    try {
      setFixing(true);
      const response = await api.post('/api/sla/fix-tickets');
      alert(`Fixed SLA data for ${response.data.ticketsFixed} tickets`);
      await fetchAnalysis(); // Refresh data
    } catch (err) {
      console.error('Error fixing tickets:', err);
      alert('Failed to fix ticket SLA data');
    } finally {
      setFixing(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, []);

  const getSlaHealthBadge = (health: string) => {
    switch (health) {
      case 'good':
        return <Badge variant="default" className="bg-green-500">On Track</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-500">Due Soon</Badge>;
      case 'critical':
        return <Badge variant="destructive" className="bg-orange-500">Critical</Badge>;
      case 'breached':
        return <Badge variant="destructive">Breached</Badge>;
      case 'met':
        return <Badge variant="default" className="bg-green-500">SLA Met</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Analyzing SLA data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <XCircle className="h-12 w-12 mx-auto mb-4" />
              <p>{error}</p>
              <Button onClick={fetchAnalysis} className="mt-4">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analysis) return null;

  const { summary, ticketDetails, slaValidation, futureTicketTest } = analysis.analysis;
  const [analysisData, setAnalysisData] = useState(analysis);

  const fixTicketSLA = async () => {
    // Logic for fixing ticket SLA
  }

  const isFixing = false;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">SLA Analysis Report</h1>
          <p className="text-muted-foreground">
            Last updated: {new Date(analysis.timestamp).toLocaleString()}
          </p>
        </div>
        <div className="space-x-2">
          <Button onClick={fetchAnalysis} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
            <Button 
              onClick={fixTicketSLA}
              disabled={isFixing}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isFixing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Fix Ticket SLA Data
            </Button>

            <Button 
              onClick={async () => {
                try {
                  const response = await fetch('/api/sla/force-breach-check', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    }
                  });

                  if (response.ok) {
                    const result = await response.json();
                    console.log('Force breach check result:', result);
                    // Refresh the analysis
                    const analysisResponse = await fetch('/api/sla/analysis');
                    if (analysisResponse.ok) {
                      const analysisData = await analysisResponse.json();
                      setAnalysisData(analysisData);
                    }
                  }
                } catch (error) {
                  console.error('Error forcing breach check:', error);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Force SLA Breach Check
            </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalTickets}</div>
            <p className="text-xs text-muted-foreground">
              {summary.openTickets} open, {summary.closedTickets} closed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Breached</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.slaBreached}</div>
            <p className="text-xs text-muted-foreground">
              {summary.responseBreached} response, {summary.resolutionBreached} resolution
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Track</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.slaOnTrack}</div>
            <p className="text-xs text-muted-foreground">
              Meeting SLA targets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Coverage</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((slaValidation.ticketsWithSLA / summary.totalTickets) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {slaValidation.ticketsWithSLA} of {summary.totalTickets} tickets
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tickets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tickets">Ticket Details</TabsTrigger>
          <TabsTrigger value="policies">SLA Policies</TabsTrigger>
          <TabsTrigger value="validation">Validation Results</TabsTrigger>
          <TabsTrigger value="future">Future Test</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ticket SLA Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket #</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>SLA Policy</TableHead>
                      <TableHead>SLA Status</TableHead>
                      <TableHead>Resolution Due</TableHead>
                      <TableHead>Health</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ticketDetails.slice(0, 50).map((ticket) => (
                      <TableRow key={ticket.ticketNumber}>
                        <TableCell className="font-mono">{ticket.ticketNumber}</TableCell>
                        <TableCell className="max-w-xs truncate">{ticket.title}</TableCell>
                        <TableCell>
                          <Badge variant={
                            ticket.priority === 'critical' ? 'destructive' :
                            ticket.priority === 'high' ? 'secondary' : 'outline'
                          }>
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{ticket.status}</Badge>
                        </TableCell>
                        <TableCell>{ticket.slaPolicy || 'No Policy'}</TableCell>
                        <TableCell>{ticket.currentSLAStatus}</TableCell>
                        <TableCell>
                          {ticket.resolutionDue ? 
                            new Date(ticket.resolutionDue).toLocaleString() : 
                            'Not Set'
                          }
                        </TableCell>
                        <TableCell>{getSlaHealthBadge(ticket.slaHealth)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {ticketDetails.length > 50 && (
                <p className="text-sm text-muted-foreground mt-4">
                  Showing first 50 of {ticketDetails.length} tickets
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active SLA Policies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.policies.map((policy) => (
                  <div key={policy.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{policy.name}</h3>
                      <Badge variant={policy.is_active ? "default" : "secondary"}>
                        {policy.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{policy.description}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Type:</span> {policy.ticket_type || 'Any'}
                      </div>
                      <div>
                        <span className="font-medium">Priority:</span> {policy.priority || 'Any'}
                      </div>
                      <div>
                        <span className="font-medium">Response:</span> {policy.response_time}m
                      </div>
                      <div>
                        <span className="font-medium">Resolution:</span> {policy.resolution_time}m
                      </div>
                    </div>
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Business Hours:</span> {
                        policy.business_hours_only ? 
                        `${policy.business_start}-${policy.business_end}` : 
                        '24/7'
                      }
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SLA Validation Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {slaValidation.ticketsWithSLA}
                    </div>
                    <p className="text-sm text-muted-foreground">Tickets with SLA</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {slaValidation.ticketsWithoutSLA}
                    </div>
                    <p className="text-sm text-muted-foreground">Tickets without SLA</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.round((slaValidation.ticketsWithSLA / (slaValidation.ticketsWithSLA + slaValidation.ticketsWithoutSLA)) * 100)}%
                    </div>
                    <p className="text-sm text-muted-foreground">Coverage Rate</p>
                  </div>
                </div>

                {slaValidation.ticketsWithoutSLA > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                      <h4 className="font-medium text-yellow-800">Action Required</h4>
                    </div>
                    <p className="text-yellow-700 mt-1">
                      {slaValidation.ticketsWithoutSLA} tickets are missing SLA data. 
                      Click "Fix Missing SLA" to automatically apply SLA policies.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="future" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Future Ticket SLA Test</CardTitle>
              <p className="text-sm text-muted-foreground">
                Tests whether new tickets will get proper SLA assignments
              </p>
            </CardHeader>
            <CardContent>
              {futureTicketTest ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Test Results</h4>
                    <Badge variant={
                      futureTicketTest.summary?.passed === futureTicketTest.summary?.totalTests ? 
                      "default" : "destructive"
                    }>
                      {futureTicketTest.summary?.passed || 0} / {futureTicketTest.summary?.totalTests || 0} Passed
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {futureTicketTest.results?.map((result: any, index: number) => (
                      <div key={index} className="border rounded p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-sm">
                            <span className="font-medium">
                              {result.testCase.type} - {result.testCase.priority}
                            </span>
                          </div>
                          <Badge variant={result.willWork ? "default" : "destructive"}>
                            {result.willWork ? "✓ Pass" : "✗ Fail"}
                          </Badge>
                        </div>
                        {result.willWork ? (
                          <div className="text-xs text-muted-foreground">
                            Policy: {result.policy} | 
                            Response: {result.responseTime}m | 
                            Resolution: {result.resolutionTime}m
                          </div>
                        ) : (
                          <div className="text-xs text-red-600">
                            Error: {result.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No test results available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}