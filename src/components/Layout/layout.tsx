import type { PropsWithChildren } from "react";
import Nav from "@/components/Nav/nav";
import Footer from "@/components/Footer/footer";
import SignupForm from "@/components/SignupForm/signup-form";
import { signup } from "./layout.module.css";
import config from "@/site/config";
import '@/styles/reset.module.css';
import '@/styles/global.module.css';
import '@/site/theme.css';

export default function Layout({ children }: PropsWithChildren) {
  return (
    <main>
      <Nav />
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
