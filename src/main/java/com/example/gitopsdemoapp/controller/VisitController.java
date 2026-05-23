package com.example.gitopsdemoapp.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
public class VisitController {

    private final JdbcTemplate jdbcTemplate;
    private final String appVersion;

    public VisitController(JdbcTemplate jdbcTemplate, @Value("${APP_VERSION:v1.0.0}") String appVersion) {
        this.jdbcTemplate = jdbcTemplate;
        this.appVersion = appVersion;
    }

    @GetMapping("/")
    public ResponseEntity<Map<String, Object>> getVisit() {
        try {
            // Record visit
            jdbcTemplate.update("INSERT INTO visits (visited_at) VALUES (?)", LocalDateTime.now());

            // Count visits
            Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM visits", Integer.class);

            String hostname;
            try {
                hostname = InetAddress.getLocalHost().getHostName();
            } catch (UnknownHostException e) {
                hostname = "unknown";
            }

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Welcome to the GitOps Demo App! This is an automated rolling update.");
            response.put("visit_count", count != null ? count : 0);
            response.put("version", appVersion);
            response.put("hostname", hostname);
            response.put("timestamp", LocalDateTime.now().toString());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errResponse = new HashMap<>();
            errResponse.put("error", "Failed to record visit: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errResponse);
        }
    }

    @GetMapping("/healthz")
    public ResponseEntity<String> getHealth() {
        try {
            // Ping database
            jdbcTemplate.execute("SELECT 1");
            return ResponseEntity.ok("OK");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Database ping failed: " + e.getMessage());
        }
    }
}
