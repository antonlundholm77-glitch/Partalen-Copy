/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Inkludera content/-filer i Vercel serverless-bundlar (fs.readFile på runtime).
  experimental: {
    outputFileTracingIncludes: {
      "/**": ["./content/**/*"],
    },
  },
  // Lokalt ligger repot i iCloud-synkade ~/Documents — iCloud flyttar/evakuerar
  // .next-filerna under build/dev → ENOENT + 404 på chunks. Mappar som slutar på
  // ".nosync" exkluderas av iCloud, så vi lägger output där LOKALT. På Vercel/CI
  // finns ingen iCloud och plattformen förväntar sig ".next" → default där.
  // (Tas bort helt om/när repot flyttas ut ur iCloud.)
  ...(process.env.VERCEL || process.env.CI ? {} : { distDir: ".next.nosync" }),
};

export default nextConfig;
