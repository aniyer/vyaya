package models

import (
	"database/sql/driver"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// timeFormats covers Python naive datetimes, SQLite strings, and RFC3339.
var timeFormats = []string{
	time.RFC3339Nano,
	time.RFC3339,
	"2006-01-02 15:04:05.999999999-07:00",
	"2006-01-02T15:04:05",
	"2006-01-02 15:04:05.999999999",
	"2006-01-02 15:04:05",
	"2006-01-02",
}

// FlexTime is a time.Time that handles multiple SQLite datetime string formats
// and marshals as null when zero.
type FlexTime struct {
	T     time.Time
	Valid bool
}

func (ft *FlexTime) Scan(value interface{}) error {
	if value == nil {
		ft.Valid = false
		return nil
	}
	var s string
	switch v := value.(type) {
	case time.Time:
		ft.T, ft.Valid = v, true
		return nil
	case string:
		s = v
	case []byte:
		s = string(v)
	default:
		return fmt.Errorf("FlexTime: unsupported type %T", value)
	}
	for _, f := range timeFormats {
		if t, err := time.Parse(f, s); err == nil {
			ft.T, ft.Valid = t, true
			return nil
		}
	}
	ft.Valid = false
	return nil
}

func (ft FlexTime) Value() (driver.Value, error) {
	if !ft.Valid {
		return nil, nil
	}
	return ft.T.UTC().Format("2006-01-02 15:04:05"), nil
}

func (ft FlexTime) MarshalJSON() ([]byte, error) {
	if !ft.Valid || ft.T.IsZero() {
		return []byte("null"), nil
	}
	return []byte(`"` + ft.T.UTC().Format(time.RFC3339) + `"`), nil
}

// DateOnly stores/returns dates as "YYYY-MM-DD" strings.
type DateOnly struct {
	T     time.Time
	Valid bool
}

func (d *DateOnly) Scan(value interface{}) error {
	if value == nil {
		d.Valid = false
		return nil
	}
	var s string
	switch v := value.(type) {
	case time.Time:
		d.T, d.Valid = v, true
		return nil
	case string:
		s = v
	case []byte:
		s = string(v)
	default:
		return fmt.Errorf("DateOnly: unsupported type %T", value)
	}
	for _, f := range timeFormats {
		if t, err := time.Parse(f, s); err == nil {
			d.T, d.Valid = t, true
			return nil
		}
	}
	d.Valid = false
	return nil
}

func (d DateOnly) Value() (driver.Value, error) {
	if !d.Valid {
		return nil, nil
	}
	return d.T.Format("2006-01-02"), nil
}

func (d DateOnly) MarshalJSON() ([]byte, error) {
	if !d.Valid || d.T.IsZero() {
		return []byte("null"), nil
	}
	return []byte(`"` + d.T.Format("2006-01-02") + `"`), nil
}

func (d *DateOnly) ToTimePtr() *time.Time {
	if !d.Valid {
		return nil
	}
	return &d.T
}

func DateOnlyFromTime(t *time.Time) DateOnly {
	if t == nil {
		return DateOnly{}
	}
	return DateOnly{T: *t, Valid: true}
}

// Category model
type Category struct {
	ID       uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Name     string    `gorm:"type:varchar(100);uniqueIndex" json:"name"`
	Icon     string    `gorm:"type:varchar(50);default:'📁'" json:"icon"`
	Color    string    `gorm:"type:varchar(7);default:'#6366f1'" json:"color"`
	Receipts []Receipt `gorm:"foreignKey:CategoryID" json:"-"`
}

// Receipt model
type Receipt struct {
	ID              string   `gorm:"type:varchar(36);primaryKey;index" json:"id"`
	Vendor          *string  `gorm:"type:varchar(255);index" json:"vendor"`
	Amount          *float64 `json:"amount"`
	AmountUSD       *float64 `json:"amount_usd"`
	Currency        string   `gorm:"type:varchar(3);default:'USD'" json:"currency"`
	TransactionDate DateOnly `gorm:"type:date;index" json:"transaction_date"`
	CategoryID      *uint    `json:"category_id"`
	ImagePath       string   `gorm:"type:varchar(500)" json:"image_path"`
	RawOCRText      *string  `gorm:"type:text" json:"raw_ocr_text"`
	Status          string   `gorm:"type:varchar(20);default:'processing';index" json:"status"`
	CreatedAt       FlexTime `json:"created_at"`
	UpdatedAt       FlexTime `json:"updated_at"`

	Category *Category `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
}

func (r *Receipt) BeforeCreate(tx *gorm.DB) (err error) {
	if r.ID == "" {
		r.ID = uuid.New().String()
	}
	now := FlexTime{T: time.Now().UTC(), Valid: true}
	if !r.CreatedAt.Valid {
		r.CreatedAt = now
	}
	if !r.UpdatedAt.Valid {
		r.UpdatedAt = now
	}
	return
}

func (r *Receipt) BeforeUpdate(tx *gorm.DB) (err error) {
	r.UpdatedAt = FlexTime{T: time.Now().UTC(), Valid: true}
	return
}


func SeedCategories(db *gorm.DB) error {
	var count int64
	db.Model(&Category{}).Count(&count)
	if count > 0 {
		return nil
	}

	defaultCategories := []Category{
		{Name: "Groceries", Icon: "🛒", Color: "#86efac"},
		{Name: "Dining", Icon: "🍽️", Color: "#fdba74"},
		{Name: "Fuel", Icon: "⛽", Color: "#fde047"},
		{Name: "Utilities", Icon: "💡", Color: "#93c5fd"},
		{Name: "Shopping", Icon: "🛍️", Color: "#c4b5fd"},
		{Name: "Healthcare", Icon: "🏥", Color: "#fca5a5"},
		{Name: "Transportation", Icon: "🚗", Color: "#67e8f9"},
		{Name: "Entertainment", Icon: "🎬", Color: "#f9a8d4"},
		{Name: "Other", Icon: "📄", Color: "#cbd5e1"},
	}

	return db.Create(&defaultCategories).Error
}
