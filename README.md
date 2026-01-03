# D&D 5e Character Builder

A dynamic character sheet application for Dungeons and Dragons 5th Edition (2024 Revision), built with Next.js, Postgres, and Drizzle ORM.

## Prerequisites

- Node.js 18+
- Docker (for local Postgres database)

## Setup

### 1. Database Setup
Start the local database and admin interface using Docker Compose:

```bash
docker-compose up -d
```

This starts:
- **Postgres** on port `5432`
- **Adminer** (DB GUI) on port `8080` (accessible at http://localhost:8080)

### 2. Environment Configuration
Copy the example environment file:

```bash
cp .env.example .env
```

Ensure the `DATABASE_URL` in `.env` matches your Docker configuration:
```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/dnd_character_db
```

### 3. Database Initialization
Push the schema to the database:

```bash
npx drizzle-kit push
```

### 4. Seed Data
Populate the database with SRD rules (Classes, Spells, etc.) and a test character:

```bash
# Import Rules (Classes, Subclasses, Spells)
npx tsx scripts/seed.ts

# Create Test Character (Level 5 Wizard with Items)
npx tsx scripts/seed-character.ts
```

## Running the Application

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser. 
You can view the test character at `/character/1`.

## Features
- **Dynamic Character Sheet**: Real-time HP tracking and state management.
- **Database Persistence**: All changes are saved to Postgres via Server Actions.
- **Rules Integration**: Browse spells and verify inventory against 5e rules.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Styling**: Tailwind CSS + Shadcn/UI
- **State**: Zustand (Client) + Server Actions


## Credits
- [DLtheDM](https://www.reddit.com/user/DLtheDM) for the [reference file](https://www.reddit.com/r/DnD/comments/1fa7bu9/formfillable_2024_character_sheet/)
 