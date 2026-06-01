import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!res.ok) throw new Error('Invalid credentials');
      
      const data = await res.json();
      login(data.token, data.role, data.location, data.email, data.name);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="app-container" style={{maxWidth: '500px', marginTop: '10vh'}}>
      <div className="glass-card">
        <h2 className="event-title">Login to TicketSystem</h2>
        {error && <div className="notification error" style={{position:'static', marginBottom: '1rem', animation:'none'}}>{error}</div>}
        <form onSubmit={handleLogin} style={{display:'flex', flexDirection:'column', gap:'1.5rem'}}>
          <input 
            type="email" 
            placeholder="Email Address" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1.1rem', fontFamily: 'inherit'}}
            required
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1.1rem', fontFamily: 'inherit'}}
            required
          />
          <button type="submit" className="btn-primary" style={{marginTop: '1rem'}}>Secure Login</button>
        </form>
        <p style={{marginTop: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.95rem'}}>
          New to TicketSystem? <Link to="/register" style={{color: 'var(--secondary)', textDecoration: 'none', fontWeight: 600}}>Sign Up</Link>
        </p>
        <p style={{marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.05)'}}>
          Demo Admin Account:<br/>Email: test@example.com<br/>Password: password
        </p>
      </div>
    </div>
  );
}
