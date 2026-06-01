import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import EventDetails from './pages/EventDetails';
import AdminDashboard from './pages/AdminDashboard';
import Register from './pages/Register';
import MyBookings from './pages/MyBookings';
import Navbar from './components/Navbar';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';

function App() {
  const { user } = useContext(AuthContext);

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
        <Route path="/my-bookings" element={user ? <MyBookings /> : <Navigate to="/login" />} />
        <Route path="/event/:id" element={<EventDetails />} />
        <Route path="/admin/create-event" element={user && user.role === 'ADMIN' ? <AdminDashboard /> : <Navigate to="/login" />} />
      </Routes>
    </>
  );
}

export default App;
