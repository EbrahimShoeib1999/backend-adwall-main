const mongoose = require("mongoose");

// Suppress Mongoose strictQuery deprecation warning and prepare behavior for Mongoose v7.
// Set to false to allow filtering with fields not in schema (recommended when migrating),
// or set to true to opt-in to strict query filtering. Adjust as needed.
mongoose.set('strictQuery', false);

const dbConnection = () => {
  mongoose
    .connect(process.env.DB_URI)
    .then((conn) => {
      console.log(`Database Connected: ${conn.connection.host}`);
    })
    .catch((err) => {
      console.error(`Database Error: ${err}`);
      process.exit(1);
    });
};

module.exports = dbConnection;
