# Use the official Nginx image as the base
FROM nginx:alpine

# Copy the static website files to the nginx default public folder
COPY public/ /usr/share/nginx/html

# Expose port 80 for normal web traffic
EXPOSE 80

# Nginx runs automatically
