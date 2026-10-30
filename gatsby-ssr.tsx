import type { GatsbySSR } from "gatsby";
import ncyimbyConfig from "./sites/ncyimby/config";
import stosideConfig from "./sites/stoside/config";

const SITE = process.env.SITE || "ncyimby";
const siteConfig = SITE === "stoside" ? stosideConfig : ncyimbyConfig;

export const onRenderBody: GatsbySSR["onRenderBody"] = ({
  setHtmlAttributes,
  setHeadComponents,
}) => {
  setHtmlAttributes({ lang: "en" });

  if (siteConfig.auth) {
    setHeadComponents([
      <script
        key="auth-class"
        dangerouslySetInnerHTML={{
          __html: `try{if(localStorage.getItem('sto_admin')==='true')document.documentElement.classList.add('authed')}catch(e){}`,
        }}
      />,
    ]);
  }
};

export const wrapRootElement: GatsbySSR["wrapRootElement"] = siteConfig.auth
  ? ({ element }) => {
      const { AuthProvider } = require("./src/components/Auth/auth-context");
      return <AuthProvider>{element}</AuthProvider>;
    }
  : undefined;
