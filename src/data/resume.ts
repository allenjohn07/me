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
  education: [
    { degree: "Diploma in Software Development", school: "SAIT", end: "2026" },
    { degree: "Bachelor of Science in Computer Application", school: "MGU", end: "2022" },
  ],
  projects: [
    {
      title: "Cubing Kerala",
      url: "https://cubingkerala.com",
      description: "Kerala Cubing community platform",
      image: "/projects/cubingkerala.webp",
    },
    {
      title: "OhShifts",
      url: "https://ohshifts.com",
      description: "Shifting platform focusing small scale businesses",
      image: "/projects/ohshifts.webp",
    },
    {
      title: "SpeedCubers India",
      url: "https://speedcubersindia.com",
      description: "SCI community platform (Still in development)",
      image: "/projects/speedcubersindia.webp",
    },
    {
      title: "StudySync",
      url: null,
      description: "Class note-taking app with speech to text and analysis, all running locally",
      image: "/projects/studysync.webp",
    },
  ],
  cubing: [
    "WCA official speedcuber and organiser",
    "Ranked 6th in India for One-Handed, 2018",
    "Cubing Kerala core member",
  ],
} as const;
