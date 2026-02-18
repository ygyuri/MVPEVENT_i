#!/bin/sh
set -e

# This entrypoint runs as root so it can create/fix permissions on mounted volumes,
# then drops privileges to the 'nodejs' user before exec-ing the app.
#
# Why this is needed:
#   docker-compose mounts the 'server_uploads' named volume at /app/uploads.
#   Named volumes are owned by root:root, so a non-root nodejs user cannot
#   create subdirectories inside them. We fix ownership here before the app starts.

# Create all required upload subdirectories
mkdir -p /app/uploads/communications \
         /app/uploads/organizer \
         /app/uploads/events \
         /app/uploads/temp

# Give the nodejs user ownership of the uploads tree
chown -R nodejs:nodejs /app/uploads

# Drop privileges and run the actual command (e.g. "npm start") as nodejs
exec su-exec nodejs "$@"
