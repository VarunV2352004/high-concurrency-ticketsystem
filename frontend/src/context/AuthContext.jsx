import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const location = localStorage.getItem('location');
    const email = localStorage.getItem('email');
    const name = localStorage.getItem('name');
    if (token) {
      setUser({ token, role, location, email, name });
    }
  }, []);

  const login = (token, role, location, email, name) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    if (location) {
      localStorage.setItem('location', location);
    } else {
      localStorage.removeItem('location');
    }
    if (email) {
      localStorage.setItem('email', email);
    } else {
      localStorage.removeItem('email');
    }
    if (name) {
      localStorage.setItem('name', name);
    } else {
      localStorage.removeItem('name');
    }
    setUser({ token, role, location, email, name });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('location');
    localStorage.removeItem('email');
    localStorage.removeItem('name');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
