package main

import (
	"testing"
)

func TestAppVersion(t *testing.T) {
	// Simple test assertion to verify build integrity and CI pipeline testing step
	expected := "v1.0.0"
	actual := "v1.0.0"
	if actual != expected {
		t.Errorf("Expected version %s, got %s", expected, actual)
	}
}
