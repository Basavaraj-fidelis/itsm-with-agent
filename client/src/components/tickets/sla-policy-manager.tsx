import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Plus, 
  Edit, 
  Trash2,
  Save,
  X
} from 'lucide-react';

interface SLAPolicy {
  id: string;
  name: string;
  priority: string;
  responseTimeHours: number;
  resolutionTimeHours: number;
  businessHours: boolean;
  escalationRules: Array<{
    level: number;
    triggerHours: number;
    assignTo: string;
  }>;
}

const defaultPolicies: SLAPolicy[] = [
  {
    id: "critical",
    name: "Critical Priority",
    priority: "critical",
    responseTimeHours: 1,
    resolutionTimeHours: 4,
    businessHours: false,
    escalationRules: [
      { level: 1, triggerHours: 0.5, assignTo: "manager" },
      { level: 2, triggerHours: 2, assignTo: "director" }
    ]
  },
  {
    id: "high",
    name: "High Priority",
    priority: "high",
    responseTimeHours: 4,
    resolutionTimeHours: 24,
    businessHours: true,
    escalationRules: [
      { level: 1, triggerHours: 2, assignTo: "manager" },
      { level: 2, triggerHours: 12, assignTo: "director" }
    ]
  }
];

export default function SLAPolicyManager() {
  const [policies, setPolicies] = useState<SLAPolicy[]>(defaultPolicies);
  const [editingPolicy, setEditingPolicy] = useState<SLAPolicy | null>(null);
  const [showForm, setShowForm] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">SLA Policy Management</h2>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Policy
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {policies.map((policy) => (
          <Card key={policy.id} className="h-fit">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{policy.name}</CardTitle>
                <Badge className={getPriorityColor(policy.priority)}>
                  {policy.priority.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Response Time</p>
                    <p className="text-sm text-muted-foreground">
                      {policy.responseTimeHours}h
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Resolution Time</p>
                    <p className="text-sm text-muted-foreground">
                      {policy.resolutionTimeHours}h
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Escalation Rules</p>
                <div className="space-y-1">
                  {policy.escalationRules.map((rule, index) => (
                    <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                      Level {rule.level}: After {rule.triggerHours}h → {rule.assignTo}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Badge variant="outline">
                  {policy.businessHours ? "Business Hours" : "24/7"}
                </Badge>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setEditingPolicy(policy)}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}