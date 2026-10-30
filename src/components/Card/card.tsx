import { Link } from "gatsby";
import { GatsbyImage, getImage, IGatsbyImageData } from "gatsby-plugin-image";
import Byline from "@/components/Byline/byline";
import { card } from "./card.module.css";

type CardProps = {
  link: string;
  title: string;
  description: string;
  image: IGatsbyImageData | null;
  authorName?: string | null;
  publishedAt?: string | Date | null;
};

export default function Card({ link, title, description, image, authorName, publishedAt }: CardProps) {
  const img = image ? getImage(image) : null;
  return (
    <article className={card}>
      <div>
        <div><Link to={link}><h2>{title}</h2></Link></div>
        <div><Link to={link}><p>{description}</p></Link></div>
        <Byline author={authorName} publishedAt={publishedAt} compact />
      </div>
      {img && (
        <div>
          <Link to={link}>
            <GatsbyImage image={img} alt={title} />
          </Link>
        </div>
      )}
    </article>
  );
}
