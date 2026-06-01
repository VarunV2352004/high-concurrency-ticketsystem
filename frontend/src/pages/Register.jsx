import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('Bengaluru');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8080/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, location })
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Registration failed');
      }
      
      const data = await res.json();
      login(data.token, data.role, data.location, data.email, data.name);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cities = ['Bengaluru', 'Mumbai', 'Goa', 'Delhi', 'Hyderabad', 'Chennai'];

  return (
    <div className="app-container" style={{maxWidth: '500px', marginTop: '5vh'}}>
      <div className="glass-card">
        <h2 className="event-title" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Join TicketSystem</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Create an account to unlock instant seat holds, dynamic pricing, and personalized location alerts!
        </p>

        {error && <div className="notification error" style={{position:'static', marginBottom: '1.5rem', animation:'none'}}>{error}</div>}
        
        <form onSubmit={handleRegister} style={{display:'flex', flexDirection:'column', gap:'1.25rem'}}>
          <div>
            <label style={{display:'block', marginBottom:'0.5rem', color:'var(--text-muted)', fontSize:'0.9rem'}}>Full Name</label>
            <input 
              type="text" 
              placeholder="e.g. Varun V" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{width:'100%', padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem', fontFamily: 'inherit'}}
              required
            />
          </div>

          <div>
            <label style={{display:'block', marginBottom:'0.5rem', color:'var(--text-muted)', fontSize:'0.9rem'}}>Email Address</label>
            <input 
              type="email" 
              placeholder="e.g. varun@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{width:'100%', padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem', fontFamily: 'inherit'}}
              required
            />
          </div>

          <div>
            <label style={{display:'block', marginBottom:'0.5rem', color:'var(--text-muted)', fontSize:'0.9rem'}}>Password</label>
            <input 
              type="password" 
              placeholder="Create strong password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{width:'100%', padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem', fontFamily: 'inherit'}}
              required
            />
          </div>

          <div>
            <label style={{display:'block', marginBottom:'0.5rem', color:'var(--text-muted)', fontSize:'0.9rem'}}>Default City (For Location Filter)</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={{width:'100%', padding: '1.05rem', borderRadius: '12px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem', fontFamily: 'inherit', cursor: 'pointer'}}
              required
            >
              {cities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn-primary" style={{marginTop: '1rem'}} disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up & Get Started'}
          </button>
        </form>

        <p style={{marginTop: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.95rem'}}>
          Already have an account? <Link to="/login" style={{color: 'var(--secondary)', textDecoration: 'none', fontWeight: 600}}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}
