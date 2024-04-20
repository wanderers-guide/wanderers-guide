![Wanderer's Guide](https://legacy.wanderersguide.app/images/logo.png "Wanderer's Guide logo")

## Quick links

- [Legacy App Repo](https://github.com/wanderers-guide/wanderers-guide-legacy)
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

### Creating a user

To properly access the website you need to register a user.

1. First go to the local supabase studio page at <http://127.0.0.1:54323>
2. In the authentication page, create a new user with email and password. Copy the User UUID generated
3. Create a file named `user.csv` in your computer with the following content. Remember to substitute the "UUID HERE" string for the User UUID generate in step 2:

```csv
id,created_at,user_id,display_name,image_url,background_image_url,site_theme,is_admin,is_mod,deactivated,summary,subscribed_content_sources,patreon,organized_play_id
1,2024-04-03 21:30:01.720023+00,UUID HERE,User name,,,,false,false,false,,,,
```

4. Go to the Table Editor page and select the `public_user` table. Insert the CSV in the table
5. Login with the email and password
