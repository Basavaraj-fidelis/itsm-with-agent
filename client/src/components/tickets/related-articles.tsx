import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, BookOpen } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  category: string;
  tags: string[];
  views: number;
  helpful_votes: number;
}

interface RelatedArticlesProps {
  ticketId: string;
  tags?: string[];
  category?: string;
}

export default function RelatedArticles({ ticketId, tags = [], category }: RelatedArticlesProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRelatedArticles() {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('auth_token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        // Extract meaningful tags from the ticket (keyboard, mouse, troubleshooting, etc.)
        const searchTags = [...tags];

        // Add category-based tags if available
        if (category) {
          searchTags.push(category.toLowerCase());
        }

        // Add common troubleshooting terms from ticket title if available
        const ticketElement = document.querySelector('[data-ticket-title]');
        const ticketTitle = ticketElement?.getAttribute('data-ticket-title') || '';
        if (ticketTitle) {
          const titleWords = ticketTitle.toLowerCase().split(/\s+/);
          const relevantWords = titleWords.filter(word => 
            word.length > 3 && 
            !['ticket', 'issue', 'problem', 'help'].includes(word)
          );
          searchTags.push(...relevantWords);
        }

        // Build query parameters for related articles
        const queryParams = new URLSearchParams();
        if (searchTags.length > 0) {
          queryParams.append('tags', searchTags.join(','));
        }
        queryParams.append('limit', '5');

        console.log('Fetching related articles with tags:', searchTags);

        const response = await fetch(`/api/knowledge/related?${queryParams.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Related articles API error:', response.status, errorText);
          throw new Error(`Failed to fetch related articles: ${response.status}`);
        }

        const data = await response.json();
        console.log('Related articles response:', data);
        setArticles(Array.isArray(data) ? data : data.articles || []);
      } catch (err) {
        console.error('Error fetching related articles:', err);
        setError(err instanceof Error ? err.message : 'Failed to load related articles');
        setArticles([]);
      } finally {
        setLoading(false);
      }
    }

    fetchRelatedArticles();
  }, [ticketId, tags, category]);

  const handleViewArticle = (articleId: string) => {
    window.open(`/knowledge-base?article=${articleId}`, '_blank');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5" />
            Related Help Articles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-500">Loading articles...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5" />
            Related Help Articles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline" 
              size="sm"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="w-5 h-5" />
          Related Help Articles
        </CardTitle>
      </CardHeader>
      <CardContent>
        {articles.length === 0 ? (
          <div className="text-center py-6">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-sm text-gray-500 mb-3">No related articles found for this ticket type.</p>
            <Button
              onClick={() => window.open('/knowledge-base', '_blank')}
              variant="outline"
              size="sm"
            >
              Browse Knowledge Base
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((article) => (
              <div
                key={article.id}
                className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <h4 className="font-medium text-sm mb-2 line-clamp-2">
                  {article.title}
                </h4>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                    {article.category}
                  </span>
                  <span>{article.views} views</span>
                </div>
                {article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {article.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                    {article.tags.length > 3 && (
                      <span className="text-xs text-gray-500">+{article.tags.length - 3}</span>
                    )}
                  </div>
                )}
                <Button
                  onClick={() => handleViewArticle(article.id)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <ExternalLink className="w-3 h-3 mr-2" />
                  View Article
                </Button>
              </div>
            ))}

            <div className="pt-3 border-t">
              <Button
                onClick={() => window.open('/knowledge-base', '_blank')}
                variant="ghost"
                size="sm"
                className="w-full"
              >
                Browse All Articles
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}