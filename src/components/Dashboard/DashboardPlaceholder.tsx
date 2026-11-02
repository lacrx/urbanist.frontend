import { useState } from "react";
import config from "@/site/config";
import * as layout from "./dashboard-layout.module.css";

type Props = {
  dashboardType: string;
};

export default function DashboardPlaceholder({ dashboardType }: Props) {
  const [imgFailed, setImgFailed] = useState(false);

  const basePath = `/viz-placeholders/${config.id}/dashboard-${dashboardType}`;
  const lightSrc = `${basePath}.webp`;
  const darkSrc = `${basePath}-dark.webp`;

  if (imgFailed) {
    return (
      <div className={layout.loading}>
        <div className={layout.skelRow}>
          <div className={layout.skelTile} />
          <div className={layout.skelTile} />
          <div className={layout.skelTile} />
        </div>
        <div className={layout.skelSlider} />
        <div className={layout.skelChart} />
        <div className={layout.skelSplit}>
          <div className={layout.skelMap} />
          <div className={layout.skelTable} />
        </div>
      </div>
    );
  }

  return (
    <div className={layout.placeholder}>
      <picture>
        <source
          media="(prefers-color-scheme: dark)"
          srcSet={darkSrc}
        />
        <img
          src={lightSrc}
          alt=""
          role="presentation"
          className={layout.placeholderImg}
          onError={() => setImgFailed(true)}
        />
      </picture>
    </div>
  );
}
