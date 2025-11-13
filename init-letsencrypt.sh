#!/bin/bash

# Script to initialize Let's Encrypt certificate

# --- Configuration ---
DOMAIN="fitiagrup4.dam.inspedralbes.cat"
EMAIL="a22jorrocdom@inspedralbes.cat"
DATA_PATH="./data/certbot"
RSA_KEY_SIZE=4096
# --- End Configuration ---

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check for required commands
if ! command_exists docker || ! command_exists "docker compose"; then
  echo "Error: 'docker' and 'docker compose' are required."
  exit 1
fi

# --- Main Logic ---

# Check if certificate already exists
if [ -d "$DATA_PATH/conf/live/$DOMAIN" ]; then
  echo "### Certificate for $DOMAIN already exists. Skipping creation. ###"
  echo "### To renew, run 'docker compose -f docker-compose.prod.yml run --rm certbot renew' ###"
  exit 0
}

echo "### Creating initial certificate for $DOMAIN ###"

# Create dummy certificate so Nginx can start
echo "### Creating dummy certificate for $DOMAIN ... ###"
path="/etc/letsencrypt/live/$DOMAIN"
mkdir -p "$DATA_PATH/conf/live/$DOMAIN"
docker compose -f docker-compose.prod.yml run --rm --entrypoint \
  openssl req -x509 -nodes -newkey rsa:$RSA_KEY_SIZE -days 1\
    -keyout '$path/privkey.pem' \
    -out '$path/fullchain.pem' \
    -subj '/CN=localhost'" certbot
echo

# Start Nginx
echo "### Starting Nginx ... ###"
docker compose -f docker-compose.prod.yml up --force-recreate -d nginx
echo

# Delete dummy certificate
echo "### Deleting dummy certificate for $DOMAIN ... ###"
docker compose -f docker-compose.prod.yml run --rm --entrypoint \
  rm -Rf /etc/letsencrypt/live/$DOMAIN && \
  rm -Rf /etc/letsencrypt/archive/$DOMAIN && \
  rm -Rf /etc/letsencrypt/renewal/$DOMAIN.conf" certbot
echo

# Request Let's Encrypt certificate
echo "### Requesting Let's Encrypt certificate for $DOMAIN ... ###"
# Join $domains to -d args
domain_args="-d $DOMAIN"

# Select appropriate email arg
case "$EMAIL" in
  "") email_arg="--register-unsafely-without-email" ;;
  *) email_arg="--email $EMAIL" ;;
esac

# Enable staging mode if needed
staging_arg=""
# staging_arg="--staging" # Uncomment for testing

docker compose -f docker-compose.prod.yml run --rm --entrypoint \
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    $email_arg \
    $domain_args \
    --rsa-key-size $RSA_KEY_SIZE \
    --agree-tos \
    --force-renewal" certbot
echo

# Reload Nginx to apply the new certificate
echo "### Reloading Nginx ... ###"
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

# Stop all services
echo "### Stopping all services ... ###"
docker compose -f docker-compose.prod.yml down

echo "### Initialization complete. You can now start the services with 'docker compose -f docker-compose.prod.yml up -d' ###"
