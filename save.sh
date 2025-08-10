#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# 1. Add all changes
echo "Adding changes..."
git add .

# 2. Commit the changes with a timestamp
# Create a formatted date string
DATETIME=$(date +"%Y-%m-%d %H:%M:%S")
COMMIT_MESSAGE="Automated update: $DATETIME"

echo "Committing with message: '$COMMIT_MESSAGE'"
git commit -m "$COMMIT_MESSAGE"

# 3. Push the changes to the remote repository
echo "Pushing to remote..."
git push
echo "Update complete!"
