---
description: Project technical stack definition (Backend Focus)
alwaysApply: true
---
# Technical Stack

## Backend Core (Spring Boot)
- Language: Java 21 (LTS)
- Framework: Spring Boot 4.0.0
- Build Tool: Gradle (Kotlin DSL recommended)
- Database: MySQL 8.x (InnoDB, utf8mb4)
- ORM: Spring Data JPA (Hibernate)
- Testing: JUnit 5, Mockito, AssertJ

## AI & Document Engine (Python)
- Language: Python 3.10+
- Framework: FastAPI
- AI Orchestration: LangChain
- Testing: Pytest
- LLM Provider: Google Gemini (via Internal Gateway)

## Infrastructure & Tools
- Containerization: Docker, Docker Compose
- API Documentation: Swagger/OpenAPI 3.0
- Version Control: Git

## See also:
- [003-development-guidelines.md](003-development-guidelines.md) for usage guidelines
- [301-spring-boot-java-rules.md](301-spring-boot-java-rules.md) for Java/Spring rules
- [302-python-fastapi-rules.md](302-python-fastapi-rules.md) for Python/FastAPI rules
- [303-database-mysql-jpa-rules.md](303-database-mysql-jpa-rules.md) for Database rules
- [304-api-rest-design-rules.md](304-api-rest-design-rules.md) for API standards
