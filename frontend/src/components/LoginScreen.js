import React, { useState } from "react";
import axios from "axios";

const TABS = { login: "login", forgot: "forgot", reset: "reset" };

export default function LoginScreen({ onLogin }) {
  const [tab, setTab] = useState(TABS.login);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [resetForm, setResetForm] = useState({ email: "", code: "", newPassword: "" });
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const setR = (k) => (e) => setResetForm((p) => ({ ...p, [k]: e.target.value }));

  async function handleLogin(e) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.username.trim() || !form.password) return setError("Fill all fields");
    if (isNew && !form.email) return setError("Email required for registration");
    setLoading(true);
    try {
      const { data } = await axios.post("/api/users/login", {
        username: form.username.trim(),
        email: form.email.trim() || undefined,
        password: form.password,
      });
      onLogin(data);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!resetForm.email) return setError("Enter your email");
    setLoading(true);
    try {
      const { data } = await axios.post("/api/users/forgot-password", { email: resetForm.email });
      setSuccess(data.message);
      setTab(TABS.reset);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!resetForm.code || !resetForm.newPassword) return setError("Fill all fields");
    setLoading(true);
    try {
      const { data } = await axios.post("/api/users/reset-password", {
        email: resetForm.email,
        code: resetForm.code,
        newPassword: resetForm.newPassword,
      });
      setSuccess(data.message);
      setTimeout(() => { setTab(TABS.login); setSuccess(""); }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%", padding: "12px 16px", borderRadius: 10,
    background: "#2a3942", color: "#e9edef", fontSize: 15,
    border: "1px solid rgba(134,150,160,0.2)", marginBottom: 12,
    transition: "border 0.2s",
  };

  const btnStyle = {
    width: "100%", padding: "13px", borderRadius: 10,
    background: loading ? "#2a3942" : "#00a884",
    color: "#fff", fontSize: 15, fontWeight: 600,
    cursor: loading ? "not-allowed" : "pointer",
    transition: "background 0.2s", marginTop: 4,
  };

  return (
    <div className="login-shell" style={{
      minHeight: "100dvh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#111b21", padding: 16,
    }}>
      <div className="login-card" style={{
        width: "100%", maxWidth: 400, background: "#202c33",
        borderRadius: 16, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div className="brand-mark">C</div>
          <div style={{ fontSize: 26, fontWeight: 750, color: "#e9edef" }}>ChatApp</div>
          <div style={{ fontSize: 13, color: "#8696a0", marginTop: 4 }}>
            {tab === TABS.login ? "Sign in or create account" : tab === TABS.forgot ? "Reset your password" : "Enter reset code"}
          </div>
        </div>

        {error && (
          <div style={{ background: "rgba(241,92,109,0.1)", border: "1px solid rgba(241,92,109,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#f15c6d", fontSize: 13 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: "rgba(0,168,132,0.1)", border: "1px solid rgba(0,168,132,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#00a884", fontSize: 13 }}>
            {success}
          </div>
        )}

        {tab === TABS.login && (
          <form onSubmit={handleLogin}>
            <input style={inputStyle} placeholder="Username" value={form.username} onChange={set("username")} autoComplete="username" />
            {isNew && (
              <input style={inputStyle} placeholder="Email" type="email" value={form.email} onChange={set("email")} autoComplete="email" />
            )}
            <input style={inputStyle} placeholder="Password" type="password" value={form.password} onChange={set("password")} autoComplete="current-password" />

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <input type="checkbox" id="isNew" checked={isNew} onChange={(e) => setIsNew(e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer" }} />
              <label htmlFor="isNew" style={{ fontSize: 13, color: "#8696a0", cursor: "pointer" }}>
                New user? Register
              </label>
            </div>

            <button type="submit" style={btnStyle} disabled={loading}>
              {loading ? "Please wait..." : isNew ? "Register" : "Login"}
            </button>

            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button type="button" onClick={() => { setTab(TABS.forgot); setError(""); }} style={{ color: "#00a884", fontSize: 13, background: "none", border: "none" }}>
                Forgot password?
              </button>
            </div>
          </form>
        )}

        {tab === TABS.forgot && (
          <form onSubmit={handleForgot}>
            <input style={inputStyle} placeholder="Your email address" type="email" value={resetForm.email} onChange={setR("email")} />
            <button type="submit" style={btnStyle} disabled={loading}>
              {loading ? "Sending..." : "Send Reset Code"}
            </button>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button type="button" onClick={() => { setTab(TABS.login); setError(""); }} style={{ color: "#8696a0", fontSize: 13 }}>
                ← Back to login
              </button>
            </div>
          </form>
        )}

        {tab === TABS.reset && (
          <form onSubmit={handleReset}>
            <input style={inputStyle} placeholder="6-digit code from email" value={resetForm.code} onChange={setR("code")} maxLength={6} />
            <input style={inputStyle} placeholder="New password" type="password" value={resetForm.newPassword} onChange={setR("newPassword")} />
            <button type="submit" style={btnStyle} disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button type="button" onClick={() => { setTab(TABS.login); setError(""); }} style={{ color: "#8696a0", fontSize: 13 }}>
                ← Back to login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
