package com.example.ticketsystem;

import com.example.ticketsystem.model.Event;
import com.example.ticketsystem.model.Seat;
import com.example.ticketsystem.model.SeatStatus;
import com.example.ticketsystem.model.User;
import com.example.ticketsystem.repository.EventRepository;
import com.example.ticketsystem.repository.SeatRepository;
import com.example.ticketsystem.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private SeatRepository seatRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.count() == 0) {
            System.out.println("Seeding database with test data...");
            
            // Create a test user (ADMIN) with Bengaluru as their registered location
            User testUser = new User(null, "Test User", "test@example.com", passwordEncoder.encode("password"), "ADMIN", "Bengaluru");
            userRepository.save(testUser);

            // Create Event 1: Sunburn Festival (Goa)
            Event sunburn = new Event(null, "Sunburn Festival", "Goa Beach", "Goa", LocalDateTime.now().plusMonths(1));
            sunburn = eventRepository.save(sunburn);
            seedSeatsForEvent(sunburn, 20); // 20 seats (VIP & Premium)

            // Create Event 2: Coldplay Live (Mumbai)
            Event coldplay = new Event(null, "Coldplay Live", "Mumbai Stadium", "Mumbai", LocalDateTime.now().plusMonths(2));
            coldplay = eventRepository.save(coldplay);
            seedSeatsForEvent(coldplay, 30); // 30 seats (VIP, Premium, Standard)

            // Create Event 3: IPL Cricket Match (Bengaluru)
            Event ipl = new Event(null, "IPL Cricket Match", "Chinnaswamy Stadium", "Bengaluru", LocalDateTime.now().plusWeeks(2));
            ipl = eventRepository.save(ipl);
            seedSeatsForEvent(ipl, 20); // 20 seats (VIP & Premium)
            
            System.out.println("Database seeded successfully with targeted location events and database-driven seat pricing!");
            System.out.println("Test User ID: " + testUser.getId() + " | City: Bengaluru");
            System.out.println("Seeded Events: Sunburn (Goa), Coldplay (Mumbai), IPL (Bengaluru)");
        }
    }

    private void seedSeatsForEvent(Event event, int totalSeats) {
        List<Seat> seats = new ArrayList<>();
        for (int i = 1; i <= totalSeats; i++) {
            Seat seat = new Seat();
            seat.setEvent(event);
            
            char row = (char) ('A' + ((i - 1) / 10));
            int num = ((i - 1) % 10) + 1;
            seat.setSeatNumber(row + String.valueOf(num));
            seat.setStatus(SeatStatus.AVAILABLE);
            
            // Set dynamic database-driven pricing based on row letter
            double price = 150.0;
            if (row == 'A') {
                price = 500.0;
            } else if (row == 'B') {
                price = 300.0;
            }
            seat.setPrice(price);
            
            seats.add(seat);
        }
        seatRepository.saveAll(seats);
    }
}
