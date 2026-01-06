const jwt = require("jsonwebtoken");

const secret = "super-secret-jwt-token-with-at-least-32-characters-long";

const anonPayload = {
  role: "anon",
  iss: "supabase",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 10, // 10 years
  ref: "local",
};

const servicePayload = {
  role: "service_role",
  iss: "supabase",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 10, // 10 years
  ref: "local",
};

const anonToken = jwt.sign(anonPayload, secret);
const serviceToken = jwt.sign(servicePayload, secret);

console.log("ANON_KEY=" + anonToken);
console.log("SERVICE_ROLE_KEY=" + serviceToken);
