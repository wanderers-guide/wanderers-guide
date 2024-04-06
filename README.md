![Wanderer's Guide](https://wanderersguide.app/images/logo.png "Wanderer's Guide logo")

## Quick links

- [Legacy App Repo](https://github.com/wanderers-guide/wanderers-guide)
- [Web App](./frontend)
- [Serverless API](./supabase)

## Description

> This is currently undergoing significant changes as the remaster is being built from the legacy app. More updates will be coming soon!

To help contribute, currently go to the [Legacy App](https://github.com/wanderers-guide/wanderers-guide) and follow the README there. If you would like to contribute to the rework, come chat to us on the [Wanderers Guide Discord](https://discord.gg/kxCpa6G) and search tag `@developer` in the development channel.

## Setup

1. Install node.js using the instructions here: <https://nodejs.org/en/download>
2. Install the supabase CLI for your OS following the instructions: <https://supabase.com/docs/guides/cli/getting-started>
3. Run `supabase start` to initialize supabase locally
4. Go into the `/data` folder and run `./create-db.sh postgresql://postgres:postgres@127.0.0.1:54322/postgres`. This will create all the tables needed
5. Go into the `/frontend` directory
6. Copy `.env.local.template` to `.env.local` and paste the supabase url and anon key into `.env.local`. The default url to the supabase panel is <http://127.0.0.1:54323/>
7. Run `npm install`
8. Run `npm run dev`
9. In another terminal window run at the project root level `supabase functions serve` to initialize the backend
