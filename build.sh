#!/bin/bash
# build.sh - Railway build script

echo "🔧 Building POS System V3..."

# Build frontend
echo "📦 Building React frontend..."
cd frontend
npm install
npm run build
cd ..

echo "✅ Frontend build completed"
echo "📁 Frontend build files:"
ls -la frontend/build/

# Copy build to backend accessible location
echo "📂 Ensuring backend can access frontend build..."
mkdir -p backend/static
cp -r frontend/build/* backend/static/ 2>/dev/null || true

echo "🚀 Build process completed!"
