#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# The custom message is read from the first command-line argument ($1).
USER_MESSAGE=$1

# Check if a custom message was provided. If not, exit with an error.
if [ -z "$USER_MESSAGE" ]; then
  echo "Error: No commit message was provided."
  exit 1
fi

# 1. Create a formatted date string for the timestamp.
DATETIME=$(date +"%Y-%m-%d %H:%M:%S")

# 2. Combine your custom message with the automated timestamp.
COMMIT_MESSAGE="$USER_MESSAGE | Automated update: $DATETIME"

# 3. Add all changes.
echo "Adding all changes..."
git add .

# 4. Commit the changes with the combined message.
echo "Committing with message: '$COMMIT_MESSAGE'"
git commit -m "$COMMIT_MESSAGE"

# 5. Push the changes to the remote repository.
echo "Pushing to remote repository..."
git push

echo "Publish to Git complete! 🎉"