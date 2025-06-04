import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  Plus, 
  BookOpen, 
  Star, 
  Clock, 
  User,
  Eye,
  ThumbsUp,
  MessageSquare,
  Filter,
  Tag,
  ArrowLeft,
  ExternalLink,
  AlertCircle,
  RefreshCw
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

export default function KnowledgeBase() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch articles from API
  const [articles, setArticles] = useState<Article[]>([]);
  const [error, setError] = useState<Error | null>(null);
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
      setError(null);
    } catch (err) {
      console.error('Error fetching articles:', err);
      setError(err as Error);
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
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#201F1E] dark:text-[#F3F2F1] mb-2">Help Articles</h1>
            <p className="text-neutral-600">Browse articles and documentation</p>
          </div>
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setShowNewArticleForm(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Article
          </Button>
        </div>
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

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
              <Input
                placeholder="Search articles, tags, or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="capitalize"
                >
                  {category === "all" ? "All Categories" : category}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-neutral-600">Loading articles...</p>
        </div>
      )}

      {/* Articles Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {error ? (
            <Card className="p-12 text-center">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                  Error Loading Articles
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400 text-center mb-4">
                  {error.message}
                </p>
                <Button onClick={() => window.location.reload()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : articles.length === 0 ? (
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
          ) : (
            filteredArticles.map((article) => (
              <Card 
                key={article.id} 
                className="hover:shadow-lg transition-all cursor-pointer hover:border-blue-200 dark:hover:border-blue-800"
                onClick={() => handleArticleClick(article)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Badge variant="secondary" className="mb-2">
                      {article.category}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                  <CardTitle className="text-lg line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {article.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-3 mb-4">
                    {article.content.split('\n').find(line => line.trim() && !line.startsWith('#'))?.slice(0, 150)}...
                  </p>

                  {/* Tags */}
                  {article.tags && article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {article.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                      {article.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{article.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  <Separator className="mb-3" />

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <div className="flex items-center space-x-2">
                      <User className="w-3 h-3" />
                      <span>{article.author_email}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <Eye className="w-3 h-3" />
                        <span>{article.views}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <ThumbsUp className="w-3 h-3" />
                        <span>{article.helpful_votes}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(article.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredArticles.length === 0 && !error && (
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
            {!searchTerm && selectedCategory === "all" && (
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Create First Article
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}