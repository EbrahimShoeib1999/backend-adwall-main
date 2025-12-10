const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env
const envPath = fs.existsSync(path.join(__dirname, 'env.txt')) ? 'env.txt' : '.env';
dotenv.config({ path: envPath });

const fixIndex = async () => {
  try {
    console.log('Connecting to DB...');
    await mongoose.connect(process.env.DB_URI);
    console.log('Connected.');

    const collection = mongoose.connection.collection('users');
    
    console.log('Dropping phone_1 index...');
    try {
        await collection.dropIndex('phone_1');
        console.log('Successfully dropped phone_1 index.');
    } catch (e) {
        console.log('Result:', e.message);
    }

    console.log('Index dropped. You can now restart the server.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

fixIndex();
