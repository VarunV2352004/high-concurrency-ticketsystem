# 🎫 High-Concurrency Ticket Booking System

A robust, enterprise-grade distributed ticket booking system built with **Spring Boot, Java, JPA/Hibernate, PostgreSQL, and WebSockets**, specifically designed to handle high-concurrency ticket purchase requests while preventing overselling.

---

## 🏗️ Technical Architecture

This system is engineered to solve the classic systems engineering challenge of **high parallel competition** (multiple users booking the exact same seat concurrently).

```
                      ┌─────────────────────────────────┐
                      │          React Frontend         │
                      └────────────────┬────────────────┘
                                       │ WebSocket / HTTP
                                       ▼
                      ┌─────────────────────────────────┐
                      │      Spring Boot Controller     │
                      └────────────────┬────────────────┘
                                       │ Thread Pool (HikariCP)
                                       ▼
                      ┌─────────────────────────────────┐
                      │    Transactional Service Layer   │
                      │  (Pessimistic/Optimistic Lock)  │
                      └────────────────┬────────────────┘
                                       │ ACQUIRE LOCK
                                       ▼
                      ┌─────────────────────────────────┐
                      │      PostgreSQL Database        │
                      │   (Isolated Concurrency Safe)   │
                      └─────────────────────────────────┘
```

### 1. Concurrency Control & Overselling Prevention
To guarantee that a seat is booked by **exactly one user** under extreme concurrent requests, the system implements robust database locking strategies:
* **Pessimistic Write Locking (PESSIMISTIC_WRITE):** Uses Postgres's `SELECT ... FOR UPDATE` query at the database level. When User A tries to reserve a seat, the database acquires an exclusive lock on that row. User B’s request blocks and waits safely until User A commits or rolls back, completely avoiding race conditions.
* **Optimistic Locking:** Utilizes a `@Version` tracking number on the database entities. If two requests try to update a seat's status at the exact same time, the first request succeeds, and the second request immediately throws an `OptimisticLockingFailureException`, which is caught and gracefully handled.

### 2. Live WebSocket Updates
* Integrated **Spring WebSocket + STOMP** to broadcast real-time seat status changes (Available, Reserved, Booked) to all active users.
* Ensures clients are immediately in sync with the database state without resorting to heavy, expensive HTTP polling.

### 3. Clean Architecture & Database Schema
* Built using the standard Spring **Controller-Service-Repository** pattern.
* Leverages **HikariCP** connection pooling to manage high database connection throughput.
* Implements robust relational modeling mapping `Events`, `Seats`, `Bookings`, and `Users`.

---

## ⚡ Core Technical Features

* **Overselling Prevention:** Built and verified with automated concurrent JUnit integration tests simulating 100+ parallel request threads booking the same seat.
* **Database Contention Tuning:** Utilizes Spring Data JPA transactional scopes (`@Transactional`) to keep locks active for the shortest duration possible, maximizing throughput.
* **Real-time Live Seating Map:** Live WebSocket state sync for dynamic seat availability updates.
* **Token-based Security:** Secure user authentication and registration flow.

---

## 🛠️ Tech Stack

* **Backend:** Java 17, Spring Boot, Spring Data JPA, Spring Web, Spring WebSockets.
* **Database:** PostgreSQL (with H2 in-memory DB configuration for development & integration tests).
* **Build System:** Gradle.

---

## 🚀 Running the System

### 1. Run the Spring Boot Server
Navigate to the `TicketSystem` backend directory and run:
```bash
./gradlew bootRun
```
*The server will start up, initialize the schema, seed the database with events/seats, and start listening on port 8080.*

### 2. Run Integration & Load Tests
The codebase contains a specialized concurrent simulation test suite in `ConcurrencyTest.java` that spins up parallel worker threads to verify database lock integrity. Run it using:
```bash
./gradlew test
```
*Verify that the tests pass, proving that the database lock successfully prevents double-booking under extreme parallel stress!*
