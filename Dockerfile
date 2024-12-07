# Use an official Node.js runtime as a parent image
FROM node:18-slim

# Set the working directory in the container
WORKDIR /usr/src/app

ENV PORT 8080
ENV HOST 0.0.0.0
# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose port 8080 (the default port Cloud Run expects)
EXPOSE 8080

# Define the command to run the app
CMD ["node", "src/app.js"]