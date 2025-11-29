
const allowedOrigins = [
  "https://adwallpro.com",
  "https://www.adwallpro.com",
  "https://adwallpro.vercel.app", 
  "http://localhost:3000",
  "https://localhost:3000"
];

const req = {
  headers: {
    origin: 'https://adwallpro.vercel.app'
  },
  method: 'GET'
};

const res = {
  setHeader: (key, value) => {
    console.log(`setHeader: ${key} = ${value}`);
  },
  sendStatus: (code) => {
    console.log(`sendStatus: ${code}`);
  }
};

const next = () => {
  console.log('next() called');
};

console.log('Testing CORS middleware logic...');
const origin = req.headers.origin;

if (allowedOrigins.includes(origin)) {
  res.setHeader("Access-Control-Allow-Origin", origin);
} else {
  console.log('Origin NOT allowed');
}

res.setHeader("Access-Control-Allow-Credentials", "true");
res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

if (req.method === "OPTIONS") {
  res.sendStatus(204);
} else {
  next();
}
