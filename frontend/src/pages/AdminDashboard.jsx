import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [eventDate, setEventDate] = useState('');
  const [numberOfSeats, setNumberOfSeats] = useState(20);
  const [notification, setNotification] = useState(null);

  if (!user || user.role !== 'ADMIN') {
    return <div className="app-container" style={{textAlign: 'center', marginTop: '10vh'}}>Unauthorized. Admin access only.</div>;
  }

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:8080/api/events/create?numberOfSeats=${numberOfSeats}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          title,
          venue,
          city,
          eventDate: new Date(eventDate).toISOString()
        })
      });

      if (res.ok) {
        setNotification({ message: 'Event successfully created!', type: 'success' });
        setTitle('');
        setVenue('');
        setEventDate('');
        setNumberOfSeats(20);
        setTimeout(() => navigate('/'), 2000);
      } else {
        const errorMsg = await res.text();
        setNotification({ message: `Error: ${errorMsg}`, type: 'error' });
      }
    } catch (err) {
      setNotification({ message: 'Failed to connect to backend', type: 'error' });
    }
  }

  return (
    <div className="app-container" style={{maxWidth: '600px', marginTop: '5vh'}}>
      <div className="glass-card">
        <h2 className="event-title" style={{marginBottom: '2rem'}}>Admin Event Creator</h2>
        {notification && <div className={`notification ${notification.type}`} style={{position: 'static', marginBottom: '1.5rem', animation: 'none'}}>{notification.message}</div>}
        
        <form onSubmit={handleCreateEvent} style={{display:'flex', flexDirection:'column', gap:'1.5rem'}}>
          <div>
            <label style={{display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)'}}>Event Title</label>
            <input 
              type="text" 
              placeholder="e.g. Tomorrowland 2026" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{width: '100%', padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem', fontFamily: 'inherit'}}
              required
            />
          </div>

          <div>
            <label style={{display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)'}}>Venue Name</label>
            <input 
              type="text" 
              placeholder="e.g. Boom, Belgium" 
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              style={{width: '100%', padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem', fontFamily: 'inherit'}}
              required
            />
          </div>

          <div>
            <label style={{display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)'}}>Target City</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              style={{width: '100%', padding: '1.05rem', borderRadius: '12px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem', fontFamily: 'inherit', cursor: 'pointer'}}
              required
            >
              <option value="Bengaluru">Bengaluru</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Goa">Goa</option>
              <option value="Delhi">Delhi</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Chennai">Chennai</option>
            </select>
          </div>

          <div style={{display: 'flex', gap: '1rem'}}>
            <div style={{flex: 1}}>
              <label style={{display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)'}}>Event Date & Time</label>
              <input 
                type="datetime-local" 
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                style={{width: '100%', padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem', fontFamily: 'inherit'}}
                required
              />
            </div>
            
            <div style={{flex: 1}}>
              <label style={{display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)'}}>Total Seats</label>
              <input 
                type="number" 
                min="10"
                max="500"
                value={numberOfSeats}
                onChange={(e) => setNumberOfSeats(e.target.value)}
                style={{width: '100%', padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem', fontFamily: 'inherit'}}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{marginTop: '1rem', background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)'}}>Publish Event to Live Feed</button>
        </form>
      </div>
    </div>
  );
}
