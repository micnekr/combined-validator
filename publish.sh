#!/bin/sh

set -e

clear

npm run test

tsc

# cp ./dist/index.js ./
# cp ./lib/index.ts ./

read -p "git message: " "GIT_MESSAGE"

git add .
git commit -m "$GIT_MESSAGE"
git status
git push

npm publish