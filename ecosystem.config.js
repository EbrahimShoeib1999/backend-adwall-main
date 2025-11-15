module.exports = {
  apps: [
    {
      name: "server",
      script: "./server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
        PORT: 80,
        FRONTEND_URL: "https://www.adwallpro.com",
        BASE_URL: "https://www.adwallpro.com",

        DB_URI: "mongodb+srv://adwall:alA3LcGR3G8yXXkp@cluster0.tzc2ylz.mongodb.net/?appName=Cluster0",

        JWT_SECRET_KEY: "change_this_to_a_long_random_secret_!@#123ABCxyz789",
        JWT_EXPIRES_IN: "30d",

        EMAIL_HOST: "smtp.gmail.com",
        EMAIL_PORT: 587,
        EMAIL_USER: "your_email@gmail.com",
        EMAIL_PASSWORD: "your_app_specific_password_or_api_key",
        EMAIL_FROM: "noreply@adwall.com",

        ENABLE_EMAIL: true,

        GOOGLE_CLIENT_ID: "1098732852870-2835f3lk11h1c9htjvugnh58k2mvpj63.apps.googleusercontent.com",
        GOOGLE_CLIENT_SECRET: "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",
        GOOGLE_CALLBACK_URL: "https://www.adwallpro.com/api/auth/google/callback",
      },
    },
  ],
};
