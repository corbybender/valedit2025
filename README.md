# valedit2025

A modern, scalable Content Management System built with Node.js, Express, and MSSQL.

## Project Structure

```
src/                    # Main application code (CURRENT)
├── config/             # Application configuration
├── controllers/        # Request handlers
├── middleware/         # Express middleware
├── routes/             # API and web routes
├── services/           # Business logic
├── utils/              # Helper functions
└── validators/         # Input validation

tests/                  # Jest test files
public/                 # Static assets (CSS, JS, images)
views/                  # EJS templates
legacy/                 # Legacy code (REFERENCE ONLY - not used)
```

## Development Commands

```bash
npm start              # Production server
npm run dev            # Development server with port kill
npm run dev:safe       # Development server with nodemon
npm test               # Run Jest tests
```

## Git Commands

```bash
git add .
git commit -m "Bug fix"
git push
```

## Reverting Changes
```bash
git log --oneline
git revert <commit_hash>
```

## Important Notes

- **Current Code**: All active code is in `/src/` following MVC architecture
- **Legacy Code**: Old files moved to `/legacy/` for reference - DO NOT MODIFY
- **Tests**: All tests are in `/tests/` folder and run with Jest
