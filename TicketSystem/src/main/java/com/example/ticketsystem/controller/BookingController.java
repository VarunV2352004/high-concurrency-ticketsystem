package com.example.ticketsystem.controller;

import com.example.ticketsystem.model.Booking;
import com.example.ticketsystem.model.Seat;
import com.example.ticketsystem.model.SeatStatus;
import com.example.ticketsystem.model.User;
import com.example.ticketsystem.repository.BookingRepository;
import com.example.ticketsystem.repository.SeatRepository;
import com.example.ticketsystem.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    @Autowired
    private SeatRepository seatRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Transactional
    @PostMapping("/reserve-multiple")
    public ResponseEntity<?> reserveMultipleSeats(java.security.Principal principal, @RequestBody List<Long> seatIds) {
        try {
            if (principal == null) {
                return ResponseEntity.status(401).body("Unauthorized. Please log in first.");
            }
            
            String email = principal.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Anti-Scalping Protection
            if (seatIds.size() > 6) {
                return ResponseEntity.badRequest().body("Anti-Scalping Rule: You can only book a maximum of 6 seats per transaction.");
            }

            // Sort seat IDs to prevent database deadlocks when locking multiple rows concurrently
            Collections.sort(seatIds);
            
            List<Booking> bookings = new ArrayList<>();
            Long eventId = null;
            List<Long> newlyLockedIds = new ArrayList<>();

            for (Long seatId : seatIds) {
                // Pessimistic Write Lock acquired here for each seat
                Seat seat = seatRepository.findByIdForUpdate(seatId)
                        .orElseThrow(() -> new RuntimeException("Seat not found"));

                if (seat.getStatus() == SeatStatus.LOCKED) {
                    // Check if this seat is already locked by THIS user (self re-reserve / restore scenario)
                    java.util.Optional<Booking> existingHold = bookingRepository.findByUserIdAndSeatIdAndStatus(user.getId(), seatId, "LOCKED");
                    if (existingHold.isPresent()) {
                        // Already held by this user — renew the booking time so the 5-min timer resets
                        Booking existing = existingHold.get();
                        existing.setBookingTime(LocalDateTime.now());
                        bookingRepository.save(existing);
                        if (eventId == null) eventId = seat.getEvent().getId();
                        continue; // Skip re-creating a new booking record
                    } else {
                        throw new RuntimeException("Seat " + seat.getSeatNumber() + " is already held by another customer! Please choose a different seat.");
                    }
                }

                if (seat.getStatus() == SeatStatus.BOOKED) {
                    throw new RuntimeException("Seat " + seat.getSeatNumber() + " has already been booked and confirmed!");
                }

                seat.setStatus(SeatStatus.LOCKED);
                seatRepository.save(seat);

                Booking booking = new Booking();
                booking.setEvent(seat.getEvent());
                booking.setSeat(seat);
                booking.setUser(user);
                booking.setBookingTime(LocalDateTime.now());
                booking.setStatus("LOCKED");
                
                if (eventId == null) {
                    eventId = seat.getEvent().getId();
                }
                
                newlyLockedIds.add(seatId);
                bookings.add(bookingRepository.save(booking));
            }

            // Broadcast only NEWLY locked seats to all connected clients
            if (eventId != null && !newlyLockedIds.isEmpty()) {
                java.util.Map<String, Object> payload = new java.util.HashMap<>();
                payload.put("action", "LOCK");
                payload.put("seatIds", newlyLockedIds);
                payload.put("lockedBy", email);
                messagingTemplate.convertAndSend("/topic/event/" + eventId, (Object) payload);
            }

            return ResponseEntity.ok("Successfully locked " + (bookings.size()) + " seats");
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @Transactional
    @PostMapping("/confirm-multiple")
    public ResponseEntity<?> confirmMultipleBookings(java.security.Principal principal, @RequestBody List<Long> seatIds) {
        try {
            if (principal == null) {
                return ResponseEntity.status(401).body("Unauthorized. Please log in first.");
            }
            
            String email = principal.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            List<Booking> confirmedBookings = new ArrayList<>();
            
            for (Long seatId : seatIds) {
                Seat seat = seatRepository.findById(seatId)
                        .orElseThrow(() -> new RuntimeException("Seat not found"));
                
                if (seat.getStatus() != SeatStatus.LOCKED) {
                    throw new RuntimeException("Seat " + seat.getSeatNumber() + " is not currently held.");
                }
                
                // Confirm the seat status
                seat.setStatus(SeatStatus.BOOKED);
                seatRepository.save(seat);
                
                // Find and confirm the booking record
                Booking booking = bookingRepository.findByUserIdAndSeatIdAndStatus(user.getId(), seatId, "LOCKED")
                        .orElseThrow(() -> new RuntimeException("Active hold booking not found for Seat " + seat.getSeatNumber()));
                
                booking.setStatus("CONFIRMED");
                confirmedBookings.add(bookingRepository.save(booking));
            }
            
            return ResponseEntity.ok("Successfully confirmed " + confirmedBookings.size() + " bookings!");
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    @GetMapping("/my-bookings")
    public ResponseEntity<?> getMyBookings(java.security.Principal principal) {
        try {
            if (principal == null) {
                return ResponseEntity.status(401).body("Unauthorized. Please log in first.");
            }
            
            String email = principal.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            List<Booking> bookings = bookingRepository.findByUserIdOrderByBookingTimeDesc(user.getId());
            List<java.util.Map<String, Object>> response = new ArrayList<>();
            
            for (Booking booking : bookings) {
                java.util.Map<String, Object> map = new java.util.HashMap<>();
                map.put("bookingId", booking.getId());
                map.put("bookingTime", booking.getBookingTime());
                map.put("status", booking.getStatus());
                
                if (booking.getEvent() != null) {
                    map.put("eventTitle", booking.getEvent().getTitle());
                    map.put("eventDate", booking.getEvent().getEventDate());
                    map.put("venue", booking.getEvent().getVenue());
                    map.put("city", booking.getEvent().getCity());
                }
                
                if (booking.getSeat() != null) {
                    map.put("seatNumber", booking.getSeat().getSeatNumber());
                    map.put("price", booking.getSeat().getPrice());
                }
                
                response.add(map);
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/active-holds/{eventId}")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<?> getActiveHoldsForUser(java.security.Principal principal, @PathVariable Long eventId) {
        try {
            if (principal == null) {
                return ResponseEntity.ok(Collections.emptyList());
            }
            
            String email = principal.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            List<Booking> activeBookings = bookingRepository.findByUserIdAndEventIdAndStatus(user.getId(), eventId, "LOCKED");
            List<java.util.Map<String, Object>> response = new ArrayList<>();
            LocalDateTime now = LocalDateTime.now();

            for (Booking booking : activeBookings) {
                LocalDateTime bookingTime = booking.getBookingTime();
                long secondsElapsed = java.time.Duration.between(bookingTime, now).getSeconds();
                long secondsRemaining = 300 - secondsElapsed; // 5 minute lock hold

                if (secondsRemaining > 0) {
                    java.util.Map<String, Object> map = new java.util.HashMap<>();
                    map.put("seatId", booking.getSeat().getId());
                    map.put("seatNumber", booking.getSeat().getSeatNumber());
                    map.put("price", booking.getSeat().getPrice());
                    map.put("secondsRemaining", secondsRemaining);
                    response.add(map);
                }
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @Transactional
    @PostMapping("/release-multiple")
    public ResponseEntity<?> releaseMultipleSeats(java.security.Principal principal, @RequestBody List<Long> seatIds) {
        try {
            if (principal == null) {
                return ResponseEntity.status(401).body("Unauthorized");
            }
            
            String email = principal.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Long eventId = null;
            List<Long> releasedSeatIds = new ArrayList<>();

            for (Long seatId : seatIds) {
                java.util.Optional<Booking> bookingOpt = bookingRepository.findByUserIdAndSeatIdAndStatus(user.getId(), seatId, "LOCKED");
                if (bookingOpt.isPresent()) {
                    Booking booking = bookingOpt.get();
                    booking.setStatus("CANCELLED");
                    bookingRepository.save(booking);

                    Seat seat = booking.getSeat();
                    if (seat != null && seat.getStatus() == SeatStatus.LOCKED) {
                        seat.setStatus(SeatStatus.AVAILABLE);
                        seatRepository.save(seat);
                        releasedSeatIds.add(seat.getId());
                        
                        if (eventId == null) {
                            eventId = seat.getEvent().getId();
                        }
                    }
                }
            }

            // Broadcast the release to WebSocket subscribers in real-time
            if (eventId != null && !releasedSeatIds.isEmpty()) {
                java.util.Map<String, Object> payload = new java.util.HashMap<>();
                payload.put("action", "RELEASE");
                payload.put("seatIds", releasedSeatIds);
                messagingTemplate.convertAndSend("/topic/event/" + eventId, (Object) payload);
            }

            return ResponseEntity.ok("Successfully released " + releasedSeatIds.size() + " seats");
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
