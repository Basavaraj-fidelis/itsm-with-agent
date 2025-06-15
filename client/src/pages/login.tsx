import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  Building,
  ArrowRight,
  Monitor,
  Server,
  AlertTriangle,
  CheckCircle,
  Users,
  Settings
} from "lucide-react";
import { Link } from "wouter";

export default function Login() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
    remember: false
  });
  const [useActiveDirectory, setUseActiveDirectory] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...credentials, useActiveDirectory })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        toast({
          title: "Login successful",
          description: `Welcome back, ${data.user.name || data.user.email}`
        });

        // Force page reload to ensure fresh state
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 100);
      } else {
        const error = await response.json();
        toast({
          title: "Login failed",
          description: error.message || "Invalid credentials",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Unable to connect to ITSM server",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const demoAccounts = [
    {
      email: "admin@company.com",
      password: "admin123",
      role: "Administrator",
      icon: Settings,
      description: "Full system access",
      color: "bg-red-600"
    },
    {
      email: "tech@company.com", 
      password: "tech123",
      role: "Technician",
      icon: Monitor,
      description: "Ticket management",
      color: "bg-blue-600"
    },
    {
      email: "manager@company.com",
      password: "demo123", 
      role: "Manager",
      icon: Users,
      description: "Team oversight",
      color: "bg-green-600"
    },
    {
      email: "user@company.com",
      password: "demo123",
      role: "End User", 
      icon: Building,
      description: "Submit tickets",
      color: "bg-purple-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%2523ffffff%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%227%22%20cy%3D%227%22%20r%3D%227%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center relative z-10">
        {/* Left Side - Branding */}
        <div className="hidden lg:block text-white space-y-8">
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-blue-600 rounded-2xl shadow-2xl">
                <Shield className="w-12 h-12 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">ITSM Portal</h1>
                <p className="text-blue-200">Enterprise IT Service Management</p>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-blue-100">
                Streamline Your IT Operations
              </h2>
              <p className="text-lg text-blue-200 leading-relaxed">
                Comprehensive incident management, asset tracking, and performance monitoring 
                in one unified platform.
              </p>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <Monitor className="w-8 h-8 text-blue-300 mb-2" />
              <h3 className="font-semibold text-white">Real-time Monitoring</h3>
              <p className="text-sm text-blue-200">24/7 system oversight</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <Server className="w-8 h-8 text-green-300 mb-2" />
              <h3 className="font-semibold text-white">Asset Management</h3>
              <p className="text-sm text-blue-200">Complete inventory control</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <AlertTriangle className="w-8 h-8 text-yellow-300 mb-2" />
              <h3 className="font-semibold text-white">Smart Alerts</h3>
              <p className="text-sm text-blue-200">Proactive issue detection</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <CheckCircle className="w-8 h-8 text-emerald-300 mb-2" />
              <h3 className="font-semibold text-white">SLA Compliance</h3>
              <p className="text-sm text-blue-200">Automated tracking</p>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-600 rounded-xl">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">ITSM Portal</h1>
            <p className="text-blue-200">Enterprise IT Service Management</p>
          </div>

          {/* Login Card */}
          <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold text-center text-slate-800">
                Sign In
              </CardTitle>
              <p className="text-sm text-slate-600 text-center">
                Access your ITSM dashboard
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-slate-600" />
                    <span>Email address</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@company.com"
                    value={credentials.email}
                    onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                    required
                    className="h-11 border-slate-300 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-slate-600" />
                    <span>Password</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      required
                      className="h-11 pr-10 border-slate-300 focus:border-blue-500"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-slate-500" />
                      ) : (
                        <Eye className="w-4 h-4 text-slate-500" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={credentials.remember}
                      onChange={(e) => setCredentials({ ...credentials, remember: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-600">Remember me</span>
                  </label>
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
                 <div className="flex items-center space-x-2 mb-4">
                    <input
                      type="checkbox"
                      id="useActiveDirectory"
                      checked={useActiveDirectory}
                      onChange={(e) => setUseActiveDirectory(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="useActiveDirectory" className="text-sm text-gray-600 dark:text-gray-400">
                      Use Active Directory Authentication
                    </label>
                  </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              <Separator />

              {/* Demo Accounts */}
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">
                    Demo Accounts
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {demoAccounts.map((account, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => setCredentials({ 
                        email: account.email, 
                        password: account.password, 
                        remember: false 
                      })}
                      className="h-auto p-3 flex flex-col items-center space-y-1 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                    >
                      <div className={`p-1.5 rounded ${account.color}`}>
                        <account.icon className="w-3 h-3 text-white" />
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-medium text-slate-700">{account.role}</div>
                        <div className="text-xs text-slate-500">{account.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-center text-slate-500">
                  Click any role above to auto-fill credentials
                </p>
              </div>

              <div className="text-center">
                <p className="text-sm text-slate-600">
                  Need an account?{" "}
                  <Link 
                    href="/signup" 
                    className="text-blue-600 hover:text-blue-500 font-medium"
                  >
                    Contact Administrator
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-white/70">
            <p>© 2024 ITSM Portal. Enterprise IT Service Management.</p>
            <p className="mt-1">Secure • Reliable • Efficient</p>
          </div>
        </div>
      </div>
    </div>
  );
}