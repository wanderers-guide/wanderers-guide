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
2. Run `npm install --global yarn`
3. Go into the `/frontend` directory
4. Run `yarn install`
5. While yarn installs, copy `.env.local.template` to `.env.local`
6. Paste the supabase url and key into `.env.local` (get these values from the project settings page)
7. Run `yarn dev`
