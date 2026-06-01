package com.example.ticketsystem.service;

import com.example.ticketsystem.model.Booking;
import com.example.ticketsystem.model.Seat;
import com.example.ticketsystem.model.SeatStatus;
import com.example.ticketsystem.repository.BookingRepository;
import com.example.ticketsystem.repository.SeatRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Component
public class HoldReleaseScheduler {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private SeatRepository seatRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // Run every 5 seconds to release expired locks
    @Scheduled(fixedRate = 5000)
    @Transactional
    public void releaseExpiredHolds() {
        // Find bookings in 'LOCKED' status that are older than 5 minutes
        LocalDateTime expiryTime = LocalDateTime.now().minusMinutes(5);
        List<Booking> expiredBookings = bookingRepository.findByStatusAndBookingTimeBefore("LOCKED", expiryTime);

        if (expiredBookings.isEmpty()) {
            return;
        }

        System.out.println("Found " + expiredBookings.size() + " expired ticket holds. Releasing...");

        // Group seat IDs by Event ID so we can broadcast them properly
        Map<Long, List<Long>> eventToReleasedSeats = new HashMap<>();

        for (Booking booking : expiredBookings) {
            booking.setStatus("EXPIRED");
            bookingRepository.save(booking);

            Seat seat = booking.getSeat();
            if (seat != null && seat.getStatus() == SeatStatus.LOCKED) {
                seat.setStatus(SeatStatus.AVAILABLE);
                seatRepository.save(seat);

                Long eventId = booking.getEvent().getId();
                eventToReleasedSeats.computeIfAbsent(eventId, k -> new ArrayList<>()).add(seat.getId());
            }
        }

        // Broadcast release events to WebSocket subscribers
        for (Map.Entry<Long, List<Long>> entry : eventToReleasedSeats.entrySet()) {
            Long eventId = entry.getKey();
            List<Long> seatIds = entry.getValue();

            Map<String, Object> payload = new HashMap<>();
            payload.put("action", "RELEASE");
            payload.put("seatIds", seatIds);

            System.out.println("Broadcasting released seats for Event " + eventId + ": " + seatIds);
            messagingTemplate.convertAndSend("/topic/event/" + eventId, (Object) payload);
        }
    }
}
