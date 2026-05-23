# Stage 1: Build the Java Spring Boot application
FROM maven:3.9.6-eclipse-temurin-17-alpine AS builder

WORKDIR /app

# Copy pom.xml and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build the package
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime image using secure distroless Java
FROM gcr.io/distroless/java17-debian12

WORKDIR /app

# Copy the compiled JAR from the builder stage
COPY --from=builder /app/target/gitops-demo-app-1.0.0.jar app.jar

# Expose the API port
EXPOSE 8080

# Run the JAR
ENTRYPOINT ["java", "-jar", "app.jar"]
