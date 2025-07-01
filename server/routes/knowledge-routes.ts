import { Router } from 'express';
import { db } from '../db';
import { knowledgeBase, tickets } from '@shared/ticket-schema';
import { eq, and, or, sql, desc, ilike } from 'drizzle-orm';
import jwt from "jsonwebtoken";

import { TicketStorage } from "../services/ticket-storage";

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

// Get related articles by tags
router.get('/related/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;

    // Get ticket details to extract tags
    const ticket = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);

    if (!ticket.length) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticketData = ticket[0];
    let searchTags: string[] = [];

    // Extract tags from ticket category, priority, and description
    if (ticketData.category) {
      searchTags.push(ticketData.category.toLowerCase());
    }

    if (ticketData.priority) {
      searchTags.push(ticketData.priority.toLowerCase());
    }

    // Extract keywords from title and description
    const text = `${ticketData.title} ${ticketData.description || ''}`.toLowerCase();
    const keywords = text.match(/\b\w{4,}\b/g) || [];
    searchTags.push(...keywords.slice(0, 5)); // Limit to 5 keywords

    // Remove duplicates and empty strings
    searchTags = [...new Set(searchTags.filter(tag => tag && tag.length > 0))];

    let relatedArticles: any[] = [];

    if (searchTags.length > 0) {
      // Search for articles with matching tags using proper PostgreSQL array operators
      try {
        const tagQueries = searchTags.map(tag => 
          sql`${knowledgeBase.tags}::jsonb ? ${tag}`
        );

        relatedArticles = await db
          .select()
          .from(knowledgeBase)
          .where(
            and(
              eq(knowledgeBase.status, 'published'),
              or(...tagQueries)
            )
          )
          .orderBy(desc(knowledgeBase.helpful_votes))
          .limit(5);
      } catch (tagError) {
        console.warn('Tag-based search failed, falling back to text search:', tagError);

        // Fallback to text-based search
        const textSearchConditions = searchTags.map(tag => 
          or(
            ilike(knowledgeBase.title, `%${tag}%`),
            ilike(knowledgeBase.content, `%${tag}%`),
            ilike(knowledgeBase.category, `%${tag}%`)
          )
        );

        relatedArticles = await db
          .select()
          .from(knowledgeBase)
          .where(
            and(
              eq(knowledgeBase.status, 'published'),
              or(...textSearchConditions)
            )
          )
          .orderBy(desc(knowledgeBase.helpful_votes))
          .limit(5);
      }
    }

    // If no related articles found, return top articles by category
    if (relatedArticles.length === 0 && ticketData.category) {
      relatedArticles = await db
        .select()
        .from(knowledgeBase)
        .where(
          and(
            eq(knowledgeBase.status, 'published'),
            eq(knowledgeBase.category, ticketData.category)
          )
        )
        .orderBy(desc(knowledgeBase.helpful_votes))
        .limit(3);
    }

    // If still no articles, return top articles overall
    if (relatedArticles.length === 0) {
      relatedArticles = await db
        .select()
        .from(knowledgeBase)
        .where(eq(knowledgeBase.status, 'published'))
        .orderBy(desc(knowledgeBase.helpful_votes))
        .limit(3);
    }

    res.json(relatedArticles || []);
  } catch (error) {
    console.error('Error fetching related articles:', error);
    res.status(500).json({ error: 'Failed to fetch related articles', details: error.message });
  }
});

export { router as knowledgeRoutes };