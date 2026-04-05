package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"google.golang.org/genai"
)

type ExtractedReceipt struct {
	Vendor     *string  `json:"vendor"`
	Date       *string  `json:"date"`
	Amount     *float64 `json:"amount"`
	Currency   *string  `json:"currency"`
	Category   *string  `json:"category"`
	RawText    string
	Confidence float64
}

var validCategoriesStr = strings.Join(ValidCategories, ", ")

var imagePrompt = fmt.Sprintf(`Act as an advanced OCR and data extraction assistant. Analyze the provided receipt image and extract specific data points into a structured JSON format.

### Extraction Instructions:
1. **Vendor**: Identify the official name of the store or service provider.
2. **Date**: Extract the transaction date. Normalize to "YYYY-MM-DD".
3. **Amount**: Locate the final "Total" or "Amount Due". Exclude sub-totals.
4. **Currency**: Extract the 3-letter ISO 4217 currency code (e.g., USD, EUR, GBP, INR).
5. **Category**: Assign the most relevant category from this list: [%s].

### Output Schema (Strict JSON):
{"vendor":"string or null","date":"string or null","amount":null,"currency":"string or null","category":"string or null"}

Respond ONLY with valid JSON matching this schema.`, validCategoriesStr)

func newGenAIClient(ctx context.Context, apiKey string) (*genai.Client, error) {
	return genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})
}

func extractJSON(text string) map[string]interface{} {
	text = strings.TrimSpace(text)
	start := strings.Index(text, "{")
	end := strings.LastIndex(text, "}")
	if start == -1 || end == -1 || end <= start {
		return nil
	}
	text = text[start : end+1]
	var result map[string]interface{}
	if err := json.Unmarshal([]byte(text), &result); err != nil {
		log.Printf("Failed to parse JSON from LLM response: %v", err)
		return nil
	}
	return result
}

func parseDate(s string) *time.Time {
	if s == "" {
		return nil
	}
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return nil
	}
	return &t
}

func strPtr(s string) *string  { return &s }
func f64Ptr(f float64) *float64 { return &f }

func ProcessReceiptImage(imagePath string, apiKey string, model string) (*ExtractedReceipt, error) {
	if apiKey == "" {
		return &ExtractedReceipt{RawText: "Error: missing API key", Confidence: 0}, nil
	}
	imgBytes, err := os.ReadFile(imagePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read image: %w", err)
	}

	// Detect mime type from extension
	mime := "image/jpeg"
	low := strings.ToLower(imagePath)
	if strings.HasSuffix(low, ".png") {
		mime = "image/png"
	} else if strings.HasSuffix(low, ".webp") {
		mime = "image/webp"
	}

	ctx := context.Background()
	client, err := newGenAIClient(ctx, apiKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create genai client: %w", err)
	}

	parts := []*genai.Part{
		genai.NewPartFromText(imagePrompt),
		genai.NewPartFromBytes(imgBytes, mime),
	}

	log.Printf("Calling LLM API with model %s", model)
	resp, err := client.Models.GenerateContent(ctx, model, []*genai.Content{genai.NewContentFromParts(parts, "user")}, &genai.GenerateContentConfig{
		Temperature: genai.Ptr[float32](0.1),
		MaxOutputTokens: 1024,
	})
	if err != nil {
		return nil, fmt.Errorf("LLM call failed: %w", err)
	}

	text := resp.Text()
	log.Printf("LLM Response: %s", text)
	data := extractJSON(text)
	result := &ExtractedReceipt{RawText: text, Confidence: 1.0}
	if data != nil {
		if v, ok := data["vendor"].(string); ok && v != "" {
			result.Vendor = strPtr(v)
		}
		if v, ok := data["amount"].(float64); ok {
			result.Amount = f64Ptr(v)
		}
		if v, ok := data["currency"].(string); ok && v != "" {
			result.Currency = strPtr(v)
		}
		if v, ok := data["category"].(string); ok && v != "" {
			result.Category = strPtr(v)
		}
		if v, ok := data["date"].(string); ok && v != "" {
			result.Date = strPtr(v)
		}
	}
	return result, nil
}

func ProcessReceiptAudio(audioPath string, apiKey string) (*ExtractedReceipt, error) {
	if apiKey == "" {
		return &ExtractedReceipt{RawText: "Error: missing API key", Confidence: 0}, nil
	}
	audioBytes, err := os.ReadFile(audioPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read audio: %w", err)
	}

	mime := "audio/webm"
	low := strings.ToLower(audioPath)
	if strings.HasSuffix(low, ".wav") {
		mime = "audio/wav"
	} else if strings.HasSuffix(low, ".mp3") {
		mime = "audio/mpeg"
	} else if strings.HasSuffix(low, ".m4a") {
		mime = "audio/mp4"
	}

	audioModel := "models/gemini-flash-latest"
	prompt := fmt.Sprintf(`Act as an advanced receipt data extraction assistant. Listen to the audio recording where a user describes a purchase and extract specific data points into a structured JSON format.

### Extraction Instructions:
1. Vendor: identify the store or service mentioned.
2. Date: extract the transaction date if mentioned. Convert relative dates using today: %s. Normalize to YYYY-MM-DD.
3. Amount: extract the total amount spent.
4. Currency: extract the currency if mentioned, otherwise default to USD.
5. Category: assign the most relevant category from: [%s].

Output ONLY valid JSON: {"vendor":null,"date":null,"amount":null,"currency":null,"category":null}`,
		time.Now().Format("2006-01-02"), validCategoriesStr)

	ctx := context.Background()
	client, err := newGenAIClient(ctx, apiKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create genai client: %w", err)
	}

	parts := []*genai.Part{
		{Text: prompt},
		{InlineData: &genai.Blob{Data: audioBytes, MIMEType: mime}},
	}

	log.Printf("Calling LLM API with model %s for audio", audioModel)
	resp, err := client.Models.GenerateContent(ctx, audioModel, []*genai.Content{genai.NewContentFromParts(parts, "user")}, &genai.GenerateContentConfig{
		Temperature: genai.Ptr[float32](0.1),
		MaxOutputTokens: 1024,
	})
	if err != nil {
		return nil, fmt.Errorf("audio LLM call failed: %w", err)
	}

	text := resp.Text()
	log.Printf("LLM Audio Response: %s", text)
	data := extractJSON(text)
	result := &ExtractedReceipt{RawText: text, Confidence: 1.0}
	if data != nil {
		if v, ok := data["vendor"].(string); ok && v != "" {
			result.Vendor = strPtr(v)
		}
		if v, ok := data["amount"].(float64); ok {
			result.Amount = f64Ptr(v)
		}
		if v, ok := data["currency"].(string); ok && v != "" {
			result.Currency = strPtr(v)
		}
		if v, ok := data["category"].(string); ok && v != "" {
			result.Category = strPtr(v)
		}
		if v, ok := data["date"].(string); ok && v != "" {
			result.Date = strPtr(v)
		}
	}
	return result, nil
}
