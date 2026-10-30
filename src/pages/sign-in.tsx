import { useState, useEffect } from "react";
import { navigate } from "gatsby";
import Layout from "@/components/Layout/layout";
import { useAuth } from "@/components/Auth/auth-context";
import * as s from "@/components/Auth/sign-in.module.css";

export default function SignIn() {
  const { isAdmin, userName, login, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAdmin) navigate("/", { replace: true });
  }, [isAdmin]);

  if (isAdmin) {
    return (
      <Layout>
        <div className={s.wrap}>
          <div className={s.card}>
            <h1 className={s.title}>Signed in</h1>
            <p className={s.subtitle}>You're signed in as <strong>{userName}</strong>.</p>
            <button className={s.btnPrimary} onClick={() => { logout(); navigate("/"); }}>Sign out</button>
            <button className={s.btnSecondary} onClick={() => navigate("/")}>Go back</button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={s.wrap}>
        <div className={s.card}>
          <h1 className={s.title}>Sign in</h1>
          <p className={s.subtitle}>Sign in with your Strong Towns Oceanside account.</p>
          <form onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            setError("");
            const err = await login(email, pass);
            setLoading(false);
            if (err) { setError(err); } else { navigate(-1); }
          }}>
            <label className={s.label} htmlFor="si-email">Email address</label>
            <input className={s.input} id="si-email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
            <label className={s.label} htmlFor="si-pass">Password</label>
            <input className={s.input} id="si-pass" type="password" value={pass} onChange={e => setPass(e.target.value)} autoComplete="current-password" required />
            {error && <p className={s.error}>{error}</p>}
            <button className={s.btnPrimary} type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
          </form>
        </div>
      </div>
    </Layout>
  );
}

export { Head } from "@/components/Head/head";
