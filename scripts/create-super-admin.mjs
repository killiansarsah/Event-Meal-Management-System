#!/usr/bin/env node

/**
 * Super Admin Setup Script
 * 
 * This script creates a super admin user in your Supabase instance.
 * It will:
 * 1. Create a user in Supabase Auth with the provided email and password
 * 2. Create a default tenant for the super admin
 * 3. Create a users record with role 'super_admin'
 * 
 * Usage:
 *   node scripts/create-super-admin.mjs --email admin@example.com --password SecurePassword123
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing required environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
let email = '';
let password = '';
let fullName = 'Super Admin';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--email' && args[i + 1]) {
    email = args[i + 1];
  }
  if (args[i] === '--password' && args[i + 1]) {
    password = args[i + 1];
  }
  if (args[i] === '--name' && args[i + 1]) {
    fullName = args[i + 1];
  }
}

// Validate inputs
if (!email || !password) {
  console.error('❌ Error: Missing required arguments');
  console.error('');
  console.error('Usage:');
  console.error('  node scripts/create-super-admin.mjs --email admin@example.com --password SecurePassword123 [--name "Full Name"]');
  console.error('');
  console.error('Arguments:');
  console.error('  --email EMAIL       Email for the super admin (required)');
  console.error('  --password PASSWORD Password for the super admin (required)');
  console.error('  --name NAME         Full name for the super admin (optional, default: "Super Admin")');
  process.exit(1);
}

// Validate password strength
if (password.length < 8) {
  console.error('❌ Error: Password must be at least 8 characters long');
  process.exit(1);
}

// Initialize Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createSuperAdmin() {
  try {
    console.log('🚀 Creating super admin user...');
    console.log('   Email:', email);
    console.log('   Name:', fullName);
    console.log('');

    // Step 1: Create user in Supabase Auth
    console.log('📝 Step 1: Creating user in Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (authError) {
      if (authError.message.includes('already exists')) {
        console.error('❌ Error: User with this email already exists');
        console.error('');
        console.error('To reset an existing user, delete them from Supabase Auth and try again.');
      } else {
        console.error('❌ Error creating auth user:', authError.message);
      }
      process.exit(1);
    }

    const userId = authData.user?.id;
    if (!userId) {
      console.error('❌ Error: Failed to get user ID from auth creation');
      process.exit(1);
    }

    console.log('✅ Auth user created');
    console.log('   User ID:', userId);
    console.log('');

    // Step 2: Create a default tenant
    console.log('📝 Step 2: Creating default tenant...');
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: 'Default Tenant',
        email,
        phone: null,
        status: 'active',
        created_by: userId,
      })
      .select()
      .single();

    if (tenantError) {
      console.error('❌ Error creating tenant:', tenantError.message);
      process.exit(1);
    }

    const tenantId = tenantData?.id;
    if (!tenantId) {
      console.error('❌ Error: Failed to get tenant ID');
      process.exit(1);
    }

    console.log('✅ Tenant created');
    console.log('   Tenant ID:', tenantId);
    console.log('');

    // Step 3: Create users record with super_admin role
    console.log('📝 Step 3: Creating users record...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        tenant_id: tenantId,
        email,
        full_name: fullName,
        role: 'super_admin',
        status: 'active',
      })
      .select()
      .single();

    if (userError) {
      console.error('❌ Error creating user record:', userError.message);
      console.error('');
      console.error('Note: The auth user was created but the users record failed.');
      console.error('You may need to manually delete the auth user from Supabase.');
      process.exit(1);
    }

    console.log('✅ Users record created');
    console.log('');

    // Success!
    console.log('✅ Super admin created successfully!');
    console.log('');
    console.log('🎉 You can now sign in with:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('');
    console.log('📍 Next steps:');
    console.log('   1. Go to http://localhost:3000/login');
    console.log('   2. Enter your credentials');
    console.log('   3. You will be redirected to /admin');
    console.log('');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

// Run the script
createSuperAdmin();
