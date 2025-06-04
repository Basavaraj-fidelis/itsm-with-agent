
import { Router } from "express";
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
    res.json(result.data);
  } catch (error) {
    console.error("Error fetching KB articles:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

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
