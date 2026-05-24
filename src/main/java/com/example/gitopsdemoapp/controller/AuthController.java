package com.example.gitopsdemoapp.controller;

import com.example.gitopsdemoapp.dto.LoginDto;
import com.example.gitopsdemoapp.dto.UserRegistrationDto;
import com.example.gitopsdemoapp.service.UserService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody UserRegistrationDto registrationDto) {
        Map<String, Object> response = new HashMap<>();
        
        if (registrationDto.getUsername() == null || registrationDto.getUsername().trim().isEmpty() ||
            registrationDto.getPassword() == null || registrationDto.getPassword().trim().isEmpty()) {
            response.put("error", "Username and password cannot be empty");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        String username = registrationDto.getUsername().trim();
        String password = registrationDto.getPassword();

        if (username.length() < 3) {
            response.put("error", "Username must be at least 3 characters long");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        if (password.length() < 6) {
            response.put("error", "Password must be at least 6 characters long");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        boolean success = userService.registerUser(username, password);
        if (success) {
            response.put("message", "User registered successfully");
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } else {
            response.put("error", "Username already exists");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginDto loginDto, HttpSession session) {
        Map<String, Object> response = new HashMap<>();

        if (loginDto.getUsername() == null || loginDto.getPassword() == null) {
            response.put("error", "Username and password are required");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        String username = loginDto.getUsername().trim();
        String password = loginDto.getPassword();

        boolean isValid = userService.validateCredentials(username, password);
        if (isValid) {
            session.setAttribute("user", username);
            response.put("message", "Login successful");
            response.put("username", username);
            return ResponseEntity.ok(response);
        } else {
            response.put("error", "Invalid username or password");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(HttpSession session) {
        session.invalidate();
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Logged out successfully");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus(HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        String username = (String) session.getAttribute("user");
        if (username != null) {
            response.put("logged_in", true);
            response.put("username", username);
        } else {
            response.put("logged_in", false);
        }
        return ResponseEntity.ok(response);
    }
}
