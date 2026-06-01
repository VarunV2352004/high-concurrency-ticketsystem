package com.example.ticketsystem.repository;

import com.example.ticketsystem.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByStatusAndBookingTimeBefore(String status, LocalDateTime time);
    Optional<Booking> findByUserIdAndSeatIdAndStatus(Long userId, Long seatId, String status);
    List<Booking> findByUserIdOrderByBookingTimeDesc(Long userId);
    List<Booking> findByUserIdAndEventIdAndStatus(Long userId, Long eventId, String status);
}
