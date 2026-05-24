package com.example.gitopsdemoapp.controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class VisitController {

    private final JdbcTemplate jdbcTemplate;
    private final String appVersion;

    public VisitController(JdbcTemplate jdbcTemplate, @Value("${APP_VERSION:v1.0.0}") String appVersion) {
        this.jdbcTemplate = jdbcTemplate;
        this.appVersion = appVersion;
    }

    private String getLocalHostname() {
        try {
            return InetAddress.getLocalHost().getHostName();
        } catch (UnknownHostException e) {
            return "unknown";
        }
    }

    @GetMapping("/api/visits")
    public ResponseEntity<Map<String, Object>> getVisitsData(HttpSession session) {
        String username = (String) session.getAttribute("user");
        if (username == null) {
            Map<String, Object> errResponse = new HashMap<>();
            errResponse.put("error", "Unauthorized. Please log in first.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errResponse);
        }

        try {
            // Count total visits
            Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM visits", Integer.class);

            // Fetch last 10 visits
            List<Map<String, Object>> recentVisits = jdbcTemplate.query(
                "SELECT id, visited_at, hostname, version FROM visits ORDER BY id DESC LIMIT 10",
                (rs, rowNum) -> {
                    Map<String, Object> visit = new HashMap<>();
                    visit.put("id", rs.getLong("id"));
                    visit.put("visited_at", rs.getTimestamp("visited_at").toLocalDateTime().toString());
                    visit.put("hostname", rs.getString("hostname"));
                    visit.put("version", rs.getString("version"));
                    return visit;
                }
            );

            Map<String, Object> response = new HashMap<>();
            response.put("visit_count", count != null ? count : 0);
            response.put("hostname", getLocalHostname());
            response.put("version", appVersion);
            response.put("db_status", "healthy");
            response.put("recent_visits", recentVisits);
            response.put("username", username); // Include username in dashboard data

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errResponse = new HashMap<>();
            errResponse.put("error", "Failed to retrieve visit data: " + e.getMessage());
            errResponse.put("db_status", "unhealthy");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errResponse);
        }
    }

    @PostMapping("/api/visits")
    public ResponseEntity<Map<String, Object>> recordVisit(HttpSession session) {
        String username = (String) session.getAttribute("user");
        if (username == null) {
            Map<String, Object> errResponse = new HashMap<>();
            errResponse.put("error", "Unauthorized. Please log in first.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errResponse);
        }

        try {
            String hostname = getLocalHostname();
            // Record visit
            jdbcTemplate.update("INSERT INTO visits (visited_at, hostname, version) VALUES (?, ?, ?)",
                LocalDateTime.now(), hostname, appVersion);

            return getVisitsData(session);
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
