
import { ticketStorage } from "./server/ticket-storage.js";

async function testTicketsAPI() {
  try {
    console.log("🧪 Testing tickets API...");
    
    // Test getting tickets
    console.log("1. Testing getTickets...");
    const result = await ticketStorage.getTickets(1, 10);
    console.log("✅ getTickets result:", {
      total: result.total,
      dataLength: result.data?.length || 0,
      page: result.page,
      totalPages: result.totalPages
    });
    
    if (result.data && result.data.length > 0) {
      console.log("📋 Sample ticket:", {
        id: result.data[0].id,
        ticket_number: result.data[0].ticket_number,
        title: result.data[0].title,
        type: result.data[0].type,
        status: result.data[0].status
      });
    } else {
      console.log("⚠️ No tickets found in database");
    }
    
  } catch (error) {
    console.error("❌ Error testing tickets API:", error);
  }
}

testTicketsAPI();
