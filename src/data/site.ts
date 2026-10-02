export const siteConfig = {
    name: "CodeUtsava X",
    shortName: "CU X",
    edition: "10th Edition",
    organizer: "Turing Club of Programmers, NIT Raipur",
    description:
        "CodeUtsava X is a student-led technology festival built around hackathons, learning, collaboration, and bold digital experiences.",
    links: {
        github: "https://github.com/TCP-Tech/Codeutsava-X",
        discord: "https://discord.gg/Ek9gr2Xnqb",
    },
} as const;

const deploymentSiteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined;
const configuredSiteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? deploymentSiteUrl
)?.replace(/\/$/, "");

export const siteUrl = configuredSiteUrl ?? (process.env.NODE_ENV === "production"
    ? "https://codeutsava.nitrr.ac.in"
    : "http://localhost:3000");

export const primaryNavigation = [
    { label: "About", href: "/#about" },
    { label: "Timeline", href: "/#timeline" },
    { label: "Events", href: "/events" },
    { label: "Team", href: "/team" },
    { label: "FAQ", href: "/#faq" },
    { label: "Contact", href: "/contact-us" },
] as const;
