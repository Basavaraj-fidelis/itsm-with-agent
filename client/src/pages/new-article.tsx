
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Eye, FileText, Tag, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";

export default function NewArticle() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  
  const [article, setArticle] = useState({
    title: '',
    content: '',
    category: 'General',
    status: 'published' as const
  });

  const categories = [
    "General",
    "Account Management",
    "Hardware", 
    "Network",
    "Security",
    "Software",
    "Troubleshooting"
  ];

  const handleSubmit = async (isDraft = false) => {
    if (!article.title.trim() || !article.content.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both title and content",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
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
          title: article.title,
          content: article.content,
          category: article.category,
          tags: tags,
          author_email: 'admin@company.com',
          status: isDraft ? 'draft' : 'published',
          views: 0,
          helpful_votes: 0
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create article');
      }

      toast({
        title: "Success",
        description: `Article ${isDraft ? 'saved as draft' : 'published'} successfully`,
      });

      // Redirect back to knowledge base
      setLocation('/knowledge-base');
    } catch (error) {
      console.error('Error creating article:', error);
      toast({
        title: "Error",
        description: "Failed to create article",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const renderMarkdown = (content: string) => {
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

  return (
    <div className="p-6 max-w-full mx-auto px-8">
      {/* Header */}
      <div className="mb-6">
        <Link to="/knowledge-base">
          <Button variant="ghost" className="mb-4 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Knowledge Base
          </Button>
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200 mb-2">
              Create New Article
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Write a new help article for the knowledge base
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setPreviewMode(!previewMode)}
            >
              <Eye className="w-4 h-4 mr-2" />
              {previewMode ? 'Edit' : 'Preview'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleSubmit(true)}
              disabled={isLoading}
            >
              <FileText className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button 
              onClick={() => handleSubmit(false)}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Publishing...' : 'Publish Article'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 xl:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Article Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!previewMode ? (
                <>
                  {/* Title */}
                  <div>
                    <Label htmlFor="title" className="text-sm font-medium">Title *</Label>
                    <Input
                      id="title"
                      value={article.title}
                      onChange={(e) => setArticle({ ...article, title: e.target.value })}
                      placeholder="Enter article title"
                      className="mt-1"
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <Label htmlFor="content" className="text-sm font-medium">Content *</Label>
                    <Textarea
                      id="content"
                      value={article.content}
                      onChange={(e) => setArticle({ ...article, content: e.target.value })}
                      placeholder="Write your article content here... (Supports markdown)"
                      className="mt-1 min-h-[500px] font-mono"
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      Supports markdown: # Headers, **bold**, - lists, etc.
                    </p>
                  </div>
                </>
              ) : (
                /* Preview Mode */
                <div className="border rounded-lg p-6 bg-white dark:bg-gray-900 min-h-[600px]">
                  <h1 className="text-3xl font-bold mb-4 text-neutral-800 dark:text-neutral-200">
                    {article.title || "Article Title Preview"}
                  </h1>
                  <div className="prose prose-neutral dark:prose-invert max-w-none">
                    {article.content ? renderMarkdown(article.content) : (
                      <p className="text-neutral-500 italic">Article content will appear here...</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 xl:col-span-1 space-y-6">
          {/* Article Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Article Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Category */}
              <div>
                <Label className="text-sm font-medium">Category</Label>
                <Select value={article.category} onValueChange={(value) => setArticle({ ...article, category: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <Select value={article.status} onValueChange={(value: 'published' | 'draft') => setArticle({ ...article, status: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">✅ Published</SelectItem>
                    <SelectItem value="draft">📝 Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex space-x-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag"
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                />
                <Button size="sm" onClick={addTag} disabled={!newTag.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="flex items-center space-x-1">
                      <Tag className="w-3 h-3" />
                      <span>{tag}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 ml-1"
                        onClick={() => removeTag(tag)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Writing Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Writing Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
              <p>• Use clear, concise language</p>
              <p>• Include step-by-step instructions</p>
              <p>• Add screenshots when helpful</p>
              <p>• Use headings to organize content</p>
              <p>• Include troubleshooting tips</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
