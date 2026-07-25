import fs from 'fs';
import path from 'path';

// ponytail: Manually load env variables to avoid Next.js root inference bugs
try {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const index = trimmed.indexOf('=');
        const key = trimmed.substring(0, index).trim();
        const val = trimmed.substring(index + 1).trim();
        process.env[key] = val;
      }
    });
    console.log('Seeder successfully loaded env variables manually.');
  }
} catch (error) {
  console.error('Seeder failed to load env variables manually:', error);
}

async function seed() {
  console.log('Starting admin seeding...');
  
  const { connectDB } = await import('../src/lib/db');
  const User = (await import('../src/models/User')).default;
  const { hashPassword } = await import('../src/lib/auth');

  await connectDB();

  const adminEmail = process.env.ROOT_ADMIN_EMAIL || 'admin@digitalheroes.com';
  const adminPassword = process.env.ROOT_ADMIN_PASSWORD || 'admin122333';
  const adminName = 'Root Admin';

  const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });

  if (existingAdmin) {
    console.log(`Admin user with email ${adminEmail} already exists. Updating password...`);
    existingAdmin.passwordHash = await hashPassword(adminPassword);
    existingAdmin.active = true;
    await existingAdmin.save();
    console.log('Successfully updated existing admin password.');
    process.exit(0);
  }

  const passwordHash = await hashPassword(adminPassword);

  const adminUser = new User({
    name: adminName,
    email: adminEmail.toLowerCase(),
    passwordHash,
    role: 'admin',
    active: true,
  });

  await adminUser.save();
  console.log(`Successfully seeded root admin user:`);
  console.log(`Email: ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Error seeding admin user:', err);
  process.exit(1);
});
