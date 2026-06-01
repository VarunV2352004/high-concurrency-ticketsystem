package com.example.ticketsystem;

import com.example.ticketsystem.model.Seat;
import com.example.ticketsystem.model.SeatStatus;
import com.example.ticketsystem.repository.SeatRepository;
import com.example.ticketsystem.service.BookingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
public class ConcurrencyTest {

    @Autowired
    private BookingService bookingService;

    @Autowired
    private SeatRepository seatRepository;

    @Test
    public void testConcurrentBooking() throws InterruptedException {
        int numberOfThreads = 100;
        ExecutorService executorService = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch latch = new CountDownLatch(numberOfThreads);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);

        // We will try to book Seat ID 2 (which is Seat A2)
        Long targetSeatId = 2L;
        Long targetUserId = 1L;

        System.out.println("==========================================================");
        System.out.println("Starting 100 concurrent booking requests for Seat ID: " + targetSeatId);
        System.out.println("==========================================================");

        for (int i = 0; i < numberOfThreads; i++) {
            executorService.execute(() -> {
                try {
                    bookingService.reserveSeat(targetUserId, targetSeatId);
                    successCount.incrementAndGet();
                    System.out.println("[SUCCESS] Thread " + Thread.currentThread().getId() + " booked the seat!");
                } catch (Exception e) {
                    failCount.incrementAndGet();
                    // System.out.println("[FAIL] Blocked by lock: " + e.getMessage());
                } finally {
                    latch.countDown();
                }
            });
        }

        // Wait for all 100 threads to finish
        latch.await();
        executorService.shutdown();

        System.out.println("==========================================================");
        System.out.println("Total Successful Bookings: " + successCount.get());
        System.out.println("Total Failed Bookings (Blocked by Lock): " + failCount.get());
        System.out.println("==========================================================");

        // Assertions for 12 LPA proof
        assertEquals(1, successCount.get(), "Only one thread should succeed");
        assertEquals(99, failCount.get(), "99 threads should fail");

        Seat seat = seatRepository.findById(targetSeatId).get();
        assertEquals(SeatStatus.LOCKED, seat.getStatus(), "Seat should be LOCKED");
    }
}
