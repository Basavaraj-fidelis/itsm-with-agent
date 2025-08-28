import type { Express } from "express";
import { CABService } from "../services/cab-service";
import { z } from "zod";
import { changeAdvisoryBoard, ticketApprovals } from "@shared/change-management-schema";
import { tickets } from "@shared/ticket-schema";

const createCABSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  chairperson_id: z.string(),
  members: z.array(z.string()),
  meeting_frequency: z.string().optional()
});

const approvalDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  comments: z.string().optional(),
  approver_id: z.string()
});

export function registerCABRoutes(app: Express) {
  // Get all CAB boards
  app.get("/api/cab/boards", async (req, res) => {
    try {
      const boards = await CABService.getCABBoards();
      res.json(boards);
    } catch (error) {
      console.error("Error fetching CAB boards:", error);
      res.status(500).json({ error: "Failed to fetch CAB boards" });
    }
  });

  // Create CAB board
  app.post("/api/cab/boards", async (req, res) => {
    try {
      const validatedData = createCABSchema.parse(req.body);
      const board = await CABService.createCABBoard(validatedData);
      res.status(201).json(board);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Error creating CAB board:", error);
      res.status(500).json({ error: "Failed to create CAB board" });
    }
  });

  // Update CAB board
  app.put("/api/cab/boards/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = createCABSchema.partial().parse(req.body);
      const board = await CABService.updateCABBoard(id, validatedData);
      res.json(board);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Error updating CAB board:", error);
      res.status(500).json({ error: "Failed to update CAB board" });
    }
  });

  // Get pending changes for approval
  app.get("/api/cab/pending-changes", async (req, res) => {
    try {
      const cabId = req.query.cab_id as string;
      const changes = await CABService.getPendingChanges(cabId);
      res.json(changes);
    } catch (error) {
      console.error("Error fetching pending changes:", error);
      res.status(500).json({ error: "Failed to fetch pending changes" });
    }
  });

  // Process approval decision
  app.post("/api/cab/approval/:ticketId", async (req, res) => {
    try {
      const { ticketId } = req.params;
      const validatedData = approvalDecisionSchema.parse(req.body);

      const result = await CABService.processApproval(
        ticketId,
        validatedData.approver_id,
        validatedData.decision,
        validatedData.comments
      );

      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Error processing approval:", error);
      res.status(500).json({ error: "Failed to process approval" });
    }
  });

  // Get approval history
  app.get("/api/cab/approval-history/:ticketId", async (req, res) => {
    try {
      const { ticketId } = req.params;
      const history = await CABService.getApprovalHistory(ticketId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching approval history:", error);
      res.status(500).json({ error: "Failed to fetch approval history" });
    }
  });

  // Auto-route change for approval
  app.post("/api/cab/auto-route/:ticketId", async (req, res) => {
    try {
      const { ticketId } = req.params;
      await CABService.autoRouteChange(ticketId);
      res.json({ message: "Change routed successfully" });
    } catch (error) {
      console.error("Error auto-routing change:", error);
      res.status(500).json({ error: "Failed to route change" });
    }
  });
}