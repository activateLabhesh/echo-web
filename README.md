## Prerequisites

- Node.js 18.x or later
- Docker and Docker Compose
- npm or yarn package manager

## Getting Started

### Development with Docker

1. Clone the repository:

```bash
git clone https://github.com/IEEECS-VIT/echo-web
cd echo-web
```

2. Start the development server:

```bash
docker-compose up
```

The application will be available at http://localhost:3000

### Development without Docker

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

### Production Build

#### Using Docker

1. Build the Docker image:

```bash
docker build -t echo-web .
```

2. Run the container:

```bash
docker run -p 3000:3000 echo-web
```

#### Without Docker

1. Build the application:

```bash
npm run build
```

2. Start the production server:

```bash
npm start
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Docker Commands

- `docker-compose up` - Start development environment
- `docker-compose down` - Stop development environment
- `docker build -t echo-web .` - Build production image
- `docker run -p 3000:3000 echo-web` - Run production container
