import { GatsbyImage, getImage } from "gatsby-plugin-image";
import type { GatsbyEvent } from "@/types";
import { card, cardList, location as locationCls } from "@/components/Card/card.module.css";

export type { GatsbyEvent };

const TZ = "America/Los_Angeles";

const DAY_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
});
const HOUR_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ, hour: "numeric", hour12: false,
});
const TIME_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true,
});

function formatDisplayDate(iso: string, display: string): string {
  const eventDate = new Date(iso);
  const now = new Date();
  if (DAY_FMT.format(eventDate) !== DAY_FMT.format(now)) return display;
  const hour = Number(HOUR_FMT.format(eventDate));
  const label = hour >= 17 ? "Tonight" : "Today";
  return `${label} at ${TIME_FMT.format(eventDate)}`;
}

function EventItem({ e, as: Tag = "div" }: { e: GatsbyEvent; as?: "div" | "li" }) {
  const img = e.image?.childImageSharp ? getImage(e.image.childImageSharp.gatsbyImageData) : null;
  const dateLabel = formatDisplayDate(e.startDate, e.startDateDisplay);
  return (
    <Tag className={card}>
      <div>
        <div>
          <a href={e.url} target="_blank" rel="noopener noreferrer">
            <h2>{e.title}</h2>
          </a>
        </div>
        <div>
          <p>{dateLabel}{e.location && <span className={locationCls}>{e.location}</span>}</p>
        </div>
      </div>
      {img && (
        <div>
          <a href={e.url} target="_blank" rel="noopener noreferrer">
            <GatsbyImage image={img} alt={e.title} />
          </a>
        </div>
      )}
    </Tag>
  );
}

export function EventCard({ e }: { e: GatsbyEvent }) {
  return <EventItem e={e} />;
}

export default function EventList({ events }: { events: GatsbyEvent[] }) {
  if (events.length === 0) {
    return <p>No upcoming events. Check back soon.</p>;
  }
  return (
    <ul className={cardList}>
      {events.map(e => <EventItem key={e.id} e={e} as="li" />)}
    </ul>
  );
}
