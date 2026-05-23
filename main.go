package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	_ "github.com/lib/pq"
)

type Response struct {
	Message   string    `json:"message"`
	Count     int       `json:"visit_count"`
	Version   string    `json:"version"`
	Hostname  string    `json:"hostname"`
	Timestamp time.Time `json:"timestamp"`
}

var db *sql.DB

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	version := os.Getenv("APP_VERSION")
	if version == "" {
		version = "v1.0.0"
	}

	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")
	dbSSL := os.Getenv("DB_SSLMODE")
	if dbSSL == "" {
		dbSSL = "disable"
	}

	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		dbHost, dbPort, dbUser, dbPassword, dbName, dbSSL)

	// Connect to database with retry loop
	var err error
	for i := 0; i < 10; i++ {
		log.Printf("Connecting to database (attempt %d/10)...", i+1)
		db, err = sql.Open("postgres", connStr)
		if err == nil {
			err = db.Ping()
			if err == nil {
				log.Println("Successfully connected to database!")
				break
			}
		}
		log.Printf("Database connection failed: %v. Retrying in 3 seconds...", err)
		time.Sleep(3 * time.Second)
	}

	if err != nil {
		log.Fatalf("Could not connect to database after 10 attempts: %v", err)
	}
	defer db.Close()

	// Initialize table
	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS visits (
		id SERIAL PRIMARY KEY,
		visited_at TIMESTAMP NOT NULL
	)`)
	if err != nil {
		log.Fatalf("Failed to create visits table: %v", err)
	}

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}

		// Insert visit
		_, err := db.Exec("INSERT INTO visits (visited_at) VALUES ($1)", time.Now())
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to record visit: %v", err), http.StatusInternalServerError)
			return
		}

		// Count visits
		var count int
		err = db.QueryRow("SELECT COUNT(*) FROM visits").Scan(&count)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to count visits: %v", err), http.StatusInternalServerError)
			return
		}

		hostname, _ := os.Hostname()
		resp := Response{
			Message:   "Welcome to the GitOps Demo App! This is an automated rolling updatess.",
			Count:     count,
			Version:   version,
			Hostname:  hostname,
			Timestamp: time.Now(),
		}

		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		json.NewEncoder(w).Encode(resp)
	})

	http.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		err := db.Ping()
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(fmt.Sprintf("Database ping failed: %v", err)))
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	log.Printf("Starting web server on port %s (version: %s)...", port, version)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
