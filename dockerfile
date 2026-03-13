# What is Multi Staging in Docker
# Multi staging was created to compact complex frameworks like Nextjs
# Frameworks have to be compiled, transpiled, and bundled which
# take much storage and it will cost more in AWS to store.
# 
# The Build Stage: Bundle all the compilers and dev dependencies. 
# Get back optimized package like  Next.js .next/standalone folder or a NestJS dist folder.
# 
# (The Production Stage): You start a completely brand new, empty container. 
# Now only use the finalized package, and put it in the image.
# 

# This is an ultra-lightweight Linux operating system and set the base variable
FROM node:22-alpine AS base 
# Enable pnpm without having to manually download it
RUN corepack enable pnpm


# Create a new temporary environment
FROM base AS builder
# Move to the /app directory
WORKDIR /app
# Copy the package.json and the lock.yaml file to the root
COPY package.json pnpm-lock.yaml ./
# Install the heavy packages
RUN pnpm install --frozen-lockfile
# Copy the rest of the code 
COPY . .
# Run and create the build.
RUN pnpm build


# Fresh start with the essential to without the heavy dev tools from builder tools
FROM base AS runner
WORKDIR /app
# Run node.js with the fastest, most secure mode
ENV NODE_ENV=production

# Create a restricted nextjs user to run the app 
# with the absolute minimum privileges required
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Change user
USER nextjs

# Use only the final standalone files and public assets.
# Assign ownership of these files to nextjs user.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Turn on the Server
EXPOSE 3000
CMD ["node", "server.js"]