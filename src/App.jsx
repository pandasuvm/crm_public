import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AdminDashboard from "./pages/AdminDashboard";
import Home from "./pages/Home";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function Navbar() {
  return (
    <nav className="text-[#2E3192] py-4 px-6 shadow-lg">
    <div className="container mx-auto flex justify-between items-center">
      <h1 className="text-2xl font-bold tracking-tight">CRM System</h1>
      <div className="flex text-black space-x-6">
        <Link 
          to="/" 
          className="text-black hover:text-blue-200 transition-colors duration-200 font-medium"
        >
          Home
        </Link>
        <Link 
          to="/dashboard" 
          className="text-black hover:text-blue-200 transition-colors duration-200 font-medium"
        >
          Dashboard
        </Link>
      </div>
    </div>
  </nav>
  
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <ToastContainer position="top-right" autoClose={3000} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<AdminDashboard />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
