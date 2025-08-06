FROM mcr.microsoft.com/playwright:v1.54.0-noble

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Install Playwright browsers (Chromium only for smaller image)
RUN npx playwright install chromium

# Create data directory
RUN mkdir -p /app/data

# Set proper permissions
RUN chown -R 1000:1000 /app

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "server.js"] 