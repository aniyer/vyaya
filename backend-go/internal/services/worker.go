package services

import (
	"log"
	"path/filepath"
	"strings"
	"time"

	"github.com/aniyer/vyaya/backend/internal/config"
	"github.com/aniyer/vyaya/backend/internal/models"
	"gorm.io/gorm"
)

type WorkItem struct {
	ReceiptID string
	FilePath  string
}

var WorkQueue = make(chan WorkItem, 100)

func StartWorker(db *gorm.DB) {
	go func() {
		log.Println("Receipt processing worker started")
		for item := range WorkQueue {
			processReceipt(db, item.ReceiptID, item.FilePath)
		}
	}()
}

func processReceipt(db *gorm.DB, receiptID, filePath string) {
	log.Printf("Starting processing for receipt %s", receiptID)

	var receipt models.Receipt
	if err := db.First(&receipt, "id = ?", receiptID).Error; err != nil {
		log.Printf("Receipt %s not found: %v", receiptID, err)
		return
	}

	// Determine if audio
	ext := strings.ToLower(filepath.Ext(filePath))
	isAudio := ext == ".webm" || ext == ".wav" || ext == ".mp3" || ext == ".m4a" || ext == ".ogg"

	// Default transaction date to now (Eastern)
	easternLoc, _ := time.LoadLocation("America/New_York")
	now := time.Now().In(easternLoc)
	txDate := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	receipt.TransactionDate = models.DateOnly{T: txDate, Valid: true}

	cfg := config.AppSettings

	var extracted *ExtractedReceipt
	var procErr error

	if isAudio {
		extracted, procErr = ProcessReceiptAudio(filePath, cfg.GoogleAPIKey)
	} else {
		extracted, procErr = ProcessReceiptImage(filePath, cfg.GoogleAPIKey, cfg.LLMModel)
	}

	if procErr != nil {
		log.Printf("Processing failed for receipt %s: %v", receiptID, procErr)
		setFailedDefaults(&receipt, procErr.Error())
	} else if extracted.Confidence == 0 && strings.HasPrefix(extracted.RawText, "Error:") {
		setFailedDefaults(&receipt, extracted.RawText)
	} else {
		// Apply extracted data
		if extracted.Vendor != nil {
			receipt.Vendor = extracted.Vendor
		} else {
			v := "Unknown Vendor"
			receipt.Vendor = &v
		}
		if extracted.Amount != nil {
			receipt.Amount = extracted.Amount
		} else {
			zero := 0.0
			receipt.Amount = &zero
		}
		cur := "USD"
		if extracted.Currency != nil {
			cur = *extracted.Currency
		}
		receipt.Currency = cur
		receipt.RawOCRText = &extracted.RawText

		// Parse date from LLM
		if extracted.Date != nil {
			if t := parseDate(*extracted.Date); t != nil {
				receipt.TransactionDate = models.DateOnly{T: *t, Valid: true}
			}
		}

		// Convert to USD
		if receipt.Amount != nil && *receipt.Amount > 0 {
			usd, err := ConvertToUSD(*receipt.Amount, cur, receipt.TransactionDate.ToTimePtr())
			if err == nil {
				receipt.AmountUSD = &usd
			}
		}

		// Categorize
		if extracted.Category != nil {
			var cat models.Category
			if err := db.Where("LOWER(name) = LOWER(?)", *extracted.Category).First(&cat).Error; err == nil {
				receipt.CategoryID = &cat.ID
			}
		}
		if receipt.CategoryID == nil && receipt.Vendor != nil {
			if cat := AutoCategorize(*receipt.Vendor, db); cat != nil {
				receipt.CategoryID = &cat.ID
			}
		}
		if receipt.CategoryID == nil {
			var other models.Category
			if err := db.Where("LOWER(name) = ?", "other").First(&other).Error; err == nil {
				receipt.CategoryID = &other.ID
			}
		}
		receipt.Status = "review"
		log.Printf("Receipt %s processed successfully", receiptID)
	}

	if err := db.Save(&receipt).Error; err != nil {
		log.Printf("Failed to save receipt %s: %v", receiptID, err)
	}
}

func setFailedDefaults(r *models.Receipt, errMsg string) {
	if r.Vendor == nil || *r.Vendor == "Processing..." || *r.Vendor == "Processing Audio..." {
		v := "Unknown Vendor (Error)"
		r.Vendor = &v
	}
	if r.Amount == nil {
		zero := 0.0
		r.Amount = &zero
	}
	zero := 0.0
	r.AmountUSD = &zero
	r.RawOCRText = &errMsg
	r.Status = "review"
}
