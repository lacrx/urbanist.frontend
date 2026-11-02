import type { ReactNode } from "react";
import Nav from "@/components/Nav/nav";
import Footer from "@/components/Footer/footer";
import SignupForm from "@/components/SignupForm/signup-form";
import Breadcrumb, { type Crumb } from "@/components/Breadcrumb/breadcrumb";
import { signup } from "./layout.module.css";
import config from "@/site/config";
import '@/styles/reset.module.css';
import '@/styles/global.module.css';
import '@/site/theme.css';

type LayoutProps = {
  children: ReactNode;
  breadcrumb?: { section: Crumb; title: string };
};

export default function Layout({ children, breadcrumb }: LayoutProps) {
  return (
    <main>
      <Nav />
      {breadcrumb && <Breadcrumb section={breadcrumb.section} title={breadcrumb.title} />}
      { children }
      <div>
        <section className={signup}>
          <p>{config.newsletter.cta}</p>
          <SignupForm
            actionUrl={config.newsletter.actionUrl}
            listId={config.newsletter.listId}
            placeholder="Your email"
            buttonText="Subscribe"
          />
        </section>
        <Footer />
      </div>
    </main>
  );
}
