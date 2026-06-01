package com.example.ticketsystem.service;

import com.example.ticketsystem.model.Booking;
import com.example.ticketsystem.model.Seat;
import com.example.ticketsystem.model.SeatStatus;
import com.example.ticketsystem.model.User;
import com.example.ticketsystem.repository.BookingRepository;
import com.example.ticketsystem.repository.SeatRepository;
import com.example.ticketsystem.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class BookingService {

    @Autowired
    private SeatRepository seatRepository;

    @Autowired
    private BookingRepository bookingRepository;
    
    @Autowired
    private UserRepository userRepository;

    @Transactional
    public Booking reserveSeat(Long userId, Long seatId) {
        // 1. Fetch seat with PESSIMISTIC_WRITE lock
        // This stops ANY other thread from modifying this seat until this transaction completes.
        Seat seat = seatRepository.findByIdForUpdate(seatId)
                .orElseThrow(() -> new RuntimeException("Seat not found"));

        // 2. Check if available
        if (seat.getStatus() != SeatStatus.AVAILABLE) {
            throw new RuntimeException("Seat is already booked or locked");
        }

        // 3. Lock the seat
        seat.setStatus(SeatStatus.LOCKED);
        seatRepository.save(seat);

        // 4. Create booking record
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Booking booking = new Booking();
        booking.setUser(user);
        booking.setEvent(seat.getEvent());
        booking.setSeat(seat);
        booking.setBookingTime(LocalDateTime.now());
        booking.setStatus("PENDING");

        return bookingRepository.save(booking);
    }

    @Transactional
    public Booking confirmBooking(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        
        if (!"PENDING".equals(booking.getStatus())) {
            throw new RuntimeException("Booking is not pending");
        }

        booking.setStatus("CONFIRMED");
        Seat seat = booking.getSeat();
        seat.setStatus(SeatStatus.BOOKED);
        seatRepository.save(seat);

        return bookingRepository.save(booking);
    }
}
