import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { BookOpen, ExternalLink, Search } from "lucide-react";

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  helpful_votes: number;
  views: number;
}

interface RelatedArticlesProps {
  ticket: {
    title: string;
    description: string;
    category?: string;
    type: string;
  };
}

export default function RelatedArticles({ ticket }: RelatedArticlesProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRelatedArticles();
  }, [ticket.title, ticket.category]);

  const fetchRelatedArticles = async () => {
    try {
      setLoading(true);

      // Create search terms from ticket title and description
      const searchTerms = [
        ticket.title,
        ticket.category,
        ticket.type
      ].filter(Boolean).join(' ');

      console.log('Fetching related articles with search terms:', searchTerms);

      // Use the same authentication approach as other API calls
      const token = localStorage.getItem('auth-token');
      if (!token) {
        console.error('No auth token found for KB articles');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      // Fetch articles with search terms using fetch directly
      const response = await fetch(`/api/knowledge-base?search=${encodeURIComponent(searchTerms)}&limit=5&status=published`, {
        method: 'GET',
        headers
      });

      console.log('Knowledge base API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Knowledge base articles data:', data);
        setArticles(Array.isArray(data) ? data.slice(0, 3) : []); // Show only top 3 related articles
      } else {
        console.error('Failed to fetch articles:', response.status, await response.text());
        // Try to fetch all articles as fallback
        const fallbackResponse = await fetch('/api/knowledge-base?limit=5&status=published', {
          method: 'GET',
          headers
        });
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          console.log('Fallback articles data:', fallbackData);
          setArticles(Array.isArray(fallbackData) ? fallbackData.slice(0, 3) : []);
        }
      }
    } catch (error) {
      console.error('Error fetching related articles:', error);
      // Try one more fallback without search
      try {
        const token = localStorage.getItem('auth-token');
        if (token) {
          const fallbackResponse = await fetch('/api/knowledge-base?limit=3&status=published', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            setArticles(Array.isArray(fallbackData) ? fallbackData : []);
          }
        }
      } catch (fallbackError) {
        console.error('Fallback fetch also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const getRelevanceScore = (article: Article) => {
    const ticketText = `${ticket.title} ${ticket.description}`.toLowerCase();
    const articleText = `${article.title} ${article.content}`.toLowerCase();

    // Simple keyword matching for relevance
    const ticketWords = ticketText.split(' ').filter(word => word.length > 3);
    const matches = ticketWords.filter(word => articleText.includes(word));

    return Math.min(100, Math.round((matches.length / ticketWords.length) * 100));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
            Related Help Articles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (articles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
            Related Help Articles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Search className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No related articles found for this ticket type.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => window.open('/knowledge-base', '_blank')}
            >
              Browse Knowledge Base
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
          Related Help Articles
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {articles.map((article) => {
            const relevance = getRelevanceScore(article);
            return (
              <div 
                key={article.id} 
                className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-sm text-blue-700 hover:text-blue-900 cursor-pointer">
                    {article.title}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {relevance}% match
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {article.content.substring(0, 120)}...
                </p>

                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <span>{article.category}</span>
                    <span>•</span>
                    <span>{article.views} views</span>
                    <span>•</span>
                    <span>{article.helpful_votes} helpful</span>
                  </div>

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs"
                    onClick={() => window.open(`/knowledge-base/${article.id}`, '_blank')}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => window.open(`/knowledge-base?search=${encodeURIComponent(ticket.title)}`, '_blank')}
          >
            <Search className="w-4 h-4 mr-2" />
            Search More Articles
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}