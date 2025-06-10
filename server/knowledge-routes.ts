import { Router } from "express";
import { db } from "./db";
import { knowledgeBase } from "@shared/ticket-schema";
import { eq, like, desc } from "drizzle-orm";
import { TicketStorage } from "./ticket-storage";

const router = Router();
const storage = new TicketStorage();

// Get all articles
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const filters = {
      category: req.query.category as string,
      search: req.query.search as string,
      status: (req.query.status as string) || "published"
    };

    const result = await storage.getKBArticles(page, limit, filters);
    
    // If search is provided, sort by relevance
    if (filters.search && result.data) {
      const searchTerms = filters.search.toLowerCase().split(' ');
      
      result.data.sort((a, b) => {
        const aRelevance = calculateRelevanceScore(a, searchTerms);
        const bRelevance = calculateRelevanceScore(b, searchTerms);
        return bRelevance - aRelevance;
      });
    }
    
    res.json(result.data);
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
router.get("/:id", async (req, res) => {
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
router.post("/", async (req, res) => {
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