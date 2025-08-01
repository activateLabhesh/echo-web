'use client';
import { register } from "../../api";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const [form, setForm] = useState({
    email: "",
    displayName: "",
    username: "",
    password: "",
    dob: { day: "", month: "", year: "" },
  });
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (field: string, value: string) => {
    if (["day", "month", "year"].includes(field)) {
      setForm((prev) => ({
        ...prev,
        dob: { ...prev.dob, [field]: value },
      }));
    } else {
      setForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setSuccess(false);
    setLoading(true);


    try {
      const res = await register(form.email, form.username, form.password);
      setSuccess(true);
      setMessage(res.message || "Registration successful!");
      setTimeout(() => router.push("/login"), 2000);
    } catch (error: any) {
      setSuccess(false);
      setMessage(
          error?.response?.data?.message ||
          error?.message ||
          "Registration failed. Please try again."
      );
    }
    setLoading(false);
  };

  return (
      <div className="flex h-screen bg-black font-sans">
        <div className="hidden lg:block lg:w-1/2">
          <img
              src="/signup-side.png"
              alt="Signup Visual"
              className="w-full h-full object-cover rounded-tr-[40px] rounded-br-[40px]"
          />
        </div>

        <div className="w-full lg:w-1/2 flex justify-center items-center px-6">
          <div className="w-full max-w-md text-white">
            <h1 className="text-2xl font-bold mb-6 text-center">Sign Up</h1>

            <form onSubmit={handleRegister}>
              <div className="mb-4">
                <label className="text-sm">Email</label>
                <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className="w-full px-4 py-2 mt-1 bg-transparent border border-white rounded-md focus:outline-none"
                    required
                />
              </div>

              <div className="mb-4">
                <label className="text-sm">Display Name</label>
                <input
                    type="text"
                    value={form.displayName}
                    onChange={(e) => handleChange("displayName", e.target.value)}
                    className="w-full px-4 py-2 mt-1 bg-transparent border border-white rounded-md focus:outline-none"
                />
              </div>

              <div className="mb-4">
                <label className="text-sm">Username</label>
                <input
                    type="text"
                    value={form.username}
                    onChange={(e) => handleChange("username", e.target.value)}
                    className="w-full px-4 py-2 mt-1 bg-transparent border border-white rounded-md focus:outline-none"
                />
              </div>

              <div className="mb-4">
                <label className="text-sm mb-1 block">Date of birth</label>
                <div className="flex gap-2">
                  <input
                      type="text"
                      placeholder="Date"
                      value={form.dob.day}
                      onChange={(e) => handleChange("day", e.target.value)}
                      className="w-1/3 px-2 py-2 bg-transparent border border-white rounded-md text-sm"
                  />
                  <input
                      type="text"
                      placeholder="Month"
                      value={form.dob.month}
                      onChange={(e) => handleChange("month", e.target.value)}
                      className="w-1/3 px-2 py-2 bg-transparent border border-white rounded-md text-sm"
                  />
                  <input
                      type="text"
                      placeholder="Year"
                      value={form.dob.year}
                      onChange={(e) => handleChange("year", e.target.value)}
                      className="w-1/3 px-2 py-2 bg-transparent border border-white rounded-md text-sm"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="text-sm">Password</label>
                <input
                    type="password"
                    value={form.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    className="w-full px-4 py-2 mt-1 bg-transparent border border-white rounded-md focus:outline-none"
                    required
                />
              </div>

              <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 text-lg font-semibold text-black bg-yellow-400 rounded-md hover:bg-yellow-500 disabled:opacity-60"
              >
                {loading ? "Registering..." : "Register"}
              </button>
            </form>

            {message && (
                <div
                    style={{ color: success ? "green" : "red", marginTop: 10 }}
                    className="text-center"
                >
                  {message}
                </div>
            )}

            <div className="text-sm text-center mt-4">
              <a href="/login" className="text-yellow-400 hover:underline">
                Already have an account?
              </a>
            </div>
          </div>
        </div>
      </div>
  );
}
