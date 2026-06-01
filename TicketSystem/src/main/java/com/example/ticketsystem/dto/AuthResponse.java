package com.example.ticketsystem.dto;

public record AuthResponse(String token, String role, String location, String email, String name) {}
