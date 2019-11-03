# Motivation
This service is a part of picart services that intended to handle different sorts of files in the system. File data is stored in the MongoDB database.

# How to run

To run service locally you have two options:
- Run in the stable mode (default);
- Run in the development mode. In the development mode you'll have in place code reload on the change mechanism.

## Stable mode
```bash
docker-compose up -d  --build
```

## Development mode
```bash
docker-compose -f docker-compose.dev.yml up -d  --build
```