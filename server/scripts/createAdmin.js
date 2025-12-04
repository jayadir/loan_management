const bcrypt = require('bcryptjs');
const db = require('../db');

async function main() {
  const fullName = process.argv[2] || 'Admin User';
  const email = process.argv[3] || 'admin@example.com';
  const password = process.argv[4] || 'Admin@123';

  if (!email || !password) {
    console.log('Usage: node scripts/createAdmin.js "Full Name" email@example.com password');
    process.exit(1);
  }

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      console.log('User already exists:', email);
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    await db.query(
      'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [fullName, email, hash, 'admin']
    );

    console.log('Admin created successfully:', email);
    process.exit(0);
  } catch (err) {
    console.error('Failed to create admin:', err.message);
    process.exit(1);
  }
}

main();