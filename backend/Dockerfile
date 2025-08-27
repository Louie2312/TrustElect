FROM node:18-alpine

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ linux-headers

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies and rebuild bcrypt
RUN npm ci --only=production
RUN npm rebuild bcrypt --build-from-source

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p uploads public/uploads

# Set proper permissions
RUN chown -R node:node /app
USER node

EXPOSE 5000

CMD ["npm", "start"]