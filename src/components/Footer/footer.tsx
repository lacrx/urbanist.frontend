import { Link } from "gatsby"
import { footer } from './footer.module.css';
import config from "@/site/config";

const CURRENT_YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className={footer}>
      <ul>
        <li>
          <Link to="/">
            <div>{config.shortName}</div>
            {config.logo && <img src={config.logo} width="60" alt={`${config.title} Logo`} />}
          </Link>
        </li>
      </ul>
      <span>&copy; {CURRENT_YEAR} {config.title}</span>
    </footer>
  )
}
