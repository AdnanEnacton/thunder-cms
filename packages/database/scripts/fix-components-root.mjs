import { PrismaClient } from "@prisma/client";

const SECTIONS_ROOT = "src/layouts/components/sections";

const MANUAL_BLOCKS = [
  {
    key: "bannerThree",
    label: "Banner Three",
    category: "sections",
    fields: [],
    description: "Hero banner (BannerThree.astro)",
    source: { kind: "component", file: "src/layouts/components/sections/BannerThree.astro" },
  },
  {
    key: "servicesSection",
    label: "Services Section",
    category: "sections",
    fields: [],
    description: "Services grid/carousel",
    source: { kind: "component", file: "src/layouts/components/sections/ServicesSection.astro" },
  },
  {
    key: "section",
    label: "Multipurpose / About Section",
    category: "sections",
    fields: [],
    description: "About / multipurpose section (Section.astro)",
    source: { kind: "component", file: "src/layouts/components/sections/Section.astro" },
  },
  {
    key: "aboutSection",
    label: "About Section",
    category: "sections",
    fields: [],
    description: "Alias for Section.astro using about defaults",
    source: { kind: "component", file: "src/layouts/components/sections/Section.astro" },
  },
  {
    key: "multipurposeSection",
    label: "Multipurpose Section",
    category: "sections",
    fields: [],
    description: "Alias for Section.astro",
    source: { kind: "component", file: "src/layouts/components/sections/Section.astro" },
  },
  {
    key: "workingProcessSection",
    label: "Working Process",
    category: "sections",
    fields: [],
    source: { kind: "component", file: "src/layouts/components/sections/WorkingProcessSection.astro" },
  },
  {
    key: "testimonialQuoteSection",
    label: "Testimonial Quote",
    category: "sections",
    fields: [],
    source: { kind: "component", file: "src/layouts/components/sections/TestimonialQuoteSection.astro" },
  },
  {
    key: "contactSectionTwo",
    label: "Contact Section",
    category: "sections",
    fields: [],
    source: { kind: "component", file: "src/layouts/components/sections/ContactSectionTwo.astro" },
  },
  {
    key: "teamSection",
    label: "Team Section",
    category: "sections",
    fields: [],
    source: { kind: "component", file: "src/layouts/components/sections/TeamSection.astro" },
  },
  {
    key: "blogSection",
    label: "Blog Section",
    category: "sections",
    fields: [],
    source: { kind: "component", file: "src/layouts/components/sections/BlogSection.astro" },
  },
  {
    key: "callToAction",
    label: "Call To Action",
    category: "sections",
    fields: [],
    source: { kind: "component", file: "src/layouts/components/sections/CallToAction.astro" },
  },
];

async function main() {
  const prisma = new PrismaClient();
  const projects = await prisma.project.findMany({ select: { id: true, name: true } });

  for (const project of projects) {
    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        componentsRoot: SECTIONS_ROOT,
        blockRegistry: JSON.stringify(MANUAL_BLOCKS, null, 2),
        framework: "astro",
      },
      select: { id: true, name: true, componentsRoot: true },
    });
    console.log("Forced update:", updated.name, "→", updated.componentsRoot);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
