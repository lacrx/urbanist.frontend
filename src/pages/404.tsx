import Layout from "@/components/Layout/layout";
import Hero from "@/components/Hero/hero";

const heroProps = {
  title: "Page not found."
}

export default function NotFound() {
  return (
    <Layout>
      <Hero { ...heroProps } />
    </Layout>
  );
}

export { Head } from "@/components/Head/head";
