
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react';
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

interface SLAHealth {
  timestamp: string;
  totalOpenWithSLA: number;
  breached: number;
  critical: number;
  warning: number;
  good: number;
  details: any[];
}

export default function SLAAnalysis() {
  const [analysis, setAnalysis] = useState<SLAAnalysis | null>(null);
  const [health, setHealth] = useState<SLAHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const [analysisResponse, healthResponse] = await Promise.all([
        api.get('/api/sla/analysis'),
        api.get('/api/sla/health')
      ]);
      setAnalysis(analysisResponse.data);
      setHealth(healthResponse.data);
    } catch (error) {
      console.error('Error fetching SLA analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
    // Refresh every 5 minutes
    const interval = setInterval(fetchAnalysis, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getSLAHealthBadge = (slaHealth: string) => {
    switch (slaHealth) {
      case 'breached':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Breached</Badge>;
      case 'critical':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Critical</Badge>;
      case 'warning':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Warning</Badge>;
      case 'good':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />On Track</Badge>;
      case 'resolved':
        return <Badge variant="outline"><CheckCircle className="w-3 h-3 mr-1" />Resolved</Badge>;
      default:
        return <Badge variant="outline">No SLA</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading SLA analysis...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">SLA Analysis & Health Check</h1>
        <Button onClick={fetchAnalysis} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis?.analysis.summary.totalTickets}</div>
            <p className="text-xs text-muted-foreground">
              {analysis?.analysis.summary.openTickets} open, {analysis?.analysis.summary.closedTickets} closed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Breached</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {analysis?.analysis.summary.slaBreached}
            </div>
            <p className="text-xs text-muted-foreground">
              {analysis?.analysis.summary.responseBreached} response, {analysis?.analysis.summary.resolutionBreached} resolution
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA On Track</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analysis?.analysis.summary.slaOnTrack}
            </div>
            <p className="text-xs text-muted-foreground">
              Meeting SLA targets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Health</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {health?.totalOpenWithSLA}
            </div>
            <p className="text-xs text-muted-foreground">
              Open tickets with SLA
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Future Ticket Test */}
      {analysis?.analysis.futureTicketTest && (
        <Card>
          <CardHeader>
            <CardTitle>Future Ticket SLA Test</CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.analysis.futureTicketTest.success ? (
              <div className="space-y-2">
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span className="font-medium">SLA Logic is Working Correctly</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {analysis.analysis.futureTicketTest.message}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <span className="text-sm font-medium">Test Ticket Type:</span>
                    <p className="text-sm">{analysis.analysis.futureTicketTest.testTicket.type}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Priority:</span>
                    <p className="text-sm">{analysis.analysis.futureTicketTest.testTicket.priority}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Matched Policy:</span>
                    <p className="text-sm">{analysis.analysis.futureTicketTest.matchedPolicy}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Resolution Time:</span>
                    <p className="text-sm">{analysis.analysis.futureTicketTest.resolutionTime} min</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center text-red-600">
                  <XCircle className="w-5 h-5 mr-2" />
                  <span className="font-medium">SLA Logic Has Issues</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {analysis.analysis.futureTicketTest.error}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="tickets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tickets">All Tickets</TabsTrigger>
          <TabsTrigger value="health">Real-time Health</TabsTrigger>
          <TabsTrigger value="policies">SLA Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets">
          <Card>
            <CardHeader>
              <CardTitle>Ticket SLA Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>SLA Health</TableHead>
                    <TableHead>Time to SLA</TableHead>
                    <TableHead>Assigned To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis?.analysis.ticketDetails.map((ticket) => (
                    <TableRow key={ticket.ticketNumber}>
                      <TableCell className="font-medium">{ticket.ticketNumber}</TableCell>
                      <TableCell>
                        <Badge variant={
                          ticket.priority === 'critical' ? 'destructive' :
                          ticket.priority === 'high' ? 'secondary' :
                          ticket.priority === 'medium' ? 'outline' : 'default'
                        }>
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{ticket.status}</TableCell>
                      <TableCell>
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {getSLAHealthBadge(ticket.slaHealth)}
                      </TableCell>
                      <TableCell>
                        {ticket.timeToSLA !== null ? (
                          <span className={
                            ticket.timeToSLA < 0 ? 'text-red-600' :
                            ticket.timeToSLA <= 2 ? 'text-orange-600' :
                            'text-green-600'
                          }>
                            {ticket.timeToSLA > 0 ? `${ticket.timeToSLA}h` : `${Math.abs(ticket.timeToSLA)}h overdue`}
                          </span>
                        ) : (
                          'No SLA'
                        )}
                      </TableCell>
                      <TableCell>{ticket.assignedTo}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health">
          <Card>
            <CardHeader>
              <CardTitle>Real-time SLA Health</CardTitle>
              <p className="text-sm text-muted-foreground">
                Last updated: {health ? new Date(health.timestamp).toLocaleString() : 'Never'}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-red-600">{health?.breached}</div>
                    <p className="text-sm text-muted-foreground">Breached</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-orange-600">{health?.critical}</div>
                    <p className="text-sm text-muted-foreground">Critical (≤2h)</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-yellow-600">{health?.warning}</div>
                    <p className="text-sm text-muted-foreground">Warning (≤24h)</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">{health?.good}</div>
                    <p className="text-sm text-muted-foreground">On Track (>24h)</p>
                  </CardContent>
                </Card>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Hours to SLA</TableHead>
                    <TableHead>Assigned To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {health?.details.map((ticket) => (
                    <TableRow key={ticket.ticketNumber}>
                      <TableCell className="font-medium">{ticket.ticketNumber}</TableCell>
                      <TableCell>
                        <Badge variant={
                          ticket.priority === 'critical' ? 'destructive' :
                          ticket.priority === 'high' ? 'secondary' : 'outline'
                        }>
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getSLAHealthBadge(ticket.status)}
                      </TableCell>
                      <TableCell>
                        <span className={
                          ticket.hoursToSLA < 0 ? 'text-red-600 font-bold' :
                          ticket.hoursToSLA <= 2 ? 'text-orange-600 font-bold' :
                          ticket.hoursToSLA <= 24 ? 'text-yellow-600' :
                          'text-green-600'
                        }>
                          {ticket.hoursToSLA > 0 ? `${ticket.hoursToSLA}h` : `${Math.abs(ticket.hoursToSLA)}h overdue`}
                        </span>
                      </TableCell>
                      <TableCell>{ticket.assignedTo}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies">
          <Card>
            <CardHeader>
              <CardTitle>SLA Policies</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Response Time</TableHead>
                    <TableHead>Resolution Time</TableHead>
                    <TableHead>Business Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis?.policies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="font-medium">{policy.name}</TableCell>
                      <TableCell>{policy.ticket_type || 'Any'}</TableCell>
                      <TableCell>
                        <Badge variant={
                          policy.priority === 'critical' ? 'destructive' :
                          policy.priority === 'high' ? 'secondary' : 'outline'
                        }>
                          {policy.priority || 'Any'}
                        </Badge>
                      </TableCell>
                      <TableCell>{policy.response_time} min</TableCell>
                      <TableCell>{policy.resolution_time} min</TableCell>
                      <TableCell>
                        {policy.business_hours_only ? 
                          `${policy.business_start}-${policy.business_end}` : 
                          '24/7'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={policy.is_active ? 'default' : 'secondary'}>
                          {policy.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
