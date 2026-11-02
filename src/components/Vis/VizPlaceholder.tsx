import { useState } from "react";
import config from "@/site/config";

type Props = {
  vizId: string;
  height: number;
  children: React.ReactNode;
};

export default function VizPlaceholder({ vizId, height, children }: Props) {
  const [imgFailed, setImgFailed] = useState(false);

  if (imgFailed) return <>{children}</>;

  const basePath = `/viz-placeholders/${config.id}/viz-${vizId}`;
  const lightSrc = `${basePath}.webp`;
  const darkSrc = `${basePath}-dark.webp`;

  return (
    <picture>
      <source
        media="(prefers-color-scheme: dark)"
        srcSet={darkSrc}
      />
      <img
        src={lightSrc}
        alt=""
        role="presentation"
        style={{ width: "100%", height: "auto", maxHeight: height }}
        onError={() => setImgFailed(true)}
      />
    </picture>
  );
}
