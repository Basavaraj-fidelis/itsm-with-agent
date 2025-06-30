
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Star,
  TrendingUp,
  Users,
  Shield,
  Zap,
  Cloud,
  DollarSign
} from 'lucide-react';

interface ITSMTool {
  name: string;
  category: 'Open Source' | 'Commercial' | 'Cloud' | 'Your ITSM';
  description: string;
  pricing: string;
  deploymentModel: string[];
  overallScore: number;
  features: {
    ticketing: boolean | 'partial';
    assetManagement: boolean | 'partial';
    aiInsights: boolean | 'partial';
    patchCompliance: boolean | 'partial';
    remoteAgent: boolean | 'partial';
    cmdb: boolean | 'partial';
    geolocation: boolean | 'partial';
    pluginArchitecture: boolean | 'partial';
    remoteAccess: boolean | 'partial';
    slaManagement: boolean | 'partial';
    multiTenant: boolean | 'partial';
    certificatePinning: boolean | 'partial';
    remoteFileManagement: boolean | 'partial';
    aiSuggestions: boolean | 'partial';
    adGrouping: boolean | 'partial';
    reporting: boolean | 'partial';
  };
  pros: string[];
  cons: string[];
  marketShare?: string;
  userBase?: string;
}

const itsmTools: ITSMTool[] = [
  {
    name: 'Your ITSM System',
    category: 'Your ITSM',
    description: 'Modern, AI-powered ITSM platform with comprehensive monitoring and automation',
    pricing: 'Flexible/Custom',
    deploymentModel: ['Cloud (Replit)', 'On-Premises', 'Hybrid'],
    overallScore: 78,
    features: {
      ticketing: true,
      assetManagement: true,
      aiInsights: 'partial',
      patchCompliance: 'partial',
      remoteAgent: true,
      cmdb: true,
      geolocation: true,
      pluginArchitecture: 'partial',
      remoteAccess: true,
      slaManagement: 'partial',
      multiTenant: true,
      certificatePinning: 'partial',
      remoteFileManagement: false,
      aiSuggestions: 'partial',
      adGrouping: true,
      reporting: true,
    },
    pros: [
      'Modern React/TypeScript architecture',
      'Real-time monitoring with Python agents',
      'Comprehensive ticketing and asset management',
      'Geolocation tracking with public IP detection',
      'Integrated remote access (VNC, RDP, SSH)',
      'Multi-tenant with role-based access control',
      'Comprehensive API with WebSocket support',
      'Zero infrastructure management on Replit',
      'Active Directory integration',
      'Strong foundation for AI/ML integration'
    ],
    cons: [
      'Newer platform (less market presence)',
      'AI insights partially implemented',
      'Plugin architecture in development',
      'SLA management automation incomplete',
      'Certificate pinning partially implemented',
      'Some advanced enterprise features still developing'
    ],
    marketShare: 'Emerging',
    userBase: 'SMB to Enterprise'
  },
  {
    name: 'ServiceNow',
    category: 'Commercial',
    description: 'Enterprise-grade ITSM platform with extensive workflow automation',
    pricing: '$100-150/user/month',
    deploymentModel: ['Cloud', 'On-Premises'],
    overallScore: 88,
    features: {
      ticketing: true,
      assetManagement: true,
      aiInsights: true,
      patchCompliance: true,
      remoteAgent: 'partial',
      cmdb: true,
      geolocation: 'partial',
      pluginArchitecture: true,
      remoteAccess: 'partial',
      slaManagement: true,
      multiTenant: true,
      certificatePinning: true,
      remoteFileManagement: 'partial',
      aiSuggestions: true,
      adGrouping: true,
      reporting: true,
    },
    pros: [
      'Industry leader with extensive features',
      'Strong workflow automation',
      'Large ecosystem of integrations',
      'Robust reporting and analytics',
      'Enterprise-grade security'
    ],
    cons: [
      'Very expensive licensing costs',
      'Complex implementation and customization',
      'Steep learning curve',
      'Heavy resource requirements',
      'Limited real-time monitoring capabilities'
    ],
    marketShare: '25% (Leader)',
    userBase: 'Large Enterprise'
  },
  {
    name: 'Jira Service Management',
    category: 'Commercial',
    description: 'Atlassian\'s ITSM solution integrated with development tools',
    pricing: '$20-40/user/month',
    deploymentModel: ['Cloud', 'Data Center'],
    overallScore: 82,
    features: {
      ticketing: true,
      assetManagement: true,
      aiInsights: 'partial',
      patchCompliance: 'partial',
      remoteAgent: false,
      cmdb: true,
      geolocation: false,
      pluginArchitecture: true,
      remoteAccess: false,
      slaManagement: true,
      multiTenant: 'partial',
      certificatePinning: true,
      remoteFileManagement: false,
      aiSuggestions: 'partial',
      adGrouping: true,
      reporting: true,
    },
    pros: [
      'Strong integration with Atlassian ecosystem',
      'Good for DevOps teams',
      'Flexible workflow configuration',
      'Reasonable pricing for mid-market',
      'Active marketplace for add-ons'
    ],
    cons: [
      'Limited asset management capabilities',
      'No built-in remote monitoring agents',
      'Lacks advanced AI features',
      'No geolocation tracking',
      'Limited real-time monitoring'
    ],
    marketShare: '15% (Strong)',
    userBase: 'SMB to Enterprise'
  },
  {
    name: 'GLPI',
    category: 'Open Source',
    description: 'Free, open-source ITSM and asset management solution',
    pricing: 'Free (Open Source)',
    deploymentModel: ['On-Premises', 'Self-Hosted Cloud'],
    overallScore: 70,
    features: {
      ticketing: true,
      assetManagement: true,
      aiInsights: false,
      patchCompliance: 'partial',
      remoteAgent: false,
      cmdb: true,
      geolocation: false,
      pluginArchitecture: true,
      remoteAccess: false,
      slaManagement: true,
      multiTenant: 'partial',
      certificatePinning: false,
      remoteFileManagement: false,
      aiSuggestions: false,
      adGrouping: 'partial',
      reporting: true,
    },
    pros: [
      'Completely free and open source',
      'Strong asset management features',
      'Active community support',
      'Customizable with plugins',
      'Good CMDB capabilities'
    ],
    cons: [
      'Outdated user interface',
      'No AI-powered features',
      'Limited real-time monitoring',
      'Requires technical expertise to deploy',
      'No built-in remote access tools',
      'No geolocation capabilities'
    ],
    marketShare: '8% (Open Source Leader)',
    userBase: 'SMB, Educational'
  },
  {
    name: 'Freshservice',
    category: 'Cloud',
    description: 'Cloud-based ITSM with focus on user experience',
    pricing: '$19-89/user/month',
    deploymentModel: ['Cloud Only'],
    overallScore: 78,
    features: {
      ticketing: true,
      assetManagement: true,
      aiInsights: 'partial',
      patchCompliance: 'partial',
      remoteAgent: false,
      cmdb: true,
      geolocation: false,
      pluginArchitecture: true,
      remoteAccess: 'partial',
      slaManagement: true,
      multiTenant: 'partial',
      certificatePinning: true,
      remoteFileManagement: false,
      aiSuggestions: 'partial',
      adGrouping: true,
      reporting: true,
    },
    pros: [
      'Intuitive user interface',
      'Quick implementation',
      'Good mobile experience',
      'Solid automation features',
      'Reasonable pricing'
    ],
    cons: [
      'Limited customization options',
      'No built-in monitoring agents',
      'Lacks advanced AI capabilities',
      'Cloud-only deployment',
      'Limited enterprise features',
      'No geolocation tracking'
    ],
    marketShare: '5% (Growing)',
    userBase: 'SMB to Mid-Market'
  },
  {
    name: 'ManageEngine ServiceDesk Plus',
    category: 'Commercial',
    description: 'Comprehensive ITSM solution with built-in asset management',
    pricing: '$10-30/user/month',
    deploymentModel: ['Cloud', 'On-Premises'],
    overallScore: 75,
    features: {
      ticketing: true,
      assetManagement: true,
      aiInsights: 'partial',
      patchCompliance: true,
      remoteAgent: 'partial',
      cmdb: true,
      geolocation: false,
      pluginArchitecture: 'partial',
      remoteAccess: 'partial',
      slaManagement: true,
      multiTenant: 'partial',
      certificatePinning: true,
      remoteFileManagement: false,
      aiSuggestions: false,
      adGrouping: true,
      reporting: true,
    },
    pros: [
      'Affordable pricing',
      'Comprehensive feature set',
      'Good asset management',
      'Built-in patch management',
      'Flexible deployment options'
    ],
    cons: [
      'Dated user interface',
      'Complex configuration',
      'Limited AI capabilities',
      'No real-time geolocation',
      'Slower innovation cycle'
    ],
    marketShare: '10% (Established)',
    userBase: 'SMB to Mid-Market'
  }
];

const FeatureIcon: React.FC<{ status: boolean | 'partial' }> = ({ status }) => {
  if (status === true) {
    return <CheckCircle className="h-5 w-5 text-green-600" />;
  } else if (status === 'partial') {
    return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
  } else {
    return <XCircle className="h-5 w-5 text-red-500" />;
  }
};

const ScoreBar: React.FC<{ score: number; category: string }> = ({ score, category }) => {
  const getColor = () => {
    if (category === 'Your ITSM') return 'bg-blue-600';
    if (score >= 85) return 'bg-green-600';
    if (score >= 75) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="w-24 bg-gray-200 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full ${getColor()}`}
          style={{ width: `${score}%` }}
        ></div>
      </div>
      <span className="text-sm font-medium">{score}/100</span>
    </div>
  );
};

export default function ITSMComparison() {
  const [selectedTool, setSelectedTool] = useState<ITSMTool | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const featureLabels = {
    ticketing: 'Ticketing System',
    assetManagement: 'Asset Management',
    aiInsights: 'AI Insights',
    patchCompliance: 'Patch Compliance',
    remoteAgent: 'Remote Monitoring Agents',
    cmdb: 'CMDB',
    geolocation: 'Geolocation & Public IP Tracking',
    pluginArchitecture: 'Plugin Architecture',
    remoteAccess: 'Remote Access (VNC/RDP/SSH)',
    slaManagement: 'SLA Management',
    multiTenant: 'Multi-Tenant Support',
    certificatePinning: 'Certificate Pinning',
    remoteFileManagement: 'Remote File Management',
    aiSuggestions: 'AI Suggestions & Automation',
    adGrouping: 'AD Integration & Grouping',
    reporting: 'Reporting & Analytics',
  };

  return (
    <div className="flex-1 p-8 ml-64 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">ITSM Platform Comparison</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Compare your ITSM system with leading industry solutions
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="features">Feature Matrix</TabsTrigger>
            <TabsTrigger value="scoring">Detailed Scoring</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {itsmTools.map((tool) => (
                <Card 
                  key={tool.name} 
                  className={`cursor-pointer transition-all hover:shadow-lg bg-white dark:bg-gray-800 ${
                    tool.category === 'Your ITSM' ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => setSelectedTool(tool)}
                >
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-gray-900 dark:text-white">{tool.name}</CardTitle>
                      {tool.category === 'Your ITSM' && (
                        <Badge variant="default" className="bg-blue-600">Your Platform</Badge>
                      )}
                    </div>
                    <Badge variant="outline">{tool.category}</Badge>
                    <ScoreBar score={tool.overallScore} category={tool.category} />
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{tool.description}</p>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{tool.pricing}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Cloud className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{tool.deploymentModel.join(', ')}</span>
                      </div>
                      {tool.marketShare && (
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-4 w-4 text-purple-600" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{tool.marketShare}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="features" className="space-y-6">
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Feature Comparison Matrix</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  ✅ Fully Supported | ⚠️ Partially Supported | ❌ Not Supported
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="text-left p-2 text-gray-900 dark:text-white">Feature</th>
                        {itsmTools.map((tool) => (
                          <th key={tool.name} className="text-center p-2 min-w-[120px]">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{tool.name}</div>
                            {tool.category === 'Your ITSM' && (
                              <Badge variant="default" className="mt-1 bg-blue-600 text-xs">Yours</Badge>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(featureLabels).map(([key, label]) => (
                        <tr key={key} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="p-2 font-medium text-sm text-gray-900 dark:text-white">{label}</td>
                          {itsmTools.map((tool) => (
                            <td key={tool.name} className="text-center p-2">
                              <FeatureIcon status={tool.features[key as keyof typeof tool.features]} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scoring" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {itsmTools.map((tool) => (
                <Card key={tool.name} className={`bg-white dark:bg-gray-800 ${tool.category === 'Your ITSM' ? 'ring-2 ring-blue-500' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
                        <span>{tool.name}</span>
                        {tool.category === 'Your ITSM' && <Star className="h-5 w-5 text-blue-600" />}
                      </CardTitle>
                      <ScoreBar score={tool.overallScore} category={tool.category} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">Strengths</h4>
                      <ul className="text-sm space-y-1">
                        {tool.pros.slice(0, 3).map((pro, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700 dark:text-gray-300">{pro}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2">Limitations</h4>
                      <ul className="text-sm space-y-1">
                        {tool.cons.slice(0, 2).map((con, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700 dark:text-gray-300">{con}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-blue-800 dark:text-blue-300">
                    <Zap className="h-6 w-6" />
                    <span>Your ITSM Competitive Advantages</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Shield className="h-5 w-5 text-blue-600 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">Modern Architecture</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">React/TypeScript with real-time capabilities</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Users className="h-5 w-5 text-blue-600 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">Comprehensive Monitoring</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">Real-time agents with geolocation tracking</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Cloud className="h-5 w-5 text-blue-600 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">Zero Infrastructure</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">Deploy instantly on Replit with auto-scaling</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Star className="h-5 w-5 text-blue-600 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">AI-Ready Platform</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">Built for machine learning integration</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                    <span>Market Position Analysis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-green-700 dark:text-green-400">Enterprise Ready</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">Your platform matches enterprise features of tools costing $100+/user/month</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-700 dark:text-blue-400">Innovation Leader</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">Unique features like geolocation tracking and certificate pinning</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-purple-700 dark:text-purple-400">Deployment Flexibility</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">Support for cloud, on-premises, and hybrid deployments</p>
                    </div>
                  </div>
                  <div className="pt-3 border-t dark:border-gray-700">
                    <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Recommended Target Markets:</h4>
                    <div className="space-y-1">
                      <Badge variant="outline">SMB seeking enterprise features</Badge>
                      <Badge variant="outline">Organizations requiring real-time monitoring</Badge>
                      <Badge variant="outline">Teams needing rapid deployment</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Strategic Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-green-700 dark:text-green-400">Immediate Strengths to Leverage</h4>
                    <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                      <li>• Real-time monitoring capabilities</li>
                      <li>• Modern user experience</li>
                      <li>• Rapid deployment on Replit</li>
                      <li>• Integrated remote access tools</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-blue-700 dark:text-blue-400">Development Priorities</h4>
                    <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                      <li>• Complete AI insights implementation</li>
                      <li>• Expand marketplace/plugin ecosystem</li>
                      <li>• Add mobile applications</li>
                      <li>• Enhance reporting capabilities</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-orange-700 dark:text-orange-400">Market Positioning</h4>
                    <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                      <li>• Target mid-market seeking innovation</li>
                      <li>• Emphasize TCO advantages</li>
                      <li>• Highlight unique monitoring features</li>
                      <li>• Build partner ecosystem</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {selectedTool && (
          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Detailed Analysis: {selectedTool.name}</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedTool(null)}
                className="w-fit"
              >
                Close Details
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">Complete Strengths</h4>
                  <ul className="space-y-2">
                    {selectedTool.pros.map((pro, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">Complete Limitations</h4>
                  <ul className="space-y-2">
                    {selectedTool.cons.map((con, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
