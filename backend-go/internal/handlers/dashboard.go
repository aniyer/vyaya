package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/aniyer/vyaya/backend/internal/models"
	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

type DashboardHandler struct{ DB *gorm.DB }

func (h *DashboardHandler) Routes(r chi.Router) {
	r.Get("/summary", h.Summary)
	r.Get("/trends", h.Trends)
	r.Get("/categories", h.Categories)
}

func (h *DashboardHandler) Summary(w http.ResponseWriter, r *http.Request) {
	loc, _ := time.LoadLocation("America/New_York")
	now := time.Now().In(loc)
	currentMonthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	today := time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 0, time.UTC)
	prevMonthStart := currentMonthStart.AddDate(0, -1, 0)
	prevMonthEnd := currentMonthStart.AddDate(0, 0, -1)

	type sumResult struct {
		Total float64
		Count int
	}
	var cur sumResult
	h.DB.Model(&models.Receipt{}).
		Select("COALESCE(SUM(amount_usd),0) as total, COUNT(id) as count").
		Where("transaction_date >= ? AND transaction_date <= ?", currentMonthStart, today).
		Scan(&cur)

	var prev sumResult
	h.DB.Model(&models.Receipt{}).
		Select("COALESCE(SUM(amount_usd),0) as total").
		Where("transaction_date >= ? AND transaction_date <= ?", prevMonthStart, prevMonthEnd).
		Scan(&prev)

	momChange := 0.0
	if prev.Total > 0 {
		momChange = ((cur.Total - prev.Total) / prev.Total) * 100
	} else if cur.Total > 0 {
		momChange = 100.0
	}

	type catRow struct {
		ID    uint
		Name  string
		Icon  string
		Color string
		Total float64
		Count int
	}
	var catData []catRow
	h.DB.Table("categories").
		Select("categories.id, categories.name, categories.icon, categories.color, COALESCE(SUM(receipts.amount_usd),0) as total, COUNT(receipts.id) as count").
		Joins("LEFT JOIN receipts ON receipts.category_id = categories.id AND receipts.transaction_date >= ? AND receipts.transaction_date <= ?", currentMonthStart, today).
		Group("categories.id").
		Scan(&catData)

	type catSpending struct {
		CategoryID   uint    `json:"category_id"`
		CategoryName string  `json:"category_name"`
		Icon         string  `json:"icon"`
		Color        string  `json:"color"`
		Total        float64 `json:"total"`
		Count        int     `json:"count"`
	}
	var breakdown []catSpending
	for _, c := range catData {
		if c.Total > 0 {
			breakdown = append(breakdown, catSpending{c.ID, c.Name, c.Icon, c.Color, c.Total, c.Count})
		}
	}
	if breakdown == nil {
		breakdown = []catSpending{}
	}

	jsonOK(w, map[string]interface{}{
		"current_month_total":    cur.Total,
		"current_month_count":    cur.Count,
		"previous_month_total":   prev.Total,
		"month_over_month_change": round1(momChange),
		"category_breakdown":     breakdown,
	})
}

func (h *DashboardHandler) Trends(w http.ResponseWriter, r *http.Request) {
	months := 12
	if v := r.URL.Query().Get("months"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			months = n
		}
	}
	loc, _ := time.LoadLocation("America/New_York")
	now := time.Now().In(loc)
	todayDate := time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 0, time.UTC)
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	startDate := monthStart.AddDate(0, -(months - 1), 0)

	type row struct {
		Year  int
		Month int
		Total float64
		Count int
	}
	var rows []row
	h.DB.Model(&models.Receipt{}).
		Select("CAST(strftime('%Y', transaction_date) AS INTEGER) as year, CAST(strftime('%m', transaction_date) AS INTEGER) as month, COALESCE(SUM(amount_usd),0) as total, COUNT(id) as count").
		Where("transaction_date >= ? AND transaction_date <= ?", startDate, todayDate).
		Group("year, month").Order("year, month").
		Scan(&rows)

	monthlyMap := map[[2]int]row{}
	for _, r := range rows {
		monthlyMap[[2]int{r.Year, r.Month}] = r
	}

	type monthItem struct {
		Year  int     `json:"year"`
		Month int     `json:"month"`
		Total float64 `json:"total"`
		Count int     `json:"count"`
	}
	var result []monthItem
	current := startDate
	for !current.After(monthStart) {
		y, m := current.Year(), int(current.Month())
		if r, ok := monthlyMap[[2]int{y, m}]; ok {
			result = append(result, monthItem{y, m, r.Total, r.Count})
		} else {
			result = append(result, monthItem{y, m, 0, 0})
		}
		current = current.AddDate(0, 1, 0)
	}
	if result == nil {
		result = []monthItem{}
	}
	jsonOK(w, map[string]interface{}{"monthly_data": result})
}

func (h *DashboardHandler) Categories(w http.ResponseWriter, r *http.Request) {
	var cats []models.Category
	h.DB.Order("name").Find(&cats)
	if cats == nil {
		cats = []models.Category{}
	}
	jsonOK(w, cats)
}

func round1(f float64) float64 {
	return float64(int(f*10+0.5)) / 10
}
