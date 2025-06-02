
import { Router } from "express";
import { db } from "./db";
import { eq } from "drizzle-orm";

const router = Router();

// Knowledge base table schema (we'll add this to the database)
interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
  author: string;
}

// Mock data for now
const mockArticles: KnowledgeArticle[] = [
  {
    id: "1",
    title: "How to Install ITSM Agent on Windows",
    content: "Step-by-step guide for installing the ITSM agent on Windows systems...",
    category: "Installation",
    status: "published",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: "System Administrator"
  },
  {
    id: "2", 
    title: "Troubleshooting Connection Issues",
    content: "Common solutions for agent connectivity problems...",
    category: "Troubleshooting",
    status: "published",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: "Technical Support"
  },
  {
    id: "3",
    title: "Understanding Alert Severity Levels",
    content: "Guide to different alert types and their severity classifications...",
    category: "Alerts",
    status: "published",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: "System Administrator"
  }
];

// Get all articles
router.get("/", (req, res) => {
  res.json(mockArticles.filter(article => article.status === 'published'));
});

// Get article by ID
router.get("/:id", (req, res) => {
  const article = mockArticles.find(a => a.id === req.params.id);
  if (!article) {
    return res.status(404).json({ message: "Article not found" });
  }
  res.json(article);
});

// Create new article
router.post("/", (req, res) => {
  const { title, content, category } = req.body;
  const newArticle: KnowledgeArticle = {
    id: Date.now().toString(),
    title,
    content,
    category,
    status: "published",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: "System Administrator"
  };
  mockArticles.push(newArticle);
  res.status(201).json(newArticle);
});

export { router as knowledgeRoutes };
