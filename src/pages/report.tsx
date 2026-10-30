import Layout from "@/components/Layout/layout";
import Hero from "@/components/Hero/hero";
import Content from "@/components/Content/content";
import WalkAuditForm from "@/components/WalkAudit/walk-audit-form";

export default function Walk() {
  return (
    <Layout>
      <Hero
        title="Report a Condition"
        description="Help us identify and document unsafe conditions on Oceanside streets."
      />
      <Content type="section" ruled>
        <WalkAuditForm auditSlug="oceanside" />
      </Content>
    </Layout>
  );
}

export { Head } from "@/components/Head/head";
