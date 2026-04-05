package services

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

const frankfurterURL = "https://api.frankfurter.app"

func GetExchangeRate(from, to string, date *time.Time) (float64, error) {
	var dateStr string
	if date == nil || date.After(time.Now()) {
		dateStr = "latest"
	} else {
		dateStr = date.Format("2006-01-02")
	}

	url := fmt.Sprintf("%s/%s?from=%s&to=%s", frankfurterURL, dateStr, from, to)
	client := &http.Client{Timeout: 10 * time.Second}

	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		if attempt > 0 {
			time.Sleep(time.Duration(attempt*2) * time.Second)
		}
		resp, err := client.Get(url)
		if err != nil {
			lastErr = err
			continue
		}
		defer resp.Body.Close()
		if resp.StatusCode == 404 {
			log.Printf("Warning: currency %s or date %s not supported", from, dateStr)
			return 0, fmt.Errorf("unsupported currency or date")
		}
		var data struct {
			Rates map[string]float64 `json:"rates"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
			lastErr = err
			continue
		}
		if rate, ok := data.Rates[to]; ok {
			return rate, nil
		}
		return 0, fmt.Errorf("rate for %s not in response", to)
	}
	return 0, lastErr
}

func ConvertToUSD(amount float64, currency string, date *time.Time) (float64, error) {
	if currency == "USD" {
		return amount, nil
	}
	if amount == 0 {
		return 0, nil
	}
	rate, err := GetExchangeRate(currency, "USD", date)
	if err != nil {
		log.Printf("Failed to convert %f %s to USD: %v", amount, currency, err)
		return 0, err
	}
	return amount * rate, nil
}
