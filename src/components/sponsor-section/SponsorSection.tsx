import Image from "next/image";
import styles from "./SponsorSection.module.css";

const sponsors = [
  { name: "CPTCL", src: "/sponsors/cptcl.png" },
  { name: "GKTMT", src: "/sponsors/gktmt.png" },
  { name: "elevenlabs", src: "/sponsors/elevenlabs.png" },
  { name: "Mastra", src: "/sponsors/mastra_logo.png" },
  { name: "LIC", src: "/sponsors/lic.png" },
  { name: "algo-university", src: "/sponsors/algo-university.png" },

];

export function SponsorSection() {
  const rail = [...sponsors, ...sponsors, ...sponsors, ...sponsors];
  const mobileRowOffset = Math.ceil(sponsors.length / 2);
  const shiftedSponsors = [...sponsors.slice(mobileRowOffset), ...sponsors.slice(0, mobileRowOffset)];
  const shiftedRail = [...shiftedSponsors, ...shiftedSponsors, ...shiftedSponsors, ...shiftedSponsors];

  return (
    <section className={styles.sponsors} id="sponsors" aria-labelledby="sponsors-title">
      <div className={styles.backgroundGrid} aria-hidden="true" />
      <div className={styles.filmGrain} aria-hidden="true" />
      <div className={styles.orbitalRing} aria-hidden="true" />
      <div className={styles.signal} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className={styles.glitchBursts} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className={styles.heading}>
        {/* <p className={styles.eyebrow}>
          <span className={styles.statusDot} />
          POWERED BY THE PEOPLE WHO BUILD THE FUTURE
        </p> */}
        <h2 id="sponsors-title" data-text="OUR SPONSORS">OUR SPONSORS</h2>
        {/* <p className={styles.subhead}>THE ALLIES BEHIND THE GLITCHVERSE</p> */}
      </div>

      <div className={styles.marquee}>
        <div className={styles.edgeFade} aria-hidden="true" />
        <div className={styles.track}>
          {rail.map((sponsor, index) => (
            <div className={styles.card} key={`${sponsor.name}-${index}`}>
              <div className={styles.cardScanline} aria-hidden="true" />
              <div className={styles.logoWrap}>
                <Image
                  src={sponsor.src}
                  alt={`${sponsor.name} logo`}
                  fill
                  sizes="(max-width: 640px) 220px, 280px"
                  className={styles.logo}
                />
              </div>
              <span className={styles.cardCorner} aria-hidden="true" />
            </div>
          ))}
        </div>
      </div>

      <div className={styles.mobileMarquee} aria-label="Sponsors">
        <div className={styles.mobileRow}>
          <div className={styles.edgeFade} aria-hidden="true" />
          <div className={styles.mobileTrack}>
            {rail.map((sponsor, index) => (
              <div className={styles.card} key={`mobile-top-${sponsor.name}-${index}`}>
                <div className={styles.cardScanline} aria-hidden="true" />
                <div className={styles.logoWrap}>
                  <Image
                    src={sponsor.src}
                    alt={`${sponsor.name} logo`}
                    fill
                    sizes="(max-width: 640px) 170px, 280px"
                    className={styles.logo}
                  />
                </div>
                <span className={styles.cardCorner} aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>
        <div className={styles.mobileRow}>
          <div className={styles.edgeFade} aria-hidden="true" />
          <div className={styles.mobileTrack}>
            {shiftedRail.map((sponsor, index) => (
              <div className={styles.card} key={`mobile-bottom-${sponsor.name}-${index}`}>
                <div className={styles.cardScanline} aria-hidden="true" />
                <div className={styles.logoWrap}>
                  <Image
                    src={sponsor.src}
                    alt={`${sponsor.name} logo`}
                    fill
                    sizes="(max-width: 640px) 170px, 280px"
                    className={styles.logo}
                  />
                </div>
                <span className={styles.cardCorner} aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className={styles.coordinates} aria-hidden="true">
        <span>404</span>
        <span>77.5946° E</span>
        <span>TRANSMISSION // ACTIVE</span>
      </p>
    </section>
  );
}
