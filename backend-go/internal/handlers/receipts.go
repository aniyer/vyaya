package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/aniyer/vyaya/backend/internal/config"
	"github.com/aniyer/vyaya/backend/internal/models"
	"github.com/aniyer/vyaya/backend/internal/services"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ReceiptHandler struct{ DB *gorm.DB }

func (h *ReceiptHandler) Routes(r chi.Router) {
	r.Get("/", h.List)
	r.Post("/", h.CreateManual)
	r.Post("/upload", h.Upload)
	r.Post("/upload-audio", h.UploadAudio)
	r.Get("/{id}", h.Get)
	r.Put("/{id}", h.Update)
	r.Delete("/{id}", h.Delete)
	r.Get("/image/{id}", h.GetImage)
}

func easternDate() time.Time {
	loc, _ := time.LoadLocation("America/New_York")
	n := time.Now().In(loc)
	return time.Date(n.Year(), n.Month(), n.Day(), 0, 0, 0, 0, time.UTC)
}

func jsonErr(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	fmt.Fprintf(w, `{"detail":%q}`, msg)
}

func jsonOK(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

// POST /api/receipts
func (h *ReceiptHandler) CreateManual(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Vendor          *string  `json:"vendor"`
		Amount          *float64 `json:"amount"`
		Currency        string   `json:"currency"`
		TransactionDate *string  `json:"transaction_date"`
		CategoryID      *uint    `json:"category_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonErr(w, 400, "invalid JSON")
		return
	}

	cur := req.Currency
	if cur == "" {
		cur = "USD"
	}
	txDate := easternDate()
	if req.TransactionDate != nil && *req.TransactionDate != "" {
		if t, err := time.Parse("2006-01-02", *req.TransactionDate); err == nil {
			txDate = t
		}
	}

	var amtUSD *float64
	if req.Amount != nil && *req.Amount > 0 {
		usd, err := services.ConvertToUSD(*req.Amount, cur, &txDate)
		if err == nil {
			amtUSD = &usd
		}
	}

	receipt := models.Receipt{
		ImagePath:       "manual_entry",
		Status:          "completed",
		Vendor:          req.Vendor,
		Amount:          req.Amount,
		AmountUSD:       amtUSD,
		Currency:        cur,
		TransactionDate: models.DateOnly{T: txDate, Valid: true},
		CategoryID:      req.CategoryID,
	}
	if err := h.DB.Create(&receipt).Error; err != nil {
		jsonErr(w, 500, "failed to create receipt")
		return
	}
	h.DB.Preload("Category").First(&receipt, "id = ?", receipt.ID)
	jsonOK(w, receipt)
}

func saveUpload(r *http.Request, field string, allowedTypes map[string]string, receiptsDir string) (string, string, error) {
	r.ParseMultipartForm(32 << 20)
	file, header, err := r.FormFile(field)
	if err != nil {
		return "", "", fmt.Errorf("missing file: %w", err)
	}
	defer file.Close()

	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "image/jpeg"
	}
	baseType := strings.Split(contentType, ";")[0]
	ext, ok := allowedTypes[baseType]
	if !ok {
		return "", "", fmt.Errorf("unsupported content type: %s", contentType)
	}
	if e := filepath.Ext(header.Filename); e != "" {
		ext = e
	}

	loc, _ := time.LoadLocation("America/New_York")
	now := time.Now().In(loc)
	dateDir := filepath.Join(receiptsDir, fmt.Sprintf("%d/%02d/%02d", now.Year(), int(now.Month()), now.Day()))
	os.MkdirAll(dateDir, 0755)

	uniqName := uuid.New().String() + ext
	destPath := filepath.Join(dateDir, uniqName)
	dest, err := os.Create(destPath)
	if err != nil {
		return "", "", fmt.Errorf("failed to create file: %w", err)
	}
	defer dest.Close()
	if _, err := io.Copy(dest, file); err != nil {
		return "", "", fmt.Errorf("failed to write file: %w", err)
	}
	return destPath, contentType, nil
}

// POST /api/receipts/upload
func (h *ReceiptHandler) Upload(w http.ResponseWriter, r *http.Request) {
	allowed := map[string]string{
		"image/jpeg": ".jpg",
		"image/png":  ".png",
		"image/webp": ".webp",
		"image/heic": ".heic",
	}
	filePath, _, err := saveUpload(r, "file", allowed, config.AppSettings.ReceiptsDir)
	if err != nil {
		jsonErr(w, 400, err.Error())
		return
	}

	v := "Processing..."
	zero := 0.0
	receipt := models.Receipt{
		ImagePath: filePath,
		Status:    "processing",
		Vendor:    &v,
		Amount:    &zero,
		Currency:  "USD",
	}
	if err := h.DB.Create(&receipt).Error; err != nil {
		jsonErr(w, 500, "failed to create receipt record")
		return
	}
	services.WorkQueue <- services.WorkItem{ReceiptID: receipt.ID, FilePath: filePath}

	jsonOK(w, map[string]interface{}{
		"receipt":               receipt,
		"extraction_confidence": 0.0,
		"message":               "Receipt uploaded and queued for processing",
	})
}

// POST /api/receipts/upload-audio
func (h *ReceiptHandler) UploadAudio(w http.ResponseWriter, r *http.Request) {
	allowed := map[string]string{
		"audio/webm": ".webm",
		"audio/wav":  ".wav",
		"audio/mpeg": ".mp3",
		"audio/mp4":  ".m4a",
		"audio/x-m4a": ".m4a",
	}
	filePath, _, err := saveUpload(r, "file", allowed, config.AppSettings.ReceiptsDir)
	if err != nil {
		jsonErr(w, 400, err.Error())
		return
	}

	v := "Processing Audio..."
	zero := 0.0
	receipt := models.Receipt{
		ImagePath: filePath,
		Status:    "processing",
		Vendor:    &v,
		Amount:    &zero,
		Currency:  "USD",
	}
	if err := h.DB.Create(&receipt).Error; err != nil {
		jsonErr(w, 500, "failed to create receipt record")
		return
	}
	services.WorkQueue <- services.WorkItem{ReceiptID: receipt.ID, FilePath: filePath}

	jsonOK(w, map[string]interface{}{
		"receipt":               receipt,
		"extraction_confidence": 0.0,
		"message":               "Audio note uploaded and queued for processing",
	})
}

// GET /api/receipts
func (h *ReceiptHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page := 1
	perPage := 20
	if v := q.Get("page"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 1 {
			page = n
		}
	}
	if v := q.Get("per_page"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 1 && n <= 100 {
			perPage = n
		}
	}

	db := h.DB.Model(&models.Receipt{}).Preload("Category")

	if v := q.Get("category_id"); v != "" {
		db = db.Where("category_id = ?", v)
	}
	if v := q.Get("start_date"); v != "" {
		db = db.Where("transaction_date >= ?", v)
	}
	if v := q.Get("end_date"); v != "" {
		db = db.Where("transaction_date <= ?", v)
	}
	if v := q.Get("q"); v != "" {
		like := "%" + v + "%"
		db = db.Where("vendor LIKE ? OR raw_ocr_text LIKE ?", like, like)
	}

	var total int64
	db.Count(&total)

	var receipts []models.Receipt
	db.Order("CASE WHEN status = 'processing' THEN 0 ELSE 1 END, transaction_date DESC, created_at DESC").
		Offset((page - 1) * perPage).Limit(perPage).Find(&receipts)

	pages := int((total + int64(perPage) - 1) / int64(perPage))
	jsonOK(w, map[string]interface{}{
		"items":    receipts,
		"total":    total,
		"page":     page,
		"per_page": perPage,
		"pages":    pages,
	})
}

// GET /api/receipts/{id}
func (h *ReceiptHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var receipt models.Receipt
	if err := h.DB.Preload("Category").First(&receipt, "id = ?", id).Error; err != nil {
		jsonErr(w, 404, "receipt not found")
		return
	}
	jsonOK(w, receipt)
}

// PUT /api/receipts/{id}
func (h *ReceiptHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var receipt models.Receipt
	if err := h.DB.First(&receipt, "id = ?", id).Error; err != nil {
		jsonErr(w, 404, "receipt not found")
		return
	}

	var req map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonErr(w, 400, "invalid JSON")
		return
	}

	if v, ok := req["vendor"].(string); ok {
		receipt.Vendor = &v
	}
	if v, ok := req["amount"].(float64); ok {
		receipt.Amount = &v
	}
	if v, ok := req["currency"].(string); ok {
		receipt.Currency = v
	}
	if v, ok := req["transaction_date"].(string); ok && v != "" {
		if t, err := time.Parse("2006-01-02", v); err == nil {
			receipt.TransactionDate = models.DateOnly{T: t, Valid: true}
		}
	}
	if v, ok := req["category_id"].(float64); ok {
		id := uint(v)
		receipt.CategoryID = &id
	}

	// Recalculate USD
	if receipt.Amount != nil && *receipt.Amount > 0 {
		txT := receipt.TransactionDate.ToTimePtr()
		usd, err := services.ConvertToUSD(*receipt.Amount, receipt.Currency, txT)
		if err == nil {
			receipt.AmountUSD = &usd
		}
	}

	h.DB.Save(&receipt)
	h.DB.Preload("Category").First(&receipt, "id = ?", receipt.ID)
	jsonOK(w, receipt)
}

// DELETE /api/receipts/{id}
func (h *ReceiptHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var receipt models.Receipt
	if err := h.DB.First(&receipt, "id = ?", id).Error; err != nil {
		jsonErr(w, 404, "receipt not found")
		return
	}
	if receipt.ImagePath != "" && receipt.ImagePath != "manual_entry" {
		os.Remove(receipt.ImagePath)
	}
	h.DB.Delete(&receipt)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"message":"Receipt deleted successfully"}`))
}

// GET /api/receipts/image/{id}
func (h *ReceiptHandler) GetImage(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var receipt models.Receipt
	if err := h.DB.First(&receipt, "id = ?", id).Error; err != nil {
		jsonErr(w, 404, "receipt not found")
		return
	}
	if _, err := os.Stat(receipt.ImagePath); os.IsNotExist(err) {
		jsonErr(w, 404, "file not found")
		return
	}
	log.Printf("Serving file: %s", receipt.ImagePath)
	http.ServeFile(w, r, receipt.ImagePath)
}
