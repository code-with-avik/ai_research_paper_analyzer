const config = {
  // Keep production builds separate from a running `next dev` server on Windows.
  distDir: process.env.NODE_ENV === "production" ? ".next-production" : ".next",
};

export default config;
