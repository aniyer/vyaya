package database

import (
	"fmt"
	"log"

	"github.com/aniyer/vyaya/backend/internal/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB(dsn string, debug bool) error {
	logLevel := logger.Silent
	if debug {
		logLevel = logger.Info
	}

	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	
	err = sqlDB.Ping()
	if err != nil {
		return err
	}

	// Use raw SQL to create tables if they don't exist (avoids SQLite AutoMigrate temp-table issues)
	sqls := []string{
		`CREATE TABLE IF NOT EXISTS categories (
			id    INTEGER PRIMARY KEY AUTOINCREMENT,
			name  VARCHAR(100) NOT NULL UNIQUE,
			icon  VARCHAR(50)  DEFAULT '📁',
			color VARCHAR(7)   DEFAULT '#6366f1'
		)`,
		`CREATE TABLE IF NOT EXISTS receipts (
			id               VARCHAR(36) PRIMARY KEY,
			vendor           VARCHAR(255),
			amount           REAL,
			amount_usd       REAL,
			currency         VARCHAR(3)  DEFAULT 'USD',
			transaction_date DATE,
			category_id      INTEGER REFERENCES categories(id),
			image_path       VARCHAR(500) NOT NULL DEFAULT '',
			raw_ocr_text     TEXT,
			status           VARCHAR(20)  DEFAULT 'processing',
			created_at       DATETIME,
			updated_at       DATETIME
		)`,
		`CREATE INDEX IF NOT EXISTS idx_receipts_vendor           ON receipts(vendor)`,
		`CREATE INDEX IF NOT EXISTS idx_receipts_transaction_date ON receipts(transaction_date)`,
		`CREATE INDEX IF NOT EXISTS idx_receipts_status           ON receipts(status)`,
		`CREATE INDEX IF NOT EXISTS idx_categories_name           ON categories(name)`,
	}
	for _, sql := range sqls {
		if err := db.Exec(sql).Error; err != nil {
			return fmt.Errorf("migration failed: %w", err)
		}
	}

	// Seed data
	err = models.SeedCategories(db)
	if err != nil {
		log.Printf("Warning: failed to seed categories: %v", err)
	}

	DB = db
	return nil
}

func GetDB() *gorm.DB {
	return DB
}
