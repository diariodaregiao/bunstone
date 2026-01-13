#!/bin/bash

# Script to build the Docker image for the bunstone-docs project

echo "================================================"
echo "Docker Build - Bunstone Docs"
echo "================================================"
echo ""

# Ask for version from user
read -p "What is the Docker image version? (ex: v1.0.1): " version

# Validate if version was provided
if [ -z "$version" ]; then
  echo "❌ Error: version cannot be empty"
  exit 1
fi

# Confirm before building
echo ""
echo "The build will be performed with the following tags:"
echo "  - diariowebsquad/bunstone-docs:$version"
echo "  - diariowebsquad/bunstone-docs:latest"
echo ""
read -p "Do you want to continue? (y/n): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "❌ Build canceled"
  exit 0
fi

echo ""
echo "🔨 Starting build..."
echo ""

# Execute the build
docker build -t diariowebsquad/bunstone-docs:$version -t diariowebsquad/bunstone-docs:latest .

# Check if the build was successful
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Build completed successfully!"
  echo ""
  echo "Images created:"
  echo "  - diariowebsquad/bunstone-docs:$version"
  echo "  - diariowebsquad/bunstone-docs:latest"
else
  echo ""
  echo "❌ Error building the image"
  exit 1
fi
