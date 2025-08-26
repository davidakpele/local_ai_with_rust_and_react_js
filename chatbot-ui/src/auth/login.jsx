import React, { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../assets/images/AIBots.avif"
import AuthenticationServices from '../services/AuthenticationServices';
import AppManager from '../utils/appManager';
import "./login.css"

export default function Login() {
  const [email, setEmail] = useState("");
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
          const payload = { email, password };
          const response = await AuthenticationServices.login(payload);
          // Check if the response was successful
          if (response.status==200) {
              // Store in localStorage
              const userData = response.data;
               AppManager.store({
                data: {
                  token: userData.token,
                  id: userData.id,
                  email: userData.email,
                  username: userData.username
                },
                type: 'local' 
              }); 
              window.location.href = `${window.location.origin}/`;
          } else {
              newErrors.password = response.data.error;
          }
        } catch (error) {
          console.error('Login error:', error);
        } finally {
        setLoading(false);
      }
         setErrors(newErrors);
      }
    };

  return (
    <div className="bg-gray-50">
      <div className="min-h-screen flex flex-col items-center justify-center py-6 px-4">
        <div className="max-w-[480px] w-full">
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-gray-200 shadow-sm">
            <div className="text-center mb-12">
              <img src={Logo} alt="logo" className="w-40 inline-block"/>
            </div>
            <h4 className="text-slate-900 text-center text-3xl font-semibold">
              Sign in
            </h4>
            <form className="mt-3 space-y-6" onSubmit={handleSubmit}>
              {/* Username */}
              <div>
                <label className="text-slate-900 text-sm font-medium mb-2 block">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <input
                    name="email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full text-slate-900 text-sm border px-4 py-3 pr-8 rounded-md outline-blue-600 ${
                      errors.email ? "border-red-500" : "border-slate-300"
                    }`}
                    placeholder="Enter your email"
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="#bbb"
                    stroke="#bbb"
                    className="w-4 h-4 absolute right-4"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="10" cy="7" r="6"></circle>
                    <path d="M14 15H6a5 5 0 0 0-5 5 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 5 5 0 0 0-5-5zm8-4h-2.59l.3-.29a1 1 0 0 0-1.42-1.42l-2 2a1 1 0 0 0 0 1.42l2 2a1 1 0 0 0 1.42 0 1 1 0 0 0 0-1.42l-.3-.29H22a1 1 0 0 0 0-2z"></path>
                  </svg>
                </div>
                {errors.email  && (
                  <p className="text-red-500 text-sm mt-1">{errors.email }</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="text-slate-900 text-sm font-medium mb-2 block">
                  Password
                </label>
                <div className="relative flex items-center">
                  <input
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full text-slate-900 text-sm border px-4 py-3 pr-8 rounded-md outline-blue-600 ${
                      errors.password ? "border-red-500" : "border-slate-300"
                    }`}
                    placeholder="Enter password"
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="#bbb"
                    stroke="#bbb"
                    className="w-4 h-4 absolute right-4 cursor-pointer"
                    viewBox="0 0 128 128"
                  >
                    <path d="M64 104C22.127 104 1.367 67.496.504 65.943a4 4 0 0 1 0-3.887C1.367 60.504 22.127 24 64 24s62.633 36.504 63.496 38.057a4 4 0 0 1 0 3.887C126.633 67.496 105.873 104 64 104zM8.707 63.994C13.465 71.205 32.146 96 64 96c31.955 0 50.553-24.775 55.293-31.994C114.535 56.795 95.854 32 64 32 32.045 32 13.447 56.775 8.707 63.994zM64 88c-13.234 0-24-10.766-24-24s10.766-24 24-24 24 10.766 24 24-10.766 24-24 24zm0-40c-8.822 0-16 7.178-16 16s7.178 16 16 16 16-7.178 16-16-7.178-16-16-16z"></path>
                  </svg>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                )}
              </div>

              {/* Remember & Forgot */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 shrink-0 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-3 block text-sm text-slate-900"
                  >
                    Remember me
                  </label>
                </div>
                <div className="text-sm">
                  <Link
                  to="/auth/forget-password"
                    className="text-blue-600 hover:underline font-semibold"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </div>

              {/* Submit */}
              <div className="">
                  <button
                      type="submit"
                      disabled={loading}
                      style={{backgroundColor:"oklch(20.8% 0.042 265.755)", height:"45px"}}
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
                      "Login"
                    )}
                  </button>
              </div>

              {/* Register link */}
              <p className="text-slate-900 text-sm !mt-6 text-center">
                Don't have an account?{" "}
                <Link
                  to="/auth/register"
                  className="text-blue-600 hover:underline ml-1 whitespace-nowrap font-semibold"
                >
                  Register here
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
