import React, { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../assets/images/AIBots.avif";
import AuthenticationServices from '../services/AuthenticationServices';
import "./login.css"

export default function Register() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors = {};

    // Email validation
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Enter a valid email address";
    }

    // Username validation
    if (!username) {
      newErrors.username = "Username is required";
    } else if (username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    // Password validation
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validate()) {
      const newErrors = {};
      try {
        setLoading(true);
        const payload = { username, email, password };
        const response = await AuthenticationServices.register(payload);
        // Check if the response was successful
        if (response.status==201) {
            window.location.href = `${window.location.origin}/auth/login`;
        } else {
          if(response.data.targe =="username_error"){
            newErrors.username = response.data.error;
          }
          else if(response.data.targe =="email_error"){
            newErrors.email = response.data.error;
          }else{
            newErrors.username = response.data.error;
          }
        }
      } catch (error) {
        console.error('Registration error:', error);
      } finally {
        setLoading(false);
      }
       setErrors(newErrors);
    }
  };

  return (
    <div className="flex flex-col justify-center sm:h-screen p-4">
      <div className="max-w-md w-full mx-auto border border-gray-300 rounded-2xl p-8">
        <div className="text-center mb-12">
          <img src={Logo} alt="logo" className="w-40 inline-block" />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* ✅ Username field */}
            <div>
              <label className="text-slate-900 text-sm font-medium mb-2 block">
                Username
              </label>
              <input
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)} 
                type="text"
                className={`text-slate-900 bg-white border w-full text-sm px-4 py-3 rounded-md outline-blue-500 ${
                  errors.username ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter username"
              />
              {errors.username && (
                <p className="text-red-500 text-sm mt-1">{errors.username}</p>
              )}
            </div>

            {/* ✅ Email field */}
            <div>
              <label className="text-slate-900 text-sm font-medium mb-2 block">
                Email Address
              </label>
              <input
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="text"
                className={`text-slate-900 bg-white border w-full text-sm px-4 py-3 rounded-md outline-blue-500 ${
                  errors.email ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter email"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* ✅ Password field */}
            <div>
              <label className="text-slate-900 text-sm font-medium mb-2 block">
                Password
              </label>
              <input
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)} 
                className={`text-slate-900 bg-white border w-full text-sm px-4 py-3 rounded-md outline-blue-500 ${
                  errors.password ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter password"
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 shrink-0 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="remember-me"
                className="text-slate-600 ml-3 block text-sm"
              >
                I accept the
                <Link
                  to={"#"}
                  className="text-blue-600 font-medium hover:underline ml-1"
                >
                  Terms and Conditions
                </Link>
              </label>
            </div>
          </div>

          <div className="mt-12">
            <button
            onClick={handleSubmit}
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: "oklch(20.8% 0.042 265.755)",
                height: "45px",
              }}
              className={`auth-btn w-full flex items-center justify-center text-white py-2 px-4 rounded-lg transition ${
                loading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {loading ? (
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
              ) : (
                "Register"
              )}
            </button>
          </div>
          <p className="text-slate-600 text-sm mt-6 text-center">
            Already have an account?
            <Link
              to={"/auth/login"}
              className="text-blue-600 font-medium hover:underline ml-1"
            >
              Login here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
