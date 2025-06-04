import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { 
  Search, 
  Plus, 
  FileText, 
  Eye, 
  Edit, 
  Trash2,
  Filter,
  Clock,
  User,
  ThumbsUp,
  ThumbsDown,
  Star,
  BookOpen,
  HelpCircle,
  Tag,
  Calendar,
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
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

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
    software: "📱"
  };
  return icons[category] || "📄";
};

export default function KnowledgeBase() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedStatus, setSelectedStatus] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showNewArticleForm, setShowNewArticleForm] = useState(false);
  const [newArticle, setNewArticle] = useState({
    title: '',
    content: '',
    category: 'General'
  });

  useEffect(() => {
    fetchArticles();
  }, [selectedCategory, searchTerm]);

  const fetchArticles = async () => {
    try {
      setIsLoading(true);
      // Build query parameters
      const params = new URLSearchParams({
        status: 'published'
      });

      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      console.log(`Fetching KB articles with filters:`, { 
        category: selectedCategory !== 'all' ? selectedCategory : undefined, 
        search: searchTerm.trim() || undefined, 
        status: 'published' 
      });

      const response = await fetch(`/api/knowledge-base?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch articles: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Received ${data.length} articles for category: ${selectedCategory}`);
      setArticles(data);
    } catch (err) {
      console.error('Error fetching articles:', err);
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateArticle = async () => {
    if (!newArticle.title.trim() || !newArticle.content.trim()) {
      alert('Please fill in both title and content');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/knowledge-base', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: newArticle.title,
          content: newArticle.content,
          category: newArticle.category,
          tags: [],
          author_email: 'admin@company.com',
          status: 'published',
          views: 0,
          helpful_votes: 0
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create article');
      }

      // Reset form and refresh articles
      setNewArticle({ title: '', content: '', category: 'General' });
      setShowNewArticleForm(false);
      fetchArticles();
    } catch (err) {
      console.error('Error creating article:', err);
      alert('Failed to create article');
    }
  };

  const categories = [
    "all",
    "Account Management",
    "Hardware", 
    "Network",
    "Security",
    "Software",
    "Troubleshooting"
  ];
  // Use articles directly since server-side filtering handles everything
  const filteredArticles = articles;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleArticleClick = (article: Article) => {
    setSelectedArticle(article);
  };

  const handleBackToList = () => {
    setSelectedArticle(null);
  };

  const renderMarkdown = (content: string) => {
    // Simple markdown-like rendering
    return content
      .split('\n')
      .map((line, index) => {
        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-2xl font-bold mt-6 mb-4 text-neutral-800 dark:text-neutral-200">{line.slice(2)}</h1>;
        } else if (line.startsWith('## ')) {
          return <h2 key={index} className="text-xl font-semibold mt-5 mb-3 text-neutral-700 dark:text-neutral-300">{line.slice(3)}</h2>;
        } else if (line.startsWith('### ')) {
          return <h3 key={index} className="text-lg font-medium mt-4 mb-2 text-neutral-700 dark:text-neutral-300">{line.slice(4)}</h3>;
        } else if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={index} className="font-semibold mb-2 text-neutral-700 dark:text-neutral-300">{line.slice(2, -2)}</p>;
        } else if (line.startsWith('- ')) {
          return <li key={index} className="ml-4 mb-1 text-neutral-600 dark:text-neutral-400">{line.slice(2)}</li>;
        } else if (/^\d+\./.test(line)) {
          return <li key={index} className="ml-4 mb-1 text-neutral-600 dark:text-neutral-400 list-decimal">{line.replace(/^\d+\.\s*/, '')}</li>;
        } else if (line.trim() === '') {
          return <br key={index} />;
        } else {
          return <p key={index} className="mb-2 text-neutral-600 dark:text-neutral-400 leading-relaxed">{line}</p>;
        }
      });
  };

  // Article detail view
  if (selectedArticle) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={handleBackToList}
            className="mb-4 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Knowledge Base
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Badge variant="secondary" className="mb-3">
                {selectedArticle.category}
              </Badge>
              <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200 mb-4">
                {selectedArticle.title}
              </h1>

              {/* Article meta */}
              <div className="flex items-center space-x-6 text-sm text-neutral-500 mb-6">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>{selectedArticle.author_email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>Updated {formatDate(selectedArticle.updated_at)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4" />
                  <span>{selectedArticle.views} views</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ThumbsUp className="w-4 h-4" />
                  <span>{selectedArticle.helpful_votes} helpful</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <ThumbsUp className="w-4 h-4 mr-2" />
                Helpful
              </Button>
            </div>
          </div>
        </div>

        {/* Article content */}
        <Card>
          <CardContent className="p-8">
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              {renderMarkdown(selectedArticle.content)}
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        {selectedArticle.tags && selectedArticle.tags.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {selectedArticle.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Article list view
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#201F1E] dark:text-[#F3F2F1] mb-2">Help Articles</h1>
          <p className="text-neutral-600 dark:text-neutral-400">Browse articles and documentation to solve common problems</p>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setShowNewArticleForm(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Article
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Articles</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{articles.length}</p>
              </div>
              <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Published</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {articles.filter(a => a.status === 'published').length}
                </p>
              </div>
              <Award className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Categories</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {new Set(articles.map(a => a.category)).size}
                </p>
              </div>
              <Tag className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Most Helpful</p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                  {articles.filter(a => a.helpful_votes && a.helpful_votes > 0).length}
                </p>
              </div>
              <ThumbsUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Article Form */}
      {showNewArticleForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Article</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <Input
                value={newArticle.title}
                onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
                placeholder="Enter article title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select 
                value={newArticle.category}
                onChange={(e) => setNewArticle({ ...newArticle, category: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                {categories.filter(cat => cat !== 'all').map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Content</label>
              <textarea
                value={newArticle.content}
                onChange={(e) => setNewArticle({ ...newArticle, content: e.target.value })}
                placeholder="Enter article content (supports markdown)"
                className="w-full p-2 border border-gray-300 rounded-md h-40"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateArticle} className="bg-blue-600 hover:bg-blue-700">
                Create Article
              </Button>
              <Button variant="outline" onClick={() => setShowNewArticleForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Search and Filters */}
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
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Advanced Search
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <Label className="text-sm font-medium">Category:</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="troubleshooting">🔧 Troubleshooting</SelectItem>
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
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
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

            {/* Popular Tags */}
            <div className="flex items-center space-x-2">
              <Label className="text-sm font-medium">Popular Tags:</Label>
              <div className="flex flex-wrap gap-1">
                {['password-reset', 'email-setup', 'vpn', 'printer', 'wifi', 'slow-computer'].map(tag => (
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

      {/* Articles Layout */}
      <Tabs defaultValue="grid" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-[200px] grid-cols-2">
            <TabsTrigger value="grid">Grid View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>
          <div className="text-sm text-muted-foreground">
            Showing {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''}
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
                      : "No knowledge base articles available yet"
                    }
                  </p>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Article
                  </Button>
                </CardContent>
              </Card>
            )}
            {!isLoading && (
              filteredArticles.map((article) => (
                <Card 
                  key={article.id} 
                  className="group cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500 hover:border-l-blue-600"
                  onClick={() => {
                    setSelectedArticle(article);
                    setShowNewArticleForm(true);
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-3">
                          <Badge 
                            variant={article.status === "published" ? "default" : "secondary"}
                            className={article.status === "published" ? "bg-green-100 text-green-800" : ""}
                          >
                            {article.status === "published" ? "✅ Published" : "📝 Draft"}
                          </Badge>
                          <Badge variant="outline" className="font-normal">
                            {getCategoryIcon(article.category)} {article.category}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg mb-2 group-hover:text-blue-600 transition-colors">
                          {article.title}
                        </CardTitle>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                          <Share className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
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
                        <span>{formatDistanceToNow(new Date(article.created_at), { addSuffix: true })}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Eye className="w-3 h-3" />
                          <span>{article.views || 0}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <ThumbsUp className="w-3 h-3 text-green-600" />
                          <span>{article.helpful_votes || 0}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="w-3 h-3 text-blue-600" />
                          <span>0</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="list" className="space-y-2">
          {filteredArticles.map((article) => (
            <Card 
              key={article.id}
              className="cursor-pointer hover:shadow-md transition-all duration-200"
              onClick={() => {
                setSelectedArticle(article);
                setShowNewArticleForm(true);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant={article.status === "published" ? "default" : "secondary"}>
                        {article.status}
                      </Badge>
                      <Badge variant="outline">
                        {getCategoryIcon(article.category)} {article.category}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-lg mb-1">{article.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {article.content?.slice(0, 200)}...
                    </p>
                  </div>
                  <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>{article.views || 0}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <ThumbsUp className="w-4 h-4" />
                      <span>{article.helpful_votes || 0}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatDistanceToNow(new Date(article.created_at), { addSuffix: true })}</span>
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