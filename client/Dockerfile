FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# With docker-compose volume ./client:/app, node_modules is a separate volume that may be empty.
# Install deps at start so @tiptap/react and other packages are present.
CMD ["sh", "-c", "npm install && npm run dev"] 