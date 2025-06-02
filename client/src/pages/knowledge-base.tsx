
import { useState } from "react";
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
  Tag
} from "lucide-react";

interface Article {
  id: string;
  title: string;
  content: string;
  author: string;
  category: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  views: number;
  likes: number;
  status: "published" | "draft";
}

export default function KnowledgeBase() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(false);

  // Mock data - replace with actual API call
  const [articles] = useState<Article[]>([
    {
      id: "1",
      title: "How to Reset Your Password",
      content: "Step-by-step guide to reset your account password...",
      author: "John Doe",
      category: "Account Management",
      tags: ["password", "account", "security"],
      created_at: "2024-01-15T10:00:00Z",
      updated_at: "2024-01-15T10:00:00Z",
      views: 245,
      likes: 12,
      status: "published"
    },
    {
      id: "2", 
      title: "Network Connectivity Issues",
      content: "Troubleshooting common network problems...",
      author: "Jane Smith",
      category: "Network",
      tags: ["network", "connectivity", "troubleshooting"],
      created_at: "2024-01-14T14:30:00Z",
      updated_at: "2024-01-14T14:30:00Z",
      views: 189,
      likes: 8,
      status: "published"
    },
    {
      id: "3",
      title: "Software Installation Guide",
      content: "Installing and configuring business software...",
      author: "Mike Johnson",
      category: "Software",
      tags: ["software", "installation", "configuration"],
      created_at: "2024-01-13T09:15:00Z",
      updated_at: "2024-01-13T09:15:00Z",
      views: 156,
      likes: 15,
      status: "published"
    }
  ]);

  const categories = [
    "all",
    "Account Management", 
    "Network",
    "Software",
    "Hardware",
    "Security",
    "Policies"
  ];

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || article.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
              Knowledge Base
            </h1>
            <p className="text-neutral-600">Browse articles and documentation</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Article
          </Button>
        </div>
      </div>

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

      {/* Articles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredArticles.map((article) => (
          <Card key={article.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <Badge variant="secondary" className="mb-2">
                  {article.category}
                </Badge>
                <Button variant="ghost" size="sm">
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
              <CardTitle className="text-lg line-clamp-2">
                {article.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-3 mb-4">
                {article.content}
              </p>
              
              {/* Tags */}
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

              <Separator className="mb-3" />
              
              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <div className="flex items-center space-x-2">
                  <User className="w-3 h-3" />
                  <span>{article.author}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    <Eye className="w-3 h-3" />
                    <span>{article.views}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <ThumbsUp className="w-3 h-3" />
                    <span>{article.likes}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(article.created_at)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredArticles.length === 0 && (
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
