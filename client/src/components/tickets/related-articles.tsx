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
      console.log('=== FETCHING RELATED ARTICLES ===');
      console.log('Ticket details:', {
        title: ticket.title,
        category: ticket.category,
        type: ticket.type
      });

      // Create search terms from ticket title and description
      const searchTerms = [
        ticket.title,
        ticket.category,
        ticket.type
      ].filter(Boolean).join(' ');

      console.log('Search terms:', searchTerms);

      // Use the API client for consistency
      let articlesData = [];

      try {
        // First, try to get articles using search
        if (searchTerms.trim()) {
          console.log('Trying search-based fetch...');
          const searchResponse = await api.get(`/knowledge-base?search=${encodeURIComponent(searchTerms)}&limit=5&status=published`);
          console.log('Search response:', searchResponse);

          if (searchResponse && Array.isArray(searchResponse) && searchResponse.length > 0) {
            articlesData = searchResponse.slice(0, 3);
            console.log('Found articles via search:', articlesData.length);
          }
        }

        // If no articles found with search, try category-based search
        if (articlesData.length === 0 && ticket.category) {
          console.log('Trying category-based fetch for category:', ticket.category);
          const categoryResponse = await api.get(`/knowledge-base?category=${encodeURIComponent(ticket.category)}&limit=3&status=published`);
          console.log('Category response:', categoryResponse);

          if (categoryResponse && Array.isArray(categoryResponse) && categoryResponse.length > 0) {
            articlesData = categoryResponse.slice(0, 3);
            console.log('Found articles via category:', articlesData.length);
          }
        }

        // Final fallback - get any published articles
        if (articlesData.length === 0) {
          console.log('Trying fallback fetch - any published articles...');
          const fallbackResponse = await api.get('/knowledge-base?limit=3&status=published');
          console.log('Fallback response:', fallbackResponse);

          if (fallbackResponse && Array.isArray(fallbackResponse)) {
            articlesData = fallbackResponse.slice(0, 3);
            console.log('Found articles via fallback:', articlesData.length);
          }
        }

        console.log('Final articles data:', articlesData);
        setArticles(articlesData);

      } catch (apiError) {
        console.error('API call failed:', apiError);
        setArticles([]);
      }
    } catch (error) {
      console.error('Error fetching related articles:', error);
      setArticles([]);
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