import { Router } from "express";
import jwt from "jsonwebtoken";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Notifications endpoint
router.get("/", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.id;

      // Get tickets from database for notifications
      const { db } = await import("../db");
      const { desc } = await import("drizzle-orm");
      const { tickets } = await import("@shared/ticket-schema");

      const ticketsList = await db
        .select()
        .from(tickets)
        .orderBy(desc(tickets.updated_at));

      const userTickets = ticketsList.filter(
        (ticket) =>
          ticket.assigned_to === userId ||
          ticket.requester_email === decoded.email,
      );

      // Create notifications for recent ticket updates
      const notifications = userTickets
        .filter((ticket) => {
          const updatedAt = new Date(ticket.updated_at);
          const now = new Date();
          const diffHours = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
          return diffHours <= 24; // Only show notifications for tickets updated in last 24 hours
        })
        .map((ticket) => ({
          id: ticket.id,
          type: "ticket_update",
          title: `Ticket ${ticket.ticket_number} updated`,
          message: `${ticket.title} - Status: ${ticket.status}`,
          timestamp: ticket.updated_at,
          read: false,
        }));

      res.json(notifications);
    } catch (jwtError) {
      return res.status(401).json({ error: "Invalid token" });
    }
  } catch (error) {
    console.error("Error fetching tickets for notifications:", error);
    res.json([]); // Return empty array on error to prevent client issues
  }
});

router.post("/:id/read", async (req, res) => {
  try {
    const notificationId = req.params.id;
    // In a real implementation, you'd store read status in database
    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/mark-all-read", async (req: any, res) => {
  try {
    const userId = req.user.id;
    console.log(`Marking all notifications as read for user: ${userId}`);

    res.json({
      message: "All notifications marked as read",
      success: true,
      markedCount: 0, // Would be actual count in real implementation
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const notificationId = req.params.id;
    // In a real implementation, you'd delete the notification from database
    res.json({ message: "Notification deleted" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;