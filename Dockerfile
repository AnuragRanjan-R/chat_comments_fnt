# === STAGE 1: BUILD ===
# Use a Node.js image to build the Next.js application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
# This leverages Docker's layer caching
COPY package*.json ./
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the Next.js application for production
RUN npm run build

# === STAGE 2: RUNNER ===
# Use a clean, lightweight Node.js image for the final container
FROM node:20-alpine AS runner

WORKDIR /app

# Set the environment to production
ENV NODE_ENV=production

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm install --production

# Copy the built application from the 'builder' stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/package.json ./

# Expose the port the app runs on
EXPOSE 3000

# The command to start the Next.js production server
CMD ["npm", "start"]
