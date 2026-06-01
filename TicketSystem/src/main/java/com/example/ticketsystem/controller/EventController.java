package com.example.ticketsystem.controller;

import com.example.ticketsystem.model.Event;
import com.example.ticketsystem.model.Seat;
import com.example.ticketsystem.model.SeatStatus;
import com.example.ticketsystem.repository.EventRepository;
import com.example.ticketsystem.repository.SeatRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/events")
public class EventController {

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private SeatRepository seatRepository;

    @org.springframework.cache.annotation.Cacheable("events")
    @GetMapping
    public List<Event> getAllEvents() {
        return eventRepository.findAll();
    }

    // Secured endpoint: Only accessible by users with "ROLE_ADMIN"
    @org.springframework.cache.annotation.CacheEvict(value = "events", allEntries = true)
    @PostMapping("/create")
    public Event createEvent(@RequestBody Event event, @RequestParam(defaultValue = "10") int numberOfSeats) {
        Event savedEvent = eventRepository.save(event);
        
        // Dynamically generate seating layout for this new event
        List<Seat> seats = new ArrayList<>();
        for (int i = 1; i <= numberOfSeats; i++) {
            Seat seat = new Seat();
            seat.setEvent(savedEvent);
            // Basic seating layout generator: A1, A2... B1, B2...
            char row = (char) ('A' + ((i - 1) / 10));
            int num = ((i - 1) % 10) + 1;
            seat.setSeatNumber(row + String.valueOf(num));
            seat.setStatus(SeatStatus.AVAILABLE);
            
            // Assign database price dynamically based on row letter
            double price = 150.0;
            if (row == 'A' || row == 'B') {
                price = 500.0;
            } else if (row == 'C' || row == 'D') {
                price = 300.0;
            }
            seat.setPrice(price);
            
            seats.add(seat);
        }
        seatRepository.saveAll(seats);
        
        return savedEvent;
    }
}
