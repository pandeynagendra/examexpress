import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { User, LogOut } from "lucide-react";

export const Header = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const handleLogout = () => {
    try {
      setLoading(true);
      setOpen(false);
      
      // Clear all authentication data
      localStorage.removeItem("authToken");
      localStorage.removeItem("candidate");
      localStorage.removeItem("userData");
      localStorage.removeItem("user");
      localStorage.removeItem("examData");
      
      // Clear session storage
      sessionStorage.clear();
      
      // Redirect to login page
      navigate("/");
      
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Check if user is logged in
  const isLoggedIn = !!localStorage.getItem("authToken");

  return (
    <header className="w-full bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">

        {/* LEFT LOGO */}
        <Link to="/" className="flex items-center gap-2 sm:gap-2">
          <img
            src="../assets/examexpress.png"
            alt="ExamExpress Logo"
            className="h-20 md:h-16 bg-white p-2 rounded-md object-contain"
          />
        </Link>

        {/* USER DROPDOWN - Only show if logged in */}
        {isLoggedIn ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen(!open)}
              disabled={loading}
              className="flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-muted hover:bg-muted/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="User menu"
              aria-expanded={open}
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
              ) : (
                <User className="h-5 w-5 text-muted-foreground" />
              )}
            </button>

            {/* DROPDOWN MENU */}
            {open && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-border rounded-lg shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    User Menu
                  </p>
                </div>
                
                <Link
                  to="/profile-verification"
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 transition"
                  onClick={() => setOpen(false)}
                >
                  <User className="h-4 w-4" />
                  Profile
                </Link>
                
                <button
                  onClick={handleLogout}
                  disabled={loading}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-red-50 transition text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LogOut className="h-4 w-4" />
                  {loading ? "Logging out..." : "Logout"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/">
            <Button variant="outline" size="sm">
              Login
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
};