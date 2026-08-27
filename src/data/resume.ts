export const DATA = {
  name: "Allen John",
  url: "https://allenjohn.me",
  description: "Self-taught Full stack developer, Speedcuber",
  summary: [
    "I'm an aspiring software developer currently living in Calgary.",
    "I love experimenting with new technologies and building things.",
    "I can solve a Rubik's cube in 10 seconds.",
  ].join("\n\n"),
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
  github: {
    username: "allenjohn07",
    featured: [
      {
        repo: "cubingkeralaorg/cubingkerala",
        title: "Cubing Kerala",
        homepage: "https://cubingkerala.org/",
        description:
          "A platform for the Kerala cubing community to track competitions and rankings. Built with Next.js and TypeScript for better performance. It integrates with the World Cube Association's APIs and authentication to keep user and competition data up to date.",
      },
      {
        repo: "Speed-Cubers-India/sci-frontend",
        title: "SpeedCubers India",
        homepage: "https://speedcubersindia.com/",
        description:
          "SpeedCubers India is now an officially recognized WCA regional organization in India. It's a platform for the Indian cubing community to track national rankings and live competition updates. I work on the web platform in a small team, directly under a WCA board member and a software engineer at Google.",
      },
      {
        repo: "allenjohn07/OhShift",
        title: "OhShift",
        homepage: "https://ohshift.pages.dev",
        description:
          "A modern shift management platform designed to streamline workforce scheduling for small businesses. Type-safe Next.js frontend with a Bun, Elysia, and Prisma backend, Neon Postgres, and email alerts for live shift updates.",
      },
    ],
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
