# Multi-stage build for React app
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Add non-root user
RUN addgroup -g 1001 -S nginx
RUN adduser -S ecommerce -u 1001

# Change ownership
RUN chown -R ecommerce:nginx /usr/share/nginx/html
RUN chown -R ecommerce:nginx /var/cache/nginx
RUN chown -R ecommerce:nginx /var/log/nginx
RUN chown -R ecommerce:nginx /etc/nginx/conf.d
RUN touch /var/run/nginx.pid
RUN chown -R ecommerce:nginx /var/run/nginx.pid

USER ecommerce

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]