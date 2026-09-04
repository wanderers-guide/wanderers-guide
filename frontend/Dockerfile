# syntax=docker/dockerfile:1.7

# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --legacy-peer-deps

COPY . .

# Vite envs are baked in at build time. Pass via --build-arg or compose args.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_KEY
ARG VITE_ENV=production
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_KEY=$VITE_SUPABASE_KEY \
    VITE_ENV=$VITE_ENV

RUN npm run build

# ---- Runtime stage ----
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
