# Testing Documentation

This project uses a comprehensive testing strategy covering both backend and frontend.

## Backend Testing

The backend uses **Jest** for testing.
- **Unit Tests**: `npm run test`
- **Integration/E2E Tests**: `npm run test:e2e`

### Prerequisites
- Docker must be running to spin up the test database.
- The E2E tests use a separate Postgres container defined in `docker-compose.test.yml`.

### Running E2E Tests
1. Ensure Docker is running.
2. Run the tests:
   ```bash
   cd backend
   # Start test DB (optional, the script handles it if configured, but manual start is safer)
   docker-compose -f ../docker-compose.test.yml up -d
   
   # Run tests
   DATABASE_URL="postgresql://test_user:test_password@localhost:5433/iso_doc_platform_test?schema=public" npm run test:e2e
   ```

### Notes
- The E2E tests use a real database.
- `PrismaTestHelper` is used to clean the database between tests.
- **Known Issue**: File upload tests might hang in some environments due to `multer`/`supertest` interaction.

## Frontend Testing

The frontend uses **Vitest** for unit/component tests and **Playwright** for E2E tests.

### Unit Tests
Run unit tests with Vitest:
```bash
cd frontend
npm run test
```

### E2E Tests
Run E2E tests with Playwright:
```bash
cd frontend
npm run test:e2e
```
This command will automatically start the Next.js dev server.

### Prerequisites
- Install Playwright browsers: `npx playwright install`

## CI/CD Integration
Ensure `OPENROUTER_API_KEY` is set in the environment if running tests that hit external APIs (though they should be mocked).
For E2E tests, ensure the database is accessible.
