import { Link } from "gatsby";
import { nav, list, item, separator, current } from "./breadcrumb.module.css";

export type Crumb = {
  label: string;
  path: string;
};

type BreadcrumbProps = {
  section: Crumb;
  title: string;
};

export default function Breadcrumb({ section, title }: BreadcrumbProps) {
  return (
    <nav className={nav} aria-label="breadcrumbs">
      <ol className={list}>
        <li className={item}>
          <Link to="/">Home</Link>
        </li>
        <li className={item} role="presentation" aria-hidden="true">
          <span className={separator}>/</span>
        </li>
        <li className={item}>
          <Link to={section.path}>{section.label}</Link>
        </li>
        <li className={item} role="presentation" aria-hidden="true">
          <span className={separator}>/</span>
        </li>
        <li className={`${item} ${current}`} aria-current="page">
          {title}
        </li>
      </ol>
    </nav>
  );
}
