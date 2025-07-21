import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";
import {
  Search,
  BookOpen,
  Filter,
  Plus,
  Eye,
  ThumbsUp,
  Calendar,
  User,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import {
  Trash2,
  Clock,
  Tag,
  TrendingUp,
  Award,
  Users,
  Download,
  Share,
  Heart,
  MessageCircle,
  Lightbulb,
  Shield,
  Zap,
  Settings,
  FileText,
  Edit,
  HelpCircle,
} from "lucide-react";

interface Article {
  id: string;
  title: string;
  content: string;
  author_email: string;
  category: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  views: number;
  helpful_votes: number;
  status: "published" | "draft";
}

const getCategoryIcon = (category: string) => {
  const icons = {
    troubleshooting: "🔧",
    "how-to": "📋",
    policy: "📜",
    technical: "⚙️",
    security: "🛡️",
    network: "🌐",
    hardware: "💻",
    software: "📱",
  };
  return icons[category] || "📄";
};

export default function KnowledgeBase() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute("/knowledge-base/:id");
  const articleId = params?.id;

  const [articles, setArticles] = useState<any[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    if (articleId) {
      fetchSingleArticle(articleId);
    } else {
      fetchArticles();
    }
  }, [articleId, pagination.page, selectedCategory, searchTerm]);

  const fetchArticles = async () => {
    try {
      setIsLoading(true);
      // Build query parameters
      const params = new URLSearchParams({
        status: "published",
        limit: "50", // Increase limit for better results
      });

      if (selectedCategory && selectedCategory !== "all") {
        params.append("category", selectedCategory);
      }

      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }

      console.log(`Fetching KB articles with filters:`, {
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        search: searchTerm.trim() || undefined,
        status: "published",
      });

      const token = localStorage.getItem("auth_token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Add authorization header if token exists
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch(`/api/knowledge-base?${params.toString()}`, {
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`KB API Error: ${response.status} - ${errorText}`);

          if (response.status === 401) {
            console.warn("Authentication issue for KB articles, trying without auth");
            // Retry without auth token
            const retryResponse = await fetch(`/api/knowledge-base?${params.toString()}`, {
              headers: { "Content-Type": "application/json" },
            });

            if (retryResponse.ok) {
              const retryResult = await retryResponse.json();
              setArticles(Array.isArray(retryResult) ? retryResult : retryResult.data || []);
              return;
            }
          }

          throw new Error(`Failed to fetch articles: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log("KB API Response:", result);

        // Handle both paginated and direct array responses
        let articlesData = [];
        if (result.data && Array.isArray(result.data)) {
          articlesData = result.data;
        } else if (Array.isArray(result)) {
          articlesData = result;
        }

        console.log(`Received ${articlesData.length} articles for category: ${selectedCategory}`);
        setArticles(articlesData);

      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.warn('KB API request timed out');
          toast({
            title: "Request Timeout",
            description: "Knowledge base request took too long. Please try again.",
            variant: "destructive"
          });
        } else {
          throw fetchError;
        }
      }

    } catch (err) {
      console.error("Error fetching articles:", err);
      setArticles([]);

      // Show user-friendly error message
      if (err.message.includes('fetch')) {
        toast({
          title: "Connection Error",
          description: "Unable to load articles. Please check your connection and try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSingleArticle = async (id: string) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("auth_token");

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/knowledge-base/${id}`, {
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Single article fetch error: ${response.status} - ${errorText}`,
        );
        
        // Try to find the article in the existing articles list as fallback
        const existingArticle = articles.find(a => a.id === id);
        if (existingArticle) {
          console.log("Using cached article:", existingArticle);
          setSelectedArticle(existingArticle);
          return;
        }
        
        throw new Error(`Failed to fetch article: ${response.status}`);
      }

      const article = await response.json();
      console.log("Fetched single article:", article);
      setSelectedArticle(article);
    } catch (err) {
      console.error("Error fetching article:", err);
      
      // Try to find the article in the existing articles list as final fallback
      const existingArticle = articles.find(a => a.id === id);
      if (existingArticle) {
        console.log("Using cached article as fallback:", existingArticle);
        setSelectedArticle(existingArticle);
      } else {
        setSelectedArticle(null);
        toast({
          title: "Error",
          description: "Unable to load the article. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const categories = [
    "all",
    "Account Management",
    "Hardware",
    "Network",
    "Security",
    "Software",
    "Troubleshooting",
  ];
  // Use articles directly since server-side filtering handles everything
  const filteredArticles = articles;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleArticleClick = (article: any) => {
    console.log("Opening article:", article);
    // Set the selected article directly for immediate display
    setSelectedArticle(article);
    setLocation(`/knowledge-base/${article.id}`);
  };

  const handleBackToList = () => {
    setLocation("/knowledge-base");
  };

  const renderMarkdown = (content: string) => {
    // Enhanced markdown-like rendering with better typography
    return content.split("\n").map((line, index) => {
      if (line.startsWith("# ")) {
        return (
          <h1
            key={index}
            className="text-3xl font-bold mt-8 mb-6 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2"
          >
            {line.slice(2)}
          </h1>
        );
      } else if (line.startsWith("## ")) {
        return (
          <h2
            key={index}
            className="text-2xl font-semibold mt-8 mb-4 text-gray-800 dark:text-gray-200"
          >
            {line.slice(3)}
          </h2>
        );
      } else if (line.startsWith("### ")) {
        return (
          <h3
            key={index}
            className="text-xl font-medium mt-6 mb-3 text-gray-800 dark:text-gray-200"
          >
            {line.slice(4)}
          </h3>
        );
      } else if (line.startsWith("**") && line.endsWith("**")) {
        return (
          <p
            key={index}
            className="font-semibold mb-3 text-gray-800 dark:text-gray-200 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border-l-4 border-blue-400"
          >
            {line.slice(2, -2)}
          </p>
        );
      } else if (line.startsWith("- ")) {
        return (
          <li
            key={index}
            className="ml-6 mb-2 text-gray-700 dark:text-gray-300 list-disc"
          >
            {line.slice(2)}
          </li>
        );
      } else if (/^\d+\./.test(line)) {
        return (
          <li
            key={index}
            className="ml-6 mb-2 text-gray-700 dark:text-gray-300 list-decimal"
          >
            {line.replace(/^\d+\.\s*/, "")}
          </li>
        );
      } else if (line.trim() === "") {
        return <div key={index} className="mb-4"></div>;
      } else {
        return (
          <p
            key={index}
            className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed text-lg"
          >
            {line}
          </p>
        );
      }
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-neutral-600">Loading articles...</p>
        </div>
      </div>
    );
  }

  // Single article view
  if (selectedArticle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-5xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="outline"
              onClick={handleBackToList}
              className="mb-6 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Knowledge Base
            </Button>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-0 p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-4">
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-800 border-blue-200"
                    >
                      {getCategoryIcon(selectedArticle.category)}{" "}
                      {selectedArticle.category}
                    </Badge>
                    <Badge
                      variant={
                        selectedArticle.status === "published"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {selectedArticle.status === "published"
                        ? "✅ Published"
                        : "📝 Draft"}
                    </Badge>
                  </div>

                  <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6 leading-tight">
                    {selectedArticle.title}
                  </h1>

                  {/* Article meta */}
                  <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">
                        {selectedArticle.author_email}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-green-500" />
                      <span>
                        Updated {formatDate(selectedArticle.updated_at)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Eye className="w-4 h-4 text-purple-500" />
                      <span>{selectedArticle.views} views</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ThumbsUp className="w-4 h-4 text-orange-500" />
                      <span>{selectedArticle.helpful_votes} helpful</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col space-y-2 ml-6">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                  >
                    <ThumbsUp className="w-4 h-4 mr-2" />
                    Mark Helpful
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                  >
                    <Share className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Article content */}
          <Card className="shadow-lg border-0 overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-white dark:bg-gray-800 p-12">
                <div className="prose prose-lg prose-blue dark:prose-invert max-w-none">
                  <div className="text-gray-800 dark:text-gray-200 leading-relaxed">
                    {renderMarkdown(selectedArticle.content)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tags and Related Actions */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tags */}
            {selectedArticle.tags && selectedArticle.tags.length > 0 && (
              <div className="lg:col-span-2">
                <Card className="shadow-md border-0">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center text-gray-800 dark:text-gray-200">
                      <Tag className="w-5 h-5 mr-2 text-blue-500" />
                      Related Tags
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedArticle.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-sm px-3 py-1 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 cursor-pointer transition-colors"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Quick Actions */}
            <div>
              <Card className="shadow-md border-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center text-gray-800 dark:text-gray-200">
                    <Zap className="w-5 h-5 mr-2 text-yellow-500" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Suggest Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Add Comment
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                  >
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Related Articles
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Article list view
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#201F1E] dark:text-[#F3F2F1] mb-2">
            Help Articles
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Browse articles and documentation to solve common problems
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Link to="/knowledge-base/new">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New Article
            </Button>
          </Link>
        </div>
      </div>

      <Card className="bg-white dark:bg-gray-800 shadow-sm border">
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search articles, tags, or content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Advanced Search
              </Button>
            </div>

            {showAdvancedSearch && (
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <Label className="text-sm font-medium">Category:</Label>
                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="troubleshooting">
                        🔧 Troubleshooting
                      </SelectItem>
                      <SelectItem value="how-to">📋 How To</SelectItem>
                      <SelectItem value="policy">📜 Policy</SelectItem>
                      <SelectItem value="technical">⚙️ Technical</SelectItem>
                      <SelectItem value="security">🛡️ Security</SelectItem>
                      <SelectItem value="network">🌐 Network</SelectItem>
                      <SelectItem value="hardware">💻 Hardware</SelectItem>
                      <SelectItem value="software">📱 Software</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Label className="text-sm font-medium">Status:</Label>
                  <Select
                    value={selectedStatus}
                    onValueChange={setSelectedStatus}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="published">✅ Published</SelectItem>
                      <SelectItem value="draft">📝 Draft</SelectItem>
                      <SelectItem value="archived">📦 Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Label className="text-sm font-medium">Sort:</Label>
                  <Select value="recent" onValueChange={() => {}}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Recent</SelectItem>
                      <SelectItem value="popular">Popular</SelectItem>
                      <SelectItem value="helpful">Most Helpful</SelectItem>
                      <SelectItem value="title">Title A-Z</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Label className="text-sm font-medium">Popular Tags:</Label>
              <div className="flex flex-wrap gap-1">
                {[
                  "password-reset",
                  "email-setup",
                  "vpn",
                  "printer",
                  "wifi",
                  "slow-computer",
                ].map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => setSearchTerm(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="grid" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-[200px] grid-cols-2">
            <TabsTrigger value="grid">Grid View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>
          <div className="text-sm text-muted-foreground">
            Showing {filteredArticles.length} article
            {filteredArticles.length !== 1 ? "s" : ""}
          </div>
        </div>

        <TabsContent value="grid" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {isLoading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-neutral-600">Loading articles...</p>
              </div>
            )}

            {!isLoading && filteredArticles.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="w-12 h-12 text-neutral-400 mb-4" />
                  <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                    No articles found
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 text-center mb-4">
                    {searchTerm || selectedCategory !== "all"
                      ? "Try adjusting your search or filters"
                      : "No knowledge base articles available yet"}
                  </p>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Article
                  </Button>
                </CardContent>
              </Card>
            )}
            {!isLoading &&
              filteredArticles.map((article) => (
                <Card
                  key={article.id}
                  className="group cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500 hover:border-l-blue-600"
                  onClick={() => handleArticleClick(article)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-3">
                          <Badge
                            variant={
                              article.status === "published"
                                ? "default"
                                : "secondary"
                            }
                            className={
                              article.status === "published"
                                ? "bg-green-100 text-green-800"
                                : ""
                            }
                          >
                            {article.status === "published"
                              ? "✅ Published"
                              : "📝 Draft"}
                          </Badge>
                          <Badge variant="outline" className="font-normal">
                            {getCategoryIcon(article.category)}{" "}
                            {article.category}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg mb-2 group-hover:text-blue-600 transition-colors">
                          {article.title}
                        </CardTitle>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100"
                        >
                          <Share className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100"
                        >
                          <Heart className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 line-clamp-3">
                      {article.content?.slice(0, 150)}...
                    </p>

                    <Separator className="my-3" />

                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {formatDistanceToNow(new Date(article.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span>{article.author_email}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="list" className="space-y-2">
          {filteredArticles.map((article) => (
            <Card
              key={article.id}
              className="cursor-pointer hover:shadow-md transition-all duration-200"
              onClick={() => handleArticleClick(article)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge
                        variant={
                          article.status === "published"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {article.status}
                      </Badge>
                      <Badge variant="outline">
                        {getCategoryIcon(article.category)} {article.category}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-lg mb-1">
                      {article.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {article.content?.slice(0, 200)}...
                    </p>
                  </div>
                  <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <User className="w-4 h-4" />
                      <span>{article.author_email}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>
                        {formatDistanceToNow(new Date(article.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}