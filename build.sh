#!/bin/bash
# Cloudflare Pages build script

echo "📦 Installing dependencies..."
cd frontend
npm install

echo "🔨 Building frontend..."
npm run build

echo "✅ Build completed!"
echo "Output directory: frontend/dist"
ls -la dist/
