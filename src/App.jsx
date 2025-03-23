// src/App.jsx
import { AuthProvider } from './context/AuthContext';
import AdminDashboard from './pages/AdminDashboard';
import Home from './pages/Home';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <AuthProvider>
      <ToastContainer position="top-right" autoClose={3000} />
      <Home/>
    </AuthProvider>
  );
}

export default App;
