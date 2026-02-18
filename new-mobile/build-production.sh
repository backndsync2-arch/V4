#!/bin/bash
# Production APK build script

echo "🏭 Building Production APK with S3-Only Storage..."
echo "=================================================="

# Clean previous builds
echo "🧹 Cleaning previous builds..."
flutter clean

# Get dependencies
echo "📦 Getting dependencies..."
flutter pub get

# Build production APK
echo "🔨 Building production APK..."
flutter build apk --release --dart-define=PRODUCTION=true

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Production APK built successfully!"
    echo "📱 APK location: build/app/outputs/flutter-apk/app-release.apk"
    echo ""
    echo "🚀 Features in this build:"
    echo "   ✅ S3-only file storage (no local dependencies)"
    echo "   ✅ Multi-device compatible"
    echo "   ✅ Production-ready architecture"
    echo "   ✅ Presigned URL support for secure file access"
else
    echo "❌ Build failed! Check the error messages above."
    exit 1
fi