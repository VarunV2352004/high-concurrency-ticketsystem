import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function MyBookings() {
  const { user } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/bookings/my-bookings', {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTierName = (seatNumber) => {
    const row = seatNumber.charAt(0).toUpperCase();
    if (row === 'A' || row === 'B') return 'VIP';
    if (row === 'C' || row === 'D') return 'Premium';
    return 'Standard';
  };

  const getTierColor = (tier) => {
    if (tier === 'VIP') return '#f59e0b';
    if (tier === 'Premium') return '#8b5cf6';
    return '#3b82f6';
  };

  return (
    <div className="app-container" style={{ maxWidth: '850px' }}>
      <div style={{ width: '100%', marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="app-title" style={{ fontSize: '2.5rem', textAlign: 'left' }}>My Purchase History</h1>
          <p className="app-subtitle" style={{ textAlign: 'left', fontSize: '0.9rem', letterSpacing: '2px', marginTop: '0.25rem' }}>View your scannable dynamic passes</p>
        </div>
        <button onClick={() => navigate('/')} className="btn-primary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem' }}>
          Browse Events
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', marginTop: '10vh', color: 'var(--text-muted)' }}>Loading tickets database...</div>
      ) : bookings.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '1rem' }}>No Tickets Booked Yet</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>You haven't reserved any show passes. Find an event and lock your seats in real-time!</p>
          <button className="btn-primary" onClick={() => navigate('/')}>Book Tickets Now</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
          {bookings.map(b => {
            const tier = getTierName(b.seatNumber);
            const tierColor = getTierColor(tier);
            const formattedDate = new Date(b.eventDate).toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
            });
            const formattedTime = new Date(b.eventDate).toLocaleTimeString('en-US', {
              hour: '2-digit', minute: '2-digit'
            });

            return (
              <div 
                key={b.bookingId} 
                className="glass-card" 
                style={{
                  padding: 0,
                  display: 'flex',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  border: `1px solid rgba(255, 255, 255, 0.08)`,
                  boxShadow: `0 15px 35px rgba(0,0,0,0.4)`
                }}
              >
                {/* Main Pass Info Section */}
                <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff', margin: 0 }}>{b.eventTitle}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>📍 {b.venue}, {b.city}</p>
                    </div>
                    <span 
                      style={{
                        padding: '0.4rem 1rem',
                        borderRadius: '50px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        background: b.status === 'CONFIRMED' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                        color: b.status === 'CONFIRMED' ? '#10b981' : '#f59e0b',
                        border: `1px solid ${b.status === 'CONFIRMED' ? '#10b981' : '#f59e0b'}`,
                        boxShadow: `0 0 10px ${b.status === 'CONFIRMED' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`
                      }}
                    >
                      {b.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '2rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Date</p>
                      <p style={{ fontSize: '1rem', fontWeight: '600', color: '#fff', margin: '0.2rem 0 0' }}>{formattedDate}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Time</p>
                      <p style={{ fontSize: '1rem', fontWeight: '600', color: '#fff', margin: '0.2rem 0 0' }}>{formattedTime}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Seat</p>
                      <p style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--secondary)', margin: '0.1rem 0 0' }}>
                        {b.seatNumber} <span style={{ fontSize: '0.8rem', fontWeight: '500', color: tierColor, border: `1px solid ${tierColor}`, padding: '0.1rem 0.4rem', borderRadius: '4px', marginLeft: '0.25rem' }}>{tier}</span>
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <span>Ref Code: <strong style={{ color: '#fff' }}>#TS-{100000 + b.bookingId}</strong></span>
                    <span>Paid: <strong style={{ color: '#fff', fontSize: '1rem' }}>₹{b.price}</strong></span>
                  </div>
                </div>

                {/* Perforated Divider */}
                <div style={{
                  width: '2px',
                  background: 'repeating-linear-gradient(to bottom, transparent, transparent 4px, rgba(255,255,255,0.1) 4px, rgba(255,255,255,0.1) 12px)',
                  position: 'relative'
                }}>
                  {/* Perforated Circles Top/Bottom */}
                  <div style={{ position: 'absolute', top: '-10px', left: '-9px', width: '20px', height: '20px', borderRadius: '50%', background: 'var(--bg-base)', border: '1px solid rgba(255,255,255,0.08)', zIndex: 10 }}></div>
                  <div style={{ position: 'absolute', bottom: '-10px', left: '-9px', width: '20px', height: '20px', borderRadius: '50%', background: 'var(--bg-base)', border: '1px solid rgba(255,255,255,0.08)', zIndex: 10 }}></div>
                </div>

                {/* Digital Ticket Scannable Section */}
                <div style={{
                  width: '200px',
                  background: 'rgba(255,255,255,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem',
                  gap: '0.75rem',
                  textAlign: 'center',
                  userSelect: 'none'
                }}>
                  {/* Glowing Mock QR Code */}
                  <div style={{
                    width: '100px',
                    height: '100px',
                    border: '4px solid #fff',
                    borderRadius: '8px',
                    position: 'relative',
                    background: '#fff',
                    padding: '6px',
                    boxShadow: b.status === 'CONFIRMED' ? '0 0 20px rgba(16,185,129,0.3)' : 'none',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '2px',
                    alignContent: 'center',
                    justifyContent: 'center'
                  }}>
                    {/* QR Code Pixel Blocks */}
                    <div style={{ width: '25px', height: '25px', background: '#000', position: 'absolute', top: '6px', left: '6px' }}></div>
                    <div style={{ width: '25px', height: '25px', background: '#000', position: 'absolute', top: '6px', right: '6px' }}></div>
                    <div style={{ width: '25px', height: '25px', background: '#000', position: 'absolute', bottom: '6px', left: '6px' }}></div>
                    
                    {/* Dynamic Seeded Center Pixels */}
                    <div style={{ width: '8px', height: '8px', background: '#000', position: 'absolute', top: '45px', left: '45px' }}></div>
                    <div style={{ width: '12px', height: '6px', background: '#000', position: 'absolute', top: '40px', left: '20px' }}></div>
                    <div style={{ width: '6px', height: '12px', background: '#000', position: 'absolute', top: '55px', right: '25px' }}></div>
                    <div style={{ width: '10px', height: '10px', background: '#000', position: 'absolute', bottom: '20px', right: '20px' }}></div>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Scan at Entry</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
