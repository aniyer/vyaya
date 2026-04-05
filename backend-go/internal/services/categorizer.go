package services

import (
	"strings"

	"github.com/aniyer/vyaya/backend/internal/models"
	"gorm.io/gorm"
)

var ValidCategories = []string{
	"Groceries", "Dining", "Fuel", "Utilities",
	"Shopping", "Healthcare", "Transportation", "Entertainment",
}

var categoryKeywords = map[string][]string{
	"Groceries":      {"walmart", "kroger", "safeway", "trader joe", "whole foods", "aldi", "publix", "costco", "sam's club", "target", "grocery", "market", "food lion", "wegmans", "heb", "meijer", "sprouts", "fresh"},
	"Dining":         {"restaurant", "cafe", "coffee", "mcdonald", "starbucks", "chipotle", "subway", "pizza", "burger", "taco", "wendy", "chick-fil-a", "dunkin", "panera", "deli", "bakery", "grill", "kitchen", "diner", "bistro", "eatery"},
	"Utilities":      {"electric", "water", "gas", "internet", "comcast", "at&t", "verizon", "t-mobile", "sprint", "utility", "power", "energy", "cable", "phone", "wireless", "spectrum", "xfinity"},
	"Shopping":       {"amazon", "best buy", "apple store", "nordstrom", "macy", "kohls", "jcpenney", "ross", "tj maxx", "marshalls", "home depot", "lowes", "ikea", "bed bath", "williams sonoma"},
	"Healthcare":     {"pharmacy", "cvs", "walgreens", "hospital", "clinic", "doctor", "medical", "dental", "optometry", "vision", "health", "rx", "prescription", "urgent care", "lab", "diagnostic"},
	"Transportation": {"uber", "lyft", "taxi", "metro", "transit", "parking", "toll", "dmv", "auto", "car wash", "oil change", "tire", "mechanic", "rental car", "hertz", "enterprise", "avis", "supercharger", "gas"},
	"Entertainment":  {"netflix", "spotify", "hulu", "disney", "movie", "theater", "cinema", "concert", "ticket", "amc", "regal", "game", "playstation", "xbox", "steam", "arcade"},
}

func AutoCategorize(vendorName string, db *gorm.DB) *models.Category {
	if vendorName == "" {
		return nil
	}
	vendorLower := strings.ToLower(vendorName)
	for catName, keywords := range categoryKeywords {
		for _, kw := range keywords {
			if strings.Contains(vendorLower, kw) {
				var cat models.Category
				if err := db.Where("name = ?", catName).First(&cat).Error; err == nil {
					return &cat
				}
			}
		}
	}
	return nil
}
