export const DATA = {
  name: "Allen John",
  url: "https://allenjohn.me",
  description: "Self-taught Full stack developer, Speedcuber",
  summary: [
    "I'm an aspiring software developer currently living in Calgary.",
    "I love experimenting with new technologies and building things.",
    "I can solve a Rubik's cube in 10 seconds.",
  ].join("\n\n"),
  skills: [
    {
      category: "Frontend",
      groups: [
        {
          label: "Core",
          items: [
            "React 19",
            "Next.js (App Router)",
            "TypeScript",
            "Tailwind CSS",
          ],
        },
        {
          label: "UI & Animation",
          items: ["Shadcn/ui", "Framer Motion"],
        },
        {
          label: "State & Validation",
          items: ["TanStack Query", "Zod"],
        },
        {
          label: "Testing",
          items: ["Playwright (E2E)"],
        },
      ],
    },
    {
      category: "Backend & Database",
      groups: [
        {
          label: "Server & APIs",
          items: [
            "Node.js",
            "Express",
            "RESTful APIs",
            "Webhooks",
            "GraphQL",
          ],
        },
        {
          label: "Database & ORM",
          items: ["PostgreSQL", "MongoDB", "Prisma", "Supabase"],
        },
        {
          label: "Auth & Infrastructure",
          items: ["Clerk", "Amazon S3", "Redis (Caching)"],
        },
      ],
    },
    {
      category: "DevOps & Tools",
      groups: [
        {
          items: [
            "Git",
            "GitHub",
            "Docker",
            "Vercel",
            "GitHub Actions (CI/CD)",
            "Sentry",
            "Postman",
          ],
        },
      ],
    },
  ],
  contact: {
    social: {
      GitHub: {
        url: "https://github.com/allenjohn07",
      },
      LinkedIn: {
        url: "https://www.linkedin.com/in/allenjohn07/",
      },
    },
  },
  education: [
    {
      school: "Southern Alberta Institute of Technology",
      degree: "Diploma in Software Development",
      start: "May 2025",
      end: "December 2026",
    },
    {
      school: "Mahatma Gandhi University",
      degree: "Bachelor of Science in Computer Application",
      start: "June 2019",
      end: "May 2022",
    },
  ],
  projects: [
    {
      title: "Cubing Kerala",
      subtitle: "",
      href: "https://cubingkerala.org/",
      dates: "July 2024 - Present",
      active: true,
      description:
        "A platform for the Kerala cubing community to track competitions and rankings. Built with Next.js and TypeScript for better performance. It integrates with the World Cube Association's APIs and authentication to keep user and competition data up to date.",
      technologies: [
        "Next.js",
        "TypeScript",
        "Prisma",
        "PostgreSQL",
        "WCA Login",
        "WCA API's",
        "Tailwind",
        "Shadcn UI",
        "Magic UI",
        "Lottie JSON",
      ],
      links: [
        { type: "Website", href: "https://cubingkerala.org", icon: "globe" },
        {
          type: "Source",
          href: "https://github.com/cubingkeralaorg/cubingkerala",
          icon: "github",
        },
      ],
    },
    {
      title: "SpeedCubers India",
      subtitle: "",
      href: "https://speedcubersindia.com/",
      dates: "August 2024 - Present",
      active: true,
      description:
        "SpeedCubers India is now an officially recognized WCA regional organization in India. It's a platform for the Indian cubing community to track national rankings and live competition updates. I work on the web platform in a small team, directly under a WCA board member and a software engineer at Google. We are working on bringing the ranking system and other features to life in the near future.",
      technologies: [
        "Next.js",
        "TypeScript",
        "JavaScript",
        "Express",
        "Amazon S3",
        "Wca API",
        "Transtack Query",
        "Tailwind",
        "Chakra UI",
      ],
      links: [
        {
          type: "Website",
          href: "https://speedcubersindia.com/",
          icon: "globe",
        },
        {
          type: "Source",
          href: "https://github.com/Speed-Cubers-India",
          icon: "github",
        },
      ],
    },
    {
      title: "OhShift",
      subtitle: "Shifting Platform",
      href: "https://allenjohn07.github.io/OhShift/",
      dates: "March 2026 - Present",
      active: true,
      description:
        "A modern shift management platform designed to streamline workforce scheduling for small businesses. The application features a decoupled, ultra-fast architecture: a type-safe Next.js and TypeScript frontend optimized as a static export and hosted on GitHub Pages, paired with a high-performance backend API built using Bun, Elysia, and Prisma. It leverages Neon for a serverless PostgreSQL database and automates real-time shift alerts via email notifications.",
      technologies: [
        "Next.js",
        "TypeScript",
        "Bun",
        "Elysia",
        "Prisma",
        "Neon",
        "Brevo",
        "Tailwind",
        "Shadcn UI",
      ],
      links: [
        {
          type: "Website",
          href: "https://allenjohn07.github.io/OhShift/",
          icon: "globe",
        },
        {
          type: "Source",
          href: "https://github.com/allenjohn07/OhShift",
          icon: "github",
        },
      ],
    },
  ],
  cubing: [
    {
      organization: "World Cube Association",
      url: "https://www.worldcubeassociation.org/persons/2017JOHN14",
      title: "Speedcuber and Organizer",
      start: "July 2017",
      end: "Present",
    },
    {
      organization: "Cubing Kerala",
      url: "https://cubingkerala.org/",
      title: "Core Member and Website Creator/Maintainer",
      start: "July 2017",
      end: "Present",
    },
    {
      organization: "SpeedCubers India",
      url: "https://speedcubersindia.com/",
      title: "Frontend Lead",
      start: "August 2024",
      end: "Present",
    },
  ],
} as const;
