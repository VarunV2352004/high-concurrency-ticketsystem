import { useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <nav style={{
      width: '100%', 
      padding: '1.25rem 4rem', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      background: 'rgba(10, 10, 15, 0.8)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      <Link to="/" style={{ textDecoration: 'none' }}>
        <h1 style={{
          fontSize: '1.5rem', 
          fontWeight: 800, 
          background: 'linear-gradient(to right, #fff, #a5b4fc)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent',
          margin: 0,
          letterSpacing: '-0.5px'
        }}>TicketSystem</h1>
      </Link>

      <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
        {/* City Location Selector Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>📍 City:</span>
          <select
            value={localStorage.getItem('selectedCity') || (user?.location || 'All Cities')}
            onChange={(e) => {
              localStorage.setItem('selectedCity', e.target.value);
              window.dispatchEvent(new Event('cityChanged'));
              navigate('/'); // Force redirection to Home so they see filtered shows
            }}
            style={{
              background: '#0d0d14',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.9rem',
              fontWeight: 500,
              outline: 'none'
            }}
          >
            <option value="All Cities">All Cities</option>
            <option value="Bengaluru">Bengaluru</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Goa">Goa</option>
            <option value="Delhi">Delhi</option>
            <option value="Hyderabad">Hyderabad</option>
          </select>
        </div>

        {user ? (
          <div style={{display:'flex', gap:'2rem', alignItems:'center'}}>
            <Link to="/my-bookings" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = 'white'} onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}>
              My Tickets
            </Link>
            
            <span style={{color:'var(--text-muted)', fontSize: '0.9rem'}}>
              Welcome, <strong style={{color: 'white', fontWeight: 600}}>{user.name || 'User'}</strong>
              {user.role === 'ADMIN' && (
                <span style={{fontSize: '0.75rem', background: 'rgba(236,72,153,0.1)', padding: '0.2rem 0.6rem', borderRadius: '4px', marginLeft: '0.5rem', color: 'var(--secondary)', border: '1px solid rgba(236,72,153,0.2)', fontWeight: 700}}>ADMIN</span>
              )}
            </span>
            {user.role === 'ADMIN' && (
              <button className="btn-primary" onClick={() => navigate('/admin/create-event')} style={{padding: '0.5rem 1.25rem', fontSize: '0.9rem', background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', boxShadow: '0 5px 15px rgba(236, 72, 153, 0.3)'}}>
                + Create Event
              </button>
            )}
            <button className="btn-primary" onClick={logout} style={{padding: '0.5rem 1.25rem', fontSize: '0.9rem', background: '#1e293b', border: '1px solid #334155', boxShadow: 'none'}}>
              Logout
            </button>
          </div>
        ) : (
          <button className="btn-primary" onClick={() => navigate('/login')} style={{padding: '0.6rem 1.75rem', fontSize: '0.9rem', borderRadius: '50px'}}>
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}
