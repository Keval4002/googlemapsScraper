#!/bin/bash

echo "🔧 Rebuilding Docker image for Google Maps Scraper..."
echo ""

# Stop any running containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Remove old images
echo "🗑️  Removing old images..."
docker rmi $(docker images -q google-maps-scraper_scraper) 2>/dev/null || true

# Rebuild the image
echo "🏗️  Building new Docker image..."
docker-compose build --no-cache

# Test the build
echo "🧪 Testing the build..."
docker-compose up -d

# Wait for the container to start
echo "⏳ Waiting for container to start..."
sleep 10

# Test the health endpoint
echo "🏥 Testing health endpoint..."
curl -f http://localhost:3000/health || {
    echo "❌ Health check failed!"
    echo "📋 Container logs:"
    docker-compose logs scraper
    exit 1
}

echo "✅ Health check passed!"
echo ""

# Show container status
echo "📊 Container status:"
docker-compose ps

echo ""
echo "🎉 Docker rebuild complete!"
echo "🌐 Your application should be available at: http://localhost:3000"
echo ""
echo "📋 To view logs: docker-compose logs -f scraper"
echo "🛑 To stop: docker-compose down" 