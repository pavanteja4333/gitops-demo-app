package com.example.gitopsdemoapp.service;

import org.mindrot.jbcrypt.BCrypt;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final JdbcTemplate jdbcTemplate;

    public UserService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean userExists(String username) {
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM users WHERE LOWER(username) = LOWER(?)",
            Integer.class,
            username
        );
        return count != null && count > 0;
    }

    public boolean registerUser(String username, String password) {
        if (userExists(username)) {
            return false;
        }
        
        // Hash password using BCrypt
        String hashedPassword = BCrypt.hashpw(password, BCrypt.gensalt());
        
        int rows = jdbcTemplate.update(
            "INSERT INTO users (username, password) VALUES (?, ?)",
            username,
            hashedPassword
        );
        
        return rows > 0;
    }

    public boolean validateCredentials(String username, String password) {
        try {
            String hashedPassword = jdbcTemplate.queryForObject(
                "SELECT password FROM users WHERE LOWER(username) = LOWER(?)",
                String.class,
                username
            );
            if (hashedPassword == null) {
                return false;
            }
            return BCrypt.checkpw(password, hashedPassword);
        } catch (EmptyResultDataAccessException e) {
            return false;
        }
    }
}
