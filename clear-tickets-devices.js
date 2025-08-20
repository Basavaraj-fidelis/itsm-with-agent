
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { tickets, ticketComments, ticketAttachments } from './shared/ticket-schema.js';
import { devices, device_reports, alerts, usb_devices } from './shared/schema.js';

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = postgres(connectionString);
const db = drizzle(sql);

async function clearTicketsAndDevices() {
  try {
    console.log('🗑️  Clearing tickets and devices data...');
    
    // Clear ticket-related data
    console.log('Clearing ticket comments...');
    await db.delete(ticketComments);
    
    console.log('Clearing ticket attachments...');
    await db.delete(ticketAttachments);
    
    console.log('Clearing tickets...');
    await db.delete(tickets);
    
    // Clear device-related data
    console.log('Clearing USB devices...');
    await db.delete(usb_devices);
    
    console.log('Clearing device reports...');
    await db.delete(device_reports);
    
    console.log('Clearing alerts...');
    await db.delete(alerts);
    
    console.log('Clearing devices...');
    await db.delete(devices);
    
    console.log('✅ Successfully cleared all tickets and devices data');
    console.log('👥 User data has been preserved');
    
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run the script
clearTicketsAndDevices()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
