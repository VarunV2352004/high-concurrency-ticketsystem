import { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  
  const [event, setEvent] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  const [showCheckout, setShowCheckout] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const showCheckoutRef = useRef(showCheckout);
  useEffect(() => {
    showCheckoutRef.current = showCheckout;
  }, [showCheckout]);

  useEffect(() => {
    if (!showCheckout) return;
    if (timeLeft <= 0) {
      // Call release API immediately when countdown expires!
      const releaseHolds = async () => {
        try {
          const seatIds = selectedSeats.map(s => s.id);
          if (seatIds.length > 0 && userRef.current) {
            await fetch(`http://localhost:8080/api/bookings/release-multiple`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userRef.current.token}`
              },
              body: JSON.stringify(seatIds)
            });
          }
        } catch (err) {
          console.error("Failed to auto-expire hold", err);
        }
      };
      releaseHolds();
      setShowCheckout(false);
      setSelectedSeats([]);
      showNotification("Reservation hold expired! Your seats have been released.", "error");
      fetchEventData();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [showCheckout, timeLeft]);

  useEffect(() => {
    fetchEventData();

    // Setup STOMP WebSocket client for real-time seat synchronization
    const stompClient = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      debug: function (str) {
        console.log('STOMP: ' + str);
      },
      reconnectDelay: 5000,
    });

    stompClient.onConnect = function () {
      console.log("Successfully connected to WebSocket STOMP Broker.");
      // Subscribe to the specific topic for this event
      stompClient.subscribe(`/topic/event/${id}`, function (message) {
        const payload = JSON.parse(message.body);
        console.log("Live broadcast received!", payload);
        
        // Handle both action-based object formats and old array-based locking fallback
        const isActionPayload = payload && typeof payload === 'object' && !Array.isArray(payload);
        const action = isActionPayload ? payload.action : 'LOCK';
        const targetIds = isActionPayload ? payload.seatIds : payload;
        const lockedBy = isActionPayload ? payload.lockedBy : null;

        // BUBBLE FILTER: Ignore loopback lock echoes from our own actions!
        if (action === 'LOCK' && lockedBy && userRef.current && lockedBy === userRef.current.email) {
          console.log("Ignored loopback echo for seats we locked ourselves.");
          return;
        }

        if (action === 'LOCK') {
          // Optimistically update the UI to lock seats
          setSeats(prevSeats => prevSeats.map(seat => {
            if (targetIds.includes(seat.id)) {
              return { ...seat, status: 'LOCKED' };
            }
            return seat;
          }));
          
          // If the user had any of those seats selected, clear them and show a warning
          setSelectedSeats(prevSelected => {
            // If the checkout modal is open, do not clear selection (we held these seats ourselves!)
            if (showCheckoutRef.current) {
              return prevSelected;
            }
            const compromised = prevSelected.filter(s => targetIds.includes(s.id));
            if (compromised.length > 0) {
              showNotification("Warning: Someone just held a seat you were looking at!", "error");
              return prevSelected.filter(s => !targetIds.includes(s.id));
            }
            return prevSelected;
          });
        } else if (action === 'RELEASE') {
          // Release seats back to AVAILABLE
          setSeats(prevSeats => prevSeats.map(seat => {
            if (targetIds.includes(seat.id)) {
              return { ...seat, status: 'AVAILABLE' };
            }
            return seat;
          }));
          
          showNotification("Notice: Expired seat holds released back to available pool!", "success");
        }
      });
    };

    stompClient.activate();

    // Cleanup on unmount
    return () => {
      if (stompClient.active) {
        stompClient.deactivate();
      }
    };
  }, [id]);

  const fetchEventData = async () => {
    try {
      const eventRes = await fetch('http://localhost:8080/api/events');
      const events = await eventRes.json();
      const currentEvent = events.find(e => e.id.toString() === id);
      
      if (currentEvent) {
        setEvent(currentEvent);
        
        const seatsRes = await fetch(`http://localhost:8080/api/seats/all/${currentEvent.id}`);
        const allSeats = await seatsRes.json();
        
        // Sort seats nicely
        allSeats.sort((a, b) => {
           const aRow = a.seatNumber.charAt(0);
           const bRow = b.seatNumber.charAt(0);
           if (aRow !== bRow) return aRow.localeCompare(bRow);
           const aNum = parseInt(a.seatNumber.substring(1));
           const bNum = parseInt(b.seatNumber.substring(1));
           return aNum - bNum;
        });

        setSeats(allSeats);

        // RESTORE USER ACTIVE DATABASE HOLDS ON PAGE LOAD/REFRESH
        if (userRef.current) {
          try {
            const holdsRes = await fetch(`http://localhost:8080/api/bookings/active-holds/${currentEvent.id}`, {
              headers: {
                'Authorization': `Bearer ${userRef.current.token}`
              }
            });
            if (holdsRes.ok) {
              const holds = await holdsRes.json();
              if (holds && holds.length > 0) {
                console.log("Restored active holds for user:", holds);
                // Match the returned held seat IDs with the loaded allSeats objects
                const restoredSeats = allSeats.filter(seat => holds.some(h => h.seatId === seat.id));
                setSelectedSeats(restoredSeats);
                setShowCheckout(true);
                
                // Set the countdown timer to the minimum remaining seconds
                const minSeconds = Math.min(...holds.map(h => h.secondsRemaining));
                setTimeLeft(minSeconds > 0 ? minSeconds : 300);
              }
            }
          } catch (holdErr) {
            console.error("Failed to restore active holds from database", holdErr);
          }
        }
      }
    } catch (err) {
      console.error(err);
      showNotification("Failed to connect to backend", "error");
    } finally {
      setLoading(false);
    }
  }

  const getSeatTierInfo = (seat) => {
    const rowLetter = seat.seatNumber.charAt(0).toUpperCase();
    const price = seat.price || 150;
    if (rowLetter === 'A' || rowLetter === 'B') {
      return { name: 'VIP', price: price, color: '#f59e0b', className: 'tier-vip' };
    } else if (rowLetter === 'C' || rowLetter === 'D') {
      return { name: 'Premium', price: price, color: '#8b5cf6', className: 'tier-premium' };
    } else {
      return { name: 'Standard', price: price, color: '#3b82f6', className: 'tier-standard' };
    }
  };

  const handleSeatClick = (seat) => {
    if (seat.status !== 'AVAILABLE') return;
    
    if (selectedSeats.some(s => s.id === seat.id)) {
      setSelectedSeats(selectedSeats.filter(s => s.id !== seat.id));
    } else {
      if (selectedSeats.length >= 6) {
        showNotification("Anti-Scalping Rule: Max 6 seats per transaction.", "error");
        return;
      }
      setSelectedSeats([...selectedSeats, seat]);
    }
  }

  const handleBook = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (selectedSeats.length === 0) return;
    setBookingLoading(true);
    
    try {
      const seatIds = selectedSeats.map(s => s.id);
      
      const res = await fetch(`http://localhost:8080/api/bookings/reserve-multiple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(seatIds)
      });
      
      if (res.status === 401 || res.status === 403) {
        showNotification("Your session has expired. Please log in again.", "error");
        setTimeout(() => navigate('/login'), 1500);
        return;
      }

      if (!res.ok) {
        const errorText = await res.text();
        // Refetch seats so UI reflects the true locked state
        fetchEventData();
        setSelectedSeats([]);
        throw new Error(errorText || "One or more seats were just grabbed by someone else!");
      }
      
      showNotification(`Hold acquired! Complete checkout in 5 minutes.`, "success");
      setShowCheckout(true);
      setTimeLeft(300); // 5 minutes
      fetchEventData();
      
    } catch (err) {
      showNotification(err.message, "error");
      fetchEventData(); 
    } finally {
      setBookingLoading(false);
    }
  }

  const handleConfirmPayment = async () => {
    setPaymentProcessing(true);
    try {
      const seatIds = selectedSeats.map(s => s.id);
      const res = await fetch(`http://localhost:8080/api/bookings/confirm-multiple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(seatIds)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Payment confirmation failed!");
      }

      showNotification(`🎉 Booking Confirmed! Redirecting to your ticket wallet...`, "success");
      setSelectedSeats([]);
      setShowCheckout(false);
      fetchEventData();
      
      // Auto-redirect to scannable tickets wallet after 1.5 seconds
      setTimeout(() => {
        navigate('/my-bookings');
      }, 1500);
      
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setPaymentProcessing(false);
    }
  }

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }

  if (loading) return <div className="app-container" style={{textAlign: 'center', marginTop: '20vh'}}>Loading...</div>;
  if (!event) return <div className="app-container" style={{textAlign: 'center', marginTop: '20vh'}}>Event not found.</div>;

  const totalCost = selectedSeats.reduce((acc, s) => acc + (s.price || 150), 0);

  return (
    <div className="app-container">
      {notification && <div className={`notification ${notification.type}`} style={{position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 1100, animation: 'none'}}>{notification.message}</div>}

      <div style={{width: '100%', marginBottom: '2rem'}}>
        <button onClick={() => navigate('/')} style={{background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '1rem'}}>
          &larr; Back to Events
        </button>
      </div>

      <div className="glass-card">
        <div className="event-info">
          <h2 className="event-title">{event.title}</h2>
          <div className="event-details">
            <span>📅 {new Date(event.eventDate).toLocaleDateString()}</span>
            <span>📍 {event.venue}</span>
            <span>🎫 {seats.length} Total Capacity</span>
          </div>
        </div>

        <div className="screen-container">
          <div className="screen"></div>
          <div className="screen-text">Stage / Screen</div>
        </div>

        <div className="legend" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'center', padding: '1rem' }}>
          <div className="legend-item"><div className="legend-color" style={{backgroundColor: '#f59e0b'}}></div><span>VIP (Row A-B) - ₹500</span></div>
          <div className="legend-item"><div className="legend-color" style={{backgroundColor: '#8b5cf6'}}></div><span>Premium (Row C-D) - ₹300</span></div>
          <div className="legend-item"><div className="legend-color" style={{backgroundColor: '#3b82f6'}}></div><span>Standard (Row E+) - ₹150</span></div>
          <div className="legend-item"><div className="legend-color" style={{backgroundColor: 'var(--seat-selected)'}}></div><span>Selected</span></div>
          <div className="legend-item"><div className="legend-color" style={{backgroundColor: 'var(--seat-booked)'}}></div><span>Locked / Booked</span></div>
        </div>

        <div className="seat-map" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', overflowX: 'auto', width: '100%', padding: '1rem 0' }}>
          {Array.from(new Set(seats.map(s => s.seatNumber.charAt(0)))).sort().map(rowLetter => {
            const rowSeats = seats.filter(seat => seat.seatNumber.charAt(0) === rowLetter);
            const midPoint = Math.floor(rowSeats.length / 2);
            
            return (
              <div key={rowLetter} className="seat-row" style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 'max-content' }}>
                {/* Left Row Label */}
                <div style={{ width: '30px', fontWeight: 'bold', color: 'var(--text-muted)', textAlign: 'center', userSelect: 'none', fontSize: '1.1rem' }}>
                  {rowLetter}
                </div>
                
                {/* Left Section Seats */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {rowSeats.slice(0, midPoint).map(seat => {
                    const tier = getSeatTierInfo(seat);
                    const isSelected = selectedSeats.some(s => s.id === seat.id);
                    return (
                      <div 
                        key={seat.id} 
                        className={`seat ${seat.status.toLowerCase()} ${isSelected ? 'selected' : ''}`} 
                        onClick={() => handleSeatClick(seat)}
                        title={`${seat.seatNumber} (${tier.name} - ₹${tier.price})`}
                        style={
                          isSelected 
                            ? { backgroundColor: tier.color, borderColor: '#fff', color: '#fff', boxShadow: `0 0 12px ${tier.color}` } 
                            : seat.status === 'AVAILABLE' 
                            ? { border: `2px solid ${tier.color}`, color: '#fff', background: 'rgba(255,255,255,0.02)' } 
                            : {}
                        }
                      >
                        {seat.seatNumber.substring(1)}
                      </div>
                    );
                  })}
                </div>
                
                {/* Aisle Gap */}
                <div className="aisle-gap" style={{ width: '2.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ width: '2px', height: '30px', backgroundColor: 'rgba(255,255,255,0.05)' }}></div>
                </div>
                
                {/* Right Section Seats */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {rowSeats.slice(midPoint).map(seat => {
                    const tier = getSeatTierInfo(seat);
                    const isSelected = selectedSeats.some(s => s.id === seat.id);
                    return (
                      <div 
                        key={seat.id} 
                        className={`seat ${seat.status.toLowerCase()} ${isSelected ? 'selected' : ''}`} 
                        onClick={() => handleSeatClick(seat)}
                        title={`${seat.seatNumber} (${tier.name} - ₹${tier.price})`}
                        style={
                          isSelected 
                            ? { backgroundColor: tier.color, borderColor: '#fff', color: '#fff', boxShadow: `0 0 12px ${tier.color}` } 
                            : seat.status === 'AVAILABLE' 
                            ? { border: `2px solid ${tier.color}`, color: '#fff', background: 'rgba(255,255,255,0.02)' } 
                            : {}
                        }
                      >
                        {seat.seatNumber.substring(1)}
                      </div>
                    );
                  })}
                </div>
                
                {/* Right Row Label */}
                <div style={{ width: '30px', fontWeight: 'bold', color: 'var(--text-muted)', textAlign: 'center', userSelect: 'none', fontSize: '1.1rem' }}>
                  {rowLetter}
                </div>
              </div>
            );
          })}
        </div>

        <div className="checkout-bar">
          <div className="checkout-info">
            <p>Selected Seats ({selectedSeats.length})</p>
            <h3 style={{ fontSize: '1.25rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '300px' }}>
              {selectedSeats.length > 0 ? selectedSeats.map(s => s.seatNumber).join(', ') : 'None'}
            </h3>
            {selectedSeats.length > 0 && (
              <p style={{ marginTop: '0.5rem', color: '#fff', fontSize: '1rem', textTransform: 'none', fontWeight: 600 }}>
                Total Cost: <span style={{ color: 'var(--secondary)', fontSize: '1.5rem', fontWeight: 800 }}>₹{totalCost}</span>
              </p>
            )}
          </div>
          <button className="btn-primary" disabled={selectedSeats.length === 0 || bookingLoading} onClick={handleBook}>
            {!user ? 'Login to Book' : bookingLoading ? 'Processing Lock...' : `Reserve ${selectedSeats.length} Ticket(s)`}
          </button>
        </div>
      </div>

      {/* Secure Checkout Pop-up Modal */}
      {showCheckout && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000,
          animation: 'fadeIn 0.3s ease'
        }}>
          <div className="glass-card" style={{
            maxWidth: '500px',
            padding: '2.5rem',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{
                background: 'rgba(236,72,153,0.1)',
                color: 'var(--secondary)',
                padding: '0.5rem 1.25rem',
                borderRadius: '50px',
                fontSize: '0.85rem',
                fontWeight: '600',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>
                Secure Payments
              </span>
              <h3 style={{ fontSize: '1.75rem', marginTop: '1rem', color: '#fff' }}>Confirm Your Booking</h3>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.03)',
              padding: '1.5rem',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Event</span>
                <span style={{ fontWeight: 600 }}>{event.title}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Selected Seats</span>
                <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                  {selectedSeats.map(s => s.seatNumber).join(', ')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Total Cost</span>
                <span style={{ fontWeight: 800, color: 'var(--secondary)', fontSize: '1.4rem' }}>
                  ₹{totalCost}
                </span>
              </div>
            </div>

            {/* Countdown timer */}
            <div style={{
              textAlign: 'center',
              padding: '1rem',
              borderRadius: '12px',
              background: timeLeft < 60 ? 'rgba(239,68,68,0.1)' : 'rgba(79,70,229,0.1)',
              border: timeLeft < 60 ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(79,70,229,0.2)',
              color: timeLeft < 60 ? '#ef4444' : '#a5b4fc',
              fontWeight: 600
            }}>
              ⏱️ Hold Expires in: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <button 
                className="btn-primary" 
                onClick={handleConfirmPayment}
                disabled={paymentProcessing}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
                  padding: '1rem 2rem',
                  fontSize: '1.1rem'
                }}
              >
                {paymentProcessing ? 'Processing Secure Payment...' : `Confirm & Pay ₹${totalCost}`}
              </button>
              
              <button 
                className="btn-primary" 
                onClick={async () => {
                  try {
                    const seatIds = selectedSeats.map(s => s.id);
                    if (seatIds.length > 0 && user) {
                      await fetch(`http://localhost:8080/api/bookings/release-multiple`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${user.token}`
                        },
                        body: JSON.stringify(seatIds)
                      });
                      showNotification("Reservation hold cancelled and seats released.", "success");
                    }
                  } catch (err) {
                    console.error("Failed to cancel hold", err);
                  }
                  setShowCheckout(false);
                  setSelectedSeats([]);
                  fetchEventData();
                }}
                disabled={paymentProcessing}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: 'none',
                  padding: '0.8rem 2rem',
                  fontSize: '1rem',
                  color: 'var(--text-muted)'
                }}
              >
                Cancel Hold
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
