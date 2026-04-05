# ── Build stage ──────────────────────────────────────────────────────────────
FROM golang:1.24-alpine AS builder

# CGO is required for go-sqlite3
RUN apk add --no-cache gcc musl-dev

WORKDIR /build

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=1 GOOS=linux go build -a -ldflags="-w -s" -o vyaya ./cmd/api

# ── Final image ───────────────────────────────────────────────────────────────
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /build/vyaya .

RUN mkdir -p /app/data/receipts

EXPOSE 8000

CMD ["./vyaya"]
