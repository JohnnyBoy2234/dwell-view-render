#!/bin/bash

# Deployment script for SwiftRent
# This script handles the dependency conflicts during deployment

echo "🚀 Starting SwiftRent deployment..."

# Install dependencies with conflict resolution
echo "📦 Installing dependencies..."
npm ci --legacy-peer-deps --ignore-scripts

# Build the project
echo "🔨 Building project..."
npm run build

echo "✅ Deployment preparation complete!"
