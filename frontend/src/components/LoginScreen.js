import React, { useState } from "react";
import axios from "axios";
import { HiOutlineArrowLeft, HiOutlineChatBubbleLeftRight, HiOutlineCheckCircle, HiOutlineEnvelope, HiOutlineEye, HiOutlineEyeSlash, HiOutlineKey, HiOutlineLockClosed, HiOutlineShieldCheck, HiOutlineSparkles, HiOutlineUser } from "react-icons/hi2";

const SCREEN = { LOGIN: "login", FORGOT: "forgot", RESET: "reset" };

export default function LoginScreen({ onLogin }) {
  const [screen, setScreen] = useState(SCREEN.LOGIN);
  const [register, setRegister] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [reset, setReset] = useState({ email: "", code: "", newPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState({ type: "", text: "" });

  const update = (key) => (event) => setForm((old) => ({ ...old, [key]: event.target.value }));
  const updateReset = (key) => (event) => setReset((old) => ({ ...old, [key]: event.target.value }));
  const fail = (text) => setNotice({ type: "error", text });

  async function submitLogin(event) {
    event.preventDefault();
    setNotice({ type: "", text: "" });
    if (!form.username.trim() || !form.password) return fail("Enter your username and password.");
    if (register && !form.email.trim()) return fail("Email is required to create your account.");
    setLoading(true);
    try {
      const { data } = await axios.post("/api/users/login", { username: form.username.trim(), email: form.email.trim() || undefined, password: form.password });
      onLogin(data);
    } catch (error) { fail(error.response?.data?.message || "Unable to connect. Please try again."); }
    finally { setLoading(false); }
  }

  async function submitForgot(event) {
    event.preventDefault();
    if (!reset.email.trim()) return fail("Enter your account email.");
    setLoading(true); setNotice({ type: "", text: "" });
    try {
      const { data } = await axios.post("/api/users/forgot-password", { email: reset.email.trim() });
      setNotice({ type: "success", text: data.message }); setScreen(SCREEN.RESET);
    } catch (error) { fail(error.response?.data?.message || "Could not send the reset code."); }
    finally { setLoading(false); }
  }

  async function submitReset(event) {
    event.preventDefault();
    if (!reset.code.trim() || !reset.newPassword) return fail("Enter the code and your new password.");
    setLoading(true); setNotice({ type: "", text: "" });
    try {
      const { data } = await axios.post("/api/users/reset-password", { email: reset.email.trim(), code: reset.code.trim(), newPassword: reset.newPassword });
      setNotice({ type: "success", text: data.message });
      setTimeout(() => { setScreen(SCREEN.LOGIN); setNotice({ type: "", text: "" }); }, 1400);
    } catch (error) { fail(error.response?.data?.message || "Password reset failed."); }
    finally { setLoading(false); }
  }

  const backToLogin = () => { setScreen(SCREEN.LOGIN); setNotice({ type: "", text: "" }); };

  return (
    <main className="auth-page">
      <div className="auth-grid" />
      <span className="auth-blob blob-a" /><span className="auth-blob blob-b" />
      <section className="auth-story">
        <div className="auth-brand"><span><HiOutlineChatBubbleLeftRight /></span><strong>ChatApp</strong></div>
        <div className="auth-story-copy">
          <div className="eyebrow"><HiOutlineSparkles /> A BETTER WAY TO CONNECT</div>
          <h1>Conversations,<br /><span>reimagined.</span></h1>
          <p>A calm, private space for the people and moments that matter most.</p>
          <div className="story-points"><span><HiOutlineShieldCheck /> Private by design</span><span><HiOutlineCheckCircle /> Real-time delivery</span></div>
        </div>
        <div className="story-message message-a"><i>AS</i><div><b>Alex</b><p>That looks amazing! ✨</p></div></div>
        <div className="story-message message-b"><i>YO</i><div><b>You</b><p>Sending it right now</p></div></div>
        <small className="auth-footer">Secure • Simple • Beautiful</small>
      </section>

      <section className="auth-form-side">
        <div className="auth-card">
          {screen !== SCREEN.LOGIN && <button className="auth-back" onClick={backToLogin}><HiOutlineArrowLeft /> Back</button>}
          <div className="auth-card-head">
            <span className="auth-mobile-logo"><HiOutlineChatBubbleLeftRight /></span>
            <div className="eyebrow">{screen === SCREEN.LOGIN ? (register ? "CREATE ACCOUNT" : "WELCOME BACK") : screen === SCREEN.FORGOT ? "ACCOUNT RECOVERY" : "SECURE RESET"}</div>
            <h2>{screen === SCREEN.LOGIN ? (register ? "Join ChatApp" : "Sign in to ChatApp") : screen === SCREEN.FORGOT ? "Forgot password?" : "Create new password"}</h2>
            <p>{screen === SCREEN.LOGIN ? (register ? "Create your private messaging space." : "Continue your conversations from where you left off.") : screen === SCREEN.FORGOT ? "We’ll send a six-digit code to your email." : "Enter the code from your email."}</p>
          </div>

          {notice.text && <div className={`form-notice ${notice.type}`}><span>{notice.type === "success" ? <HiOutlineCheckCircle /> : "!"}</span>{notice.text}</div>}

          {screen === SCREEN.LOGIN && <form className="auth-form" onSubmit={submitLogin}>
            <Field icon={<HiOutlineUser />} label="Username"><input value={form.username} onChange={update("username")} placeholder="Enter your username" autoComplete="username" /></Field>
            {register && <Field icon={<HiOutlineEnvelope />} label="Email address"><input type="email" value={form.email} onChange={update("email")} placeholder="you@example.com" autoComplete="email" /></Field>}
            <Field icon={<HiOutlineLockClosed />} label="Password" action={<button type="button" aria-label="Toggle password" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <HiOutlineEyeSlash /> : <HiOutlineEye />}</button>}>
              <input type={showPassword ? "text" : "password"} value={form.password} onChange={update("password")} placeholder="Enter your password" autoComplete={register ? "new-password" : "current-password"} />
            </Field>
            {!register && <button type="button" className="forgot-link" onClick={() => { setScreen(SCREEN.FORGOT); setNotice({ type: "", text: "" }); }}>Forgot password?</button>}
            <button className="primary-btn" disabled={loading}>{loading ? <span className="button-loader" /> : register ? "Create my account" : "Sign in"}</button>
            <div className="auth-switch">{register ? "Already have an account?" : "New to ChatApp?"}<button type="button" onClick={() => { setRegister((value) => !value); setNotice({ type: "", text: "" }); }}>{register ? "Sign in" : "Create account"}</button></div>
          </form>}

          {screen === SCREEN.FORGOT && <form className="auth-form" onSubmit={submitForgot}>
            <Field icon={<HiOutlineEnvelope />} label="Email address"><input type="email" value={reset.email} onChange={updateReset("email")} placeholder="you@example.com" autoFocus /></Field>
            <button className="primary-btn" disabled={loading}>{loading ? <span className="button-loader" /> : "Send reset code"}</button>
          </form>}

          {screen === SCREEN.RESET && <form className="auth-form" onSubmit={submitReset}>
            <Field icon={<HiOutlineKey />} label="Six-digit code"><input value={reset.code} onChange={updateReset("code")} placeholder="000000" inputMode="numeric" maxLength={6} /></Field>
            <Field icon={<HiOutlineLockClosed />} label="New password"><input type="password" value={reset.newPassword} onChange={updateReset("newPassword")} placeholder="Minimum 8 characters" /></Field>
            <button className="primary-btn" disabled={loading}>{loading ? <span className="button-loader" /> : "Update password"}</button>
          </form>}
        </div>
      </section>
    </main>
  );
}

function Field({ icon, label, action, children }) {
  return <label className="field"><span className="field-label">{label}</span><span className="field-control"><i>{icon}</i>{children}{action}</span></label>;
}
