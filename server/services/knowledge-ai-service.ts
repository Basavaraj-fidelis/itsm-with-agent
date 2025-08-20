import { db } from "../db";
import { knowledgeBase } from "@shared/ticket-schema";
import { eq, like, or, desc } from "drizzle-orm";
import type { KnowledgeBaseArticle, NewKnowledgeBaseArticle } from "@shared/ticket-schema";

export interface TicketArticleMatch {
  article: KnowledgeBaseArticle;
  relevanceScore: number;
  matchReasons: string[];
}

export class KnowledgeAIService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.baseUrl = 'https://api.openai.com/v1';
  }

  private async callChatGPT(prompt: string): Promise<string> {
    if (!this.apiKey) {
      console.warn('OpenAI API key not configured, using fallback generation');
      return this.generateFallbackContent(prompt);
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an IT support expert creating knowledge base articles. Write clear, step-by-step solutions in markdown format.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || this.generateFallbackContent(prompt);
    } catch (error) {
      console.error('Error calling ChatGPT:', error);
      return this.generateFallbackContent(prompt);
    }
  }

  private generateFallbackContent(prompt: string): string {
    return `# IT Support Guide

## Issue Description
This article addresses common IT issues and provides step-by-step solutions.

## Troubleshooting Steps
1. Check basic connectivity and power
2. Restart affected services or devices
3. Check logs for error messages
4. Contact IT support if issue persists

## Additional Resources
- Check company IT policies
- Refer to vendor documentation
- Contact system administrator

*This article was auto-generated based on the reported issue.*`;
  }

  /**
   * Find relevant articles for a ticket
   */
  async findRelevantArticles(ticket: {
    title: string;
    description: string;
    category?: string;
    type: string;
    tags?: string[];
  }): Promise<TicketArticleMatch[]> {
    try {
      console.log('🔍 Finding relevant articles for ticket:', ticket.title);

      // Get all published articles
      const articles = await db
        .select()
        .from(knowledgeBase)
        .where(eq(knowledgeBase.status, "published"))
        .orderBy(desc(knowledgeBase.helpful_votes));

      console.log(`📚 Found ${articles.length} published articles in database`);

      if (!articles.length) {
        console.log('❌ No published articles found');
        return [];
      }

      const matches: TicketArticleMatch[] = [];
      const ticketText = `${ticket.title} ${ticket.description}`.toLowerCase();
      const ticketWords = this.extractKeywords(ticketText);

      console.log('🔤 Extracted keywords:', ticketWords);

      for (const article of articles) {
        const score = this.calculateRelevanceScore(ticket, article, ticketWords);

        if (score.score > 0.05) { // Very low threshold to catch more potential matches
          matches.push({
            article,
            relevanceScore: score.score,
            matchReasons: score.reasons
          });
        }
      }

      // Sort by relevance score (highest first) and limit to top 3
      const sortedMatches = matches
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 3);

      console.log(`✅ Found ${sortedMatches.length} relevant articles with scores:`, 
        sortedMatches.map(m => ({ 
          id: m.article.id, 
          title: m.article.title, 
          score: m.relevanceScore.toFixed(2),
          reasons: m.matchReasons 
        }))
      );

      return sortedMatches;

    } catch (error) {
      console.error("❌ Error finding relevant articles:", error);
      return [];
    }
  }

  /**
   * Generate a draft article from ticket content
   */
  async generateDraftArticle(ticketData: {
    title: string;
    description: string;
    category: string;
    type: string;
    tags: string[];
  }): Promise<KnowledgeBaseArticle | null> {
    try {
      console.log('Generating draft article for:', ticketData.title);

      // Create a detailed prompt for ChatGPT
      const prompt = `Create a comprehensive IT support knowledge base article for the following issue:

Title: ${ticketData.title}
Description: ${ticketData.description}
Category: ${ticketData.category}
Type: ${ticketData.type}
Tags: ${ticketData.tags.join(', ')}

Please provide:
1. A clear problem description
2. Step-by-step troubleshooting instructions
3. Common causes and solutions
4. Prevention tips
5. When to escalate to higher level support

Format the response in markdown with proper headings and bullet points.`;

      // Use ChatGPT to generate content
      const content = await this.callChatGPT(prompt);
      const title = this.generateArticleTitle(ticketData);
      const tags = this.generateArticleTags(ticketData);

      const articleData: NewKnowledgeBaseArticle = {
        title,
        content,
        category: ticketData.category || 'General',
        tags,
        author_email: 'system@company.com',
        status: 'draft',
        views: 0,
        helpful_votes: 0,
      };

      // Placeholder for actual storage logic; assuming ticketStorage.createKBArticle exists
      // const article = await ticketStorage.createKBArticle(articleData);
      // For now, let's simulate saving to the 'knowledgeBase' table directly if ticketStorage is not available
      const [createdArticle] = await db
        .insert(knowledgeBase)
        .values(articleData)
        .returning();

      console.log(`✅ Generated AI-powered draft article: ${createdArticle.title}`);
      return createdArticle;
    } catch (error) {
      console.error('Error generating draft article:', error);
      return null;
    }
  }

  /**
   * Calculate relevance score between ticket and article
   */
  private calculateRelevanceScore(
    ticket: any, 
    article: KnowledgeBaseArticle, 
    ticketWords: string[]
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    const articleTitle = article.title.toLowerCase();
    const articleContent = article.content.toLowerCase();
    const articleCategory = (article.category || "").toLowerCase();
    const ticketTitle = ticket.title.toLowerCase();
    const ticketCategory = (ticket.category || "").toLowerCase();

    // Direct title similarity (highest weight)
    const titleWords = ticketTitle.split(' ').filter(word => word.length > 2);
    const titleMatches = titleWords.filter(word => articleTitle.includes(word));
    if (titleMatches.length > 0) {
      score += titleMatches.length * 0.6;
      reasons.push(`Title matches: ${titleMatches.join(", ")}`);
    }

    // Category exact match (high weight)
    if (ticketCategory && articleCategory.includes(ticketCategory)) {
      score += 0.5;
      reasons.push("Category match");
    }

    // Content keyword matches
    const contentMatches = ticketWords.filter(word => 
      word.length > 2 && articleContent.includes(word)
    );
    if (contentMatches.length > 0) {
      score += contentMatches.length * 0.15;
      reasons.push(`Content keywords: ${contentMatches.slice(0, 3).join(", ")}`);
    }

    // Tags matching
    if (article.tags && Array.isArray(article.tags)) {
      const tagMatches = article.tags.filter(tag => 
        ticketWords.some(word => tag.toLowerCase().includes(word.toLowerCase()))
      );
      if (tagMatches.length > 0) {
        score += tagMatches.length * 0.2;
        reasons.push(`Tag matches: ${tagMatches.join(", ")}`);
      }
    }

    // Article quality boost
    score += (article.helpful_votes || 0) * 0.02;
    score += (article.views || 0) * 0.002;

    return { score, reasons };
  }

  /**
   * Extract meaningful keywords from text
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'are', 'as', 'was', 'will', 
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could', 'should', 
      'would', 'may', 'might', 'must', 'shall', 'am', 'were', 'been', 'i', 'me', 
      'my', 'you', 'your', 'he', 'she', 'it', 'we', 'they', 'them', 'this', 'that',
      'with', 'for', 'from', 'by', 'in', 'out', 'up', 'down', 'of', 'an', 'or',
      'but', 'not', 'no', 'so', 'if', 'when', 'where', 'why', 'how', 'all', 'any',
      'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own',
      'same', 'than', 'too', 'very', 'can', 'just', 'now', 'get', 'got', 'also'
    ]);

    // Tech-specific keywords that should be prioritized
    const techKeywords = [
      'keyboard', 'mouse', 'monitor', 'screen', 'password', 'login', 'network', 
      'wifi', 'internet', 'email', 'printer', 'computer', 'laptop', 'software',
      'hardware', 'application', 'browser', 'windows', 'mac', 'phone', 'mobile',
      'vpn', 'security', 'virus', 'malware', 'slow', 'crash', 'freeze', 'error',
      'update', 'install', 'connection', 'troubleshooting', 'troubleshoot'
    ];

    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    // Prioritize tech keywords
    const priorityWords = words.filter(word => techKeywords.includes(word));
    const otherWords = words.filter(word => !techKeywords.includes(word) && !priorityWords.includes(word));

    // Return priority words first, then other words
    return [...priorityWords, ...otherWords].slice(0, 20);
  }

  /**
   * Generate article content from ticket
   */
  private generateArticleContent(ticket: {
    title: string;
    description: string;
    category?: string;
    type: string;
  }): string {
    return `# ${ticket.title}

## Problem Description
${ticket.description}

## Troubleshooting Steps

### Step 1: Initial Diagnosis
1. Verify the issue symptoms carefully
2. Check for any recent changes or updates
3. Review error messages or logs if available
4. Document the exact steps that led to the issue

### Step 2: Basic Resolution
1. Restart the affected service/application
2. Check system resources (CPU, Memory, Disk space)
3. Verify network connectivity
4. Clear temporary files and cache if applicable

### Step 3: Advanced Troubleshooting
1. Check system logs for detailed error information
2. Review configuration settings and recent changes
3. Test with minimal configuration or safe mode
4. Run diagnostic tools specific to the ${ticket.category || 'system'}

### Step 4: Escalation Process
If the above steps don't resolve the issue:
1. Document all attempted solutions and their results
2. Gather comprehensive system information and logs
3. Take screenshots or recordings of the issue
4. Contact technical support with detailed information

## Prevention Measures
- Implement regular system maintenance schedules
- Keep software, drivers, and firmware updated
- Monitor system performance proactively
- Follow security best practices
- Create regular backups
- Document configuration changes

## Related Topics
- System troubleshooting fundamentals
- ${ticket.category || 'General'} maintenance procedures
- Performance optimization techniques
- Error diagnostic procedures

## Additional Resources
- System documentation
- Vendor support resources
- Community forums and knowledge bases
- Training materials for ${ticket.category || 'system management'}

---
*This article was automatically generated from support ticket: ${ticket.title}*  
*Category: ${ticket.category || 'General'}*  
*Issue Type: ${ticket.type}*  
*Generated on: ${new Date().toLocaleDateString()}*`;
  }

  /**
   * Generate title for article
   */
  private generateArticleTitle(ticket: {
    title: string;
    category?: string;
  }): string {
    return `How to Resolve: ${ticket.title}`;
  }

  /**
   * Generate tags for article
   */
  private generateArticleTags(ticket: {
    title: string;
    description: string;
    category?: string;
    type: string;
    tags?: string[];
  }): string[] {
    const tags = new Set<string>();

    // Add existing tags
    if (ticket.tags && Array.isArray(ticket.tags)) {
      ticket.tags.forEach(tag => tags.add(tag.toLowerCase()));
    }

    // Add category as tag
    if (ticket.category) {
      tags.add(ticket.category.toLowerCase().replace(/\s+/g, '-'));
    }

    // Add type as tag
    tags.add(ticket.type.toLowerCase().replace(/\s+/g, '-'));

    // Extract keywords from title and description
    const text = `${ticket.title} ${ticket.description}`.toLowerCase();
    const keywords = this.extractKeywords(text);
    keywords.slice(0, 5).forEach(keyword => tags.add(keyword));

    // Add common troubleshooting tags
    tags.add('troubleshooting');
    tags.add('support');
    tags.add('how-to');

    return Array.from(tags).slice(0, 10); // Increase to 10 tags
  }

  /**
   * Categorize ticket based on content
   */
  private categorizeTicket(ticket: {
    title: string;
    description: string;
    type: string;
  }): string {
    const text = `${ticket.title} ${ticket.description}`.toLowerCase();

    const categoryKeywords = {
      'Hardware': ['hardware', 'device', 'computer', 'laptop', 'desktop', 'monitor', 'keyboard', 'mouse', 'printer', 'scanner', 'disk', 'memory', 'ram', 'cpu', 'motherboard'],
      'Software': ['software', 'application', 'program', 'install', 'update', 'crash', 'error', 'bug', 'app', 'exe', 'installation'],
      'Network': ['network', 'internet', 'wifi', 'connection', 'router', 'vpn', 'firewall', 'ethernet', 'dns', 'ip', 'ping'],
      'Security': ['security', 'password', 'login', 'access', 'permission', 'virus', 'malware', 'antivirus', 'authentication', 'unauthorized'],
      'Email & Communication': ['email', 'outlook', 'exchange', 'mail', 'communication', 'messaging', 'smtp', 'pop', 'imap'],
      'System Performance': ['slow', 'performance', 'speed', 'freeze', 'hang', 'crash', 'memory', 'cpu', 'lag', 'timeout'],
      'Account Management': ['account', 'user', 'profile', 'settings', 'preferences', 'permissions', 'role', 'access'],
      'Troubleshooting': ['troubleshoot', 'diagnose', 'fix', 'repair', 'resolve', 'problem', 'issue', 'error']
    };

    let bestMatch = 'Other';
    let maxMatches = 0;

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      const matches = keywords.filter(keyword => text.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = category;
      }
    }

    return bestMatch;
  }

  async getRelatedArticles(params: {
    tags: string[];
    category?: string;
    limit: number;
  }): Promise<any[]> {
    try {
      const { tags, category, limit } = params;

      console.log('Searching for related articles with:', { tags, category, limit });

      // Get all published articles
      let query = db.select().from(knowledgeBase)
        .where(eq(knowledgeBase.status, 'published'))
        .orderBy(desc(knowledgeBase.helpful_votes), desc(knowledgeBase.views));

      const allArticles = await query;
      console.log(`Found ${allArticles.length} total published articles`);

      if (tags.length === 0) {
        return allArticles.slice(0, limit);
      }

      // Score articles based on tag and content matches
      const scoredArticles = allArticles.map(article => {
        const articleTags = Array.isArray(article.tags) ? article.tags : [];
        const articleTitle = (article.title || '').toLowerCase();
        const articleContent = (article.content || '').toLowerCase();

        let matchScore = 0;

        // Check tag matches
        tags.forEach(tag => {
          const tagLower = tag.toLowerCase();

          // Exact tag match (highest score)
          if (articleTags.some(articleTag => articleTag.toLowerCase() === tagLower)) {
            matchScore += 10;
          }
          // Partial tag match
          else if (articleTags.some(articleTag => 
            articleTag.toLowerCase().includes(tagLower) || tagLower.includes(articleTag.toLowerCase())
          )) {
            matchScore += 5;
          }

          // Title match
          if (articleTitle.includes(tagLower)) {
            matchScore += 3;
          }

          // Content match (lower weight)
          if (articleContent.includes(tagLower)) {
            matchScore += 1;
          }
        });

        // Category boost
        if (category && article.category === category) {
          matchScore += 2;
        }

        return { ...article, matchScore };
      });

      // Sort by match score, then by helpful_votes, then by views
      const sortedArticles = scoredArticles
        .filter(article => article.matchScore > 0)
        .sort((a, b) => {
          if (a.matchScore !== b.matchScore) {
            return b.matchScore - a.matchScore;
          }
          if ((b.helpful_votes || 0) !== (a.helpful_votes || 0)) {
            return (b.helpful_votes || 0) - (a.helpful_votes || 0);
          }
          return (b.views || 0) - (a.views || 0);
        });

      console.log(`Returning ${Math.min(sortedArticles.length, limit)} matched articles from ${sortedArticles.length} matches`);

      // Log the top matches for debugging
      sortedArticles.slice(0, limit).forEach((article, index) => {
        console.log(`Match ${index + 1}: "${article.title}" (score: ${article.matchScore}, tags: ${JSON.stringify(article.tags)})`);
      });

      return sortedArticles.slice(0, limit);
    } catch (error) {
      console.error('Error in getRelatedArticles:', error);
      throw error;
    }
  }
}

export const knowledgeAIService = new KnowledgeAIService();