/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingIncludes: {
    '/*': [
      './prisma/**/*',
      './src/lib/**/*'
    ],
  },
}

module.exports = nextConfig