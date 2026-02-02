# Claude Project Guidelines

## Commit Messages

Use **gitmoji** for all commits. Format: `<emoji> <message>`

Common gitmojis:
- ✨ `:sparkles:` - New feature
- 🐛 `:bug:` - Bug fix
- 🔥 `:fire:` - Remove code/files
- 📝 `:memo:` - Documentation
- 💄 `:lipstick:` - UI/style updates
- ♻️ `:recycle:` - Refactor
- 🚀 `:rocket:` - Deploy
- 🔧 `:wrench:` - Config changes
- ✅ `:white_check_mark:` - Add tests
- 🏗️ `:building_construction:` - Architecture changes
- ⬆️ `:arrow_up:` - Upgrade dependencies
- 🔒 `:lock:` - Security fix
- 🚧 `:construction:` - Work in progress

Examples:
```
✨ Add beatmap search to Explore page
🐛 Fix auth redirect loop
🔧 Update CloudFront cache settings
```

## Deployment

Push to `main` triggers automatic deployment to staging via GitHub Actions.

Manual deploy to prod: Go to Actions → Deploy PackShare → Run workflow → Select "prod"
