package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/aniyer/vyaya/backend/internal/config"
	"github.com/aniyer/vyaya/backend/internal/database"
	"github.com/aniyer/vyaya/backend/internal/handlers"
	"github.com/aniyer/vyaya/backend/internal/services"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	config.LoadConfig()
	cfg := config.AppSettings

	// Init DB (SQLite with foreign keys enabled via DSN param)
	dsn := cfg.DatabaseURL + "?_foreign_keys=on"
	if err := database.InitDB(dsn, cfg.Debug); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	db := database.GetDB()

	// Start background worker
	services.StartWorker(db)

	// Set up router
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: false,
	}))

	// API routes
	r.Route("/api/receipts", func(r chi.Router) {
		h := &handlers.ReceiptHandler{DB: db}
		h.Routes(r)
	})
	r.Route("/api/dashboard", func(r chi.Router) {
		h := &handlers.DashboardHandler{DB: db}
		h.Routes(r)
	})

	// Static files for receipt images
	r.Handle("/static/receipts/*", http.StripPrefix("/static/receipts/", http.FileServer(http.Dir(cfg.ReceiptsDir))))

	// Health endpoints
	r.Get("/", func(w http.ResponseWriter, req *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"app":%q,"status":"healthy","version":"2.0.0"}`, cfg.AppName)
	})
	r.Get("/api/health", func(w http.ResponseWriter, req *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	log.Printf("Starting %s on %s", cfg.AppName, addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
