import { useEffect, useRef, useState } from "react";
import { Link, navigate } from "gatsby";
import { nav, loginBtn, authOnly, noAuthOnly } from './nav.module.css';
import config from "@/site/config";
import { useAuth } from "@/components/Auth/auth-context";

const Hamburger = () =>
  <svg width="16" height="10" viewBox="0 0 16 10">
    <title>Open mobile navigation</title>
    <g fill="currentColor" fillRule="evenodd">
      <rect y="8" width="16" height="2" rx="1"></rect>
      <rect width="16" height="2" rx="1"></rect>
    </g>
  </svg>

const X = () =>
  <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <title>Close mobile navigation</title>
    <line x1="11" y1="1" x2="1" y2="11"></line>
    <line x1="1" y1="1" x2="11" y2="11"></line>
  </svg>

function AuthButtons() {
  const { logout } = useAuth();
  return (
    <li>
      <button className={`${loginBtn} ${authOnly}`} onClick={logout}>
        Sign out
      </button>
      <button className={`${loginBtn} ${noAuthOnly}`} onClick={() => navigate('/sign-in')}>
        Sign in
      </button>
    </li>
  );
}

export default function Nav() {
  const ref = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current && document.contains(target) && !ref.current.contains(target)) {
        setOpen(false);
      }
    }
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <ul ref={ref} className={`${nav} ${open ? "open" : "closed"}`}>
      <li>
        <Link to="/">
          <div>{config.shortName}</div>
          {config.logo && <img src={config.logo} width="60" alt={`${config.title} Logo`} />}
        </Link>
      </li>
      <li>
        <button onClick={() => setOpen(!open)}>
          {open ? <X /> : <Hamburger />}
        </button>
      </li>
      {config.navLinks.map(link => (
        <li key={link.path}>
          <Link to={link.path}><span>{link.label}</span></Link>
        </li>
      ))}
      {config.auth && <AuthButtons />}
    </ul>
  );
}
