# Stage 1: Build the static Go binary
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy source code and download dependencies
COPY . .
RUN go mod tidy

# Build statically
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Stage 2: Runtime image using distroless
FROM gcr.io/distroless/static-debian12

WORKDIR /

# Copy the compiled binary from the builder stage
COPY --from=builder /app/main /main

# Expose the API port
EXPOSE 8080

# Run as nonroot user
USER nonroot:nonroot

# Run the binary
ENTRYPOINT ["/main"]
