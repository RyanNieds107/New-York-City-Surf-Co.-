# Local Development Setup

## Database Setup

This project requires a MySQL database. For local development, use Docker:

### 1. Start Local Database
```bash
docker-compose up -d
```

This starts a MySQL 8.0 database on port 3306.

### 2. Verify Database is Running
```bash
docker-compose ps
```

You should see `surf_forecast_mysql` in an "Up" state.

### 3. Start Development Server
```bash
pnpm dev
```

The server will:
- Connect to local MySQL (via `.env.local`)
- Run migrations automatically
- Start on http://localhost:3000

### Troubleshooting

**Connection Errors:**
- Ensure Docker is running
- Check database is up: `docker-compose ps`
- View database logs: `docker-compose logs mysql`

**Reset Database:**
```bash
docker-compose down -v  # Deletes all data
docker-compose up -d    # Starts fresh
```

**Connect to Database:**
```bash
docker exec -it surf_forecast_mysql mysql -uroot -plocaldevpassword railway
```

## Production Database

The production database (Railway) configuration remains in `.env`. Never commit `.env.local` to git.
