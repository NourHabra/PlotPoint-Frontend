import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "PlotPoint",
  version: packageJson.version,
  copyright: `© ${currentYear}, PlotPoint.`,
  meta: {
    title: "PlotPoint",
    description:
      "bla bla for now TODO",
  },
};
