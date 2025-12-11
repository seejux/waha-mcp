#!/usr/bin/env node

/**
 * Demo: Multi-Session Management
 * Shows how to work with multiple WhatsApp accounts
 */

import { WAHAClient } from './dist/client/waha-client.js';
import dotenv from 'dotenv';

dotenv.config();

async function demoMultiSession() {
  console.log('🚀 WAHA Multi-Session Management Demo\n');
  console.log('=' .repeat(60));
  
  const client = new WAHAClient(
    process.env.WAHA_BASE_URL,
    process.env.WAHA_API_KEY
  );

  try {
    // Step 1: List all sessions
    console.log('\n📋 Step 1: Listing all sessions\n');
    const sessions = await client.listSessions('default', { all: true });
    console.log(`Found ${sessions.length} sessions:\n`);
    
    sessions.forEach((session, index) => {
      console.log(`${index + 1}. ${session.name}`);
      console.log(`   Status: ${session.status}`);
      if (session.me) {
        console.log(`   Phone: ${session.me.id}`);
        console.log(`   Name: ${session.me.pushName}`);
      }
      console.log();
    });

    // Step 2: Get detailed info for each session
    console.log('=' .repeat(60));
    console.log('\n📊 Step 2: Detailed session information\n');
    
    for (const session of sessions.slice(0, 3)) { // Just first 3 for demo
      try {
        const info = await client.getSession(session.name, {});
        console.log(`Session: ${session.name}`);
        console.log(`  Status: ${info.status}`);
        
        if (info.me) {
          console.log(`  Account: ${info.me.pushName} (${info.me.id})`);
        }
        
        // Get chats count
        const chats = await client.getChatsOverview(session.name, { limit: 1 });
        console.log(`  Has chats: ${chats.length > 0 ? 'Yes' : 'No'}`);
        console.log();
      } catch (error) {
        console.log(`  ⚠️  Error: ${error.message}\n`);
      }
    }

    // Step 3: Demonstrate switching between sessions
    console.log('=' .repeat(60));
    console.log('\n🔄 Step 3: Switching between sessions\n');
    
    const activeSessions = sessions.filter(s => s.status === 'WORKING');
    
    if (activeSessions.length >= 2) {
      const session1 = activeSessions[0].name;
      const session2 = activeSessions[1].name;
      
      console.log(`Querying ${session1}...`);
      const chats1 = await client.getChatsOverview(session1, { limit: 1 });
      console.log(`  ✅ Got ${chats1.length} chat(s)\n`);
      
      console.log(`Querying ${session2}...`);
      const chats2 = await client.getChatsOverview(session2, { limit: 1 });
      console.log(`  ✅ Got ${chats2.length} chat(s)\n`);
      
      console.log('✨ Successfully switched between sessions!');
    }

    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('\n🎉 Multi-Session Demo Complete!\n');
    console.log('Key Capabilities Demonstrated:');
    console.log('  ✅ List all sessions on server');
    console.log('  ✅ Get detailed info for specific sessions');
    console.log('  ✅ Query different sessions independently');
    console.log('  ✅ Switch between sessions seamlessly');
    console.log();
    console.log('💡 This enables:');
    console.log('  • Managing multiple WhatsApp accounts');
    console.log('  • Bulk operations across accounts');
    console.log('  • Independent session configuration');
    console.log('  • Flexible routing and load balancing');
    console.log();

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

demoMultiSession();
