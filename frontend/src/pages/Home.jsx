import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Home() {
  const { user } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState(
    localStorage.getItem('selectedCity') || (user?.location || 'All Cities')
  );
  const navigate = useNavigate();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    fetchEvents();

    const handleCityChange = () => {
      const city = localStorage.getItem('selectedCity') || (user?.location || 'All Cities');
      setSelectedCity(city);
    };

    window.addEventListener('cityChanged', handleCityChange);
    return () => window.removeEventListener('cityChanged', handleCityChange);
  }, [user]);

  const fetchEvents = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/events');
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter events dynamically based on search query and Navbar city selector
  const filteredEvents = events.filter(event => {
    const matchesCity = selectedCity === 'All Cities' || 
      (event.city && event.city.toLowerCase() === selectedCity.toLowerCase());
      
    const matchesSearch = 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.city && event.city.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCity && matchesSearch;
  });

  return (
    <div className="app-container">
      {/* Hero Header Area */}
      <div style={{textAlign:'center', marginBottom: '3.5rem', width: '100%', maxWidth: '700px'}}>
        {user ? (
          <div style={{ marginBottom: '1.75rem', animation: 'fadeIn 0.8s ease' }}>
            <span style={{
              background: 'linear-gradient(135deg, rgba(79,70,229,0.08) 0%, rgba(236,72,153,0.08) 100%)',
              color: 'var(--text-normal)',
              padding: '0.6rem 1.6rem',
              borderRadius: '50px',
              fontSize: '0.95rem',
              fontWeight: '500',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              display: 'inline-block',
              backdropFilter: 'blur(8px)',
              letterSpacing: '0.5px'
            }}>
              👋 {getGreeting()}, <strong style={{ color: 'var(--primary)', fontWeight: 700 }}>{user.name}</strong>! Ready for a live experience?
            </span>
          </div>
        ) : null}

        <h1 className="app-title" style={{fontSize: '3.5rem', marginBottom: '0.75rem', lineHeight: 1.15}}>Explore Live Events</h1>
        <p className="app-subtitle" style={{ fontSize: '1.05rem', letterSpacing: '4px', color: 'var(--text-muted)', fontWeight: 500 }}>
          {selectedCity !== 'All Cities' ? `Live Shows in ${selectedCity}` : 'Find the best entertainment in your area'}
        </p>

        {/* Dynamic Search Bar */}
        <div style={{ position: 'relative', marginTop: '2.5rem', width: '100%' }}>
          <input 
            type="text" 
            placeholder="🔍 Search by Artist, Show, Venue, or City..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '1.25rem 2rem 1.25rem 3rem',
              borderRadius: '50px',
              background: 'rgba(20, 20, 25, 0.7)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'white',
              fontSize: '1.1rem',
              fontFamily: 'inherit',
              outline: 'none',
              boxShadow: '0 10px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'rgba(79, 70, 229, 0.4)';
              e.target.style.boxShadow = '0 10px 30px rgba(79, 70, 229, 0.15), inset 0 1px 0 rgba(255,255,255,0.05)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255,255,255,0.08)';
              e.target.style.boxShadow = '0 10px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)';
            }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{textAlign: 'center', marginTop: '10vh', color: 'var(--text-muted)' }}>Loading events database...</div>
      ) : filteredEvents.length === 0 ? (
        <div className="glass-card" style={{ padding: '4rem', textAlign: 'center', maxWidth: '600px' }}>
          <h3 style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '1rem' }}>No Events Found</h3>
          <p style={{ color: 'var(--text-muted)' }}>We couldn't find any shows in {selectedCity} matching "{searchQuery}". Try selecting "All Cities" or searching for another term!</p>
        </div>
      ) : (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem', width: '100%'}}>
          {filteredEvents.map(event => {
            const isRecommended = user && user.location && event.city && 
              event.city.toLowerCase() === user.location.toLowerCase();

            return (
              <div 
                key={event.id} 
                className="glass-card" 
                style={{
                  padding: '2.25rem', 
                  cursor: 'pointer', 
                  position: 'relative',
                  border: isRecommended ? '1.5px solid rgba(236,72,153,0.3)' : '1px solid var(--card-border)',
                  boxShadow: isRecommended ? '0 15px 35px rgba(236,72,153,0.1), inset 0 1px 0 rgba(255,255,255,0.1)' : '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                }} 
                onClick={() => navigate(`/event/${event.id}`)}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-6px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {/* Personalized Recommended Ribbon */}
                {isRecommended && (
                  <span style={{
                    position: 'absolute',
                    top: '1.25rem', right: '1.25rem',
                    background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
                    color: 'white',
                    padding: '0.3rem 0.8rem',
                    borderRadius: '50px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                    boxShadow: '0 4px 10px rgba(236,72,153,0.3)'
                  }}>
                    ✨ FOR YOU
                  </span>
                )}

                <span style={{
                  color: 'var(--secondary)',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  display: 'inline-block',
                  marginBottom: '0.75rem'
                }}>
                  🎭 LIVE EVENT
                </span>
                
                <h3 style={{fontSize: '1.6rem', fontWeight: 700, marginBottom: '1.25rem', color: '#fff', lineHeight: 1.2}}>{event.title}</h3>
                
                <div style={{display:'flex', flexDirection:'column', gap:'0.5rem', marginBottom:'2rem'}}>
                  <p style={{color: 'var(--text-muted)', fontSize: '0.95rem'}}>📍 <strong>{event.venue}</strong> {event.city && `, ${event.city}`}</p>
                  <p style={{color: 'var(--text-muted)', fontSize: '0.95rem'}}>📅 {new Date(event.eventDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>

                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem'}}>
                  <span style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '0.95rem' }}>
                    View Layout &rarr;
                  </span>
                  {event.city && (
                    <span style={{
                      background: 'rgba(255,255,255,0.04)',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      color: '#94a3b8',
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      {event.city}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
