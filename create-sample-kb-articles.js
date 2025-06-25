
const { drizzle } = require("drizzle-orm/node-postgres");
const { Client } = require("pg");
const { knowledgeBase } = require("./shared/ticket-schema");

async function createSampleKBArticles() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/fidelis_itsm",
  });

  try {
    await client.connect();
    const db = drizzle(client);

    const sampleArticles = [
      {
        title: "How to Reset Your Password",
        content: "Follow these steps to reset your password: 1. Go to login page 2. Click 'Forgot Password' 3. Enter your email 4. Check your email for reset link 5. Follow the instructions in the email",
        category: "Account Management",
        tags: ["password", "reset", "login", "account"],
        author_email: "admin@company.com",
        status: "published",
        views: 150,
        helpful_votes: 45
      },
      {
        title: "Troubleshooting Printer Issues",
        content: "Common printer problems and solutions: 1. Check if printer is turned on 2. Verify USB/network connection 3. Update printer drivers 4. Clear print queue 5. Restart printer service",
        category: "Hardware",
        tags: ["printer", "troubleshooting", "hardware"],
        author_email: "admin@company.com",
        status: "published",
        views: 200,
        helpful_votes: 60
      },
      {
        title: "VPN Connection Setup",
        content: "Setting up VPN connection: 1. Download VPN client 2. Import configuration file 3. Enter credentials 4. Connect to VPN 5. Verify connection",
        category: "Network",
        tags: ["vpn", "network", "connection", "setup"],
        author_email: "admin@company.com",
        status: "published",
        views: 120,
        helpful_votes: 35
      },
      {
        title: "Software Installation Guide",
        content: "How to install approved software: 1. Check software catalog 2. Submit installation request 3. Wait for approval 4. Download from approved source 5. Follow installation wizard",
        category: "Software",
        tags: ["software", "installation", "approval", "catalog"],
        author_email: "admin@company.com",
        status: "published",
        views: 180,
        helpful_votes: 50
      },
      {
        title: "Email Configuration",
        content: "Setting up email on various devices: 1. Gather email settings 2. Open email app 3. Add new account 4. Enter server settings 5. Test sending/receiving",
        category: "Email",
        tags: ["email", "configuration", "setup", "outlook"],
        author_email: "admin@company.com",
        status: "published",
        views: 95,
        helpful_votes: 28
      }
    ];

    for (const article of sampleArticles) {
      await db.insert(knowledgeBase).values(article);
      console.log(`Created article: ${article.title}`);
    }

    console.log("✅ Sample knowledge base articles created successfully!");
  } catch (error) {
    console.error("❌ Error creating sample articles:", error);
  } finally {
    await client.end();
  }
}

createSampleKBArticles();
