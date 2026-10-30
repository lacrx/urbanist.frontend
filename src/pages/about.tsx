import Layout from '@/components/Layout/layout';
import Hero from '@/components/Hero/hero';
import Content from '@/components/Content/content';
import config from "@/site/config";
import AboutContent from "@/site/about-content";

export default function About() {
  return (
    <Layout>
      <Hero title="About Us" {...config.about.heroProps} />
      <Content type="section" {...config.about.contentProps}>
        <AboutContent />
      </Content>
    </Layout>
  );
}

export { Head } from "@/components/Head/head";
