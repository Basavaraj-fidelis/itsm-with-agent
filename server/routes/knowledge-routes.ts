import { Router } from 'express';
import { db } from '../db';
import { knowledgeBase, tickets } from '@shared/ticket-schema';
import { eq, and, or, sql, desc, ilike, count } from 'drizzle-orm';
import jwt from "jsonwebtoken";

import { TicketStorage } from "../services/ticket-storage";
import { knowledgeAIService } from "../services/knowledge-ai-service";

const router = Router();
const storage = new TicketStorage();

// Authentication middleware - make it optional for knowledge base
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // For knowledge base, we'll allow unauthenticated access to published articles
    req.user = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err: any, decoded: any) => {
    if (err) {
      console.error('Token verification error:', err);
      req.user = null;
    } else {
      req.user = decoded;
    }
    next();
  });
};

// Get all articles
router.get("/", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const filters = {
      category: req.query.category as string,
      search: req.query.search as string,
      status: (req.query.status as string) || "published"
    };

    console.log('KB Search filters:', filters);

    // Build query conditions
    const conditions = [];

    // Always filter by status (published articles only)
    conditions.push(eq(knowledgeBase.status, filters.status));

    // Add category filter if specified
    if (filters.category && filters.category !== 'all' && filters.category !== undefined) {
      conditions.push(eq(knowledgeBase.category, filters.category));
    }

    // Add search filter if specified
    if (filters.search && filters.search.trim() !== '') {
      const searchTerm = `%${filters.search.toLowerCase()}%`;
      conditions.push(
        or(
          like(knowledgeBase.title, searchTerm),
          like(knowledgeBase.content, searchTerm),
          like(knowledgeBase.category, searchTerm)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count for pagination
    const [{ total }] = await db
      .select({ total: count() })
      .from(knowledgeBase)
      .where(whereClause);

    // Get articles with pagination
    const articles = await db
      .select()
      .from(knowledgeBase)
      .where(whereClause)
      .orderBy(desc(knowledgeBase.helpful_votes), desc(knowledgeBase.views), desc(knowledgeBase.created_at))
      .limit(limit)
      .offset((page - 1) * limit);

    console.log(`Found ${articles.length} articles in database (total: ${total})`);

    const response = {
      data: articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching KB articles:", error);
    res.status(500).json({ 
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

function calculateRelevanceScore(article: any, searchTerms: string[]): number {
  const titleText = article.title.toLowerCase();
  const contentText = article.content.toLowerCase();
  const categoryText = (article.category || '').toLowerCase();

  let score = 0;

  searchTerms.forEach(term => {
    if (term.length > 2) {
      // Title matches are worth more
      if (titleText.includes(term)) score += 10;
      // Category matches are worth medium
      if (categoryText.includes(term)) score += 5;
      // Content matches are worth less
      if (contentText.includes(term)) score += 2;
    }
  });

  // Boost by helpful votes and views
  score += (article.helpful_votes || 0) * 0.5;
  score += (article.views || 0) * 0.1;

  return score;
}

// Get related articles based on header search, tags or category (must come before /:id route)
router.get('/related', async (req, res) => {
  try {
    const { tags, category, limit = '5', header, title } = req.query;

    console.log('Related articles request:', { tags, category, limit, header, title });

    // Priority 1: Header/Title based search
    if (header || title) {
      const searchText = (header || title) as string;
      const searchTextLower = searchText.toLowerCase();
      
      console.log(`Performing header-based search for: "${searchText}"`);

      // Extract meaningful words from the header/title
      const stopWords = ['the', 'is', 'not', 'can', 'cannot', 'will', 'with', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among', 'since', 'until', 'while', 'because', 'so', 'if', 'when', 'where', 'how', 'what', 'who', 'which', 'why', 'this', 'that', 'these', 'those'];
      
      const searchWords = searchTextLower
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.includes(word));

      console.log(`Search words: ${searchWords.join(', ')}`);

      if (searchWords.length > 0) {
        try {
          // Search for exact phrase first
          const exactMatches = await db
            .select()
            .from(knowledgeBase)
            .where(
              and(
                eq(knowledgeBase.status, 'published'),
                or(
                  ilike(knowledgeBase.title, `%${searchTextLower}%`),
                  ilike(knowledgeBase.content, `%${searchTextLower}%`)
                )
              )
            )
            .orderBy(desc(knowledgeBase.helpful_votes), desc(knowledgeBase.views))
            .limit(parseInt(limit as string, 10));

          if (exactMatches.length > 0) {
            console.log(`Found ${exactMatches.length} exact matches`);
            return res.json(exactMatches);
          }

          // Search by individual words if no exact matches
          const wordSearches = searchWords.map(word => 
            or(
              ilike(knowledgeBase.title, `%${word}%`),
              ilike(knowledgeBase.content, `%${word}%`)
            )
          );

          const wordMatches = await db
            .select()
            .from(knowledgeBase)
            .where(
              and(
                eq(knowledgeBase.status, 'published'),
                or(...wordSearches)
              )
            )
            .orderBy(desc(knowledgeBase.helpful_votes), desc(knowledgeBase.views))
            .limit(parseInt(limit as string, 10));

          console.log(`Found ${wordMatches.length} word-based matches`);
          return res.json(wordMatches);

        } catch (searchError) {
          console.error('Header search failed, falling back to tag search:', searchError);
        }
      }
    }

    // Priority 2: Tag-based search (fallback)
    let searchTags: string[] = [];
    if (tags) {
      searchTags = (tags as string).split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
    }

    // If no specific tags provided, try to find articles based on common keywords
    if (searchTags.length === 0) {
      searchTags = ['keyboard', 'mouse', 'troubleshooting', 'password', 'network'];
    }

    console.log('Falling back to tag search with tags:', searchTags);

    const articles = await knowledgeAIService.getRelatedArticles({
      tags: searchTags,
      category: category as string,
      limit: parseInt(limit as string, 10)
    });

    console.log(`Found ${articles.length} related articles via tag search`);
    res.json(articles);
  } catch (error) {
    console.error('Error fetching related articles:', error);
    res.status(500).json({ 
      message: 'Failed to fetch related articles',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get related articles by ticket ID using header-based string search
router.get('/related/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;

    // Get ticket details to extract header/title
    const ticket = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);

    if (!ticket.length) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticketData = ticket[0];
    const ticketTitle = ticketData.title.toLowerCase();
    
    console.log(`Searching KB articles for ticket title: "${ticketData.title}"`);

    // Extract meaningful words from ticket title (ignore common stop words)
    const stopWords = ['the', 'is', 'not', 'can', 'cannot', 'will', 'with', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among', 'since', 'until', 'while', 'because', 'so', 'if', 'when', 'where', 'how', 'what', 'who', 'which', 'why', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their'];
    
    const titleWords = ticketTitle
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));

    console.log(`Extracted words from title: ${titleWords.join(', ')}`);

    let relatedArticles: any[] = [];

    if (titleWords.length > 0) {
      // Search for articles using title words - prioritize exact phrase matches
      const exactPhraseSearch = ilike(knowledgeBase.title, `%${ticketTitle}%`);
      const exactContentSearch = ilike(knowledgeBase.content, `%${ticketTitle}%`);

      // Create individual word searches for title and content
      const titleWordSearches = titleWords.map(word => 
        ilike(knowledgeBase.title, `%${word}%`)
      );
      const contentWordSearches = titleWords.map(word => 
        ilike(knowledgeBase.content, `%${word}%`)
      );

      try {
        // First try exact phrase matches
        const exactMatches = await db
          .select()
          .from(knowledgeBase)
          .where(
            and(
              eq(knowledgeBase.status, 'published'),
              or(exactPhraseSearch, exactContentSearch)
            )
          )
          .orderBy(desc(knowledgeBase.helpful_votes), desc(knowledgeBase.views))
          .limit(3);

        relatedArticles.push(...exactMatches);
        console.log(`Found ${exactMatches.length} exact phrase matches`);

        // If we need more articles, search by individual words
        if (relatedArticles.length < 5) {
          const remainingLimit = 5 - relatedArticles.length;
          const existingIds = relatedArticles.map(a => a.id);

          const wordMatches = await db
            .select()
            .from(knowledgeBase)
            .where(
              and(
                eq(knowledgeBase.status, 'published'),
                sql`${knowledgeBase.id} NOT IN (${existingIds.length > 0 ? existingIds.map(() => '?').join(',') : 'NULL'})`,
                or(
                  ...titleWordSearches,
                  ...contentWordSearches
                )
              )
            )
            .orderBy(desc(knowledgeBase.helpful_votes), desc(knowledgeBase.views))
            .limit(remainingLimit);

          relatedArticles.push(...wordMatches);
          console.log(`Found ${wordMatches.length} additional word matches`);
        }

      } catch (searchError) {
        console.error('Header-based search failed:', searchError);
        
        // Fallback to simple text search
        relatedArticles = await db
          .select()
          .from(knowledgeBase)
          .where(
            and(
              eq(knowledgeBase.status, 'published'),
              or(
                ilike(knowledgeBase.title, `%${titleWords[0]}%`),
                ilike(knowledgeBase.content, `%${titleWords[0]}%`)
              )
            )
          )
          .orderBy(desc(knowledgeBase.helpful_votes))
          .limit(5);
      }
    }

    // If no matches found, return most helpful articles as fallback
    if (relatedArticles.length === 0) {
      console.log('No header-based matches found, returning top articles');
      relatedArticles = await db
        .select()
        .from(knowledgeBase)
        .where(eq(knowledgeBase.status, 'published'))
        .orderBy(desc(knowledgeBase.helpful_votes), desc(knowledgeBase.views))
        .limit(3);
    }

    console.log(`Returning ${relatedArticles.length} related articles for ticket: "${ticketData.title}"`);
    relatedArticles.forEach((article, index) => {
      console.log(`${index + 1}. "${article.title}" (helpful_votes: ${article.helpful_votes}, views: ${article.views})`);
    });

    res.json(relatedArticles || []);
  } catch (error) {
    console.error('Error fetching related articles:', error);
    res.status(500).json({ error: 'Failed to fetch related articles', details: error.message });
  }
});

// Get article by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const article = await storage.getKBArticleById(req.params.id);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }
    res.json(article);
  } catch (error) {
    console.error("Error fetching KB article:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Create new article
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { title, content, category } = req.body;
    const newArticle = {
      title,
      content,
      category,
      tags: [],
      author_email: "system@company.com",
      status: "published" as const,
      views: 0,
      helpful_votes: 0
    };

    const article = await storage.createKBArticle(newArticle);
    res.status(201).json(article);
  } catch (error) {
    console.error("Error creating KB article:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export { router as knowledgeRoutes };