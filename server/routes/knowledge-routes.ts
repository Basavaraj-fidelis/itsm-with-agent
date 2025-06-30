import { Router } from "express";
import { eq, desc, like, and, count } from "drizzle-orm";
import jwt from "jsonwebtoken";

import { db } from "../db";
import { knowledgeSchema } from "@shared/knowledge-schema";
import { TicketStorage } from "../services/ticket-storage";

const router = Router();
const storage = new TicketStorage();

// Authentication middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err: any, decoded: any) => {
    if (err) {
      console.error('Token verification error:', err);
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = decoded;
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

    // Get articles directly from database
    let query = db.select().from(knowledgeBase);

    // Apply status filter
    if (filters.status) {
      query = query.where(eq(knowledgeBase.status, filters.status));
    }

    const articles = await query;
    console.log(`Found ${articles.length} articles in database`);

    let filteredArticles = articles;

    // Apply search filter
    if (filters.search) {
      const searchTerms = filters.search.toLowerCase().split(' ');
      filteredArticles = articles.filter(article => {
        const titleText = article.title.toLowerCase();
        const contentText = article.content.toLowerCase();
        const categoryText = (article.category || '').toLowerCase();

        return searchTerms.some(term => 
          titleText.includes(term) || 
          contentText.includes(term) || 
          categoryText.includes(term)
        );
      });

      // Sort by relevance
      filteredArticles.sort((a, b) => {
        const aRelevance = calculateRelevanceScore(a, searchTerms);
        const bRelevance = calculateRelevanceScore(b, searchTerms);
        return bRelevance - aRelevance;
      });
    }

    // Apply category filter
    if (filters.category && filters.category !== 'all') {
      filteredArticles = filteredArticles.filter(article => 
        article.category === filters.category
      );
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedArticles = filteredArticles.slice(startIndex, startIndex + limit);

    console.log(`Returning ${paginatedArticles.length} articles after filtering`);
    res.json(paginatedArticles);
  } catch (error) {
    console.error("Error fetching KB articles:", error);
    res.status(500).json({ message: "Internal server error" });
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

export { router as knowledgeRoutes };