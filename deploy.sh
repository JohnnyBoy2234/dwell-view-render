#!/bin/bash

# Deployment script for RentLekker
# This script handles the dependency conflicts during deployment

echo "🚀 Starting RentLekker deployment..."

# Install dependencies with conflict resolution
echo "📦 Installing dependencies..."
npm ci --legacy-peer-deps --ignore-scripts

# Build the project
echo "🔨 Building project..."
npm run build

echo "✅ Deployment preparation complete!"
