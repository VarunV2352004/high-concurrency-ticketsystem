package com.example.ticketsystem.controller;

import com.example.ticketsystem.model.Seat;
import com.example.ticketsystem.model.SeatStatus;
import com.example.ticketsystem.repository.SeatRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/seats")
public class SeatController {

    @Autowired
    private SeatRepository seatRepository;

    @GetMapping("/available/{eventId}")
    public List<Seat> getAvailableSeats(@PathVariable Long eventId) {
        return seatRepository.findByEventIdAndStatus(eventId, SeatStatus.AVAILABLE);
    }

    @GetMapping("/all/{eventId}")
    public List<Seat> getAllSeats(@PathVariable Long eventId) {
        return seatRepository.findByEventId(eventId);
    }
}
